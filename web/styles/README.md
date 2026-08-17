# Clutch UI System — Phase 2 baseline

This directory is the only destination for new global visual work after Phase 2.

## Architecture

- `tokens.css` — palette, spacing, radii, shadows, typography aliases, motion timings.
- `base.css` — global type, accessibility, selection, reduced motion.
- `components.css` — shared surfaces, buttons, chips, progress, tabs, forms.
- `layout.css` — app shell, contextual header, desktop rail, mobile shell.
- `pages/` — page-owned composition only (`hub.css`, `matches.css`, `social.css`, `profile.css`, `profile-signature.css`, `composition.css`).

## Rules

1. Do not create `v5`, `fix`, `polish`, `final`, or page-specific token files.
2. A visual primitive used by two screens belongs in `components.css` and `js/components-v4.js`.
3. A page file may compose components but must not redefine global currency/economy semantics.
4. Frags are competitive rating only. Volts are cosmetic spend only.
5. UI typography is the default. `--font-display` is reserved for exceptional headings and ceremonies.
6. Motion budget: `--motion-micro` (~180 ms), `--motion-transition` (~360 ms), `--motion-ceremony` (~1.8 s; exceptional product moments may extend to 4 s).
7. `prefers-reduced-motion` must always retain a usable static state.
8. Each screen must have one dominant object. Supporting information should not compete with it above the fold.
9. Context header policy: Hub = level + streak; Matchs = seasonal Frags; Social = faction/rank; Vault = Volts only; Moi = identity/progression.
10. Legacy CSS may remain only while a non-migrated screen still depends on it. Remove the reference as soon as ownership moves here.
