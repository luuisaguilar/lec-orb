# Demo Mode Hardening

## Summary

Demo mode used to activate in either of these cases:

1. `NEXT_PUBLIC_DEMO_MODE === "true"`
2. `NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co"`

The second condition was unsafe because a misconfigured Preview or Production environment could fall back into demo behavior instead of failing clearly.

The new policy is explicit and fail-closed:

- demo mode activates only when `NEXT_PUBLIC_DEMO_MODE === "true"`
- and only when `NODE_ENV === "development"`
- Preview and Production never activate demo mode
- missing or placeholder Supabase configuration now throws an explicit configuration error instead of degrading to demo behavior

## Code Changes

- [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts)
  Demo activation is now local-development only.

- [src/lib/supabase/env.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/env.ts)
  Centralized validation for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  The browser-safe loader now reads those variables via direct references:
  - `process.env.NEXT_PUBLIC_SUPABASE_URL`
  - `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
  This avoids the Next.js client-bundle issue where dynamic lookups like `process.env[name]` are not inlined.

- [src/lib/supabase/client.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/client.ts)
- [src/lib/supabase/server.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/server.ts)
- [src/lib/supabase/proxy.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/proxy.ts)
  These clients now fail with clear errors when required Supabase env vars are missing or set to the documentation placeholder.

## Operational Contract

### Local development

If you want demo behavior locally:

- set `NEXT_PUBLIC_DEMO_MODE=true`
- run the app in development mode

Demo mode is for controlled local development only.

### Preview and Production

Preview and Production never activate demo mode, even if:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `NEXT_PUBLIC_SUPABASE_URL` is a placeholder or wrong value

In those environments, bad Supabase configuration must fail explicitly so the problem is visible and fixable.

## Why This Is Safer

- removes heuristic behavior based on placeholder values
- avoids a client-side configuration bug where configured public env vars could appear missing in the browser bundle
- prevents silent fallback to mock data in deployed environments
- makes configuration errors visible early through explicit runtime failures
- keeps demo behavior intentional instead of accidental
