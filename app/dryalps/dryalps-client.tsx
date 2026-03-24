'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import MapView, {
  Layer,
  MapRef,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl'
import Layout from '@/components/layout'
import { useThemeContext } from '@/context/theme'
import type { DryAlpsClientProps, DryAlpsImpact } from '@/types'

import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const sectorColors: Record<string, string> = {
  'Agriculture and livestock farming': '#8b6b3d',
  'Energy and industry and transport': '#9a5f3b',
  Forestry: '#5f7143',
  'Freshwater and terrestrial ecosystems': '#667b84',
  'Public water supply': '#536c79',
  'Tourism and recreation': '#7a5f66',
  Others: '#6a675f',
}

const impactDensityLegend = [
  { label: '1', color: '#d6d3d1' },
  { label: '2', color: '#a8a29e' },
  { label: '3-4', color: '#78716c' },
  { label: '5+', color: '#57534e' },
] as const

function parseQueryList(value: string | null) {
  if (!value) {
    return []
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

function parseQueryNumber(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function areEqualLists(firstList: string[], secondList: string[]) {
  if (firstList.length !== secondList.length) {
    return false
  }

  return firstList.every((value, index) => value === secondList[index])
}

function setListParam(
  params: URLSearchParams,
  key: string,
  values: string[]
) {
  if (values.length) {
    params.set(key, values.join(','))
    return
  }

  params.delete(key)
}

function formatCalendarDate(value: string | null) {
  if (!value) {
    return 'Undated'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate)
}

function formatResolutionAwareDate(
  value: string | null,
  resolution: string | null
) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  if (resolution === 'year') {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate)
  }

  if (resolution === 'month') {
    return new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsedDate)
  }

  return formatCalendarDate(value)
}

function getTimeResolutionLabel(resolution: string | null) {
  if (resolution === 'year') {
    return 'Year precision'
  }

  if (resolution === 'month') {
    return 'Month precision'
  }

  if (resolution === 'day') {
    return 'Day precision'
  }

  return 'Unspecified precision'
}

function getImpactYear(impact: DryAlpsImpact) {
  return impact.displayDate ? impact.displayDate.slice(0, 4) : 'Unknown'
}

function getImpactHeading(impact: DryAlpsImpact) {
  const primaryLocation =
    impact.locations[0]?.naturalLocation || impact.locations[0]?.name

  if (primaryLocation) {
    return `${impact.impactedSector} in ${primaryLocation}`
  }

  return impact.impactedSector
}

function getPrimaryLocationLabel(impact: DryAlpsImpact) {
  return impact.locations[0]?.naturalLocation || impact.locations[0]?.name || 'Location not specified'
}

function getImpactSubline(impact: DryAlpsImpact) {
  if (impact.timeOfOccurrence) {
    return impact.timeOfOccurrence
  }

  return formatResolutionAwareDate(
    impact.displayDate,
    impact.timeResolution
  ) || 'Undated'
}

function getImpactTimeRange(impact: DryAlpsImpact) {
  const start = formatResolutionAwareDate(impact.startDate, impact.timeResolution)
  const end = formatResolutionAwareDate(impact.endDate, impact.timeResolution)

  if (start && end) {
    return start === end ? start : `${start} to ${end}`
  }

  return start || end
}

function getImpactTemporalMeta(impact: DryAlpsImpact) {
  const precisionLabel = getTimeResolutionLabel(impact.timeResolution).replace(
    ' precision',
    ''
  )

  return `${impact.periodOfOccurrence} • ${precisionLabel}`
}

function formatYearMonth(value: string) {
  const parsedDate = new Date(`${value}-01T00:00:00.000Z`)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate)
}

function getUrlHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'External source'
  }
}

function truncateUrl(url: string, maxLength = 52) {
  try {
    const parsedUrl = new URL(url)
    const simplified = `${parsedUrl.hostname}${parsedUrl.pathname}${parsedUrl.search}`

    if (simplified.length <= maxLength) {
      return simplified
    }

    const keepStart = Math.max(24, Math.floor((maxLength - 3) * 0.7))
    const keepEnd = Math.max(8, maxLength - keepStart - 3)

    return `${simplified.slice(0, keepStart)}...${simplified.slice(-keepEnd)}`
  } catch {
    if (url.length <= maxLength) {
      return url
    }

    return `${url.slice(0, maxLength - 3)}...`
  }
}

function buildImpactCountExpression(countsByNutsId: Record<string, number>) {
  const expression: any[] = ['match', ['get', 'NUTS_ID']]

  Object.entries(countsByNutsId).forEach(([nutsId, count]) => {
    let color = '#d6d3d1'

    if (count >= 5) {
      color = '#57534e'
    } else if (count >= 3) {
      color = '#78716c'
    } else if (count >= 2) {
      color = '#a8a29e'
    } else if (count >= 1) {
      color = '#d6d3d1'
    }

    expression.push(nutsId, color)
  })

  expression.push('rgba(231, 229, 228, 0.14)')
  return expression
}

export default function DryAlpsClient({
  dataset,
  allPosts,
  dataMode,
  error,
}: DryAlpsClientProps) {
  const mapRef = useRef<MapRef>(null)
  const isUpdatingUrl = useRef(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQueryString = searchParams.toString()
  const initialSearchQuery = searchParams.get('q') ?? ''
  const initialSectorFilters = parseQueryList(searchParams.get('sectors'))
  const initialPeriodFilter = searchParams.get('period') ?? 'all'
  const initialYearFilters = parseQueryList(searchParams.get('years'))
  const initialSpeiFilters = parseQueryList(searchParams.get('spei'))
  const initialCounterMeasureFilters = parseQueryList(
    searchParams.get('measures')
  )
  const initialRegionFilters = parseQueryList(searchParams.get('regions'))
  const initialSelectedImpactId = parseQueryNumber(searchParams.get('impact'))
  const initialShowMappedOnly = searchParams.get('mapped') === '1'
  const initialRegionLevel = (searchParams.get('regionLevel') === 'nuts2' ? 'nuts2' : 'nuts3') as 'nuts2' | 'nuts3'
  const [theme] = useThemeContext()
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [regionSearchQuery, setRegionSearchQuery] = useState('')
  const [sectorFilters, setSectorFilters] = useState<string[]>(initialSectorFilters)
  const [periodFilter, setPeriodFilter] = useState(initialPeriodFilter)
  const [yearFilters, setYearFilters] = useState<string[]>(initialYearFilters)
  const [speiFilters, setSpeiFilters] = useState<string[]>(initialSpeiFilters)
  const [counterMeasureFilters, setCounterMeasureFilters] = useState<string[]>(
    initialCounterMeasureFilters
  )
  const [regionFilters, setRegionFilters] = useState<string[]>(
    initialRegionFilters
  )
  const [showMappedOnly, setShowMappedOnly] = useState(initialShowMappedOnly)
  const [regionLevel, setRegionLevel] = useState<'nuts2' | 'nuts3'>(initialRegionLevel)
  const [viewMode, setViewMode] = useState<'chronicle' | 'tabular'>('chronicle')
  const [mobileViewMode, setMobileViewMode] = useState<'timeline' | 'map'>(
    'timeline'
  )
  const [selectedImpactId, setSelectedImpactId] = useState<number | null>(
    initialSelectedImpactId
  )
  const [tableSortKey, setTableSortKey] = useState<string>('date')
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc')
  const [tableSearchQuery, setTableSearchQuery] = useState('')
  const deferredTableSearchQuery = useDeferredValue(tableSearchQuery)
  const [hoveredRegion, setHoveredRegion] = useState<{
    x: number
    y: number
    nutsId: string
    regionName: string
  } | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const deferredRegionSearchQuery = useDeferredValue(regionSearchQuery)

  useEffect(() => {
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false
      return
    }

    const nextSearchQuery = searchParams.get('q') ?? ''
    const nextSectorFilters = parseQueryList(searchParams.get('sectors'))
    const nextPeriodFilter = searchParams.get('period') ?? 'all'
    const nextYearFilters = parseQueryList(searchParams.get('years'))
    const nextSpeiFilters = parseQueryList(searchParams.get('spei'))
    const nextCounterMeasureFilters = parseQueryList(
      searchParams.get('measures')
    )
    const nextRegionFilters = parseQueryList(searchParams.get('regions'))
    const nextSelectedImpactId = parseQueryNumber(searchParams.get('impact'))
    const nextShowMappedOnly = searchParams.get('mapped') === '1'
    const nextRegionLevel = (searchParams.get('regionLevel') === 'nuts2' ? 'nuts2' : 'nuts3') as 'nuts2' | 'nuts3'

    setSearchQuery((currentValue) =>
      currentValue === nextSearchQuery ? currentValue : nextSearchQuery
    )
    setSectorFilters((currentValue) =>
      areEqualLists(currentValue, nextSectorFilters)
        ? currentValue
        : nextSectorFilters
    )
    setPeriodFilter((currentValue) =>
      currentValue === nextPeriodFilter ? currentValue : nextPeriodFilter
    )
    setYearFilters((currentValue) =>
      areEqualLists(currentValue, nextYearFilters)
        ? currentValue
        : nextYearFilters
    )
    setSpeiFilters((currentValue) =>
      areEqualLists(currentValue, nextSpeiFilters)
        ? currentValue
        : nextSpeiFilters
    )
    setCounterMeasureFilters((currentValue) =>
      areEqualLists(currentValue, nextCounterMeasureFilters)
        ? currentValue
        : nextCounterMeasureFilters
    )
    setRegionFilters((currentValue) =>
      areEqualLists(currentValue, nextRegionFilters)
        ? currentValue
        : nextRegionFilters
    )
    setSelectedImpactId((currentValue) =>
      currentValue === nextSelectedImpactId
        ? currentValue
        : nextSelectedImpactId
    )
    setShowMappedOnly((currentValue) =>
      currentValue === nextShowMappedOnly ? currentValue : nextShowMappedOnly
    )
    setRegionLevel((currentValue) =>
      currentValue === nextRegionLevel ? currentValue : nextRegionLevel
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQueryString])

  const sectors = useMemo(
    () =>
      Array.from(
        new Set(dataset.impacts.map((impact) => impact.impactedSector))
      ).sort(),
    [dataset.impacts]
  )

  const periods = useMemo(
    () =>
      Array.from(
        new Set(dataset.impacts.map((impact) => impact.periodOfOccurrence))
      ).sort(),
    [dataset.impacts]
  )

  const regionNameById = useMemo(() => {
    const nextRegionNameById = new Map<string, string>()

    dataset.nutsMap.features.forEach((feature) => {
      const nutsId = feature.properties?.NUTS_ID
      const regionName = feature.properties?.NUTS_NAME

      if (!nutsId || !regionName || nextRegionNameById.has(nutsId)) {
        return
      }

      nextRegionNameById.set(nutsId, regionName)
    })

    dataset.nuts2Map.features.forEach((feature) => {
      const nutsId = feature.properties?.NUTS_ID
      const regionName = feature.properties?.NUTS_NAME

      if (!nutsId || !regionName || nextRegionNameById.has(nutsId)) {
        return
      }

      nextRegionNameById.set(nutsId, regionName)
    })

    return nextRegionNameById
  }, [dataset.nutsMap.features, dataset.nuts2Map.features])

  const getImpactNutsIds = useMemo(() => {
    if (regionLevel === 'nuts2') {
      return (impact: DryAlpsImpact) =>
        Array.from(new Set(impact.locations.flatMap((loc) => loc.nuts2)))
    }
    return (impact: DryAlpsImpact) => impact.mappedNutsIds
  }, [regionLevel])

  const allCountsByNutsId = useMemo(() => {
    const counts: Record<string, number> = {}

    dataset.impacts.forEach((impact) => {
      getImpactNutsIds(impact).forEach((nutsId) => {
        counts[nutsId] = (counts[nutsId] || 0) + 1
      })
    })

    return counts
  }, [dataset.impacts, getImpactNutsIds])

  const regionOptions = useMemo(() => {
    const normalizedQuery = deferredRegionSearchQuery.trim().toLowerCase()

    return Object.entries(allCountsByNutsId)
      .map(([nutsId, count]) => ({
        nutsId,
        regionName: regionNameById.get(nutsId) || nutsId,
        count,
      }))
      .filter((region) => {
        if (!normalizedQuery) {
          return true
        }

        return (
          region.regionName.toLowerCase().includes(normalizedQuery) ||
          region.nutsId.toLowerCase().includes(normalizedQuery)
        )
      })
      .sort((firstRegion, secondRegion) => {
        const firstSelected = regionFilters.includes(firstRegion.nutsId)
        const secondSelected = regionFilters.includes(secondRegion.nutsId)

        if (firstSelected !== secondSelected) {
          return firstSelected ? -1 : 1
        }

        return firstRegion.regionName.localeCompare(secondRegion.regionName, 'en')
      })
  }, [allCountsByNutsId, deferredRegionSearchQuery, regionFilters, regionNameById])

  const selectedRegionSet = useMemo(
    () => new Set(regionFilters),
    [regionFilters]
  )

  const selectedSectorSet = useMemo(
    () => new Set(sectorFilters),
    [sectorFilters]
  )

  const selectedYearSet = useMemo(() => new Set(yearFilters), [yearFilters])
  const selectedSpeiSet = useMemo(() => new Set(speiFilters), [speiFilters])
  const selectedCounterMeasureSet = useMemo(
    () => new Set(counterMeasureFilters),
    [counterMeasureFilters]
  )

  const speiOptions = useMemo(
    () =>
      Array.from(
        new Map(
          dataset.impacts
            .filter((impact) => impact.speiContext)
            .map((impact) => [
              impact.speiContext!.category,
              {
                category: impact.speiContext!.category,
                label: impact.speiContext!.label,
                color: impact.speiContext!.color,
              },
            ])
        ).values()
      ),
    [dataset.impacts]
  )

  const counterMeasureOptions = useMemo(() => {
    const counts = new Map<string, number>()

    dataset.impacts.forEach((impact) => {
      impact.counterMeasures.forEach((measure) => {
        counts.set(measure, (counts.get(measure) || 0) + 1)
      })
    })

    return Array.from(counts.entries())
      .map(([measure, count]) => ({ measure, count }))
      .sort((firstItem, secondItem) => {
        if (secondItem.count !== firstItem.count) {
          return secondItem.count - firstItem.count
        }

        return firstItem.measure.localeCompare(secondItem.measure, 'en')
      })
  }, [dataset.impacts])

  const impactsBeforeYearFilter = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase()

    return dataset.impacts.filter((impact) => {
      if (
        sectorFilters.length &&
        !selectedSectorSet.has(impact.impactedSector)
      ) {
        return false
      }

      if (periodFilter !== 'all' && impact.periodOfOccurrence !== periodFilter) {
        return false
      }

      if (
        speiFilters.length &&
        (!impact.speiContext || !selectedSpeiSet.has(impact.speiContext.category))
      ) {
        return false
      }

      if (
        counterMeasureFilters.length &&
        !impact.counterMeasures.some((measure) =>
          selectedCounterMeasureSet.has(measure)
        )
      ) {
        return false
      }

      if (
        regionFilters.length &&
        !getImpactNutsIds(impact).some((nutsId) => selectedRegionSet.has(nutsId))
      ) {
        return false
      }

      if (showMappedOnly && !getImpactNutsIds(impact).length) {
        return false
      }

      if (normalizedQuery && !impact.searchableText.includes(normalizedQuery)) {
        return false
      }

      return true
    })
  }, [
    dataset.impacts,
    deferredSearchQuery,
    getImpactNutsIds,
    periodFilter,
    regionFilters,
    selectedCounterMeasureSet,
    selectedSectorSet,
    sectorFilters.length,
    selectedSpeiSet,
    selectedRegionSet,
    showMappedOnly,
    speiFilters.length,
    counterMeasureFilters.length,
  ])

  const filteredImpacts = useMemo(() => {
    if (!yearFilters.length) {
      return impactsBeforeYearFilter
    }

    return impactsBeforeYearFilter.filter((impact) =>
      selectedYearSet.has(getImpactYear(impact))
    )
  }, [impactsBeforeYearFilter, selectedYearSet, yearFilters.length])

  const tableImpacts = useMemo(() => {
    let items = filteredImpacts

    if (deferredTableSearchQuery.trim()) {
      const q = deferredTableSearchQuery.trim().toLowerCase()
      items = items.filter((impact) => impact.searchableText.includes(q))
    }

    const sorted = [...items]
    sorted.sort((a, b) => {
      let cmp = 0
      switch (tableSortKey) {
        case 'date':
          cmp =
            (a.displayDate ? Date.parse(a.displayDate) : 0) -
            (b.displayDate ? Date.parse(b.displayDate) : 0)
          break
        case 'sector':
          cmp = a.impactedSector.localeCompare(b.impactedSector, 'en')
          break
        case 'location':
          cmp = getPrimaryLocationLabel(a).localeCompare(
            getPrimaryLocationLabel(b),
            'en'
          )
          break
        case 'period':
          cmp = a.periodOfOccurrence.localeCompare(b.periodOfOccurrence, 'en')
          break
        case 'measures':
          cmp = a.counterMeasures.length - b.counterMeasures.length
          break
        case 'sources':
          cmp = a.newsItems.length - b.newsItems.length
          break
        case 'resolution':
          cmp = (a.timeResolution || '').localeCompare(
            b.timeResolution || '',
            'en'
          )
          break
        case 'regions':
          cmp = a.mappedNutsIds.length - b.mappedNutsIds.length
          break
        case 'specific':
          cmp = Number(a.isSpecific) - Number(b.isSpecific)
          break
        case 'allLocations':
          cmp = a.locations.length - b.locations.length
          break
        default:
          break
      }
      return tableSortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [filteredImpacts, deferredTableSearchQuery, tableSortKey, tableSortDir])

  useEffect(() => {
    if (!filteredImpacts.length) {
      setSelectedImpactId(null)
      return
    }

    const hasSelectedImpact = filteredImpacts.some(
      (impact) => impact.id === selectedImpactId
    )

    if (!hasSelectedImpact) {
      setSelectedImpactId(null)
    }
  }, [filteredImpacts, selectedImpactId])

  const selectedImpact =
    filteredImpacts.find((impact) => impact.id === selectedImpactId) || null

  const countsByNutsId = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredImpacts.forEach((impact) => {
      getImpactNutsIds(impact).forEach((nutsId) => {
        counts[nutsId] = (counts[nutsId] || 0) + 1
      })
    })

    return counts
  }, [filteredImpacts, getImpactNutsIds])

  const impactedRegionCount = useMemo(
    () => Object.keys(countsByNutsId).length,
    [countsByNutsId]
  )

  const coveredYearsCount = useMemo(
    () => new Set(filteredImpacts.map((impact) => getImpactYear(impact))).size,
    [filteredImpacts]
  )

  const groupedImpacts = useMemo(() => {
    const groups = new Map<string, DryAlpsImpact[]>()

    filteredImpacts.forEach((impact) => {
      const year = getImpactYear(impact)
      const currentGroup = groups.get(year) || []
      currentGroup.push(impact)
      groups.set(year, currentGroup)
    })

    return Array.from(groups.entries())
  }, [filteredImpacts])

  const pulseYears = useMemo(() => {
    const groups = new Map<string, DryAlpsImpact[]>()

    impactsBeforeYearFilter.forEach((impact) => {
      const year = getImpactYear(impact)
      const currentGroup = groups.get(year) || []
      currentGroup.push(impact)
      groups.set(year, currentGroup)
    })

    return [...groups.entries()].sort(([firstYear], [secondYear]) => {
      if (firstYear === 'Unknown') {
        return 1
      }

      if (secondYear === 'Unknown') {
        return -1
      }

      return Number(firstYear) - Number(secondYear)
    })
  }, [impactsBeforeYearFilter])

  const maxGroupedYearCount = useMemo(
    () =>
      groupedImpacts.reduce(
        (currentMax, [, impacts]) => Math.max(currentMax, impacts.length),
        1
      ),
    [groupedImpacts]
  )

  const activeFilters = useMemo(() => {
    const filters: Array<{
      id: string
      label: string
      onRemove: () => void
    }> = []

    if (searchQuery.trim()) {
      filters.push({
        id: 'search',
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => setSearchQuery(''),
      })
    }

    if (sectorFilters.length) {
      sectorFilters.forEach((sector) => {
        filters.push({
          id: `sector-${sector}`,
          label: `Sector: ${sector}`,
          onRemove: () =>
            setSectorFilters((currentSectors) =>
              currentSectors.filter(
                (currentSector) => currentSector !== sector
              )
            ),
        })
      })
    }

    if (periodFilter !== 'all') {
      filters.push({
        id: 'period',
        label: `Period: ${periodFilter}`,
        onRemove: () => setPeriodFilter('all'),
      })
    }

    yearFilters.forEach((year) => {
      filters.push({
        id: `year-${year}`,
        label: `Year: ${year}`,
        onRemove: () =>
          setYearFilters((currentYears) =>
            currentYears.filter((currentYear) => currentYear !== year)
          ),
      })
    })

    speiFilters.forEach((category) => {
      const option = speiOptions.find((item) => item.category === category)

      filters.push({
        id: `spei-${category}`,
        label: `SPEI-1: ${option?.label || category}`,
        onRemove: () =>
          setSpeiFilters((currentCategories) =>
            currentCategories.filter(
              (currentCategory) => currentCategory !== category
            )
          ),
      })
    })

    counterMeasureFilters.forEach((measure) => {
      filters.push({
        id: `measure-${measure}`,
        label: `Measure: ${measure}`,
        onRemove: () =>
          setCounterMeasureFilters((currentMeasures) =>
            currentMeasures.filter(
              (currentMeasure) => currentMeasure !== measure
            )
          ),
      })
    })

    regionFilters.forEach((nutsId) => {
      filters.push({
        id: `region-${nutsId}`,
        label: `Region: ${regionNameById.get(nutsId) || nutsId}`,
        onRemove: () =>
          setRegionFilters((currentFilters) =>
            currentFilters.filter((currentNutsId) => currentNutsId !== nutsId)
          ),
      })
    })

    if (showMappedOnly) {
      filters.push({
        id: 'mapped',
        label: 'Mapped only',
        onRemove: () => setShowMappedOnly(false),
      })
    }

    return filters
  }, [
    periodFilter,
    regionFilters,
    regionNameById,
    searchQuery,
    sectorFilters,
    showMappedOnly,
    speiFilters,
    speiOptions,
    counterMeasureFilters,
    yearFilters,
  ])

  const yearScopeLabel = useMemo(() => {
    if (!yearFilters.length) {
      return 'All years'
    }

    if (yearFilters.length <= 3) {
      return yearFilters.join(', ')
    }

    return `${yearFilters.length} years selected`
  }, [yearFilters])

  function toggleYearFilter(year: string) {
    setYearFilters((currentYears) =>
      currentYears.includes(year)
        ? currentYears.filter((currentYear) => currentYear !== year)
        : [...currentYears, year]
    )
  }

  const selectedRegionLabels = useMemo(
    () =>
      regionFilters.map((nutsId) => ({
        nutsId,
        regionName: regionNameById.get(nutsId) || nutsId,
      })),
    [regionFilters, regionNameById]
  )

  useEffect(() => {
    if (!selectedImpact?.coordinate || !mapRef.current) {
      return
    }

    mapRef.current.flyTo({
      center: selectedImpact.coordinate,
      duration: 900,
      zoom: 6.1,
    })
  }, [selectedImpact])

  useEffect(() => {
    const nextParams = new URLSearchParams(currentQueryString)
    const normalizedSearchQuery = searchQuery.trim()

    if (normalizedSearchQuery) {
      nextParams.set('q', normalizedSearchQuery)
    } else {
      nextParams.delete('q')
    }

    if (sectorFilters.length) {
      nextParams.set('sectors', sectorFilters.join(','))
    } else {
      nextParams.delete('sectors')
    }

    if (periodFilter !== 'all') {
      nextParams.set('period', periodFilter)
    } else {
      nextParams.delete('period')
    }

    setListParam(nextParams, 'years', yearFilters)
    setListParam(nextParams, 'spei', speiFilters)
    setListParam(nextParams, 'measures', counterMeasureFilters)
    setListParam(nextParams, 'regions', regionFilters)

    if (showMappedOnly) {
      nextParams.set('mapped', '1')
    } else {
      nextParams.delete('mapped')
    }

    if (regionLevel !== 'nuts3') {
      nextParams.set('regionLevel', regionLevel)
    } else {
      nextParams.delete('regionLevel')
    }

    if (selectedImpactId !== null) {
      nextParams.set('impact', String(selectedImpactId))
    } else {
      nextParams.delete('impact')
    }

    const nextQueryString = nextParams.toString()

    if (nextQueryString === currentQueryString) {
      return
    }

    startTransition(() => {
      isUpdatingUrl.current = true
      router.replace(
        nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
        { scroll: false }
      )
    })
  }, [
    counterMeasureFilters,
    currentQueryString,
    pathname,
    periodFilter,
    regionFilters,
    regionLevel,
    router,
    searchQuery,
    sectorFilters,
    selectedImpactId,
    showMappedOnly,
    speiFilters,
    yearFilters,
  ])

  const fillExpression = useMemo(
    () => buildImpactCountExpression(countsByNutsId),
    [countsByNutsId]
  )

  const selectedFilter = useMemo<any>(
    () => {
      const selectedImpactNutsIds = selectedImpact
        ? getImpactNutsIds(selectedImpact)
        : []

      return selectedImpactNutsIds.length
        ? ['in', ['get', 'NUTS_ID'], ['literal', selectedImpactNutsIds]]
        : ['==', ['get', 'NUTS_ID'], '']
    },
    [selectedImpact, getImpactNutsIds]
  )

  const regionSelectionFilter = useMemo<any>(
    () =>
      regionFilters.length
        ? ['in', ['get', 'NUTS_ID'], ['literal', regionFilters]]
        : ['==', ['get', 'NUTS_ID'], ''],
    [regionFilters]
  )

  const activeMapGeoJson = regionLevel === 'nuts2' ? dataset.nuts2Map : dataset.nutsMap

  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6 py-24 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          <div className="max-w-lg border border-rose-200 bg-white p-8 shadow-lg dark:border-rose-900/60 dark:bg-zinc-900">
            <h1 className="text-2xl font-semibold">DryAlps is unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {error}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout posts={allPosts}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.08),_transparent_32%),linear-gradient(180deg,_#fafaf9_0px,_#f5f5f4_400px,_#ffffff_900px)] bg-fixed pt-28 text-zinc-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.12),_transparent_28%),linear-gradient(180deg,_#09090b_0px,_#18181b_400px,_#27272a_900px)] dark:text-zinc-100">
        <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-10 md:px-6 xl:px-8">
          <div className="overflow-hidden border border-stone-200/80 bg-white/88 shadow-[0_25px_80px_-45px_rgba(41,37,36,0.32)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-900/80">
            <div className="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] lg:px-8">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    DryAlps
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white/90 p-1 text-xs dark:border-zinc-700 dark:bg-zinc-900/90">
                    <Link
                      href="/dryalps?source=api"
                      className={`rounded-full px-3 py-1.5 font-medium transition ${dataMode === 'api'
                        ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                        : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                    >
                      API
                    </Link>
                    <Link
                      href="/dryalps?source=mock"
                      className={`rounded-full px-3 py-1.5 font-medium transition ${dataMode === 'mock'
                        ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                        : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                        }`}
                    >
                      Mock
                    </Link>
                  </div>
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
                    A living timeline of drought impacts in the Alpine region.
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 md:text-base">
                    DryAlps-IT aims to build a reproducible and continuously growing
                    drought-impact database for the Italian Alps. The dataset
                    covers impacts from 2022 onwards. This interface treats impacts
                    as time-stamped events that can be followed across years,
                    sectors and places.
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                    Data source: {dataMode === 'mock' ? 'Mock dataset' : 'DryAlps API'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="border border-stone-200 bg-stone-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-500 dark:text-zinc-400">
                    Impacts
                  </div>
                  <div className="mt-3 text-3xl font-semibold">
                    {filteredImpacts.length}
                  </div>
                </div>
                <div className="border border-stone-200 bg-stone-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-500 dark:text-zinc-400">
                    Years covered
                  </div>
                  <div className="mt-3 text-3xl font-semibold">
                    {coveredYearsCount}
                  </div>
                </div>
                <div className="border border-stone-200 bg-stone-50/90 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="text-xs uppercase tracking-[0.22em] text-stone-500 dark:text-zinc-400">
                    Impacted {regionLevel === 'nuts2' ? 'NUTS2' : 'NUTS3'}
                  </div>
                  <div className="mt-3 text-3xl font-semibold">
                    {impactedRegionCount}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-stone-200/80 px-6 py-5 dark:border-zinc-800/70 lg:px-8">
              <p className="max-w-5xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                The interface is built around three linked questions: when impacts
                emerge, where they occur, and which sectors they affect. News
                articles remain attached as supporting evidence, while the impact
                itself stays the primary unit of observation.
              </p>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1 border border-stone-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900/80">
              <button
                type="button"
                onClick={() => setViewMode('chronicle')}
                className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'chronicle'
                  ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                  : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
              >
                Chronicle
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tabular')}
                className={`px-3 py-2 text-sm font-medium transition ${viewMode === 'tabular'
                  ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                  : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
              >
                Tabular
              </button>
            </div>
            {viewMode === 'chronicle' ? (
              <div className="ml-4 inline-flex items-center gap-1 border border-stone-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900/80 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('timeline')}
                  className={`px-3 py-2 text-sm font-medium transition ${mobileViewMode === 'timeline'
                    ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('map')}
                  className={`px-3 py-2 text-sm font-medium transition ${mobileViewMode === 'map'
                    ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                    : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                >
                  Map
                </button>
              </div>
            ) : null}
          </div>

          {viewMode === 'chronicle' ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(520px,1.2fr)_minmax(360px,0.8fr)]">
              <aside
                className={`${mobileViewMode === 'timeline' ? 'block' : 'hidden'} overflow-x-hidden overflow-y-visible border border-stone-200/80 bg-white/92 shadow-[0_20px_70px_-45px_rgba(41,37,36,0.34)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/88 xl:block`}
              >
                <div className="border-b border-stone-200/80 px-6 py-5 dark:border-zinc-800/80">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Impact timeline</h2>
                      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                        Read the archive as a living chronology. The rail shows where
                        impacts cluster over time, while each entry opens its source
                        article directly in place.
                      </p>
                    </div>

                    {activeFilters.length ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('')
                          setSectorFilters([])
                          setPeriodFilter('all')
                          setYearFilters([])
                          setSpeiFilters([])
                          setCounterMeasureFilters([])
                          setRegionFilters([])
                          setShowMappedOnly(false)
                        }}
                        className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                      >
                        Clear all
                      </button>
                    ) : null}
                  </div>

                  <section className="z-20 mt-5 overflow-hidden border border-stone-200 bg-stone-50/95 p-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                          Temporal pulse
                        </div>
                        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          Filter the timeline and the map by one or more years.
                        </p>
                      </div>

                      <div className="rounded-full border border-stone-700 bg-stone-700 px-3 py-1 text-xs font-medium text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950">
                        {yearFilters.length
                          ? `Selected years: ${yearScopeLabel}`
                          : 'Selected years: All years'}
                      </div>
                    </div>

                    <div className="mt-5 sm:overflow-x-auto sm:pb-1">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:min-w-max sm:items-end sm:gap-3">
                        {pulseYears.map(([year, impacts]) => {
                          const isSelectedYear = yearFilters.includes(year)
                          const barHeight = Math.max(
                            14,
                            Math.round((impacts.length / maxGroupedYearCount) * 72)
                          )

                          return (
                            <button
                              key={year}
                              type="button"
                              onClick={() => toggleYearFilter(year)}
                              className={`group flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition sm:w-16 sm:shrink-0 ${isSelectedYear
                                ? 'border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950'
                                : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-400 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-zinc-700'
                                }`}
                            >
                              <div className="flex h-16 items-end sm:h-24">
                                <div
                                  className={`w-4 rounded-full transition sm:w-5 ${isSelectedYear
                                    ? 'bg-amber-400 dark:bg-amber-300'
                                    : 'bg-stone-300 group-hover:bg-stone-500 dark:bg-zinc-600 dark:group-hover:bg-zinc-500'
                                    }`}
                                  style={{ height: `${barHeight}px` }}
                                />
                              </div>
                              <div className="text-sm font-semibold">{year}</div>
                              <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">
                                {impacts.length}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </section>

                  <div className="mt-5">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                      Sector
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sectors.map((sector) => {
                        const active = sectorFilters.includes(sector)
                        return (
                          <button
                            key={sector}
                            type="button"
                            onClick={() =>
                              setSectorFilters((currentSectors) =>
                                currentSectors.includes(sector)
                                  ? currentSectors.filter(
                                    (currentSector) => currentSector !== sector
                                  )
                                  : [...currentSectors, sector]
                              )
                            }
                            className="rounded-full border px-3 py-2 text-sm transition"
                            style={{
                              borderColor:
                                sectorColors[sector] || sectorColors.Others,
                              backgroundColor: active
                                ? `${sectorColors[sector] || sectorColors.Others}24`
                                : `${sectorColors[sector] || sectorColors.Others}12`,
                              color:
                                sectorColors[sector] || sectorColors.Others,
                              boxShadow: active
                                ? `inset 0 0 0 1px ${sectorColors[sector] || sectorColors.Others}`
                                : 'none',
                            }}
                          >
                            {sector}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <details
                    className="mt-5 border border-stone-200 bg-stone-50/75 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/35"
                    open={
                      Boolean(searchQuery.trim()) ||
                      periodFilter !== 'all' ||
                      Boolean(speiFilters.length) ||
                      Boolean(counterMeasureFilters.length) ||
                      showMappedOnly ||
                      Boolean(regionFilters.length) ||
                      Boolean(regionSearchQuery.trim())
                    }
                  >
                    <summary className="group/summary flex cursor-pointer list-none items-center justify-between rounded-lg bg-stone-100 px-4 py-3 text-sm font-semibold text-zinc-800 marker:hidden transition hover:bg-stone-200 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      <span>
                        Refine results
                        <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          — use these when year and sector are not enough
                        </span>
                      </span>
                      <svg
                        className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open/summary:rotate-180 dark:text-zinc-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </summary>

                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                          Search
                        </span>
                        <input
                          type="search"
                          name="impact-search"
                          autoComplete="off"
                          value={searchQuery}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            startTransition(() => {
                              setSearchQuery(nextValue)
                            })
                          }}
                          placeholder="Search impacts, places, measures or news…"
                          className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-stone-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-stone-400"
                        />
                      </label>

                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                          Period
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {periods.map((period) => {
                            const active = periodFilter === period
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() =>
                                  setPeriodFilter(active ? 'all' : period)
                                }
                                className={`rounded-full border px-3 py-2 text-sm transition ${active
                                  ? 'border-stone-700 bg-stone-700 text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950'
                                  : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600'
                                  }`}
                              >
                                {period}
                              </button>
                            )
                          })}

                          <button
                            type="button"
                            onClick={() => setShowMappedOnly((value) => !value)}
                            className={`rounded-full border px-3 py-2 text-sm transition ${showMappedOnly
                              ? 'border-stone-700 bg-stone-700 text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950'
                              : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600'
                              }`}
                          >
                            Mapped only
                          </button>
                        </div>
                      </div>

                      {speiOptions.length ? (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                            SPEI-1
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {speiOptions.map((option) => {
                              const active = speiFilters.includes(option.category)

                              return (
                                <button
                                  key={option.category}
                                  type="button"
                                  onClick={() =>
                                    setSpeiFilters((currentCategories) =>
                                      currentCategories.includes(option.category)
                                        ? currentCategories.filter(
                                          (currentCategory) =>
                                            currentCategory !== option.category
                                        )
                                        : [...currentCategories, option.category]
                                    )
                                  }
                                  className={`rounded-full border px-3 py-2 text-sm transition ${active
                                    ? 'border-stone-700 bg-stone-700 text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950'
                                    : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600'
                                    }`}
                                >
                                  {option.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      {counterMeasureOptions.length ? (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                            Counter measures
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {counterMeasureOptions.map((option) => {
                              const active = counterMeasureFilters.includes(
                                option.measure
                              )

                              return (
                                <button
                                  key={option.measure}
                                  type="button"
                                  onClick={() =>
                                    setCounterMeasureFilters((currentMeasures) =>
                                      currentMeasures.includes(option.measure)
                                        ? currentMeasures.filter(
                                          (currentMeasure) =>
                                            currentMeasure !== option.measure
                                        )
                                        : [...currentMeasures, option.measure]
                                    )
                                  }
                                  className={`rounded-full border px-3 py-2 text-sm transition ${active
                                    ? 'border-stone-700 bg-stone-700 text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950'
                                    : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600'
                                    }`}
                                >
                                  {option.measure}{' '}
                                  <span className="opacity-70">{option.count}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                            Regions
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/80">
                              <button
                                type="button"
                                onClick={() => {
                                  setRegionLevel('nuts3')
                                  setRegionFilters([])
                                }}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${regionLevel === 'nuts3'
                                  ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                                  : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                  }`}
                              >
                                NUTS3
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRegionLevel('nuts2')
                                  setRegionFilters([])
                                }}
                                className={`rounded-full px-2.5 py-1 font-medium transition ${regionLevel === 'nuts2'
                                  ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                                  : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                  }`}
                              >
                                NUTS2
                              </button>
                            </div>
                            {selectedRegionLabels.length ? (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {selectedRegionLabels.length} selected
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {selectedRegionLabels.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedRegionLabels.map((region) => (
                              <button
                                key={region.nutsId}
                                type="button"
                                onClick={() =>
                                  setRegionFilters((currentFilters) =>
                                    currentFilters.filter(
                                      (currentNutsId) =>
                                        currentNutsId !== region.nutsId
                                    )
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-800 transition hover:border-stone-400 hover:bg-stone-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
                              >
                                <span>{region.regionName}</span>
                                <span className="text-xs opacity-70">x</span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 space-y-3">
                          <input
                            type="search"
                            name="region-search"
                            autoComplete="off"
                            value={regionSearchQuery}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              startTransition(() => {
                                setRegionSearchQuery(nextValue)
                              })
                            }}
                            placeholder={`Search ${regionLevel === 'nuts2' ? 'NUTS2' : 'NUTS3'} regions…`}
                            className="w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-stone-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-stone-400"
                          />

                          <div className="flex flex-wrap gap-2">
                            {regionOptions.slice(0, 16).map((region) => {
                              const active = regionFilters.includes(region.nutsId)

                              return (
                                <button
                                  key={region.nutsId}
                                  type="button"
                                  onClick={() =>
                                    setRegionFilters((currentFilters) =>
                                      currentFilters.includes(region.nutsId)
                                        ? currentFilters.filter(
                                          (currentNutsId) =>
                                            currentNutsId !== region.nutsId
                                        )
                                        : [...currentFilters, region.nutsId]
                                    )
                                  }
                                  className={`rounded-full border px-3 py-2 text-sm transition ${active
                                    ? 'border-stone-700 bg-stone-700 text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950'
                                    : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:border-zinc-600'
                                    }`}
                                >
                                  {region.regionName}{' '}
                                  <span className="opacity-70">{region.count}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>

                  {activeFilters.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {activeFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={filter.onRemove}
                          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-200 dark:hover:border-zinc-600"
                        >
                          <span>{filter.label}</span>
                          <span className="text-xs opacity-70">x</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="px-6 py-5">
                  {groupedImpacts.length ? (
                    <div className="space-y-8">
                      {groupedImpacts.map(([year, impacts]) => (
                        <section
                          key={year}
                          className="grid gap-4 lg:grid-cols-[96px_minmax(0,1fr)] lg:gap-6"
                        >
                          <div className="lg:sticky lg:top-44 lg:self-start">
                            <div className="w-full border border-stone-200 bg-stone-50 px-4 py-4 text-left text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100">
                              <div className="text-2xl font-semibold tracking-tight">
                                {year}
                              </div>
                              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                                {impacts.length} impact{impacts.length === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>

                          <div className="relative pl-6 before:absolute before:bottom-0 before:left-[11px] before:top-0 before:w-px before:bg-stone-200 before:content-[''] dark:before:bg-zinc-800">
                            {impacts.map((impact) => {
                              const isSelected = impact.id === selectedImpact?.id
                              const locationNames = Array.from(
                                new Set(
                                  impact.locations.map(
                                    (location) =>
                                      location.naturalLocation || location.name
                                  )
                                )
                              )

                              return (
                                <div
                                  key={impact.id}
                                  className="relative pb-4 last:pb-0"
                                >
                                  <span
                                    className={`absolute left-[-20px] top-9 z-10 block h-4 w-4 rounded-full border-[1px] border-solid ${isSelected
                                      ? 'border-stone-900 bg-stone-50 dark:border-zinc-100 dark:bg-zinc-900'
                                      : 'border-stone-400 bg-stone-50 dark:border-zinc-400 dark:bg-zinc-900'
                                      }`}
                                  />

                                  <article
                                    className={`border px-5 py-4 transition duration-200 ${isSelected
                                      ? 'border-amber-600/60 border-l-4 bg-amber-50/40 shadow-[0_8px_24px_-12px_rgba(180,83,9,0.18)] dark:border-amber-400/50 dark:border-l-4 dark:bg-amber-950/15 dark:shadow-[0_8px_24px_-12px_rgba(180,83,9,0.25)]'
                                      : 'border-stone-200 bg-white hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-[0_12px_30px_-20px_rgba(41,37,36,0.18)] dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-600'
                                      }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedImpactId((currentImpactId) =>
                                          currentImpactId === impact.id
                                            ? null
                                            : impact.id
                                        )
                                      }
                                      aria-expanded={isSelected}
                                      className="w-full text-left"
                                    >
                                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                          {getImpactSubline(impact)}
                                        </span>
                                        <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                          {getPrimaryLocationLabel(impact)}
                                          {locationNames.length > 1
                                            ? ` (+${locationNames.length - 1})`
                                            : ''}
                                        </span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {impact.impactedSector}
                                        </span>
                                      </div>
                                      <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-zinc-400 dark:text-zinc-500">
                                        <span>{impact.periodOfOccurrence} · {getTimeResolutionLabel(impact.timeResolution)}</span>
                                        {impact.mappedNutsIds.length ? (
                                          <span>{impact.mappedNutsIds.length} NUTS3</span>
                                        ) : null}
                                        {impact.newsItems.length ? (
                                          <span>{impact.newsItems.length} source{impact.newsItems.length === 1 ? '' : 's'}</span>
                                        ) : null}
                                      </div>
                                    </button>

                                    {isSelected ? (
                                      <div className="mt-4 space-y-4 border-t border-stone-200 pt-4 dark:border-zinc-800">
                                        {getImpactTimeRange(impact) &&
                                          getImpactTimeRange(impact) !== getImpactSubline(impact) ? (
                                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Range </span>
                                            {getImpactTimeRange(impact)}
                                          </div>
                                        ) : null}

                                        {locationNames.length > 1 ? (
                                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Locations </span>
                                            {locationNames.join(' · ')}
                                          </div>
                                        ) : null}

                                        {impact.counterMeasures.length ? (
                                          <div className="text-sm text-zinc-600 dark:text-zinc-300">
                                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Measures </span>
                                            {impact.counterMeasures.join(', ')}
                                          </div>
                                        ) : null}

                                        {impact.speiContext ? (
                                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">SPEI-1 </span>
                                            <span
                                              className="inline-block h-3 w-3 shrink-0 rounded-full border border-white/50 dark:border-black/20"
                                              style={{ backgroundColor: impact.speiContext.color }}
                                            />
                                            <span>{impact.speiContext.label} ({impact.speiContext.value}) — {impact.speiContext.nuts3Id}, {formatYearMonth(impact.speiContext.month)}</span>
                                          </div>
                                        ) : null}

                                        {impact.newsItems.length ? (
                                          <div className="space-y-2">
                                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Sources</span>
                                            {impact.newsItems.map((newsItem) => (
                                              <div key={newsItem.id} className="text-sm">
                                                <a
                                                  href={newsItem.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="font-medium text-zinc-800 underline decoration-stone-300 underline-offset-4 transition hover:text-zinc-950 dark:text-zinc-200 dark:decoration-zinc-600 dark:hover:text-white"
                                                >
                                                  {newsItem.title}
                                                </a>
                                                <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                                                  {getUrlHostname(newsItem.url)}
                                                  {newsItem.published ? ` · ${formatCalendarDate(newsItem.published)}` : ''}
                                                </span>
                                                {newsItem.excerpt ? (
                                                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                                                    {newsItem.excerpt}
                                                  </p>
                                                ) : null}
                                              </div>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </article>
                                </div>
                              )
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-300">
                      No impacts match the active filters.
                    </div>
                  )}
                </div>
              </aside>

              <section
                className={`${mobileViewMode === 'map' ? 'block' : 'hidden'} self-start overflow-hidden border border-stone-200/80 bg-white/94 shadow-[0_20px_70px_-45px_rgba(41,37,36,0.34)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/88 xl:sticky xl:top-28 xl:block`}
              >
                <div className="border-b border-stone-200/80 px-5 py-4 dark:border-zinc-800/80">
                  <h2 className="text-lg font-semibold">Map overview</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    The map follows the same active filters as the timeline. Click
                    regions to add or remove spatial filters. Impact selection
                    happens in the timeline. Darker regions indicate higher
                    concentrations of mapped impacts.
                  </p>
                </div>

                <div className="relative h-[360px] w-full sm:h-[420px] xl:h-[calc(100vh-16rem)]">
                  {MAPBOX_TOKEN ? (
                    <MapView
                      ref={mapRef}
                      initialViewState={{
                        latitude: 46,
                        longitude: 9,
                        zoom: 5,
                        bearing: 0,
                        pitch: 0,
                      }}
                      minZoom={3}
                      maxPitch={85}
                      mapStyle={
                        theme === 'dark'
                          ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy'
                          : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'
                      }
                      mapboxAccessToken={MAPBOX_TOKEN}
                      style={{ width: '100%', height: '100%' }}
                      interactiveLayerIds={[
                        'dryalps-base-fill',
                        'dryalps-impacts-fill',
                        'dryalps-region-filter-fill',
                      ]}
                      onMouseMove={(event) => {
                        const hoveredFeature = event.features?.[0]
                        const nutsId = hoveredFeature?.properties?.NUTS_ID
                        const regionName = hoveredFeature?.properties?.NUTS_NAME

                        if (!nutsId || !regionName) {
                          setHoveredRegion(null)
                          return
                        }

                        setHoveredRegion({
                          x: event.point.x,
                          y: event.point.y,
                          nutsId,
                          regionName,
                        })
                      }}
                      onMouseLeave={() => setHoveredRegion(null)}
                      onClick={(event) => {
                        const nutsId = event.features?.[0]?.properties?.NUTS_ID

                        if (!nutsId) {
                          return
                        }

                        setRegionFilters((currentFilters) =>
                          currentFilters.includes(nutsId)
                            ? currentFilters.filter(
                              (currentNutsId) => currentNutsId !== nutsId
                            )
                            : [...currentFilters, nutsId]
                        )
                      }}
                    >
                      <Source
                        id="dryalps-nuts3"
                        type="geojson"
                        data={activeMapGeoJson as any}
                        generateId={true}
                      >
                        <Layer
                          id="dryalps-base-fill"
                          type="fill"
                          paint={{
                            'fill-color': 'rgba(214, 211, 209, 0.18)',
                            'fill-outline-color':
                              theme === 'dark' ? '#52525b' : '#d6d3d1',
                          }}
                        />
                        <Layer
                          id="dryalps-impacts-fill"
                          type="fill"
                          paint={{
                            'fill-color': fillExpression as any,
                            'fill-opacity': 0.82,
                            'fill-outline-color':
                              theme === 'dark' ? '#27272a' : '#ffffff',
                          }}
                        />
                        <Layer
                          id="dryalps-region-filter-fill"
                          type="fill"
                          filter={regionSelectionFilter}
                          paint={{
                            'fill-color': '#a8a29e',
                            'fill-opacity': 0.22,
                          }}
                        />
                        <Layer
                          id="dryalps-region-filter-outline"
                          type="line"
                          filter={regionSelectionFilter}
                          paint={{
                            'line-color': '#57534e',
                            'line-width': 3,
                            'line-opacity': 1,
                          }}
                        />
                        <Layer
                          id="dryalps-selected-outline"
                          type="line"
                          filter={selectedFilter}
                          paint={{
                            'line-color': '#c2410c',
                            'line-width': 2.75,
                            'line-opacity': 0.95,
                          }}
                        />
                      </Source>

                      <NavigationControl
                        style={{ right: 10, bottom: 120 }}
                        position="bottom-right"
                      />
                      <ScaleControl
                        maxWidth={100}
                        unit="metric"
                        position="bottom-right"
                      />
                    </MapView>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-stone-100 px-8 text-center text-sm leading-6 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                      Set <code className="mx-1 rounded bg-stone-200 px-1.5 py-0.5 dark:bg-zinc-800">NEXT_PUBLIC_MAPBOX_TOKEN</code>
                      to enable the DryAlps map.
                    </div>
                  )}

                  {hoveredRegion ? (
                    <div
                      className="pointer-events-none absolute z-10 border border-stone-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-950/95"
                      style={{ left: hoveredRegion.x + 12, top: hoveredRegion.y + 12 }}
                    >
                      <div className="font-semibold text-zinc-950 dark:text-white">
                        {hoveredRegion.regionName}
                      </div>
                      <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                        {hoveredRegion.nutsId}
                      </div>
                      <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                        {countsByNutsId[hoveredRegion.nutsId] || 0} mapped impact
                        {(countsByNutsId[hoveredRegion.nutsId] || 0) === 1 ? '' : 's'}
                      </div>
                    </div>
                  ) : null}

                  <details className="absolute left-3 top-3 z-10 w-[calc(100%-1.5rem)] max-w-sm border border-stone-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95 xl:hidden">
                    <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 marker:hidden dark:text-zinc-400">
                      Active scope
                    </summary>

                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                          Years
                        </div>
                        {yearFilters.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {yearFilters.map((year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => toggleYearFilter(year)}
                                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs text-amber-950 transition hover:border-amber-400 hover:bg-amber-200 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:border-amber-800"
                              >
                                <span>{year}</span>
                                <span className="text-xs opacity-70">x</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                            All years
                          </p>
                        )}
                      </div>

                      <div className="border-t border-stone-200 pt-3 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                          Regions
                        </div>
                        {selectedRegionLabels.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedRegionLabels.map((region) => (
                              <button
                                key={region.nutsId}
                                type="button"
                                onClick={() =>
                                  setRegionFilters((currentFilters) =>
                                    currentFilters.filter(
                                      (currentNutsId) =>
                                        currentNutsId !== region.nutsId
                                    )
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-1.5 text-xs text-stone-800 transition hover:border-stone-400 hover:bg-stone-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
                              >
                                <span>{region.regionName}</span>
                                <span className="text-xs opacity-70">x</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                            No spatial filter
                          </p>
                        )}
                      </div>
                    </div>
                  </details>

                  <div className="absolute left-4 top-4 z-10 hidden max-w-[28rem] border border-stone-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95 xl:block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                      Active scope
                    </div>

                    <div className="mt-3 space-y-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                          Years
                        </div>
                        {yearFilters.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {yearFilters.map((year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => toggleYearFilter(year)}
                                className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-2 text-sm text-amber-950 transition hover:border-amber-400 hover:bg-amber-200 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:border-amber-800"
                              >
                                <span>{year}</span>
                                <span className="text-xs opacity-70">x</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            All years
                          </p>
                        )}
                      </div>

                      <div className="border-t border-stone-200 pt-4 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                          Regions
                        </div>
                        {selectedRegionLabels.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedRegionLabels.map((region) => (
                              <button
                                key={region.nutsId}
                                type="button"
                                onClick={() =>
                                  setRegionFilters((currentFilters) =>
                                    currentFilters.filter(
                                      (currentNutsId) =>
                                        currentNutsId !== region.nutsId
                                    )
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-800 transition hover:border-stone-400 hover:bg-stone-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600"
                              >
                                <span>{region.regionName}</span>
                                <span className="text-xs opacity-70">x</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                            No spatial filter
                          </p>
                        )}
                      </div>

                      <div className="border-t border-stone-200 pt-4 dark:border-zinc-800">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                          Impact density
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {impactDensityLegend.map((item) => (
                            <div
                              key={item.label}
                              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-white/50 dark:border-black/20"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {!impactedRegionCount ? (
                    <div className="absolute inset-x-4 bottom-4 border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/85 dark:text-amber-100">
                      No mapped {regionLevel === 'nuts2' ? 'NUTS2' : 'NUTS3'} regions match the current filter set.
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {viewMode === 'tabular' ? (
            <div className="overflow-hidden border border-stone-200/80 bg-white/92 shadow-[0_20px_70px_-45px_rgba(41,37,36,0.34)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/88">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 px-6 py-5 dark:border-zinc-800/80">
                <div>
                  <h2 className="text-lg font-semibold">Tabular view</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {tableImpacts.length} impact{tableImpacts.length === 1 ? '' : 's'} — click column headers to sort.
                  </p>
                </div>
                <input
                  type="search"
                  name="table-search"
                  autoComplete="off"
                  value={tableSearchQuery}
                  onChange={(event) => setTableSearchQuery(event.target.value)}
                  placeholder="Filter table…"
                  className="w-full max-w-xs rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-stone-500 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-stone-400"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] border-collapse text-sm">
                  <thead className="border-b border-stone-300 bg-stone-100 dark:border-zinc-700 dark:bg-zinc-900">
                    <tr>
                      {[
                        { key: 'date', label: 'Date' },
                        { key: 'sector', label: 'Sector' },
                        { key: 'location', label: 'Location' },
                        { key: 'allLocations', label: 'All locations' },
                        { key: 'period', label: 'Period' },
                        { key: 'resolution', label: 'Time resolution' },
                        { key: 'specific', label: 'Specific' },
                        { key: 'measures', label: 'Counter measures' },
                        { key: 'regions', label: 'NUTS regions' },
                        { key: 'sources', label: 'Sources' },
                      ].map((col) => (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (tableSortKey === col.key) {
                              setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                            } else {
                              setTableSortKey(col.key)
                              setTableSortDir(col.key === 'date' ? 'desc' : 'asc')
                            }
                          }}
                          className="cursor-pointer select-none border-b border-r border-stone-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 transition last:border-r-0 hover:text-stone-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {col.label}
                            {tableSortKey === col.key ? (
                              <svg
                                className={`h-3.5 w-3.5 transition-transform ${tableSortDir === 'asc' ? 'rotate-180' : ''}`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 opacity-30" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3zm-3.7 9.24a.75.75 0 0 1 1.06-.04L10 15.148l2.64-2.948a.75.75 0 1 1 1.12 1l-3.2 3.574a.75.75 0 0 1-1.12 0l-3.2-3.574a.75.75 0 0 1 .04-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableImpacts.map((impact, index) => {
                      const locationNames = Array.from(
                        new Set(
                          impact.locations.map(
                            (location) => location.naturalLocation || location.name
                          )
                        )
                      )

                      return (
                        <tr
                          key={impact.id}
                          className={`transition hover:bg-stone-100 dark:hover:bg-zinc-800/60 ${index % 2 === 0
                            ? 'bg-white dark:bg-zinc-900/40'
                            : 'bg-stone-50/80 dark:bg-zinc-900/70'
                            }`}
                        >
                          <td className="whitespace-nowrap border-b border-r border-stone-100 px-4 py-3 font-medium text-zinc-900 dark:border-zinc-800/50 dark:text-zinc-100">
                            <div>{getImpactSubline(impact)}</div>
                            {getImpactTimeRange(impact) &&
                              getImpactTimeRange(impact) !== getImpactSubline(impact) ? (
                              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {getImpactTimeRange(impact)}
                              </div>
                            ) : null}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-700 dark:border-zinc-800/50 dark:text-zinc-300">
                            {impact.impactedSector}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-700 dark:border-zinc-800/50 dark:text-zinc-300">
                            {getPrimaryLocationLabel(impact)}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {locationNames.join(', ') || '—'}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 capitalize text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {impact.periodOfOccurrence}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {getTimeResolutionLabel(impact.timeResolution)}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {impact.isSpecific ? 'Yes' : 'No'}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {impact.counterMeasures.length
                              ? impact.counterMeasures.join(', ')
                              : '—'}
                          </td>
                          <td className="border-b border-r border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {impact.mappedNutsIds.length
                              ? impact.mappedNutsIds.join(', ')
                              : '—'}
                          </td>
                          <td className="border-b border-stone-100 px-4 py-3 text-zinc-600 dark:border-zinc-800/50 dark:text-zinc-400">
                            {impact.newsItems.length
                              ? impact.newsItems.map((item) => (
                                <a
                                  key={item.id}
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block truncate text-zinc-600 underline decoration-stone-300 underline-offset-4 transition hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-white"
                                  title={item.title}
                                >
                                  {item.title}
                                </a>
                              ))
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!tableImpacts.length ? (
                  <div className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No impacts match the active filters.
                  </div>
                ) : null}
              </div>
              <div className="border-t border-stone-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500 xl:hidden">
                Scroll horizontally to see all columns
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </Layout>
  )
}
