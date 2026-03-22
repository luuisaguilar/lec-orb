# Repository Hygiene

## Summary

This repository does not currently use Git submodules. The main hygiene risks are at the repository root: tracked analysis artifacts, ad hoc helper scripts mixed with source files, and a `.gitignore` configuration that previously hid versioned documentation and `next-env.d.ts`.

## What Changed

- Removed `docs/` from `.gitignore` so deployment and maintenance documentation can be versioned normally.
- Removed `next-env.d.ts` from `.gitignore` because it is a standard Next.js generated file that should not be hidden from Git.
- Added `lint_output.txt` and `lint_parsed.txt` to `.gitignore` because they are local analysis outputs produced by root helper tooling.
- Left tracked root artifacts and helper scripts in place to avoid breaking undocumented local workflows.

## Submodules

- `.gitmodules` is not present.
- No active submodule references were found in repository configuration.
- No removal action is required.

## Root-Level Hygiene Findings

The root currently mixes application metadata with local operational files:

- Tracked report artifacts: `build_output.txt`, `eslint_report.json`, `lint_summary_clean.txt`
- Tracked scratch/spec files: `fase2`, `fase3`
- Tracked helper scripts: `check_db.js`, `fetch-test.js`, `parse_lint.js`

These files are not referenced by the main npm scripts or the checked-in GitHub Actions workflow. That makes them maintenance debt rather than immediate blockers.

## Recommended Organization

Keep the application root limited to framework/runtime files and move ad hoc utilities into dedicated folders in a follow-up cleanup:

- Move one-off maintenance scripts into `scripts/maintenance/`
- Move local debug helpers into `scripts/debug/`
- Remove or rename opaque files like `fase2` and `fase3` after confirming whether they still serve as requirements notes
- Either delete tracked report artifacts in a dedicated cleanup PR or relocate durable reports under `docs/` if they are meant to be retained

## Findings Table

| path | issue | action taken | risk |
| --- | --- | --- | --- |
| `.gitmodules` | No submodule file exists | Verified no action needed | Low |
| `.gitignore` | Ignored `docs/`, which hid repository documentation from Git | Removed the ignore entry | Medium if left unchanged because deployment/runbook docs could stay local-only |
| `.gitignore` | Ignored `next-env.d.ts`, a standard Next.js repo file | Removed the ignore entry | Medium if left unchanged because generated app metadata can drift silently |
| `.gitignore` | Missing ignores for local lint parser outputs | Added `lint_output.txt` and `lint_parsed.txt` | Low |
| `build_output.txt` | Tracked build output artifact in repository root | Documented only, left in place | Medium because it adds noise and can become stale |
| `eslint_report.json` | Tracked lint artifact in repository root | Documented only, left in place | Medium because report snapshots age quickly |
| `lint_summary_clean.txt` | Tracked lint summary artifact in repository root | Documented only, left in place | Medium because it is operational output, not source |
| `fase2` | Opaque tracked text file in repository root | Documented only, left in place | Medium because provenance is unclear |
| `fase3` | Empty tracked file in repository root | Documented only, left in place | Low to medium because intent is unclear |
| `check_db.js` | Root-level maintenance script outside `scripts/` | Documented as relocation candidate, left in place | Low because moving it without updating users may break ad hoc workflows |
| `fetch-test.js` | Root-level debug script outside `scripts/` | Documented as relocation candidate, left in place | Low |
| `parse_lint.js` | Root-level local helper script outside `scripts/` | Documented as relocation candidate, left in place | Low |

## Follow-Up Cleanup Sequence

1. Confirm whether `build_output.txt`, `eslint_report.json`, `lint_summary_clean.txt`, `fase2`, and `fase3` are intentionally versioned.
2. Move `check_db.js`, `fetch-test.js`, and `parse_lint.js` into a scoped `scripts/` subfolder and update any README references.
3. Remove stale tracked artifacts in a dedicated PR once ownership and purpose are confirmed.
4. Replace the default `README.md` with project-specific setup, validation, and deployment entry points.
