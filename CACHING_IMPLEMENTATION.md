# Caching & Data Strategy

## Overview

ADO uses a **hybrid static + runtime API** setup on Next.js 16:

- Most pages are pre-rendered at build time.
- Data freshness is primarily deployment-driven (`ado-data` update -> workflow -> Vercel rebuild).
- Some runtime API routes are intentionally dynamic (`/api/*`, region/station detail interactions).

This project currently uses the **previous caching model** (`fetch` cache options / route config). `cacheComponents` is not enabled in `next.config.js`.

## Data Flow

```txt
ado-data repo (GitHub)
  -> push to main
  -> GitHub Action (extract/minify/copy markdown)
  -> POST to Vercel deploy hook
  -> ADO build on Vercel
  -> static artifacts + server code deployed
```

## Cache Configuration

### Shared server fetch defaults (`lib/data-fetcher.ts`)

```ts
export const defaultCacheOptions: RequestInit = {
  next: { revalidate: false },
  cache: 'force-cache',
}
```

Interpretation:

- `revalidate: false`: cache entries are indefinite unless evicted/redeployed.
- `cache: 'force-cache'`: server fetches prefer the Next Data Cache.

### API response cache profiles (`lib/http-cache.ts`)

API routes now set explicit `Cache-Control` headers by data volatility:

- `LOW_CHURN`: metadata-like responses (`s-maxage=7d`)
- `DAILY_CHURN`: daily-updated map layers (`s-maxage=24h`)
- `INTERACTIVE`: region/station detail payloads (`s-maxage=24h`)
- `NO_STORE`: all error responses (404/500) to avoid stale-error caching

### Important: cache unification is partial

Many server-side fetches go through `lib/data-fetcher.ts`, but not all fetches in the repository do. Some pages and utilities still call `fetch` directly with route-specific options.

## Route Behavior (Current)

| Route | Current behavior |
|---|---|
| `/` | `force-static`, build-time data fetch |
| `/[slug]` | static params + redirect behavior |
| `/hydro/[slug]` | static params + build-time fetch for base hydro data |
| `/impacts`, `/impacts-nuts3`, `/impact-probabilities`, `/regions`, `/vulnerabilities` | static build output |
| `/md/[slug]` | static params from local markdown |
| `/drought-monitor` | request-time redirect based on `searchParams` |
| `/region/[regionId]`, `/region/[regionId]/[index]` | runtime-rendered routes with client-side interactive fetches |
| `/api/*` routes | runtime handlers used as same-origin data proxies |

## Same-Origin API Layer

Region and hydro clients are routed through same-origin APIs:

- `/api/timeseries/[stationId]`
- `/api/html-report/[stationId]`
- `/api/nuts/metadata/[datatype]`
- `/api/nuts/latest/[datatype]`
- `/api/nuts/timeseries/[regionId]`

Cache profile mapping:

- `/api/nuts/metadata/[datatype]` -> `LOW_CHURN`
- `/api/nuts/latest/[datatype]` -> `DAILY_CHURN`
- `/api/nuts/timeseries/[regionId]` -> `INTERACTIVE`
- `/api/timeseries/[stationId]` -> `INTERACTIVE`
- `/api/html-report/[stationId]` -> `INTERACTIVE`

This removes direct browser calls to `raw.githubusercontent.com` in:

- `components/RegionDetail.tsx`
- `app/hydro/[slug]/hydro-client.tsx`

## Runtime Client Fetches

Client-side runtime fetches are still used for interactivity (region detail panels, hydro station overlays, index switching), but they now use same-origin API routes in core map/detail flows.

## Cache Layers

| Layer | Scope | TTL / lifetime | Notes |
|---|---|---|---|
| Static prerender output | Static routes | Until next deploy | Main delivery path for static pages |
| Next Data Cache | Server `fetch()` with cache options | Indefinite (`revalidate: false`) unless evicted/redeployed | Used heavily via `data-fetcher` |
| API route runtime responses | `/api/*` handlers | Handler/fetch-option dependent | Used for interactive detail fetches |
| Browser memory/state | Client components | Until navigation/refresh | e.g. in-memory station cache / React state |

## Invalidation Model

Primary invalidation remains **deployment-based**:

1. Update `ado-data`
2. Workflow triggers Vercel rebuild
3. New deployment ships fresh static output and server code

There is currently no broad time-based revalidation policy across the app.

## Verification

Use `scripts/verify-caching.sh` for targeted checks:

- `RegionDetail` uses `/api/nuts/*` and does not call raw GitHub directly.
- Hydro client uses `/api/timeseries/*` and `/api/html-report/*`.
- `defaultCacheOptions` exists and is consumed by API/server code.
- Optional build-manifest context if `.next/prerender-manifest.json` is present.
