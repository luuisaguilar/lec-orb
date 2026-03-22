import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20260322_org_documents_storage.sql");

assert.ok(fs.existsSync(migrationPath), "expected org-documents storage migration to exist");

const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(migration, /insert into storage\.buckets/i);
assert.match(migration, /'org-documents'/i);
assert.match(migration, /on storage\.objects for select/i);
assert.match(migration, /on storage\.objects for insert/i);
assert.match(migration, /on storage\.objects for update/i);
assert.match(migration, /on storage\.objects for delete/i);
assert.match(migration, /storage\.foldername\(name\)/i);
assert.match(migration, /public\.org_members/i);

console.log("org-documents storage provisioning assertions passed");
