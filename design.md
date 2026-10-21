# CinéStream

French-language cinema streaming site. Public discovery and custom MP4 player; private owner administration.
Palette: near-black #0b0b0e, charcoal #17171c, warm white #f7f5f2, red #ec3344. Subtle gray borders, no purple.
Typography: Poppins body, condensed bold display titles using Arial Narrow fallback. Hero editorial type, generous spacing.
Layout: full-bleed cinematic desert hero, left aligned title, bottom fade into a horizontal portrait collection. Maximum content width 1440px with 6% margins. Small square corners, thin dividers.
Navigation: compact wordmark with red play mark; catalogue, favorites; search and administration to right.
Cards: photographic covers, custom typographic movie title, hover play overlay. Empty catalogue uses clearly labeled preview artwork, never fictional playable movies.
Responsive: stacked hero and 2-column posters on mobile. Admin focused forms, drag-drop MP4, import progress, protected access.
Player: dark modal, accessible custom controls, keyboard Space/arrows/F, fullscreen, seek, volume, playback speed, loading and error states.
Auth: Google and email/password, existing owner account only; admin email allowlist enforced server-side. Public users need no login.
Top 5: editorial ranked strip between hero and catalogue, bold oversized numerals, poster artwork and direct play action. Admin has a separate dark control panel for automatic view-based ranking or an ordered manual selection; mobile cards scroll horizontally. Views count on actual playback, deduplicated per browser and film per day.
Series: preserve the same black/red cinematic identity. Public /series catalog with search and portrait posters; /series/:id has artwork, synopsis, season selector and numbered episode list. Admin tabs Films/Séries separate the existing movie workflow from series metadata, season management and MP4 episode uploads. Clear empty states, progress/error feedback, responsive single-column forms. Shared player keeps resume and simple save-menu deterrents.
# <App Name> — Design

> Starter design brief. Replace this content with the app you're building before writing any UI.
> Keep it short and concrete — it's the single source of truth for palette, typography, pages,
> screens, and flows across web, mobile, and desktop.

One-line description of the app, the platforms it ships on, the visual direction (style, feel), and the core job it does for the user.

## Brand & Colors

One token set, consumed per platform:

- **Web & desktop**: CSS variables in `packages/web/src/web/styles.css` (desktop loads the web UI).
- **Mobile**: `Colors.light` / `Colors.dark` in `packages/mobile/constants/theme.ts`, read via `useColors()`; `userInterfaceStyle: "automatic"` follows the system light/dark setting.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| primary | #1F1F1F | #E5E5E5 | Buttons, active tab, accents |
| background | #FFFFFF | #0A0A0A | Page/screen background |
| card | #FFFFFF | #1A1A1A | Cards, surfaces |
| foreground | #171717 | #FAFAFA | Primary text |
| mutedForeground | #737373 | #A3A3A3 | Secondary text |
| border | #E5E5E5 | #262626 | Hairlines |
| destructive | #DC2626 | #EF4444 | Delete / errors |

## Typography

Name the display + body pairing here. Web: set font families in `styles.css` (self-hosted files go in `packages/web/public/fonts/`). Mobile: system font by default; load custom fonts with `useFonts` from `expo-font` and reference them via `Fonts` in `constants/theme.ts`.

## Pages & Screens

List each page/screen, its route file, and what it shows. Example:

- **Web — Home** (`packages/web/src/web/pages/index.tsx`) — what the user sees first.
- **Mobile — Home** (`packages/mobile/app/(tabs)/index.tsx`) — main tab.
- Add web pages under `src/web/pages/` (+ route in `app.tsx`); mobile tabs under `app/(tabs)/`, stack/modal screens under `app/`.

## Key User Flows

1. Describe the primary flow end to end (open → action → result).
2. ...

## Architecture

- **API**: typed oRPC client (`lib/api.ts` in each package) → the backend in `@template/web`. Query/mutation hooks live in `queries/` (one file per feature); pages/screens call them with `@tanstack/react-query`.
- **State/sync**: TanStack Query with optimistic updates for instant-feel interactions.
- **Auth / payments / uploads**: see `skills/app/references/` when those features are needed.
