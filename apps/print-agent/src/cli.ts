#!/usr/bin/env node

import { hostname } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { AGENT_VERSION, handleUpdateCommand } from './agent-updater.js';
import { AgentClient } from './agent-client.js';
import { getDefaultWebUrl, loadAgentConfig, saveAgentConfig, unpairAgent } from './config.js';
import { AgentDaemon } from './daemon.js';
import { runDesktopSession } from './desktop-runner.js';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.js';
import { shutdownGracefully } from './lifecycle.js';
import { createSystemSpoolerAdapter } from './spooler-adapter.js';

export { AGENT_VERSION } from './agent-updater.js';

export interface ExtractedUrlFlags {
  apiUrl?: string;
  webUrl?: string;
  filteredArgv: string[];
}

export function extractUrlFlags(argv: string[]): ExtractedUrlFlags {
  let apiUrl: string | undefined;
  let webUrl: string | undefined;
  const filtered: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--api-url=') || arg.startsWith('--server=')) {
      apiUrl = arg.slice(arg.indexOf('=') + 1).trim();
    } else if ((arg === '--api-url' || arg === '--server') && i + 1 < argv.length) {
      apiUrl = argv[++i].trim();
    } else if (arg.startsWith('--web-url=') || arg.startsWith('--app-url=')) {
      webUrl = arg.slice(arg.indexOf('=') + 1).trim();
    } else if ((arg === '--web-url' || arg === '--app-url') && i + 1 < argv.length) {
      webUrl = argv[++i].trim();
    } else {
      filtered.push(arg);
    }
  }
  return { apiUrl, webUrl, filteredArgv: filtered };
}

export function extractApiUrlFlag(argv: string[]): { apiUrl?: string; filteredArgv: string[] } {
  const { apiUrl, filteredArgv } = extractUrlFlags(argv);
  return { apiUrl, filteredArgv };
}

export async function runCli(rawArgv: string[] = process.argv.slice(2)): Promise<number> {
  const { apiUrl, webUrl, filteredArgv } = extractUrlFlags(rawArgv);
  const config = loadAgentConfig();

  if (apiUrl) {
    config.apiUrl = apiUrl;
  }
  if (webUrl) {
    config.webUrl = webUrl;
  }
  if (apiUrl || webUrl) {
    saveAgentConfig(config);
  }

  const client = new AgentClient(config.apiUrl);
  const spooler = createSystemSpoolerAdapter();
  const command = filteredArgv[0];

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(AGENT_VERSION);
    return 0;
  }

  if (command === 'update') {
    return handleUpdateCommand(config.apiUrl, AGENT_VERSION);
  }

  if (!command || command === 'desktop' || command === 'gui') {
    return runDesktopSession({
      config,
      client,
      spooler,
      mode: command === 'gui' ? 'gui' : 'desktop',
    });
  }

  if (command === 'config') {
    if (apiUrl || webUrl) {
      if (apiUrl) console.log(`API URL updated to: ${config.apiUrl}`);
      if (webUrl) console.log(`Web URL updated to: ${config.webUrl}`);
      return 0;
    }
    console.log(`Current API URL: ${config.apiUrl}`);
    console.log(`Current Web URL: ${config.webUrl || getDefaultWebUrl()}`);
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
      shutdownGracefully({ daemon, exitProcess: true });
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
    'Usage: snapprint-agent [desktop | gui | update | pair <code?> [--api-url <url>] [--web-url <url>] | enroll | start | status | printers | sync | unpair | config | version]'
  );
  return 1;
}

export function isCliMainModule(targetPath?: string): boolean {
  const target = (targetPath || process.argv[1] || '').replace(/\\/g, '/').toLowerCase();
  const suffixes = [
    'cli.ts',
    'cli.js',
    'snapprint-agent.bundle.cjs',
    'snapprint-agent.exe',
    '/snapprint-agent',
  ];
  return (
    suffixes.some((s) => target.endsWith(s) || target === s) ||
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
