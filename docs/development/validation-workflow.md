# Validation Workflow

This project now exposes a simple validation flow for local development and CI before deploying to Vercel.

## Available Scripts

- `npm run typecheck`
  Runs `tsc --noEmit` to catch TypeScript errors without generating build output.

- `npm run lint`
  Runs ESLint across the repository with `eslint .`.

- `npm run build`
  Runs the production Next.js build.

- `npm run check`
  Runs the full pre-deploy gate in order:
  1. `typecheck`
  2. `lint`
  3. `build`

## Recommended Usage

Use these commands during development:

```bash
npm run typecheck
```

Use this command before pushing or opening a deploy path:

```bash
npm run check
```

## Why This Helps Before Vercel

`npm run check` makes local validation and CI behave like a release gate instead of relying on Vercel to surface problems late.

That reduces avoidable deploy failures because it catches:

- TypeScript contract errors before build output is generated
- ESLint issues before they accumulate into harder-to-debug changes
- production build regressions before the code reaches Vercel

Using the same commands locally and in CI also removes ambiguity about what “ready to deploy” means.
