// In-memory cache for NUTS region names (id → name)
// Fetched once from GeoJSON and reused for all metadata calls

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

let regionNameMap: Map<string, string> | null = null
let fetchPromise: Promise<Map<string, string>> | null = null

async function loadRegionNames(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch(
      `https://${ADO_DATA_URL}/json/nuts/SPEI-3-latest.geojson`,
      { next: { revalidate: 86400 } }
    )
    if (res.ok) {
      const data = await res.json()
      for (const f of data.features) {
        const id = f.properties?.NUTS_ID
        const name = f.properties?.NUTS_NAME
        if (id && name) map.set(id, name)
      }
    }
  } catch {
    // Return empty map on failure
  }
  return map
}

export async function getRegionName(regionId: string): Promise<string> {
  if (!regionNameMap) {
    if (!fetchPromise) {
      fetchPromise = loadRegionNames()
    }
    regionNameMap = await fetchPromise
  }
  return regionNameMap.get(regionId) || regionId
}
