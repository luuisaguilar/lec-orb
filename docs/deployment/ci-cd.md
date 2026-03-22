# CI/CD

This repository now includes a minimal GitHub Actions pipeline at [`.github/workflows/ci.yml`](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/.github/workflows/ci.yml).

## What The Pipeline Does

The workflow runs on:

- pushes to `main`
- pull requests targeting `main`

It executes one validation job on `ubuntu-latest` with Node `20`.

### Execution order

1. `actions/checkout`
2. `actions/setup-node` with npm cache enabled
3. `npm ci`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run build`

## Why Node 20

The workflow pins Node `20` because:

- it is compatible with Next.js 16
- the repo already aligns with Node 20 via `@types/node`
- it is a stable default for GitHub-hosted runners and Vercel-compatible Next.js builds

The repository now also declares `engines.node = 20.x` in `package.json`, so local development, CI, and Vercel can converge on the same major runtime.

## What The Pipeline Validates

The pipeline validates:

- TypeScript compilation safety with `tsc --noEmit`
- ESLint checks using the repo's current lint configuration
- production build viability with `next build`

This is the minimum useful gate before merge or deploy because it catches:

- broken types
- invalid imports or compile-time regressions
- build-time Next.js failures
- lint regressions that the current config treats as actionable

## What The Pipeline Does Not Validate

The pipeline does not currently validate:

- automated tests, because the repo does not yet expose a stable test command
- runtime integration with Supabase or external services
- environment variable completeness in GitHub Actions or Vercel
- deployment to Vercel
- schema migrations or database drift
- preview protection, manual approvals, or release promotion rules

## Notes About Current Lint Behavior

`npm run lint` currently exits successfully even when warnings exist. That means this CI pipeline blocks on lint errors, not lint warnings.

If the team later wants stricter enforcement, the lint script can be hardened separately.

## Future Steps

Good next improvements, in order:

1. Add a stable `npm test` command and run it in CI before `build`
2. Add branch protection so CI must pass before merge
3. Add environment validation for required Vercel variables
4. Add deploy gates for production, such as required approvals or release branches
5. Add separate workflows for preview deploy checks versus release deploy checks
