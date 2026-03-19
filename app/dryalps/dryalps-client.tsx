'use client'

import Link from 'next/link'
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
  const [theme] = useThemeContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [regionSearchQuery, setRegionSearchQuery] = useState('')
  const [sectorFilter, setSectorFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [yearFilters, setYearFilters] = useState<string[]>([])
  const [speiFilters, setSpeiFilters] = useState<string[]>([])
  const [counterMeasureFilters, setCounterMeasureFilters] = useState<string[]>(
    []
  )
  const [regionFilters, setRegionFilters] = useState<string[]>([])
  const [showMappedOnly, setShowMappedOnly] = useState(false)
  const [selectedImpactId, setSelectedImpactId] = useState<number | null>(
    dataset.impacts[0]?.id ?? null
  )
  const [hoveredRegion, setHoveredRegion] = useState<{
    x: number
    y: number
    nutsId: string
    regionName: string
  } | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const deferredRegionSearchQuery = useDeferredValue(regionSearchQuery)

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

    return nextRegionNameById
  }, [dataset.nutsMap.features])

  const allCountsByNutsId = useMemo(() => {
    const counts: Record<string, number> = {}

    dataset.impacts.forEach((impact) => {
      impact.mappedNutsIds.forEach((nutsId) => {
        counts[nutsId] = (counts[nutsId] || 0) + 1
      })
    })

    return counts
  }, [dataset.impacts])

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
      if (sectorFilter !== 'all' && impact.impactedSector !== sectorFilter) {
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
        !impact.mappedNutsIds.some((nutsId) => selectedRegionSet.has(nutsId))
      ) {
        return false
      }

      if (showMappedOnly && !impact.mappedNutsIds.length) {
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
    periodFilter,
    regionFilters,
    selectedCounterMeasureSet,
    sectorFilter,
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

  useEffect(() => {
    if (!filteredImpacts.length) {
      setSelectedImpactId(null)
      return
    }

    const hasSelectedImpact = filteredImpacts.some(
      (impact) => impact.id === selectedImpactId
    )

    if (!hasSelectedImpact) {
      setSelectedImpactId(filteredImpacts[0].id)
    }
  }, [filteredImpacts, selectedImpactId])

  const selectedImpact =
    filteredImpacts.find((impact) => impact.id === selectedImpactId) ||
    filteredImpacts[0] ||
    null

  const countsByNutsId = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredImpacts.forEach((impact) => {
      impact.mappedNutsIds.forEach((nutsId) => {
        counts[nutsId] = (counts[nutsId] || 0) + 1
      })
    })

    return counts
  }, [filteredImpacts])

  const impactedRegionCount = useMemo(
    () => Object.keys(countsByNutsId).length,
    [countsByNutsId]
  )

  const coveredYearsCount = useMemo(
    () => new Set(filteredImpacts.map((impact) => getImpactYear(impact))).size,
    [filteredImpacts]
  )

  const selectedImpactNutsIds = selectedImpact?.mappedNutsIds || []

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

    if (sectorFilter !== 'all') {
      filters.push({
        id: 'sector',
        label: `Sector: ${sectorFilter}`,
        onRemove: () => setSectorFilter('all'),
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
    sectorFilter,
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

  const fillExpression = useMemo(
    () => buildImpactCountExpression(countsByNutsId),
    [countsByNutsId]
  )

  const selectedFilter = useMemo<any>(
    () =>
      selectedImpactNutsIds.length
        ? ['in', ['get', 'NUTS_ID'], ['literal', selectedImpactNutsIds]]
        : ['==', ['get', 'NUTS_ID'], ''],
    [selectedImpactNutsIds]
  )

  const regionSelectionFilter = useMemo<any>(
    () =>
      regionFilters.length
        ? ['in', ['get', 'NUTS_ID'], ['literal', regionFilters]]
        : ['==', ['get', 'NUTS_ID'], ''],
    [regionFilters]
  )

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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.08),_transparent_32%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_44%,_#ffffff_100%)] pt-28 text-zinc-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(180,83,9,0.12),_transparent_28%),linear-gradient(180deg,_#09090b_0%,_#18181b_48%,_#27272a_100%)] dark:text-zinc-100">
        <section className="mx-auto flex w-full max-w-[1760px] flex-col gap-6 px-4 pb-10 md:px-6 xl:px-8">
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
                      className={`rounded-full px-3 py-1.5 font-medium transition ${
                        dataMode === 'api'
                          ? 'bg-stone-800 text-stone-50 dark:bg-stone-100 dark:text-stone-950'
                          : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      API
                    </Link>
                    <Link
                      href="/dryalps?source=mock"
                      className={`rounded-full px-3 py-1.5 font-medium transition ${
                        dataMode === 'mock'
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
                    drought-impact database for the Italian Alps. This interface
                    foregrounds that goal by treating impacts as time-stamped
                    events that can be followed across years, sectors and places.
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
                    Impacted NUTS3
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

          <div className="grid gap-6 xl:grid-cols-[minmax(620px,1.28fr)_minmax(420px,0.72fr)]">
            <aside className="overflow-visible border border-stone-200/80 bg-white/92 shadow-[0_20px_70px_-45px_rgba(41,37,36,0.34)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/88">
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
                        setSectorFilter('all')
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

                <section className="z-20 mt-5 border border-stone-200 bg-stone-50/95 p-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                        Temporal pulse
                      </div>
                      <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        Click one or more years to filter the timeline and the map.
                      </p>
                    </div>

                    <div className="rounded-full border border-stone-700 bg-stone-700 px-3 py-1 text-xs font-medium text-stone-50 dark:border-stone-300 dark:bg-stone-200 dark:text-stone-950">
                      {yearFilters.length
                        ? `Selected years: ${yearScopeLabel}`
                        : 'Selected years: All years'}
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto pb-1">
                    <div className="flex min-w-max items-end gap-3">
                      {pulseYears.map(([year, impacts]) => {
                        const isSelectedYear = yearFilters.includes(year)
                        const barHeight = Math.max(
                          18,
                          Math.round((impacts.length / maxGroupedYearCount) * 84)
                        )

                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => toggleYearFilter(year)}
                            className={`group flex w-16 shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition ${
                              isSelectedYear
                                ? 'border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950'
                                : 'border-stone-200 bg-white text-zinc-700 hover:border-stone-400 hover:bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex h-24 items-end">
                              <div
                                className={`w-5 rounded-full transition ${
                                  isSelectedYear
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
                      const active = sectorFilter === sector
                      return (
                        <button
                          key={sector}
                          type="button"
                          onClick={() =>
                            setSectorFilter(active ? 'all' : sector)
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
                  <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 marker:hidden dark:text-zinc-200">
                    More filters
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      search, period, SPEI-1, measures, mapping, regions
                    </span>
                  </summary>

                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                        Search
                      </span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          startTransition(() => {
                            setSearchQuery(nextValue)
                          })
                        }}
                        placeholder="Search impacts, places, measures or news..."
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
                              className={`rounded-full border px-3 py-2 text-sm transition ${
                                active
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
                          className={`rounded-full border px-3 py-2 text-sm transition ${
                            showMappedOnly
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
                                className={`rounded-full border px-3 py-2 text-sm transition ${
                                  active
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
                                className={`rounded-full border px-3 py-2 text-sm transition ${
                                  active
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
                        {selectedRegionLabels.length ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {selectedRegionLabels.length} selected
                          </div>
                        ) : null}
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
                          value={regionSearchQuery}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            startTransition(() => {
                              setRegionSearchQuery(nextValue)
                            })
                          }}
                          placeholder="Search NUTS3 regions..."
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
                                className={`rounded-full border px-3 py-2 text-sm transition ${
                                  active
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
                          <button
                            type="button"
                            onClick={() => toggleYearFilter(year)}
                            className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                              yearFilters.includes(year)
                                ? 'border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950'
                                : 'border-stone-200 bg-stone-50 text-zinc-800 hover:border-stone-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-2xl font-semibold tracking-tight">
                              {year}
                            </div>
                            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] opacity-70">
                              {impacts.length} impact{impacts.length === 1 ? '' : 's'}
                            </div>
                          </button>
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
                                  className={`absolute left-[-16px] top-9 h-4 w-4 rounded-full border-4 ${
                                    isSelected
                                      ? 'border-stone-600 bg-white dark:bg-zinc-950'
                                      : 'border-stone-300 bg-white dark:border-zinc-700 dark:bg-zinc-950'
                                  }`}
                                />

                                <article
                                  className={`border px-5 py-5 transition duration-200 ${
                                    isSelected
                                      ? 'border-amber-700/50 bg-stone-200 shadow-[0_18px_45px_-35px_rgba(41,37,36,0.28)] dark:border-amber-400/50 dark:bg-stone-800/85'
                                      : 'border-stone-200 bg-white hover:-translate-y-0.5 hover:border-stone-500 hover:bg-stone-50 hover:shadow-[0_22px_50px_-32px_rgba(41,37,36,0.22)] dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-stone-500 dark:hover:bg-zinc-900/80'
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
                                    className="w-full text-left"
                                  >
                                    <div className="grid gap-4 xl:grid-cols-[156px_minmax(0,1fr)_auto]">
                                      <div className="border border-stone-200 bg-stone-50/90 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-950/60">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-zinc-400">
                                          When
                                        </div>
                                        <div className="mt-2 text-lg font-semibold leading-6 text-zinc-950 dark:text-white">
                                          {getImpactSubline(impact)}
                                        </div>
                                        <div className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                                          {getImpactTemporalMeta(impact)}
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                          <span
                                            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                            style={{
                                              backgroundColor: `${sectorColors[impact.impactedSector] || sectorColors.Others}18`,
                                              color:
                                                sectorColors[impact.impactedSector] ||
                                                sectorColors.Others,
                                            }}
                                          >
                                            {impact.impactedSector}
                                          </span>
                                        </div>

                                        <h3 className="text-lg font-semibold leading-7 text-zinc-950 dark:text-white">
                                          {getImpactHeading(impact)}
                                        </h3>

                                        {locationNames.length ? (
                                          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                            {locationNames.join(' · ')}
                                          </p>
                                        ) : null}
                                      </div>

                                      <div className="shrink-0 border border-stone-200 bg-stone-50 px-3 py-2 text-right text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
                                        <div>
                                          {impact.mappedNutsIds.length
                                            ? `${impact.mappedNutsIds.length} NUTS3`
                                            : 'List only'}
                                        </div>
                                        <div className="mt-1">
                                          {impact.newsItems.length
                                            ? `${impact.newsItems.length} source${impact.newsItems.length === 1 ? '' : 's'}`
                                            : 'No source'}
                                        </div>
                                      </div>
                                    </div>
                                  </button>

                                  {isSelected ? (
                                    <div className="mt-5 space-y-4 border-t border-stone-300/80 pt-4 dark:border-zinc-700/70">
                                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                        <div className="border border-stone-200 bg-stone-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                                          <div className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                                            Time
                                          </div>
                                          <dl className="mt-3 space-y-3 text-sm leading-6">
                                            {getImpactTimeRange(impact) &&
                                            getImpactTimeRange(impact) !==
                                              getImpactSubline(impact) ? (
                                              <div className="flex items-start justify-between gap-4">
                                                <dt className="text-zinc-500 dark:text-zinc-400">
                                                  Structured range
                                                </dt>
                                                <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                                                  {getImpactTimeRange(impact)}
                                                </dd>
                                              </div>
                                            ) : null}

                                            <div className="flex items-start justify-between gap-4">
                                              <dt className="text-zinc-500 dark:text-zinc-400">
                                                Period
                                              </dt>
                                              <dd className="text-right font-medium capitalize text-zinc-900 dark:text-zinc-100">
                                                {impact.periodOfOccurrence}
                                              </dd>
                                            </div>

                                            <div className="flex items-start justify-between gap-4">
                                              <dt className="text-zinc-500 dark:text-zinc-400">
                                                Precision
                                              </dt>
                                              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                                                {getTimeResolutionLabel(impact.timeResolution)}
                                              </dd>
                                            </div>
                                          </dl>
                                        </div>

                                        <div className="border border-stone-200 bg-stone-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                                          <div className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                                            Counter measures
                                          </div>
                                          {impact.counterMeasures.length ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                              {impact.counterMeasures.map((measure) => (
                                                <span
                                                  key={measure}
                                                  className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                                >
                                                  {measure}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                                              No counter measures are recorded for this impact.
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {impact.speiContext ? (
                                        <div className="border border-stone-200 bg-stone-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                              <div className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                                                SPEI-1 Context
                                              </div>
                                              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                                                Mock drought context for{' '}
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                  {impact.speiContext.nuts3Id}
                                                </span>{' '}
                                                in{' '}
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                  {formatYearMonth(
                                                    impact.speiContext.month
                                                  )}
                                                </span>
                                                .
                                              </p>
                                            </div>

                                            <span
                                              className="inline-flex rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                                              style={{
                                                backgroundColor:
                                                  impact.speiContext.color,
                                              }}
                                            >
                                              {impact.speiContext.label}
                                            </span>
                                          </div>

                                          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                                            <span className="rounded-full border border-stone-200 bg-white px-3 py-2 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                              SPEI-1 {impact.speiContext.value}
                                            </span>
                                            <span className="rounded-full border border-stone-200 bg-white px-3 py-2 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                              NUTS3 {impact.speiContext.nuts3Id}
                                            </span>
                                          </div>
                                        </div>
                                      ) : null}

                                    {impact.newsItems.length ? (
                                      impact.newsItems.map((newsItem) => (
                                        <div
                                          key={newsItem.id}
                                          className="border border-stone-200 bg-stone-50/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50"
                                        >
                                          <div className="text-xs uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                                            {formatCalendarDate(newsItem.published)}
                                          </div>

                                          <h4 className="mt-2 text-base font-semibold leading-6 text-zinc-950 dark:text-white">
                                            {newsItem.title}
                                          </h4>

                                          <div className="mt-3 border border-stone-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-stone-500 dark:text-zinc-400">
                                              Source
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                                                {getUrlHostname(newsItem.url)}
                                              </span>
                                              <a
                                                href={newsItem.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={newsItem.url}
                                                className="min-w-0 flex-1 truncate text-sm text-zinc-600 underline decoration-stone-300 underline-offset-4 transition hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-white"
                                              >
                                                {truncateUrl(newsItem.url)}
                                              </a>
                                            </div>
                                          </div>

                                          {newsItem.excerpt ? (
                                            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                                              {newsItem.excerpt}
                                            </p>
                                          ) : null}

                                          <div className="mt-4">
                                            <a
                                              href={newsItem.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center rounded-full bg-stone-800 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
                                            >
                                              Open article
                                            </a>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-300">
                                        No related news items are exposed for this impact.
                                      </div>
                                    )}
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

            <section className="self-start overflow-hidden border border-stone-200/80 bg-white/94 shadow-[0_20px_70px_-45px_rgba(41,37,36,0.34)] backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-900/88 xl:sticky xl:top-28">
              <div className="flex items-center justify-between border-b border-stone-200/80 px-5 py-4 dark:border-zinc-800/80">
                <div>
                  <h2 className="text-lg font-semibold">Map overview</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    The map follows the same active filters as the timeline. Click
                    regions to add or remove spatial filters; the active impact
                    stays highlighted on the ADO NUTS3 base map.
                  </p>
                </div>
                <div className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
                  ADO NUTS3 base map
                </div>
              </div>

              <div className="relative h-[520px] w-full xl:h-[calc(100vh-16rem)]">
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

                      const normalizedQuery =
                        deferredSearchQuery.trim().toLowerCase()
                      const nextImpact = dataset.impacts.find((impact) => {
                        if (!impact.mappedNutsIds.includes(nutsId)) {
                          return false
                        }

                        if (
                          sectorFilter !== 'all' &&
                          impact.impactedSector !== sectorFilter
                        ) {
                          return false
                        }

                        if (
                          periodFilter !== 'all' &&
                          impact.periodOfOccurrence !== periodFilter
                        ) {
                          return false
                        }

                        if (showMappedOnly && !impact.mappedNutsIds.length) {
                          return false
                        }

                        if (
                          normalizedQuery &&
                          !impact.searchableText.includes(normalizedQuery)
                        ) {
                          return false
                        }

                        return true
                      })

                      if (nextImpact) {
                        setSelectedImpactId(nextImpact.id)
                      }
                    }}
                  >
                    <Source
                      id="dryalps-nuts3"
                      type="geojson"
                      data={dataset.nutsMap as any}
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

                <div className="absolute left-4 top-4 z-10 max-w-[28rem] border border-stone-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
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
                  </div>
                </div>

                {!impactedRegionCount ? (
                  <div className="absolute inset-x-4 bottom-4 border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/85 dark:text-amber-100">
                    No mapped NUTS3 regions match the current filter set.
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </div>
    </Layout>
  )
}
