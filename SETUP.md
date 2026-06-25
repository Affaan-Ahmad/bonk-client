# BONK Client — Frontend Rebuild (Tailwind v4 + shadcn/ui + Motion)

A complete rebuild of the renderer UI. **The Electron bridge, IPC contract, and
`main.cjs` / `preload.cjs` are untouched** — every `window.bonkClient.*` call,
the 2-second overview poll, the auto-accept guard, the tri-state queue button,
champ select, and rune selection behave exactly as before.

---

## 1. Back up first

```bash
# from your project root
cp src/App.css src/App.css.backup
cp src/App.tsx src/App.tsx.backup
```

## 2. Install dependencies

These are independent of your Vite 8 / TS 6 / React 19 versions.

```bash
# Tailwind v4 + tooling
npm i -D tailwindcss @tailwindcss/vite
npm i tailwindcss-animate class-variance-authority clsx tailwind-merge

# UI + motion + icons (motion is the React 19 successor to framer-motion)
npm i motion lucide-react

# Radix primitives used by the included shadcn/ui components
npm i @radix-ui/react-slot @radix-ui/react-separator @radix-ui/react-switch \
      @radix-ui/react-tooltip @radix-ui/react-dialog @radix-ui/react-tabs \
      @radix-ui/react-scroll-area

# Bundled fonts (offline-safe — no CDN at runtime, works in the packaged app)
npm i @fontsource-variable/space-grotesk @fontsource-variable/inter \
      @fontsource-variable/jetbrains-mono
```

## 3. Copy the files in

Drop the contents of this bundle's `src/` over your `src/`, and the root files
(`vite.config.ts`, `tsconfig.app.json`, `components.json`) into your project root.

- `src/App.css` is **replaced** by `src/globals.css` (imported from `App.tsx` and
  `main.tsx`). You can delete `App.css` once everything renders — the backup is
  your safety net.
- `vite.config.ts` gains the `@tailwindcss/vite` plugin and the `@` → `./src` alias.
- `tsconfig.app.json` gains `baseUrl` + the `@/*` path mapping. **All of your
  original strict options are preserved** (`verbatimModuleSyntax`,
  `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`).
- `index.html` only changes its `<title>` — optional.

## 4. Build

```bash
npm run build   # tsc -b && vite build
npm run desktop # vite + electron
```

Already verified here: `tsc -b` is clean under your strict config, and
`vite build` succeeds (2,106 modules, fonts bundled).

---

## About the shadcn/ui components

The `src/components/ui/` primitives (`button`, `badge`, `input`, `separator`,
`switch`, `tooltip`, `tabs`, `dialog`, `sheet`, `scroll-area`) are **included and
pre-themed** to the dark-green token system, and the whole project is build-tested
as-is — so you don't need the shadcn CLI at all.

If you'd rather regenerate them from the registry, `components.json` is set up so
you can, without running `init`:

```bash
npx shadcn@latest add button badge input separator switch tooltip tabs dialog sheet scroll-area
```

(Regenerating will overwrite the themed versions with stock ones; you'd re-apply
the green accents via the CSS variables in `globals.css`.)

---

## What changed architecturally

The 1,510-line `App.tsx` monolith is refactored into:

- **`src/lib/useLeagueClient.ts`** — one hook that owns *every* `window.bonkClient`
  call, the 2s poll, the boot sequence, auto-accept, queue clock, and all derived
  state (rank, lobby slots, friends, champ-select resolution). The bridge contract
  now lives in exactly one place.
- **`src/lib/league-helpers.ts`** — the pure formatters/logic, ported verbatim.
- **`src/lib/constants.ts`** — nav, roles, card skins, queue options.
- **`src/types/league.ts`** — frontend view-model types. The domain/bridge types
  stay ambient globals in `src/vite-env.d.ts` (unchanged, single source of truth).
- **`src/components/*`** — presentational components, one per feature.

### Behavior notes

- **Champion select**: the separate "Hover" button is gone, per the brief.
  Clicking a champion hovers it (`champSelectAction(id, {completed:false})`);
  **Lock In / Ban** completes it (`{completed:true}`).
- **Card frames** are frontend-only state right now (`selectedCardSkinId`),
  structured so you can later persist them through your Electron config
  (`bonk-client-config.json`) if you want.
- **Asset safety**: champion icons (`bonk-lcu://champion-icons/{id}.png`) and the
  Jax splash (`bonk-lcu://champion-splashes/24/24000.jpg`) only ever appear as
  runtime strings in TS / `<img src>`. The splash reaches CSS via a runtime-injected
  `--scene-splash` variable, so the `bonk-lcu://` literal is **never** in a `.css`
  file. Confirmed: the built CSS contains zero protocol URLs.
- **No Riot API key required** and **no hardcoded League path** — same as before.
