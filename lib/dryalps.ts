import { fetchNutsGeoJSON } from '@/lib/data-fetcher'
import { fetchMockDryAlpsDataset } from '@/lib/dryalps-mock'
import type {
  DryAlpsDataset,
  DryAlpsImpact,
  DryAlpsLocation,
  DryAlpsNewsItem,
  NutsFeature,
  NutsGeoJSON,
} from '@/types'

export type DryAlpsDataMode = 'api' | 'mock'

const DRYALPS_BASE_URL = 'https://sdi.eurac.edu/dryalps'

const dryAlpsFetchOptions: RequestInit = {
  next: { revalidate: 24 * 60 * 60 },
  cache: 'force-cache',
}

interface DryAlpsLocationRecord {
  id: number
  name: string
  nuts_1: string[] | null
  nuts_2: string[] | null
  nuts_3: string[] | null
  natural_location: string | null
}

interface DryAlpsImpactLocationRecord {
  ipid: number
  lid: number
}

interface DryAlpsImpactProfileRecord {
  id: number
  fk_nid: number
  impacted_sector: string
  poc: string
  toc: string | null
  start_date: string | null
  end_date: string | null
  time_res: string | null
  is_specific: boolean
  counter_measures: string[] | null
}

interface DryAlpsNewsItemRecord {
  id: number
  title: string
  url: string
  published: string | null
  content: string | null
}

async function fetchDryAlpsResource<T>(
  resource: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(resource, `${DRYALPS_BASE_URL}/`)

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString(), dryAlpsFetchOptions)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${resource}: ${response.status}`)
  }

  return response.json()
}

function collectCoordinates(value: unknown): [number, number][] {
  if (!Array.isArray(value)) {
    return []
  }

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [[value[0], value[1]]]
  }

  return value.flatMap((item) => collectCoordinates(item))
}

function getFeatureCenter(feature: NutsFeature): [number, number] | null {
  const coordinates = collectCoordinates(feature.geometry.coordinates)

  if (!coordinates.length) {
    return null
  }

  let minLng = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })

  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
}

function buildCentroidIndex(...geoJsonCollections: NutsGeoJSON[]) {
  const index = new Map<string, [number, number]>()

  geoJsonCollections.forEach((geoJson) => {
    geoJson.features.forEach((feature) => {
      const nutsId = feature.properties?.NUTS_ID
      if (!nutsId || index.has(nutsId)) {
        return
      }

      const center = getFeatureCenter(feature)
      if (center) {
        index.set(nutsId, center)
      }
    })
  })

  return index
}

function averageCoordinates(
  coordinates: Array<[number, number] | null | undefined>
): [number, number] | null {
  const validCoordinates = coordinates.filter(
    (coordinate): coordinate is [number, number] => Boolean(coordinate)
  )

  if (!validCoordinates.length) {
    return null
  }

  const [sumLng, sumLat] = validCoordinates.reduce(
    (accumulator, [lng, lat]) => [accumulator[0] + lng, accumulator[1] + lat],
    [0, 0]
  )

  return [sumLng / validCoordinates.length, sumLat / validCoordinates.length]
}

function buildExcerpt(content: string | null, maxLength = 420) {
  if (!content) {
    return null
  }

  const normalizedContent = content.replace(/\s+/g, ' ').trim()

  if (!normalizedContent) {
    return null
  }

  if (normalizedContent.length <= maxLength) {
    return normalizedContent
  }

  return `${normalizedContent.slice(0, maxLength).trimEnd()}...`
}

function getDisplayDate(
  impact: DryAlpsImpactProfileRecord,
  newsItem: DryAlpsNewsItemRecord | undefined
) {
  return impact.start_date || impact.end_date || newsItem?.published || null
}

export function resolveDryAlpsDataMode(
  value = process.env.DRYALPS_DATA_MODE
): DryAlpsDataMode {
  return value === 'mock' ? 'mock' : 'api'
}

export async function fetchDryAlpsDataset(): Promise<DryAlpsDataset> {
  const [
    impactProfiles,
    impactLocationLinks,
    locations,
    newsItems,
    nuts2GeoJson,
    nuts3GeoJson,
  ] = await Promise.all([
    fetchDryAlpsResource<DryAlpsImpactProfileRecord[]>('impact_profile', {
      select:
        'id,fk_nid,impacted_sector,poc,toc,start_date,end_date,time_res,is_specific,counter_measures',
    }),
    fetchDryAlpsResource<DryAlpsImpactLocationRecord[]>('impact_locations', {
      select: 'ipid,lid',
    }),
    fetchDryAlpsResource<DryAlpsLocationRecord[]>('location', {
      select: 'id,name,nuts_1,nuts_2,nuts_3,natural_location',
    }),
    fetchDryAlpsResource<DryAlpsNewsItemRecord[]>('news_item', {
      select: 'id,title,url,published,content',
    }),
    fetchNutsGeoJSON('nuts2', dryAlpsFetchOptions),
    fetchNutsGeoJSON('nuts3', dryAlpsFetchOptions),
  ])

  const centroidIndex = buildCentroidIndex(nuts2GeoJson, nuts3GeoJson)

  const newsById = new Map(newsItems.map((newsItem) => [newsItem.id, newsItem]))

  const locationById = new Map<number, DryAlpsLocation>(
    locations.map((location) => {
      const mappedNutsIds = Array.from(
        new Set((location.nuts_3 || []).filter(Boolean))
      )

      const mappedCoordinates = [
        ...mappedNutsIds.map((nutsCode) => centroidIndex.get(nutsCode)),
        ...(location.nuts_2 || []).map((nutsCode) => centroidIndex.get(nutsCode)),
      ]

      const normalizedLocation: DryAlpsLocation = {
        id: location.id,
        name: location.name,
        naturalLocation: location.natural_location,
        nuts1: location.nuts_1 || [],
        nuts2: location.nuts_2 || [],
        nuts3: location.nuts_3 || [],
        mappedNutsIds,
        coordinate: averageCoordinates(mappedCoordinates),
      }

      return [location.id, normalizedLocation]
    })
  )

  const locationIdsByImpactId = new Map<number, number[]>()

  impactLocationLinks.forEach(({ ipid, lid }) => {
    const existingLocationIds = locationIdsByImpactId.get(ipid) || []
    existingLocationIds.push(lid)
    locationIdsByImpactId.set(ipid, existingLocationIds)
  })

  const impacts: DryAlpsImpact[] = impactProfiles
    .map((impact) => {
      const newsItem = newsById.get(impact.fk_nid)

      const relatedLocations = (locationIdsByImpactId.get(impact.id) || [])
        .map((locationId) => locationById.get(locationId))
        .filter((location): location is DryAlpsLocation => Boolean(location))

      const normalizedNewsItems: DryAlpsNewsItem[] = newsItem
        ? [
          {
            id: newsItem.id,
            title: newsItem.title,
            url: newsItem.url,
            published: newsItem.published,
            excerpt: buildExcerpt(newsItem.content),
          },
        ]
        : []

      const mappedNutsIds = Array.from(
        new Set(
          relatedLocations.flatMap((location) => location.mappedNutsIds)
        )
      )

      const displayDate = getDisplayDate(impact, newsItem)
      const searchableText = [
        impact.impacted_sector,
        impact.poc,
        impact.toc,
        ...((impact.counter_measures || []).filter(Boolean)),
        ...relatedLocations.flatMap((location) => [
          location.name,
          location.naturalLocation,
          ...location.nuts2,
          ...location.nuts3,
        ]),
        ...normalizedNewsItems.flatMap((item) => [
          item.title,
          item.excerpt,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return {
        id: impact.id,
        impactedSector: impact.impacted_sector,
        periodOfOccurrence: impact.poc,
        timeOfOccurrence: impact.toc,
        startDate: impact.start_date,
        endDate: impact.end_date,
        timeResolution: impact.time_res,
        isSpecific: impact.is_specific,
        counterMeasures: impact.counter_measures || [],
        coordinate: averageCoordinates(
          relatedLocations.map((location) => location.coordinate)
        ),
        mappedNutsIds,
        locations: relatedLocations,
        newsItems: normalizedNewsItems,
        speiContext: undefined,
        displayDate,
        searchableText,
      }
    })
    .sort((firstImpact, secondImpact) => {
      const firstTimestamp = firstImpact.displayDate
        ? Date.parse(firstImpact.displayDate)
        : 0
      const secondTimestamp = secondImpact.displayDate
        ? Date.parse(secondImpact.displayDate)
        : 0

      return secondTimestamp - firstTimestamp || secondImpact.id - firstImpact.id
    })

  return {
    impacts,
    nutsMap: nuts3GeoJson,
    nuts2Map: nuts2GeoJson,
  }
}

export async function fetchDryAlpsDatasetByMode(
  mode: DryAlpsDataMode = resolveDryAlpsDataMode()
): Promise<DryAlpsDataset> {
  if (mode === 'mock') {
    return fetchMockDryAlpsDataset()
  }

  return fetchDryAlpsDataset()
}
