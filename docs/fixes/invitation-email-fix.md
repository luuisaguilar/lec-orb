# Fix: Invitation Email Delivery

## Problem

`POST /api/v1/invitations` only inserted a row into `org_invitations`. No email was ever dispatched — no Resend/SMTP call, no Supabase Auth invite, no DB trigger.

The join page at `/join/[token]` was functional (token lookup → role display → accept), but users never received the link.

## Root Cause

The original implementation treated the invitation as a DB record only. Email delivery was simply never implemented.

## Fix

### Email Service — `src/lib/email/`

Added `resend.ts` (Resend client, `sendInvitationEmail()`) and `templates.ts` (responsive HTML template).

`sendInvitationEmail()` is graceful-failure by design: it never throws — it returns `{ sent: boolean, error?: string }`. A failed email does not roll back the invitation row.

### API Route — `POST /api/v1/invitations`

- Accepts optional `sendEmail: boolean` (default `true`)
- After insert, fetches `organizations.name` and builds `joinUrl = ${NEXT_PUBLIC_APP_URL}/join/${token}`
- Returns `{ invitation, emailSent, joinUrl }` — `joinUrl` is always present

### Resend Endpoint — `POST /api/v1/invitations/[id]/resend`

New endpoint to re-send the email for an existing `pending` invitation.

### UI — `invite-user-dialog.tsx`

- Toggle: **Enviar email** (default) vs **Solo generar link**
- Link-only mode returns a copyable URL shown inline in the dialog
- If email mode is chosen but email fails, the toast warns the user and shows the link anyway

## Required Environment Variables

| Variable | Description | Required |
|---|---|---|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) | Yes (for email delivery) |
| `NEXT_PUBLIC_APP_URL` | Full URL of the app (e.g. `https://lec-platform.vercel.app`) | Yes (for building invite links) |

Add to `.env.local` for development and in Vercel's Environment Variables for Preview/Production.

## Email Provider Notes

- Free Resend tier: 3,000 emails/month
- In development/free tier: emails only deliver to the Resend account owner's verified address
- To send to any address: verify a custom domain in the [Resend dashboard](https://resend.com/domains)
- `from` is currently hardcoded to `onboarding@resend.dev` (Resend shared domain). Update to a verified domain before production.

## Verification

- `npm run typecheck` — ✅ passes
- `npm run build` — ✅ passes (exit code 0)

Manual verification steps:

1. Run `npm run dev`
2. Log in as admin → Dashboard → Usuarios → "Invitar Usuario"
3. Test **email mode**: enter a real email, submit → verify email arrives with working `/join/[token]` link
4. Test **link-only mode**: submit → verify copyable URL appears → paste in browser → verify join page loads correctly
