# Chore-App
Splitwise, but for chores: rotating room checklists, roommate verification, and a fair-share balance for shared houses.

## Stack
Next.js 15 (App Router, TypeScript) · Supabase (Postgres, Auth, RLS) · Vercel

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable key.
3. Apply the database migrations: `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. In Supabase, go to Authentication > URL Configuration:
   - Set **Site URL** to your production URL, e.g. `https://<app>.vercel.app`.
   - Add these **Redirect URLs** (the `/**` matters: sign-in links carry a `?next=` query):
     `http://localhost:3000/**` and `https://<app>.vercel.app/**`.
5. Recommended: in Authentication > Email Templates > Magic Link, change the link's `href` to
   `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`.
   The default link only works in the browser that requested it; this one also works on another
   device or in a mail app's built-in browser.
6. `npm run dev`

## Scripts
- `npm test`: unit tests (Vitest)
- `npm run test:db`: database and RLS tests (pgTAP; needs Docker and `npx supabase start`)
- `npm run typecheck`, `npm run lint`, `npm run build`
