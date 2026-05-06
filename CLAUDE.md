# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript compile + Vite build
npm run preview      # Serve production build locally
npm run test         # Vitest in watch mode
npm run test:run     # Run tests once (CI-friendly)
npm run test:ui      # Vitest browser UI
npm run test:coverage # Coverage report (v8 provider)
```

There are currently no project-level test files — the test framework (Vitest + jsdom) is configured in `vite.config.ts` with setup at `src/test/setup.ts`.

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_URL=http://localhost:5173   # used for password-reset redirect
```

## Architecture

### Source layout

```
src/
  app/
    pages/        # Route-level page components
    components/   # Shared components; components/ui/ = shadcn/ui primitives
    context/      # All global state (React Context only — no Redux/Zustand)
    types.ts      # Shared TypeScript interfaces
  lib/
    supabase.ts   # Supabase client, file-upload helpers, error sanitiser
    trashEvents.ts # Pub/sub event bus for cross-context coordination
  styles/
    theme.css     # CSS custom properties (light + dark palettes)
    index.css     # Imports fonts, tailwind, theme
```

### State management

Every data domain has its own React Context provider in `src/app/context/`:
`AuthContext`, `ThemeContext`, `AccountContext`, `CategoryContext`,
`TransactionContext`, `TaskContext`, `NoteContext`, `AttachmentContext`, `TrashContext`.

Provider nesting order matters — it is defined in `App.tsx`:
- `ThemeProvider` and `AuthProvider` are outermost (no data dependency)
- All data providers are grouped inside `DataProviders`, with `CategoryProvider` and `AccountProvider` first because `TransactionContext` depends on `useAccounts()`

The pattern inside every data context is:
1. Fetch all user records on mount (filtered by `user_id`, excluding soft-deleted rows via `.is('deleted_at', null)`)
2. After each mutation, update local state optimistically rather than re-fetching
3. Expose a `refreshX()` escape hatch for forced re-sync

### Database ↔ TypeScript mapping

Supabase columns are `snake_case`; app types in `types.ts` use `camelCase`.
Every context has a local `mapToX(row)` function that converts DB rows to typed objects on the way in. When writing back to Supabase, build a `dbUpdates` object manually (see `updateNote` in `NoteContext` for the pattern).

### Cross-context communication

`src/lib/trashEvents.ts` is a lightweight pub/sub bus used to avoid prop-drilling between unrelated contexts:
- `trashEvents.emit()` — called after a soft delete; `TrashContext` listens to refresh the trash list
- `trashEvents.emitRestore(table)` — called after restore; each data context listens to re-fetch its own data
- `trashEvents.emitTransactionCreated()` — called by `AccountContext` after a balance-adjustment transaction so `TransactionContext` can refresh

### Routing & route guards

Three route guard components in `App.tsx`:
- `ProtectedRoute` — requires valid session + profile loaded + PIN configured + `sessionStorage.pinUnlocked`
- `PublicRoute` — redirects authenticated users to `/`
- `PINRoute` — requires session but not PIN unlock (used for `/pin-setup` and `/pin-lock`)

CRUD pages follow the pattern `/resource/new` (create) and `/resource/:id` (edit), both rendering the same `*Detail` component.

### Authentication & PIN security

- Supabase Auth manages sessions; the `users` table stores the extended profile.
- Registration uses the `create_user_profile` RPC (not a direct insert) to sidestep RLS during the sign-up flow.
- PIN is SHA-256 hashed client-side before being stored in `users.pin_hash`. Max 5 attempts; 30-second lockout tracked in DB columns `pin_attempts` / `pin_locked_until`.
- `pinUnlocked` is kept in `sessionStorage` so it is automatically cleared when the browser tab closes.
- Auth error messages are intentionally obscured by `handleSupabaseError()` in `src/lib/supabase.ts` — do not surface raw Supabase error strings to users.

### Theming

Dark mode is toggled by adding/removing the `.dark` class on `<html>`.
CSS custom properties for both palettes live in `src/styles/theme.css`.
`ThemeContext` supports `'light' | 'dark' | 'system'` and persists the choice to `localStorage`.

### File uploads

Handled via `uploadFile()` / `deleteFile()` helpers in `src/lib/supabase.ts`.
Allowed types: JPEG, PNG, GIF, WebP, PDF. Max size: 10 MB.
Filenames are always replaced with `{timestamp}-{random}.{ext}` before upload.

### Path alias

`@` resolves to `src/` (configured in `vite.config.ts`). Use it for all non-relative imports.

## Rules

- Setiap perubahan kode harus konfirmasi ke saya terlebih dahulu sebelum dieksekusi
- Setiap commit harus konfirmasi ke saya terlebih dahulu
- Jika ada pertanyaan terkait UI/UX, jawab dari perspektif sebagai user/pengguna