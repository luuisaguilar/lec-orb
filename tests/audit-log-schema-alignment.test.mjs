import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const routePath = path.join(repoRoot, "src", "app", "api", "v1", "audit-logs", "route.ts");
const feedHelperPath = path.join(repoRoot, "src", "lib", "audit", "feed.ts");
const migrationPath = path.join(repoRoot, "supabase", "migrations", "20260322_audit_log_schema_alignment.sql");

const routeSource = fs.readFileSync(routePath, "utf8");
const feedHelperSource = fs.readFileSync(feedHelperPath, "utf8");

assert.match(routeSource, /\.order\("created_at"/, "audit logs route should order by canonical created_at");
assert.match(routeSource, /\.eq\("action"/, "audit logs route should filter by canonical action");
assert.match(routeSource, /\.eq\("performed_by"/, "audit logs route should filter by canonical performed_by");
assert.match(routeSource, /normalizeAuditLogForFeed/, "audit logs route should normalize records for dashboard compatibility");
assert.match(feedHelperSource, /operation:\s*log\.action/, "audit feed helper should normalize action to operation for dashboard compatibility");
assert.match(feedHelperSource, /changed_by:\s*log\.performed_by/, "audit feed helper should normalize performed_by to changed_by for dashboard compatibility");
assert.match(feedHelperSource, /changed_at:\s*log\.created_at/, "audit feed helper should normalize created_at to changed_at for dashboard compatibility");
assert.doesNotMatch(routeSource, /\.order\("changed_at"/, "route should not query legacy changed_at directly");
assert.doesNotMatch(routeSource, /\.eq\("operation"/, "route should not filter legacy operation directly");
assert.doesNotMatch(routeSource, /\.eq\("changed_by"/, "route should not filter legacy changed_by directly");

assert.ok(fs.existsSync(migrationPath), "expected audit log alignment migration to exist");

const migrationSource = fs.readFileSync(migrationPath, "utf8");

assert.doesNotMatch(migrationSource, /DROP\s+TABLE/i, "migration must be non-destructive");
assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS org_id/i);
assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS action/i);
assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS performed_by/i);
assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS created_at/i);
assert.match(migrationSource, /SET action = COALESCE\(action,\s*operation\)/i);
assert.match(migrationSource, /SET performed_by = COALESCE\(performed_by,\s*changed_by\)/i);
assert.match(migrationSource, /SET created_at = COALESCE\(created_at,\s*changed_at\)/i);
assert.match(migrationSource, /CREATE POLICY "Members can read audit_log"/i);
assert.match(migrationSource, /org_members/i);

console.log("audit log schema alignment assertions passed");
