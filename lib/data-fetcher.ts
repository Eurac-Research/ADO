/**
 * Centralized data fetching utility for server-side operations
 * Provides consistent caching behavior across all data fetches
 */

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

// Default cache configuration for static data that shouldn't change until next build
export const defaultCacheOptions: RequestInit = {
  next: { revalidate: false },
  cache: 'force-cache'
}

// Cache configuration for data that should be revalidated monthly (30 days)
// Useful for semi-static data that changes infrequently but should eventually update
export const monthlyRevalidationOptions: RequestInit = {
  next: { revalidate: 30 * 24 * 60 * 60 }, // 30 days in seconds
  cache: 'force-cache'
}

/**
 * Example usage of different cache options:
 * 
 * 1. Default (static until next build):
 *    fetchDroughtIndexData('spi3')
 * 
 * 2. Monthly revalidation:
 *    fetchDroughtIndexData('spi3', monthlyRevalidationOptions)
 * 
 * 3. Custom revalidation:
 *    fetchDroughtIndexData('spi3', { 
 *      next: { revalidate: 60 * 60 }, // 1 hour in seconds
 *      cache: 'force-cache' 
 *    })
 */

/**
 * Fetch drought index data (GeoJSON)
 */
export async function fetchDroughtIndexData(
  datatype: string,
  options: RequestInit = defaultCacheOptions
) {
  const response = await fetch(
    `https://${ADO_DATA_URL}/json/nuts/${datatype.toUpperCase()}-latest.geojson`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch drought index data for ${datatype}: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch drought index metadata
 */
export async function fetchDroughtIndexMetadata(
  datatype: string,
  options: RequestInit = defaultCacheOptions
) {
  const response = await fetch(
    `https://${ADO_DATA_URL}/json/nuts/metadata/${datatype.toUpperCase()}.json`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch drought index metadata for ${datatype}: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch hydro data (GeoJSON)
 */
export async function fetchHydroData(
  datatype: string,
  options: RequestInit = defaultCacheOptions
) {
  const response = await fetch(
    `https://${ADO_DATA_URL}/json/hydro/${datatype.toUpperCase()}-latest.geojson`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch hydro data for ${datatype}: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch hydro metadata
 */
export async function fetchHydroMetadata(
  datatype: string,
  options: RequestInit = defaultCacheOptions
) {
  const response = await fetch(
    `https://${ADO_DATA_URL}/json/hydro/metadata/${datatype.toUpperCase()}.json`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch hydro metadata for ${datatype}: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch gauging stations data
 */
export async function fetchGaugingStations(
  options: RequestInit = monthlyRevalidationOptions
) {
  const response = await fetch(
    `https://${ADO_DATA_URL}/json/hydro/gauging_stations.geojson`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch gauging stations: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch impact data (EDIIALPS)
 */
export async function fetchImpactData(
  options: RequestInit = monthlyRevalidationOptions
) {
  const response = await fetch(
    'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/EDIIALPS_V1.0-minified.json',
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch impact data: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch impact probabilities data
 */
export async function fetchImpactProbabilities(
  options: RequestInit = monthlyRevalidationOptions
) {
  const [dsmResponse, dhResponse] = await Promise.all([
    fetch('https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/dsm-probs.json', options),
    fetch('https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/dh-probs.json', options)
  ])

  if (!dsmResponse.ok || !dhResponse.ok) {
    throw new Error('Failed to fetch impact probabilities data')
  }

  const [dsmData, dhData] = await Promise.all([
    dsmResponse.json(),
    dhResponse.json()
  ])

  // Combine the data as in the original implementation
  return dsmData.concat(dhData)
}

/**
 * Fetch vulnerability dataset
 */
export async function fetchVulnerabilityDataset(
  dataset: string,
  options: RequestInit = monthlyRevalidationOptions
) {
  const response = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/${dataset}.json`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch vulnerability dataset ${dataset}: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch NUTS2 or NUTS3 GeoJSON
 */
export async function fetchNutsGeoJSON(
  level: 'nuts2' | 'nuts3' = 'nuts2',
  options: RequestInit = monthlyRevalidationOptions
) {
  const response = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/${level}_simple_4326.geojson`,
    options
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch ${level} GeoJSON: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch all vulnerability data in parallel
 */
export async function fetchAllVulnerabilityData(
  options: RequestInit = monthlyRevalidationOptions
) {
  const datasets = [
    'farm_input_intensity',
    'farm_size',
    'livestock_density',
    'share_permanent_grassland',
    'share_utilised_agric_area',
    'intensity_farming'
  ]

  const [vulnerabilityResponses, nutsMapResponse] = await Promise.all([
    Promise.all(datasets.map(dataset => fetchVulnerabilityDataset(dataset, options))),
    fetchNutsGeoJSON('nuts2', options)
  ])

  const vulnerabilityData = {
    farm_input_intensity: vulnerabilityResponses[0],
    farm_size: vulnerabilityResponses[1],
    livestock_density: vulnerabilityResponses[2],
    share_permanent_grassland: vulnerabilityResponses[3],
    share_utilised_agric_area: vulnerabilityResponses[4],
    intensity_farming: vulnerabilityResponses[5]
  }

  return {
    data: vulnerabilityData,
    nutsMap: nutsMapResponse
  }
}

/**
 * Fetch timeseries data for hydro stations (for API routes)
 */
export async function fetchStationTimeseries(
  stationId: string,
  options: RequestInit = defaultCacheOptions
) {
  // Try both formats for timeseries data
  const urls = [
    `https://${ADO_DATA_URL}/json/hydro/timeseries/ID_STATION_${stationId}.json`,
    `https://${ADO_DATA_URL}/json/hydro/timeseries/${stationId}.json`
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return response.json()
      }
    } catch (error) {
      // Continue to next URL
    }
  }

  throw new Error(`Timeseries data not found for station ${stationId}`)
}

/**
 * Fetch HTML report for hydro stations (for API routes)
 */
export async function fetchStationHtmlReport(
  stationId: string,
  options: RequestInit = monthlyRevalidationOptions
) {
  // Try both formats for HTML reports
  const urls = [
    `https://${ADO_DATA_URL}/html/report_${stationId}.html`,
    `https://${ADO_DATA_URL}/html/hydro/${stationId}.html`
  ]

  for (const url of urls) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return response.text()
      }
    } catch (error) {
      // Continue to next URL
    }
  }

  throw new Error(`HTML report not found for station ${stationId}`)
}
