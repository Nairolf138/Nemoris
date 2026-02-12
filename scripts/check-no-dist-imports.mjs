import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const BLOCKED_SEGMENT = '/dist/';
const SOURCE_GLOBS = [
  ['apps'],
  ['packages'],
];

const hasSourceExtension = (path) => [...SOURCE_EXTENSIONS].some((ext) => path.endsWith(ext));

const walk = (dir, files = []) => {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (hasSourceExtension(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
};

const collectSourceDirectories = () => {
  const sourceDirs = [];

  for (const [root] of SOURCE_GLOBS) {
    const absoluteRoot = join(ROOT, root);
    let packages = [];
    try {
      packages = readdirSync(absoluteRoot);
    } catch {
      continue;
    }

    for (const packageName of packages) {
      const srcDir = join(absoluteRoot, packageName, 'src');
      try {
        if (statSync(srcDir).isDirectory()) {
          sourceDirs.push(srcDir);
        }
      } catch {
        // package without src
      }
    }
  }

  return sourceDirs;
};

const violations = [];
for (const srcDir of collectSourceDirectories()) {
  for (const file of walk(srcDir)) {
    const content = readFileSync(file, 'utf8');
    if (content.includes(BLOCKED_SEGMENT)) {
      violations.push(relative(ROOT, file));
    }
  }
}

if (violations.length > 0) {
  console.error('Found forbidden import segment "/dist/" in source files:');
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log('No forbidden /dist/ imports found in source files.');
