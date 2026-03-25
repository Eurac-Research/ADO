#!/bin/bash

set -euo pipefail

echo "=== ADO Targeted Caching Verification ==="

failures=0

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1"
  failures=$((failures + 1))
}

echo ""
echo "=== RegionDetail same-origin checks ==="
if rg -n "/api/nuts/metadata/|/api/nuts/latest/|/api/nuts/timeseries/" components/RegionDetail.tsx >/dev/null; then
  pass "RegionDetail uses same-origin /api/nuts/* endpoints"
else
  fail "RegionDetail is missing expected /api/nuts/* calls"
fi

if rg -n "raw.githubusercontent.com/Eurac-Research/ado-data|https://\\$\\{ADO_DATA_URL\\}" components/RegionDetail.tsx >/dev/null; then
  fail "RegionDetail still contains direct raw.githubusercontent.com calls"
else
  pass "RegionDetail does not call raw.githubusercontent.com directly"
fi

echo ""
echo "=== Hydro client same-origin checks ==="
if rg -n "/api/timeseries/|/api/html-report/" 'app/hydro/[slug]/hydro-client.tsx' >/dev/null; then
  pass "Hydro client uses same-origin station API routes"
else
  fail "Hydro client is missing expected /api/timeseries or /api/html-report calls"
fi

if rg -n "raw.githubusercontent.com/Eurac-Research/ado-data|https://\\$\\{ADO_DATA_URL\\}" 'app/hydro/[slug]/hydro-client.tsx' >/dev/null; then
  fail "Hydro client still contains direct raw.githubusercontent.com calls"
else
  pass "Hydro client does not call raw.githubusercontent.com directly"
fi

echo ""
echo "=== Cache utility checks ==="
if rg -n "defaultCacheOptions" lib/data-fetcher.ts >/dev/null; then
  pass "defaultCacheOptions is defined in lib/data-fetcher.ts"
else
  fail "defaultCacheOptions was not found in lib/data-fetcher.ts"
fi

if rg -n "defaultCacheOptions" app/api >/dev/null; then
  pass "At least one API route consumes defaultCacheOptions"
else
  fail "No API route appears to use defaultCacheOptions"
fi

echo ""
echo "=== API cache-header checks ==="
if rg -n "Cache-Control" app/api >/dev/null; then
  pass "API routes set Cache-Control headers"
else
  fail "No Cache-Control headers found in app/api routes"
fi

if rg -n "CACHE_CONTROL.NO_STORE" app/api >/dev/null; then
  pass "API routes mark error responses with no-store"
else
  fail "API routes are missing no-store headers for errors"
fi

echo ""
echo "=== Optional build manifest context ==="
if [ -f .next/prerender-manifest.json ]; then
  echo "INFO: .next/prerender-manifest.json present"
  rg -n '"/drought-monitor"|"/impact-probabilities"|"/regions"|"/vulnerabilities"' .next/prerender-manifest.json || true
else
  echo "INFO: .next/prerender-manifest.json not found (run pnpm build for route output checks)"
fi

echo ""
if [ "$failures" -gt 0 ]; then
  echo "Verification completed with $failures failure(s)."
  exit 1
fi

echo "Verification completed successfully."
