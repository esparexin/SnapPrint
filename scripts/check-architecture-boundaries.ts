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

if (failed) {
  console.error('\nArchitecture boundary violations found. Fix the files listed above.');
  process.exit(1);
}
console.log(
  'Architecture boundaries OK: domain is framework-independent; apps import shared packages by name.'
);
process.exit(0);
