#!/usr/bin/env node

import { hostname } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { AgentClient } from './agent-client.js';
import { loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { launchGuiWindow, startGuiServer } from './gui-server.js';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.js';
import { createSystemSpoolerAdapter } from './spooler-adapter.js';

export const AGENT_VERSION = '0.1.0';

export function extractApiUrlFlag(argv: string[]): { apiUrl?: string; filteredArgv: string[] } {
  let apiUrl: string | undefined;
  const filtered: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--api-url=')) {
      apiUrl = arg.slice(10).trim();
    } else if (arg === '--api-url' && i + 1 < argv.length) {
      apiUrl = argv[++i].trim();
    } else if (arg.startsWith('--server=')) {
      apiUrl = arg.slice(9).trim();
    } else if (arg === '--server' && i + 1 < argv.length) {
      apiUrl = argv[++i].trim();
    } else {
      filtered.push(arg);
    }
  }
  return { apiUrl, filteredArgv: filtered };
}

export async function runCli(rawArgv: string[] = process.argv.slice(2)): Promise<number> {
  const { apiUrl, filteredArgv } = extractApiUrlFlag(rawArgv);
  const config = loadAgentConfig();

  if (apiUrl) {
    config.apiUrl = apiUrl;
    saveAgentConfig(config);
  }

  const client = new AgentClient(config.apiUrl);
  const spooler = createSystemSpoolerAdapter();
  const command = filteredArgv[0];

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(AGENT_VERSION);
    return 0;
  }

  if (!command || command === 'gui') {
    const handle = await startGuiServer(client, spooler);
    launchGuiWindow(handle.url);
    console.log(`SnapPrint Agent GUI running at: ${handle.url}`);

    if (config.deviceToken) {
      const daemon = new AgentDaemon(config, client, spooler);
      daemon.start().catch(() => {});
    }

    if (process.env.NODE_ENV === 'test' || Boolean(process.env.SNAPPRINT_TEST_MODE)) {
      await handle.close();
      return 0;
    }

    const handleExit = () => {
      handle.close();
      releaseInstanceLock();
      process.exit(0);
    };
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
    return new Promise(() => {});
  }

  if (command === 'config') {
    if (apiUrl) {
      console.log(`API URL updated to: ${config.apiUrl}`);
      return 0;
    }
    console.log(`Current API URL: ${config.apiUrl}`);
    return 0;
  }

  if (command === 'enroll' || command === 'pair') {
    let pairingCode = filteredArgv[1];
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
    'Usage: snapprint-agent [gui | pair <code?> [--api-url <url>] | enroll | start | status | printers | sync | unpair | config | version]'
  );
  return 1;
}

export function isCliMainModule(targetPath?: string): boolean {
  const target = targetPath || process.argv[1] || '';
  const normalized = target.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.endsWith('/cli.ts') ||
    normalized.endsWith('/cli.js') ||
    normalized.endsWith('cli.ts') ||
    normalized.endsWith('cli.js') ||
    normalized.endsWith('/snapprint-agent.bundle.cjs') ||
    normalized.endsWith('snapprint-agent.bundle.cjs') ||
    normalized.endsWith('/snapprint-agent.exe') ||
    normalized.endsWith('snapprint-agent.exe') ||
    normalized.endsWith('/snapprint-agent') ||
    normalized.endsWith('snapprint-agent') ||
    Boolean(process.env.SNAPPRINT_AGENT_STANDALONE)
  );
}

if (isCliMainModule()) {
  runCli().then((code) => {
    if (code !== 0 && process.argv[2] !== 'start') {
      process.exit(code);
    }
  });
}
