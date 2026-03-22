import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20260322_organizations_slug_alignment.sql");
const registerPagePath = path.join(repoRoot, "src", "app", "(auth)", "register", "page.tsx");

function run() {
  assert.ok(fs.existsSync(migrationPath), "expected organizations slug alignment migration to exist");

  const migration = fs.readFileSync(migrationPath, "utf8");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.slugify_organization/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.generate_organization_slug/i);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_organization_slug/i);
  assert.match(migration, /BEFORE INSERT OR UPDATE/i);
  assert.match(migration, /ELSIF TG_OP = 'UPDATE'/i);
  assert.match(migration, /NEW\.slug IS DISTINCT FROM OLD\.slug/i);
  assert.match(migration, /INSERT INTO public\.organizations \(name\)/i);

  const registerPage = fs.readFileSync(registerPagePath, "utf8");

  assert.doesNotMatch(registerPage, /\.from\('profiles'\)\s*\.insert/i);
  assert.doesNotMatch(registerPage, /\.from\('organizations'\)\s*\.insert/i);
  assert.doesNotMatch(registerPage, /\.from\('org_members'\)\s*\.insert/i);
  assert.match(registerPage, /supabase\.auth\.signUp/i);
}

run();
console.log("registration-slug-alignment assertions passed");
