import { fetchNutsGeoJSON } from '@/lib/data-fetcher'
import type {
  DryAlpsDataset,
  DryAlpsImpact,
  DryAlpsLocation,
  DryAlpsNewsItem,
  DryAlpsSpeiContext,
  NutsFeature,
} from '@/types'

const mockFetchOptions: RequestInit = {
  next: { revalidate: 24 * 60 * 60 },
  cache: 'force-cache',
}

const mockSectors = [
  'Agriculture and livestock farming',
  'Energy and industry and transport',
  'Forestry',
  'Freshwater and terrestrial ecosystems',
  'Public water supply',
  'Tourism and recreation',
  'Others',
] as const

const mockMeasures = [
  'Water use restrictions',
  'Emergency irrigation planning',
  'Reservoir management',
  'Awareness campaign',
  'Temporary transport adjustment',
  'Hydropower coordination',
  'Forest access regulation',
  'Drinking water contingency',
]

const mockPeriods = ['past', 'past', 'present', 'future'] as const

const mockYearWeights = [
  { year: 2025, weight: 0.22 },
  { year: 2024, weight: 0.14 },
  { year: 2023, weight: 0.17 },
  { year: 2022, weight: 0.12 },
  { year: 2021, weight: 0.13 },
  { year: 2020, weight: 0.08 },
  { year: 2019, weight: 0.09 },
  { year: 2018, weight: 0.03 },
  { year: 2017, weight: 0.02 },
] as const

const mockSpeiLegend: DryAlpsSpeiContext[] = [
  {
    nuts3Id: '',
    month: '',
    value: -2.1,
    category: 'extremely_dry',
    label: 'Extremely dry',
    color: 'rgba(215,25,28,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: -1.5,
    category: 'very_dry',
    label: 'Very dry',
    color: 'rgba(253,174,97,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: -0.9,
    category: 'moderately_dry',
    label: 'Moderately dry',
    color: 'rgba(255,255,191,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: 0,
    category: 'normal',
    label: 'Normal',
    color: 'rgba(255,255,255,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: 0.9,
    category: 'moderately_wet',
    label: 'Moderately wet',
    color: 'rgba(245,153,246,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: 1.5,
    category: 'very_wet',
    label: 'Very wet',
    color: 'rgba(180,103,221,0.7)',
  },
  {
    nuts3Id: '',
    month: '',
    value: 2.1,
    category: 'extremely_wet',
    label: 'Extremely wet',
    color: 'rgba(69,0,153,0.7)',
  },
]

const italianAlpineNuts3Prefixes = [
  'ITC',
  'ITH1',
  'ITH2',
  'ITH3',
  'ITH4',
]

const sharedMockNews: DryAlpsNewsItem = {
  id: 1,
  title: 'DryAlps monitoring bulletin',
  url: 'https://www.eurac.edu/en/projects/dryalps-it',
  published: '2025-09-15',
  excerpt:
    'Mock source reused for interface stress testing. The purpose is to simulate repeated supporting evidence while evaluating the behavior of the chronology, filters, and map interactions under a denser impact volume.',
}

const mockRegionalHotspots = [
  { center: [7.35, 45.85] as [number, number], radius: 1.25, weight: 10 },
  { center: [10.9, 46.55] as [number, number], radius: 1.1, weight: 14 },
  { center: [12.45, 46.35] as [number, number], radius: 0.95, weight: 9 },
  { center: [9.55, 46.1] as [number, number], radius: 0.9, weight: 6 },
] as const

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

function getRegionalHotspotWeight(location: DryAlpsLocation) {
  if (!location.coordinate) {
    return 1
  }

  const [lng, lat] = location.coordinate

  return mockRegionalHotspots.reduce((currentWeight, hotspot) => {
    const distance = Math.hypot(lng - hotspot.center[0], lat - hotspot.center[1])

    if (distance >= hotspot.radius) {
      return currentWeight
    }

    const influence = 1 - distance / hotspot.radius
    return currentWeight + Math.max(1, Math.round(influence * hotspot.weight))
  }, 1)
}

function findNearbyLocation(
  primaryLocation: DryAlpsLocation,
  locations: DryAlpsLocation[],
  index: number
) {
  const siblingLocations = locations.filter((location) => {
    if (location.id === primaryLocation.id) {
      return false
    }

    return (
      location.nuts2[0] &&
      primaryLocation.nuts2[0] &&
      location.nuts2[0] === primaryLocation.nuts2[0]
    )
  })

  if (siblingLocations.length) {
    return siblingLocations[index % siblingLocations.length]
  }

  const primaryIndex = locations.findIndex(
    (location) => location.id === primaryLocation.id
  )
  const fallbackLocation =
    locations[(primaryIndex + index + 5) % locations.length] || null

  return fallbackLocation?.id === primaryLocation.id ? null : fallbackLocation
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatSeasonLabel(date: Date) {
  const month = date.getUTCMonth()
  const year = date.getUTCFullYear()

  if (month <= 1 || month === 11) {
    return `Winter ${year}`
  }

  if (month <= 4) {
    return `Spring ${year}`
  }

  if (month <= 7) {
    return `Summer ${year}`
  }

  return `Autumn ${year}`
}

function toIsoDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10)
}

function getMockBaseDate(index: number, impactCount: number) {
  const normalizedIndex = index / Math.max(impactCount - 1, 1)
  let cumulativeWeight = 0
  let year = mockYearWeights[mockYearWeights.length - 1].year

  for (const yearWeight of mockYearWeights) {
    cumulativeWeight += yearWeight.weight

    if (normalizedIndex <= cumulativeWeight) {
      year = yearWeight.year
      break
    }
  }

  const monthPattern = [7, 6, 8, 4, 9, 5, 2, 10, 3, 11, 1, 0]
  const monthIndex =
    monthPattern[(index * 5 + Math.floor(index / 3)) % monthPattern.length]
  const day = ((index * 7) % 27) + 1

  return new Date(Date.UTC(year, monthIndex, day))
}

function buildMockLocation(feature: NutsFeature, index: number): DryAlpsLocation {
  const nutsId = feature.properties.NUTS_ID
  const regionName = feature.properties.NUTS_NAME || nutsId

  return {
    id: index + 1,
    name: regionName,
    naturalLocation: index % 3 === 0 ? `${regionName} area` : null,
    nuts1: nutsId.length >= 3 ? [nutsId.slice(0, 3)] : [],
    nuts2: nutsId.length >= 4 ? [nutsId.slice(0, 4)] : [],
    nuts3: [nutsId],
    mappedNutsIds: [nutsId],
    coordinate: getFeatureCenter(feature),
  }
}

function buildMockImpact(
  index: number,
  locations: DryAlpsLocation[],
  impactCount: number,
  weightedLocations: DryAlpsLocation[]
): DryAlpsImpact {
  const baseDate = getMockBaseDate(index, impactCount)

  const sector = mockSectors[index % mockSectors.length]
  const period = mockPeriods[index % mockPeriods.length]
  const primaryLocation = weightedLocations[index % weightedLocations.length]
  const secondaryLocation =
    index % 6 === 0 ? findNearbyLocation(primaryLocation, locations, index) : null
  const relatedLocations = secondaryLocation
    ? [primaryLocation, secondaryLocation]
    : [primaryLocation]
  const timeResolution =
    index % 10 === 0 ? 'year' : index % 4 === 0 ? 'day' : 'month'

  const startDate =
    timeResolution === 'year'
      ? toIsoDate(baseDate.getUTCFullYear(), 0, 1)
      : timeResolution === 'day'
        ? toIsoDate(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            ((index % 27) + 1)
          )
        : toIsoDate(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 1)

  const endDate =
    timeResolution === 'year'
      ? toIsoDate(baseDate.getUTCFullYear(), 11, 31)
      : timeResolution === 'day'
        ? startDate
        : toIsoDate(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), 28)

  const timeOfOccurrence =
    timeResolution === 'month'
      ? null
      : timeResolution === 'day'
        ? index % 8 === 0
          ? formatSeasonLabel(baseDate)
          : null
        : `${baseDate.getUTCFullYear()}`

  const counterMeasures =
    index % 6 === 0
      ? [mockMeasures[index % mockMeasures.length]]
      : [
          mockMeasures[index % mockMeasures.length],
          mockMeasures[(index + 3) % mockMeasures.length],
        ]

  const mappedNutsIds = Array.from(
    new Set(relatedLocations.flatMap((location) => location.mappedNutsIds))
  )

  const displayDate = startDate
  const searchableText = [
    sector,
    period,
    timeOfOccurrence,
    ...counterMeasures,
    ...relatedLocations.flatMap((location) => [
      location.name,
      location.naturalLocation,
      ...location.nuts2,
      ...location.nuts3,
    ]),
    sharedMockNews.title,
    sharedMockNews.excerpt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const published =
    timeResolution === 'day'
      ? startDate
      : timeResolution === 'month'
        ? startDate
        : toIsoDate(baseDate.getUTCFullYear(), 6, 1)

  const baseSpeiContext = mockSpeiLegend[index % mockSpeiLegend.length]
  const speiContext: DryAlpsSpeiContext | undefined = mappedNutsIds[0]
    ? {
        ...baseSpeiContext,
        nuts3Id: mappedNutsIds[0],
        month: startDate.slice(0, 7),
      }
    : undefined

  return {
    id: index + 1,
    impactedSector: sector,
    periodOfOccurrence: period,
    timeOfOccurrence:
      timeOfOccurrence ||
      (timeResolution === 'month'
        ? formatMonthLabel(baseDate)
        : formatDayLabel(new Date(`${startDate}T00:00:00.000Z`))),
    startDate,
    endDate,
    timeResolution,
    isSpecific: index % 7 !== 0,
    counterMeasures,
    coordinate: averageCoordinates(
      relatedLocations.map((location) => location.coordinate)
    ),
    mappedNutsIds,
    locations: relatedLocations,
    newsItems: [{ ...sharedMockNews, published }],
    speiContext,
    displayDate,
    searchableText,
  }
}

export async function fetchMockDryAlpsDataset(
  impactCount = 200
): Promise<DryAlpsDataset> {
  const nuts3GeoJson = await fetchNutsGeoJSON('nuts3', mockFetchOptions)

  const eligibleFeatures = nuts3GeoJson.features
    .filter((feature: NutsFeature) => {
      const nutsId = feature.properties?.NUTS_ID || ''

      return italianAlpineNuts3Prefixes.some((prefix) =>
        nutsId.startsWith(prefix)
      )
    })
    .sort((firstFeature: NutsFeature, secondFeature: NutsFeature) =>
      firstFeature.properties.NUTS_ID.localeCompare(secondFeature.properties.NUTS_ID)
    )

  const mockLocations = eligibleFeatures
    .slice(0, 36)
    .map((feature: NutsFeature, index: number) =>
      buildMockLocation(feature, index)
    )

  const weightedLocations = mockLocations.flatMap((location) =>
    Array.from({ length: getRegionalHotspotWeight(location) }, () => location)
  )

  if (!mockLocations.length) {
    return {
      impacts: [],
      nutsMap: nuts3GeoJson,
    }
  }

  const impacts = Array.from({ length: impactCount }, (_, index) =>
    buildMockImpact(index, mockLocations, impactCount, weightedLocations)
  ).sort((firstImpact, secondImpact) => {
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
  }
}
