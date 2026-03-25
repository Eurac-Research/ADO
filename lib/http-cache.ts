export const CACHE_CONTROL = {
  LOW_CHURN:
    'public, max-age=3600, s-maxage=604800, stale-while-revalidate=604800',
  DAILY_CHURN:
    'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  INTERACTIVE:
    'public, max-age=60, s-maxage=86400, stale-while-revalidate=86400',
  NO_STORE: 'no-store',
} as const
