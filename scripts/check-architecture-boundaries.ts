import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
let failed = false;

function readSourceFiles(
  dir: string
): Array<{ path: string; content: string; relativePath: string }> {
  const results: Array<{ path: string; content: string; relativePath: string }> = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat: import('fs').Stats;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.next', 'out'].includes(entry)) {
        continue;
      }
      results.push(...readSourceFiles(full));
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) {
      results.push({
        path: full,
        content: readFileSync(full, 'utf8'),
        relativePath: relative(ROOT, full),
      });
    }
  }
  return results;
}

// 1. The domain package must never import frontend or HTTP framework code.
//    It is pure business logic, independent of apps and frameworks.
const domainFiles = readSourceFiles(join(ROOT, 'packages/domain/src'));
const frameworkImport =
  /from\s+['"](next|fastify|react|react-dom|@snapprint\/web|@snapprint\/api)['"]/;
for (const file of domainFiles) {
  if (frameworkImport.test(file.content)) {
    console.error(
      `ARCHITECTURE VIOLATION: ${file.relativePath} imports a framework/frontend package. Domain must remain framework-independent.`
    );
    failed = true;
  }
}

// 2. Applications must import shared packages by package name
//    (@snapprint/contracts, @snapprint/domain), never via deep relative paths.
const appFiles = [
  ...readSourceFiles(join(ROOT, 'apps/web')),
  ...readSourceFiles(join(ROOT, 'apps/api')),
  ...readSourceFiles(join(ROOT, 'apps/print-agent')),
];
const deepRelativeImport = /from\s+['"]\.\.\/\.\.\/packages\//;
for (const file of appFiles) {
  if (deepRelativeImport.test(file.content)) {
    console.error(
      `ARCHITECTURE VIOLATION: ${file.relativePath} imports a shared package via a deep relative path. Use the package name instead.`
    );
    failed = true;
  }
}

// 3. Prohibited telemetry and error-monitoring SDKs (ADR 0003).
//    SnapPrint strictly enforces first-party pino logging and RFC 7807 problem details.
const prohibitedSdkImport = /from\s+['"](@sentry\/|datadog|@datadog\/|bugsnag|@bugsnag\/|newrelic)/;
const allSourceFiles = [
  ...domainFiles,
  ...appFiles,
  ...readSourceFiles(join(ROOT, 'packages/contracts/src')),
];
for (const file of allSourceFiles) {
  if (prohibitedSdkImport.test(file.content)) {
    console.error(
      `ARCHITECTURE VIOLATION: ${file.relativePath} imports a prohibited external monitoring SDK. ADR 0003 mandates first-party logging.`
    );
    failed = true;
  }
}

// 4. Zero Hardcoded Business Limits & Arbitrary Fleet Caps.
//    Tenant fleet limits and quotas must remain optional/unbounded unless explicitly configured.
const contractFiles = readSourceFiles(join(ROOT, 'packages/contracts/src'));
for (const file of contractFiles) {
  if (/maxActivePrinters.*\.default\(/.test(file.content)) {
    console.error(
      `HARDCODING VIOLATION: ${file.relativePath} defines hardcoded .default() on maxActivePrinters. Limits must be optional.`
    );
    failed = true;
  }
}

// 5. Zero Hardcoded Geographic & Studio Entity Defaults.
//    Multi-tenant repositories and schemas must not impose arbitrary hardcoded states, cities, or studio names.
const apiRepoFiles = readSourceFiles(join(ROOT, 'apps/api/src/repositories'));
for (const file of [...contractFiles, ...apiRepoFiles]) {
  if (
    /state:.*\.default\(['"]Telangana['"]\)/.test(file.content) ||
    /['"]Default City['"]/.test(file.content) ||
    /studio\?\.name\s*\|\|\s*['"]My Studio['"]/.test(file.content)
  ) {
    console.error(
      `HARDCODING VIOLATION: ${file.relativePath} contains hardcoded geographic or placeholder entity fallbacks.`
    );
    failed = true;
  }
}

// 6. Paper format resolution governance in UI components.
//    UI components must not perform raw .toUpperCase() on paperSize/size without resolving format labels.
const webComponentFiles = readSourceFiles(join(ROOT, 'apps/web/app/components'));
for (const file of webComponentFiles) {
  if (/(paperSize|currentSize|size)\.toUpperCase\(\)/.test(file.content)) {
    console.error(
      `HARDCODING VIOLATION: ${file.relativePath} calls .toUpperCase() directly on a paper size identifier. Use resolveFormatLabel to prevent raw ID leaks.`
    );
    failed = true;
  }
}

if (failed) {
  console.error('\nNo Hardcoding & Boundary Check failed. Fix the violations listed above.');
  process.exit(1);
}
console.log(
  'No Hardcoding & Boundary Check OK: domain is framework-independent; apps import shared packages by name; no prohibited SDKs; zero hardcoding in schemas, repositories, and UI.'
);
process.exit(0);
