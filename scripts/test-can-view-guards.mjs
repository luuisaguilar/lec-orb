import fs from 'node:fs';
import path from 'node:path';

const targets = [
  'src/app/api/v1/modules/[slug]/records/route.ts',
  'src/app/api/v1/modules/[slug]/records/[recordId]/route.ts',
];

const requiredSnippets = [
  '.from("module_permissions")',
  '.select("can_view")',
  'Insufficient permissions to view',
];

let failed = false;

for (const target of targets) {
  const fullPath = path.join(process.cwd(), target);
  const content = fs.readFileSync(fullPath, 'utf8');

  const missing = requiredSnippets.filter((s) => !content.includes(s));
  if (missing.length > 0) {
    failed = true;
    console.error(`✗ ${target} is missing: ${missing.join(', ')}`);
  } else {
    console.log(`✓ ${target} includes can_view authorization guard`);
  }
}

if (failed) {
  process.exit(1);
}
