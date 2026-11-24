import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const ABSOLUTE_MAX_LINES = 250;
const BASELINE_PATH = join(ROOT, '.line-budget-baseline.json');
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

interface BaselineData {
  [filePath: string]: number;
}

let baseline: BaselineData = {};
if (existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    console.error(`Warning: Failed to parse baseline file at ${BASELINE_PATH}`);
  }
}

const shouldUpdateBaseline = process.argv.includes('--update-baseline');

export function getCategoryBudget(relPath: string): { budget: number; category: string } {
  const p = relPath.replace(/\\/g, '/');
  const isTest =
    p.endsWith('.test.ts') ||
    p.endsWith('.test.tsx') ||
    p.endsWith('.spec.ts') ||
    p.endsWith('.spec.tsx');

  if (!isTest && /^apps\/web\/app\/.*page\.tsx$/.test(p)) {
    return { budget: 100, category: 'Page Shell' };
  }

  if (
    !isTest &&
    (/\/use-[^/]+\.tsx?$/.test(p) || /-hook\.tsx?$/.test(p) || p.includes('/hooks/'))
  ) {
    return { budget: 150, category: 'Custom Hook' };
  }

  if (
    !isTest &&
    (p.startsWith('apps/web/app/components/') ||
      p.startsWith('apps/web/components/') ||
      (p.startsWith('apps/web/app/') && p.endsWith('.tsx'))) &&
    !p.endsWith('/page.tsx') &&
    !p.endsWith('/layout.tsx')
  ) {
    return { budget: 150, category: 'UI Component' };
  }

  if (!isTest && /^apps\/api\/src\/.*-routes.*\.ts$/.test(p)) {
    return { budget: 200, category: 'Backend Handler' };
  }

  return { budget: ABSOLUTE_MAX_LINES, category: 'Source File' };
}

interface ScannedFile {
  rel: string;
  lines: number;
  budget: number;
  category: string;
}

const files: ScannedFile[] = [];

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
      const { budget, category } = getCategoryBudget(rel);
      files.push({ rel, lines, budget, category });
    }
  }
}

walk(ROOT);

let failed = false;
const newBaseline: BaselineData = {};

for (const file of files) {
  if (file.lines > ABSOLUTE_MAX_LINES) {
    console.error(
      `ABSOLUTE LIMIT EXCEEDED: ${file.rel} — ${file.lines} lines (absolute maximum is ${ABSOLUTE_MAX_LINES})`
    );
    failed = true;
    continue;
  }

  if (file.lines > file.budget) {
    if (shouldUpdateBaseline) {
      newBaseline[file.rel] = file.lines;
    } else {
      const allowed = baseline[file.rel];
      if (allowed === undefined) {
        console.error(
          `LINE BUDGET VIOLATION: ${file.rel} — ${file.lines} lines exceeds ${file.category} budget of ${file.budget} lines and is NOT in baseline.`
        );
        failed = true;
      } else if (file.lines > allowed) {
        console.error(
          `RATCHET VIOLATION: ${file.rel} grew from baseline ${allowed} to ${file.lines} lines (budget: ${file.budget}). Baseline files may only decrease.`
        );
        failed = true;
      } else {
        newBaseline[file.rel] = file.lines;
      }
    }
  }
}

if (shouldUpdateBaseline) {
  const sortedBaseline: BaselineData = {};
  for (const key of Object.keys(newBaseline).sort()) {
    sortedBaseline[key] = newBaseline[key];
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(sortedBaseline, null, 2) + '\n', 'utf8');
  console.log(
    `Baseline updated with ${Object.keys(sortedBaseline).length} files in ${BASELINE_PATH}`
  );
  process.exit(0);
}

if (failed) {
  console.error(`\nLine budget / ratchet check failed. Fix the violations listed above.`);
  process.exit(1);
}

console.log(
  `All source files within budgets and baseline ratchet limits (${files.length} files checked, ${Object.keys(baseline).length} grandfathered in baseline).`
);
process.exit(0);
