# تدبر · Tadabur

A Quranic tadabur (تدبر) workspace. Decompose any surah into thematic **محاور** (axes),
distribute its ayat across them as a flexible tree, and record your reflections — all
saved locally in your browser.

Statically generated: every one of the 114 surahs is prerendered to its own real HTML
route with the full ayah text, per-route `<title>`, meta description, and canonical URL.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **vite-react-ssg** — static generation of all 114 surah routes
- Plain CSS (CSS variables), RTL, Arabic UI throughout
- No backend — persistence is `localStorage`, keyed per surah

## Data

The Uthmani mushaf is fetched **once at build time** from
[alquran.cloud](https://alquran.cloud) by `scripts/fetch-quran.ts` and written to
`src/data/` (committed). The app builds and runs with **no network access** — the API is
a build-time dependency only. Totals are verified: 114 surahs, 6236 ayat.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # prebuild fetches data if missing, then prerenders 114 pages
npm run preview
```

## Routes

| Path              | Page                                    |
| ----------------- | --------------------------------------- |
| `/`               | Home                                    |
| `/surahs`         | Index grid of all 114 surahs            |
| `/surah/:number`  | The tadabur workspace (1–114)           |
| `/guide`          | The tadabur methodology                 |
