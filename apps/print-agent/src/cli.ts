#!/usr/bin/env node

import { hostname } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { AgentClient } from './agent-client.js';
import { loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.js';
import { createSystemSpoolerAdapter } from './spooler-adapter.js';

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const command = argv[0] || 'status';
  const config = loadAgentConfig();
  const client = new AgentClient(config.apiUrl);
  const spooler = createSystemSpoolerAdapter();

  if (command === 'enroll') {
    let pairingCode = argv[1];
    if (!pairingCode) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      pairingCode = await rl.question('Enter 16-char Pairing Code (e.g. SNAP-XXXX-YYYY): ');
      rl.close();
    }

    if (!pairingCode || pairingCode.trim().length === 0) {
      console.error('Error: Pairing code is required.');
      return 1;
    }

    try {
      console.log(`Enrolling shop device with code: ${pairingCode.trim().toUpperCase()}...`);
      const host = hostname();
      const rawPlat = process.platform;
      const osPlatform =
        rawPlat === 'win32' || rawPlat === 'darwin' || rawPlat === 'linux' ? rawPlat : 'linux';
      const enrollResult = await client.enroll(pairingCode, host, {
        hostname: host,
        agentVersion: '0.1.0',
        osPlatform,
      });
      config.deviceToken = enrollResult.deviceToken;
      config.studioId = enrollResult.studioId;
      config.deviceId = enrollResult.deviceId;
      config.deviceFriendlyName = host;
      saveAgentConfig(config);
      console.log('Device enrolled successfully!');
      console.log(`  Studio ID: ${enrollResult.studioId}`);
      console.log(`  Device ID: ${enrollResult.deviceId}`);

      console.log('\nRunning initial printer discovery and sync...');
      const daemon = new AgentDaemon(config, client, spooler);
      await daemon.syncOnce();
      console.log('Enrollment & initial printer sync complete! Run "start" to run daemon.');
      return 0;
    } catch (err) {
      console.error(`Enrollment failed: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  if (command === 'unpair') {
    unpairAgent();
    console.log(
      'Device credentials cleared successfully. You may now re-enroll with a new pairing code.'
    );
    return 0;
  }

  if (command === 'sync') {
    if (!config.deviceToken) {
      console.error('Error: Device not enrolled. Run "snapprint-agent enroll" first.');
      return 1;
    }
    try {
      const daemon = new AgentDaemon(config, client, spooler);
      const count = await daemon.syncOnce();
      console.log(`Synced ${count} printer(s) to SnapPrint Cloud.`);
      return 0;
    } catch (err) {
      console.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`);
      return 1;
    }
  }

  if (command === 'start') {
    if (!config.deviceToken) {
      console.error('Error: Device not enrolled. Run "snapprint-agent enroll" first.');
      return 1;
    }

    const lock = acquireInstanceLock();
    if (!lock.acquired) {
      console.log(
        `SnapPrint Agent is already running (PID: ${lock.pid}). Exiting duplicate instance.`
      );
      return 0;
    }

    const daemon = new AgentDaemon(config, client, spooler);
    await daemon.start();

    const handleExit = () => {
      daemon.stop();
      releaseInstanceLock();
      process.exit(0);
    };
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    process.on('exit', () => releaseInstanceLock());
    return 0;
  }

  if (command === 'status' || command === 'printers') {
    console.log('SnapPrint Desktop Print Agent Status');
    console.log('-----------------------------------');
    console.log(`API URL:        ${config.apiUrl}`);
    console.log(`Device Token:   ${config.deviceToken ? 'Configured [✓]' : 'Not Enrolled [✗]'}`);
    console.log(`Studio ID:      ${config.studioId || 'N/A'}`);
    console.log(`Device ID:      ${config.deviceId || 'N/A'}`);
    console.log(`Last Sync:      ${config.lastSyncAt || 'Never'}`);

    console.log('\nScanning local OS spooler...');
    const printers = await spooler.getPrinters();
    console.log(`Discovered ${printers.length} printer(s):`);
    for (const p of printers) {
      const colorTag = p.isColorSupported ? 'Color' : 'B&W';
      const defaultTag = p.isDefault ? ' [Default]' : '';
      console.log(` - ${p.name} (${colorTag}, Driver: ${p.driverName})${defaultTag}`);
    }
    return 0;
  }

  console.log(
    'Usage: snapprint-agent [enroll <code?> | unpair | sync | start | status | printers]'
  );
  return 1;
}

if (process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')) {
  runCli().then((code) => {
    if (code !== 0 && process.argv[2] !== 'start') {
      process.exit(code);
    }
  });
}
