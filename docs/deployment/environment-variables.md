# Environment Variables

This project currently uses a small environment surface area:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEMO_MODE`
- `NODE_ENV` as a derived runtime variable from Next.js/Vercel

The app uses the Supabase URL and anon key on both server and client, so both are intentionally public `NEXT_PUBLIC_*` variables. Demo mode is also public because both client and server code read the same flag.

## Source Inventory

Environment variables are consumed in:

- [src/lib/supabase/client.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/client.ts)
- [src/lib/supabase/server.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/server.ts)
- [src/lib/supabase/proxy.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/supabase/proxy.ts)
- [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts)
- [src/app/(auth)/login/page.tsx](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/app/(auth)/login/page.tsx)
- [check_db.js](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/check_db.js)
- [scripts/test-supabase.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/scripts/test-supabase.ts)

## Variable Matrix

| variable | required | public/private | environments | example value | description | risk if missing |
| --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public | development, preview, production | `https://your-project-ref.supabase.co` | Base URL for the Supabase project used by browser, server, middleware, and local helper scripts. | Auth, middleware session refresh, API routes, and browser data access fail. Placeholder values now raise an explicit configuration error. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public | development, preview, production | `your-supabase-anon-key` | Supabase anon key used by browser, server, middleware, and local helper scripts. | Supabase clients cannot initialize, so login and data access fail. |
| `NEXT_PUBLIC_DEMO_MODE` | No, optional | Public | optional in local development only | `false` | Explicit switch for demo mode. Demo mode is only honored when `NODE_ENV=development`. | No effect in Preview or Production. In local development it changes auth/data behavior intentionally. |
| `NODE_ENV` | Derived | Private/runtime | development, preview, production | `development` or `production` | Set by Next.js/Vercel runtime. Used only to hide demo login UI in production. | Usually none if platform-managed. Do not override manually; manual overrides can create inconsistent behavior. |

## Required By Environment

### Required in Development

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional in development:

- `NEXT_PUBLIC_DEMO_MODE`

### Required in Preview

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Expected in preview:

- `NEXT_PUBLIC_DEMO_MODE` is ignored by the runtime and should still be left unset or `false`

### Required in Production

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Expected in production:

- `NEXT_PUBLIC_DEMO_MODE` is ignored by the runtime and should still be left unset or `false`

### Optional

- `NEXT_PUBLIC_DEMO_MODE`

### Derived

- `NODE_ENV`

## Public vs Private Review

### Variables that are correctly public

- `NEXT_PUBLIC_SUPABASE_URL`
  This must be public because the browser Supabase client needs the project URL.

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  This must be public because the browser Supabase client needs the anon key. This is acceptable only because it is the anon key, not the service role key.

- `NEXT_PUBLIC_DEMO_MODE`
  This is intentionally public because both client and server code read the same flag.

### Public exposure risks

- Do not ever place a Supabase service role key in a `NEXT_PUBLIC_*` variable.
- `NEXT_PUBLIC_DEMO_MODE=true` is safe from a secrecy perspective, but should be treated as a local-development-only flag.

## Demo Mode

Demo mode is activated in [src/lib/demo/config.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/src/lib/demo/config.ts) only when both conditions are true:

1. `NEXT_PUBLIC_DEMO_MODE === "true"`
2. `NODE_ENV === "development"`

There is no placeholder-based fallback anymore.

Demo mode is only for local development.

### How to avoid accidental demo mode in Vercel

- Preview and Production never activate demo mode.
- Keep `NEXT_PUBLIC_DEMO_MODE` unset or `false` in Vercel anyway, to avoid confusion.
- Never leave `NEXT_PUBLIC_SUPABASE_URL` as a placeholder.
- Use a real Supabase project URL in every deployed Vercel environment.
- If Supabase env vars are missing or left as placeholders, the app now fails explicitly instead of degrading to demo behavior.
- After editing env vars in Vercel, redeploy so the new values are applied consistently.

## Local Usage

Copy the example file and replace placeholders:

```bash
cp .env.example .env.local
```

Then fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Keep `NEXT_PUBLIC_DEMO_MODE=false` unless you intentionally want demo behavior in local development.

The helper scripts [check_db.js](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/check_db.js) and [scripts/test-supabase.ts](/c:/Users/Usuario/Desktop/proyectos/orb-lec/lec-orb/scripts/test-supabase.ts) explicitly read `.env.local`, so they depend on the same local file.

## Vercel Configuration

### Recommended setup in Vercel

Add these variables in Project Settings -> Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Set them for:

- Development
- Preview
- Production

Recommended value for:

- `NEXT_PUBLIC_DEMO_MODE`
  Do not add it in Vercel unless you want to keep the config surface explicit. If you do add it, keep it `false`. Preview and Production do not honor demo mode.

### CLI workflow

Link the repo to the Vercel project if needed:

```bash
vercel link
```

Pull the currently configured environment variables into `.env.local`:

```bash
vercel env pull .env.local
```

Pull a specific environment if needed:

```bash
vercel env pull .env.local --environment=preview
vercel env pull .env.local --environment=production
```

After pulling variables, restart the Next.js dev server so the updated values are loaded.

## Notes

- There is no evidence in the application code of a required server-only secret such as `SUPABASE_SERVICE_ROLE_KEY`.
- If the project later adds admin/server jobs, re-run this inventory before deploying new environment assumptions.
