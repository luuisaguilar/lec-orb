import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const demoConfigPath = path.join(repoRoot, "src", "lib", "demo", "config.ts");
const supabaseEnvPath = path.join(repoRoot, "src", "lib", "supabase", "env.ts");
const envExamplePath = path.join(repoRoot, ".env.example");
const envDocsPath = path.join(repoRoot, "docs", "deployment", "environment-variables.md");

const demoConfig = fs.readFileSync(demoConfigPath, "utf8");
const supabaseEnv = fs.readFileSync(supabaseEnvPath, "utf8");
const envExample = fs.readFileSync(envExamplePath, "utf8");
const envDocs = fs.readFileSync(envDocsPath, "utf8");

assert.match(demoConfig, /process\.env\.NEXT_PUBLIC_DEMO_MODE === "true"/);
assert.match(demoConfig, /process\.env\.NODE_ENV === "development"/);
assert.doesNotMatch(demoConfig, /placeholder\.supabase\.co/, "demo mode must not depend on placeholder Supabase URLs");

assert.match(supabaseEnv, /Missing required Supabase environment variable/);
assert.match(supabaseEnv, /placeholder\.supabase\.co/);
assert.match(supabaseEnv, /must be a real Supabase project URL/i);

assert.match(envExample, /NEXT_PUBLIC_DEMO_MODE=false/);
assert.match(envDocs, /only for local development/i);
assert.match(envDocs, /Preview and Production never activate demo mode/i);
assert.doesNotMatch(envDocs, /placeholder URL automatically activates demo mode/i);

console.log("demo mode hardening assertions passed");
