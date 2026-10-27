# MyDaily

Manage your life with ease — a personal app for money, tasks, and notes in one place.

## Features

- **Money** — multiple accounts, categories, income/expense transactions, transaction templates, and import from BCA statement PDFs
- **Tasks** — tasks with deadlines and a daily summary
- **Notes** — rich-text notes (Tiptap) with optional per-note lock
- **Attachments** — images and PDFs (max 10 MB) stored in Supabase Storage
- **Trash** — soft delete with restore
- **Security** — Supabase Auth plus an app lock (4/6-digit PIN or password) with attempt limit and lockout
- **Reminders** — web push notifications for money and task reminders (installable as a PWA)
- **Theming** — light, dark, or follow system

## Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions) · Vitest · Vercel

## Getting Started

```bash
npm install
# create .env, see below
npm run dev            # http://localhost:5173
```

### Environment variables

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=http://localhost:5173   # password-reset redirect
VITE_VAPID_PUBLIC_KEY=...            # web push
```

The `send-reminders` Edge Function in `supabase/functions/` also needs its own secrets set in Supabase: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Coverage report |

## Project Structure

```
src/
  app/
    pages/       # Route-level pages
    components/  # Shared components (ui/ = shadcn/ui primitives)
    context/     # React Context providers, one per data domain
    types.ts     # Shared TypeScript types
  lib/           # Supabase client, upload helpers, event bus
  styles/        # Theme tokens and global CSS
supabase/
  functions/     # Edge Functions (push reminders)
```

## Deployment

Deployed on Vercel from `main`. `vercel.json` handles SPA rewrites and security headers. Set the same `VITE_*` environment variables in the Vercel project settings.
