# Caching & Data Strategy

## Overview

The Alpine Drought Observatory (ADO) uses a **fully static, deploy-hook-driven** architecture on Next.js 16. All pages are pre-rendered at build time and all external data is fetched during the build. There is no runtime revalidation — data freshness is tied entirely to rebuilds triggered by the upstream data repository.

## Architecture

```
ado-data repo (GitHub)
  │
  │  push to main
  ▼
GitHub Action (main.yml)
  ├─ Copies markdown content
  ├─ Extracts & minifies GeoJSON features
  └─ POST → Vercel deploy hook
          │
          ▼
      Vercel Build
  ├─ Fetches all data from ado-data (GitHub raw)
  ├─ Pre-renders all static pages
  └─ Deploys to edge CDN
```

All data flows through a single pipeline: **data commit → GitHub Action → Vercel rebuild**. No data is fetched at runtime on the server.

## Cache Configuration

### Unified Cache Options (`lib/data-fetcher.ts`)

All server-side fetches use a single cache configuration:

```tsx
export const defaultCacheOptions: RequestInit = {
  next: { revalidate: false },
  cache: 'force-cache',
}
```

- `revalidate: false` — never revalidate; cached until the next build
- `cache: 'force-cache'` — always use the cache if available

Every fetch function in `data-fetcher.ts` defaults to `defaultCacheOptions`. There is no per-function or per-route revalidation — all data is treated as build-time static.

### Route Configuration

All content pages use `force-static` to guarantee static generation:

| Route | Config | Data Source |
|---|---|---|
| `/` | `force-static` | SPEI-1 GeoJSON + metadata |
| `/[slug]` | `generateStaticParams` | Drought index GeoJSON |
| `/hydro/[slug]` | `generateStaticParams` | Hydro station GeoJSON |
| `/drought-monitor` | `force-dynamic` | Client-side index switching |
| `/impacts` | `force-static` | EDIIALPS + NUTS2 GeoJSON |
| `/impacts-nuts3` | `force-static` | EDIIALPS + NUTS3 GeoJSON |
| `/impact-probabilities` | `force-static` | Impact probs + NUTS3 GeoJSON |
| `/regions` | `force-static` | SPEI-3 regional GeoJSON |
| `/vulnerabilities` | `force-static` | 6 vulnerability datasets + NUTS2 GeoJSON |
| `/region/[regionId]` | dynamic | Station data per region |
| `/md/[slug]` | `generateStaticParams` | Local markdown files |

### Dynamic Routes

`/drought-monitor` is `force-dynamic` because users switch between drought indices at runtime. The initial SPEI-1 data is passed as a server prop; subsequent indices are fetched client-side and cached in React state (`Map<string, CachedData>`) for instant switching.

`/region/[regionId]` and `/region/[regionId]/[index]` are server-rendered on demand since region/index combinations are too numerous to pre-render.

## Data Fetching Patterns

### Server-Side (Build Time)

All heavy data fetching happens in server components at build time:

```tsx
// app/impacts/page.tsx
export const dynamic = 'force-static'

export default async function ImpactsPage() {
  const [impactData, nutsMap] = await Promise.all([
    fetchImpactDataUtil(),
    fetchNutsGeoJSON('nuts2'),
  ])

  return <ImpactsClient impactData={impactData} nutsMap={nutsMap} ... />
}
```

GeoJSON data (NUTS2, NUTS3) is fetched server-side and passed as props to client components. This avoids client-side waterfall fetches and ensures all data is included in the static HTML payload.

### Client-Side (Runtime)

Client-side fetches are limited to:

- **Drought monitor index switching** — fetching alternative indices when the user selects them
- **Timeseries data** — per-station chart data loaded on demand via API routes
- **HTML reports** — per-station reports loaded on demand via API routes

### API Routes

Two API routes serve as proxies for station-specific data:

- `/api/timeseries/[stationId]` — proxies timeseries JSON from ado-data
- `/api/html-report/[stationId]` — proxies HTML reports from ado-data

These are dynamic (`ƒ`) routes since station IDs are selected at runtime.

## Cache Layers

| Layer | Scope | TTL | Purpose |
|---|---|---|---|
| Vercel Build Cache | All static pages + data | Until next deploy | Serves pre-rendered pages from edge CDN |
| Next.js Data Cache | `fetch()` responses during build | Until next deploy | Deduplicates identical fetches across pages |
| Browser HTTP Cache | Client-side fetches | Browser-controlled | Reduces repeat requests for index data |
| React State Cache | Drought indices in memory | Until page refresh | Instant switching between loaded indices |

## Cache Invalidation

Cache invalidation is **deployment-based only**:

1. New data is pushed to `ado-data` repo
2. GitHub Action triggers Vercel deploy hook
3. Vercel runs a full rebuild, fetching fresh data
4. New static pages replace old ones at the edge

There is no time-based revalidation. This means data is always consistent within a deployment and there are no stale-while-revalidate edge cases.

## Verification

Run `scripts/verify-caching.sh` to check:

- Routes missing `force-static`
- Fetch calls missing cache options
- Dynamic routes missing `generateStaticParams`
- Client components with direct fetch calls

## Build Output

```
Route (app)
┌ ○ /                          Static
├ ● /[slug]                    SSG (generateStaticParams)
├ ƒ /api/html-report/[id]     Dynamic
├ ƒ /api/timeseries/[id]      Dynamic
├ ƒ /drought-monitor           Dynamic
├ ● /hydro/[slug]              SSG (generateStaticParams)
├ ○ /impact-probabilities      Static
├ ○ /impacts                   Static
├ ○ /impacts-nuts3             Static
├ ● /md/[slug]                 SSG (generateStaticParams)
├ ƒ /region/[regionId]         Dynamic
├ ƒ /region/[regionId]/[index] Dynamic
├ ○ /regions                   Static
├ ○ /vulnerabilities           Static
└ ○ /sitemap.xml               Static
```

`○` = fully static, `●` = static with params, `ƒ` = server-rendered on demand
