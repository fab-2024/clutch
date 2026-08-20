# Clutch repository rules

- `mobile/` is the primary Clutch application. Product work targets Hub,
  Matchs, Social, Room and Moi.
- `mobile-foundation` remains the reference branch until the migration is
  merged and verified. Do not use `main` as the mobile base unless explicitly
  requested.
- Files under `mobile/app/` are Expo Router entries. Keep screen logic inside
  `mobile/src/features/`; route files should normally only re-export a screen.
- Only feature `api.ts` modules may import the Supabase client. Screens,
  components and hooks must not query Supabase directly.
- Keep Social split by domain: `missions`, `leagues`, `faction`, `friends` and
  `duels`. Do not recreate a monolithic Social service.
- `web/` is the legacy application and a reference only. Do not add mobile
  logic there or copy web code without checking the native implementation.
- The Clutch Room is paused. Preserve its placeholder unless the user asks to
  resume that product area.
- The current mobile UI direction is approved. Structural work must preserve
  appearance and interaction unless a redesign is explicitly requested.
- Database changes belong in `supabase/migrations/` and must keep RLS, Data API
  grants and RPC privileges explicit.
- Before handing off mobile changes, run `npm run mobile:architecture` and
  `npm run mobile:typecheck` from the repository root.
