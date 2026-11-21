import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MAX_LINES = 250;
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'out',
  'coverage',
  '.pnpm-store',
]);
const EXCLUDE_FILES = new Set(['pnpm-lock.yaml', 'next-env.d.ts', 'tsconfig.tsbuildinfo']);

let failed = false;

function walk(dir: string, relative = '') {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative ? join(relative, entry) : entry;
    let stat: import('fs').Stats;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      walk(full, rel);
    } else if (stat.isFile()) {
      const dot = entry.lastIndexOf('.');
      const ext = dot === -1 ? '' : entry.slice(dot);
      if (!EXTENSIONS.has(ext)) continue;
      if (EXCLUDE_FILES.has(entry)) continue;
      const content = readFileSync(full, 'utf8');
      const lines = content.split('\n').length;
      if (lines > MAX_LINES) {
        console.error(`FILE TOO LONG: ${rel} — ${lines} lines (max ${MAX_LINES})`);
        failed = true;
      }
    }
  }
}

walk(ROOT);

if (failed) {
  console.error(
    `\nSource-file size limit exceeded (max ${MAX_LINES} lines). Fix the files listed above.`
  );
  process.exit(1);
}
console.log(`All source files within ${MAX_LINES}-line limit.`);
process.exit(0);
