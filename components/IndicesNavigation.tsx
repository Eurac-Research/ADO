'use client'

import React, { useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu'
import { DROUGHT_CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/utils'
import {
  CloudRain,
  Droplets,
  Leaf,
  Map as MapIcon,
  Snowflake,
  type LucideIcon,
} from 'lucide-react'

type CategoryId = 'precipitation' | 'soil' | 'vegetation' | 'snow' | 'other'

const CATEGORY_ORDER: CategoryId[] = [
  'precipitation',
  'soil',
  'vegetation',
  'snow',
]

const SOIL_SET = new Set(
  DROUGHT_CATEGORIES.soil.indices.map((index) => index.toLowerCase())
)
const VEGETATION_SET = new Set(
  DROUGHT_CATEGORIES.vegetation.indices.map((index) => index.toLowerCase())
)
const SNOW_SET = new Set(
  DROUGHT_CATEGORIES.snow.indices.map((index) => index.toLowerCase())
)

interface CategoryDefinition {
  id: CategoryId
  triggerLabel: string
  heroTitle: string
  heroDescription: string
  gridClass: string
  heroClass: string
  filter: (indexLower: string) => boolean
  sort?: (a: string, b: string) => number
  icon: LucideIcon
  gradient: string[]
}

const CATEGORY_DEFINITIONS: Record<CategoryId, CategoryDefinition> = {
  precipitation: {
    id: 'precipitation',
    triggerLabel: DROUGHT_CATEGORIES.precipitation.shortName,
    heroTitle: DROUGHT_CATEGORIES.precipitation.name,
    heroDescription: DROUGHT_CATEGORIES.precipitation.description,
    gridClass:
      'grid gap-3 p-6 md:w-[500px] lg:w-[900px] lg:grid-cols-[.75fr_1fr_1fr] lg:grid-rows-[repeat(4,_minmax(0,_1fr))]',
    heroClass: 'row-span-5 lg:row-span-5',
    filter: (indexLower) =>
      indexLower.startsWith('spi') ||
      indexLower.startsWith('spei') ||
      indexLower === 'precipitation',
    sort: sortByTypeAndScale,
    icon: CloudRain,
    gradient: [
      DROUGHT_CATEGORIES.precipitation.gradient.from,
      DROUGHT_CATEGORIES.precipitation.gradient.to,
      DROUGHT_CATEGORIES.precipitation.gradient.darkFrom,
      DROUGHT_CATEGORIES.precipitation.gradient.darkTo,
    ],
  },
  soil: {
    id: 'soil',
    triggerLabel: DROUGHT_CATEGORIES.soil.shortName,
    heroTitle: DROUGHT_CATEGORIES.soil.name,
    heroDescription: DROUGHT_CATEGORIES.soil.description,
    gridClass:
      'grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]',
    heroClass: 'row-span-3',
    filter: (indexLower) => SOIL_SET.has(indexLower),
    icon: Droplets,
    gradient: [
      DROUGHT_CATEGORIES.soil.gradient.from,
      DROUGHT_CATEGORIES.soil.gradient.to,
      DROUGHT_CATEGORIES.soil.gradient.darkFrom,
      DROUGHT_CATEGORIES.soil.gradient.darkTo,
    ],
  },
  vegetation: {
    id: 'vegetation',
    triggerLabel: DROUGHT_CATEGORIES.vegetation.shortName,
    heroTitle: DROUGHT_CATEGORIES.vegetation.name,
    heroDescription: DROUGHT_CATEGORIES.vegetation.description,
    gridClass:
      'grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]',
    heroClass: 'row-span-4',
    filter: (indexLower) => VEGETATION_SET.has(indexLower),
    icon: Leaf,
    gradient: [
      DROUGHT_CATEGORIES.vegetation.gradient.from,
      DROUGHT_CATEGORIES.vegetation.gradient.to,
      DROUGHT_CATEGORIES.vegetation.gradient.darkFrom,
      DROUGHT_CATEGORIES.vegetation.gradient.darkTo,
    ],
  },
  snow: {
    id: 'snow',
    triggerLabel: DROUGHT_CATEGORIES.snow.shortName,
    heroTitle: DROUGHT_CATEGORIES.snow.name,
    heroDescription: DROUGHT_CATEGORIES.snow.description,
    gridClass:
      'grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]',
    heroClass: 'row-span-3',
    filter: (indexLower) =>
      indexLower.startsWith('sspi') || SNOW_SET.has(indexLower),
    icon: Snowflake,
    gradient: [
      DROUGHT_CATEGORIES.snow.gradient.from,
      DROUGHT_CATEGORIES.snow.gradient.to,
      DROUGHT_CATEGORIES.snow.gradient.darkFrom,
      DROUGHT_CATEGORIES.snow.gradient.darkTo,
    ],
  },
  other: {
    id: 'other',
    triggerLabel: DROUGHT_CATEGORIES.other.shortName,
    heroTitle: DROUGHT_CATEGORIES.other.name,
    heroDescription: DROUGHT_CATEGORIES.other.description,
    gridClass: 'grid gap-3 p-6 md:w-[420px]',
    heroClass: 'row-span-3',
    filter: () => false,
    icon: MapIcon,
    gradient: [
      DROUGHT_CATEGORIES.other.gradient.from,
      DROUGHT_CATEGORIES.other.gradient.to,
      DROUGHT_CATEGORIES.other.gradient.darkFrom,
      DROUGHT_CATEGORIES.other.gradient.darkTo,
    ],
  },
}

interface IndicesNavigationProps {
  indices?: string[]
  activeIndex: string
  onIndexChange?: (newIndex: string) => void
  onIndexHover?: (index: string) => Promise<void> | void
  basePath?: string
}

interface CategoryGroup extends CategoryDefinition {
  values: string[]
}

export default function IndicesNavigation({
  indices = [],
  activeIndex,
  onIndexChange,
  onIndexHover,
  basePath = '',
}: IndicesNavigationProps) {
  const router = useRouter()
  const normalizedIndices = useMemo(
    () => indices.map((index) => index.trim()).filter(Boolean),
    [indices]
  )
  const activeLower = activeIndex?.toLowerCase?.() || ''
  const normalizedBasePath = useMemo(() => {
    if (!basePath) return ''
    const trimmed = basePath.replace(/\/+$/, '')
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }, [basePath])

  const buildHref = useCallback(
    (index: string) => {
      if (!index) return '/'
      if (!normalizedBasePath) return `/${index}`
      return `${normalizedBasePath}/${index}`.replace(/\/+/, '/')
    },
    [normalizedBasePath]
  )

  const groups = useMemo<CategoryGroup[]>(() => {
    const assigned = new Set<string>()
    const result: CategoryGroup[] = []

    CATEGORY_ORDER.forEach((categoryId) => {
      const def = CATEGORY_DEFINITIONS[categoryId]
      const matches = normalizedIndices.filter((index) =>
        def.filter(index.toLowerCase())
      )
      if (matches.length) {
        if (def.sort) {
          matches.sort(def.sort)
        }
        matches.forEach((index) => assigned.add(index.toLowerCase()))
        result.push({
          ...def,
          values: matches,
        })
      }
    })

    const leftovers = normalizedIndices.filter(
      (index) => !assigned.has(index.toLowerCase())
    )

    if (leftovers.length) {
      result.push({
        ...CATEGORY_DEFINITIONS.other,
        values: leftovers,
      })
    }

    return result
  }, [normalizedIndices])

  const selectValue = useMemo(() => {
    return (
      normalizedIndices.find((index) => index.toLowerCase() === activeLower) ||
      ''
    )
  }, [normalizedIndices, activeLower])

  const navigateToIndex = (index: string) => {
    if (!index) return

    if (onIndexChange) {
      onIndexChange(index)
    } else {
      router.push(buildHref(index))
    }
  }

  if (!groups.length) {
    return null
  }

  return (
    <>
      <div className="pointer-events-none fixed left-0 right-0 top-[62px] z-20 hidden items-center w-full md:flex justify-center px-4 lg:top-[50px]">
        <div className="pointer-events-auto max-w-6xl">
          <NavigationMenu className="w-full justify-center">
            <NavigationMenuList className="group flex flex-1 list-none items-center justify-center space-x-1">
              {groups.map((group) => (
                <NavigationMenuItem key={group.id} className="relative">
                  <NavigationMenuTrigger className="rounded-md border border-transparent bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-[#b7c8ff] data-[state=open]:border-[#aac0ff] data-[state=open]:bg-[#f1f4ff] dark:border-slate-700 dark:bg-slate-900/90 dark:text-gray-100">
                    <div className="flex items-center space-x-2">
                      <group.icon className="h-4 w-4" />
                      <span>{group.triggerLabel}</span>
                    </div>
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="border border-white/80 bg-white/97 shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900/95">
                    <ul className={group.gridClass}>
                      <li className={group.heroClass}>
                        <NavigationMenuLink asChild>
                          <div
                            className={cn(
                              'flex h-full w-full select-none flex-col justify-end rounded-2xl p-6 text-gray-900 shadow-sm dark:text-gray-100',
                              'bg-[#e5edff] dark:bg-slate-800/80'
                            )}
                          >
                            <group.icon className="h-16 w-16 text-gray-700 dark:text-gray-200" />
                            <div className="mb-2 mt-4 text-lg font-semibold">
                              {group.heroTitle}
                            </div>
                            <p className="text-sm leading-tight text-gray-700 dark:text-gray-200">
                              {group.heroDescription}
                            </p>
                          </div>
                        </NavigationMenuLink>
                      </li>

                      {group.values.map((index) => {
                        const { title, description } = describeIndex(index)
                        const isActive = index.toLowerCase() === activeLower

                        return (
                          <ListItem
                            key={index}
                            title={title}
                            description={description}
                            href={onIndexChange ? undefined : buildHref(index)}
                            onClick={onIndexChange ? () => navigateToIndex(index) : undefined}
                            onMouseEnter={() => onIndexHover?.(index)}
                            isActive={isActive}
                          />
                        )
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
            <NavigationMenuViewport />
          </NavigationMenu>
        </div>
      </div>

      <div className="fixed inset-x-4 top-24 z-30 w-full  md:hidden flex justify-end pr-8">
        <div className="rounded-2xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95 max-w-52">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
            Indices
          </p>
          <label
            htmlFor="mobile-index-select"
            className="mt-2 block text-sm text-gray-700 dark:text-gray-200"
          >
            Choose a drought indicator
          </label>
          <select
            id="mobile-index-select"
            value={selectValue}
            onChange={(event) => navigateToIndex(event.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100"
          >
            <option value="" disabled>
              Select an index
            </option>
            {groups.map((group) => (
              <optgroup key={group.id} label={group.heroTitle}>
                {group.values.map((index) => {
                  const { title } = describeIndex(index)
                  return (
                    <option key={index} value={index}>
                      {title}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}

function describeIndex(index: string) {
  const indexLower = index.toLowerCase()
  const [, scale] = indexLower.split('-')

  if (indexLower.startsWith('spei')) {
    return {
      title: `SPEI-${scale || ''}`.toUpperCase(),
      description: `Standardised Precipitation-Evapotranspiration Index (${scale || '?'}-month scale)`,
    }
  }

  if (indexLower.startsWith('spi')) {
    return {
      title: `SPI-${scale || ''}`.toUpperCase(),
      description: `Standardised Precipitation Index (${scale || '?'}-month scale)`,
    }
  }

  if (indexLower.startsWith('sspi')) {
    return {
      title: `SSPI-${scale || ''}`.toUpperCase(),
      description: 'Standardised Snow Pack Index',
    }
  }

  const lookup: Record<
    string,
    {
      title: string
      description: string
    }
  > = {
    smi: { title: 'SMI', description: 'Soil Moisture Index' },
    sma: { title: 'SMA', description: 'Soil Moisture Anomalies' },
    swi: { title: 'SWI', description: 'Soil Water Index' },
    soil_moisture: {
      title: 'Soil Moisture',
      description: 'Absolute soil moisture content',
    },
    vhi: { title: 'VHI', description: 'Vegetation Health Index' },
    vci: { title: 'VCI', description: 'Vegetation Condition Index' },
    ndvi: { title: 'NDVI', description: 'Normalised Difference Vegetation Index' },
    evi: { title: 'EVI', description: 'Enhanced Vegetation Index' },
    fapar: {
      title: 'FAPAR',
      description:
        'Fraction of Absorbed Photosynthetically Active Radiation',
    },
    lai: { title: 'LAI', description: 'Leaf Area Index' },
    vegetation: {
      title: 'Vegetation',
      description: 'Composite vegetation condition',
    },
    precipitation: {
      title: 'Precipitation',
      description: 'Accumulated precipitation anomalies',
    },
    snow: { title: 'Snow', description: 'Snow cover extent' },
    swe: { title: 'SWE', description: 'Snow Water Equivalent' },
    snow_depth: { title: 'Snow Depth', description: 'Snow depth observations' },
    snow_cover: { title: 'Snow Cover', description: 'Snow cover fraction' },
    snowpack: { title: 'Snowpack', description: 'Snowpack conditions' },
  }

  if (lookup[indexLower]) {
    return lookup[indexLower]
  }

  return {
    title: index.toUpperCase(),
    description: 'Drought indicator',
  }
}

interface ListItemProps {
  title: string
  description: string
  isActive: boolean
  onClick?: () => void
  href?: string
  onMouseEnter?: () => void
}

const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ title, description, isActive, onClick, href, onMouseEnter }, ref) => {
    const content = (
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    )

    const baseClasses = cn(
      'block select-none space-y-1 rounded-xl border border-transparent p-3 text-left text-gray-900 transition hover:bg-[#f2f6ff] dark:text-gray-100 dark:hover:bg-slate-800/70',
      isActive &&
      'border-[#acc4ff] bg-[#e5edff] text-[#1d4ed8] shadow-inner dark:border-blue-500/60 dark:bg-blue-900/30 dark:text-blue-100'
    )

    if (onClick) {
      return (
        <li ref={ref}>
          <button
            type="button"
            className={cn(baseClasses, 'w-full')}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
          >
            {content}
          </button>
        </li>
      )
    }

    return (
      <li ref={ref}>
        <NavigationMenuLink asChild>
          <Link href={href || '/'} className={baseClasses} onMouseEnter={onMouseEnter}>
            {content}
          </Link>
        </NavigationMenuLink>
      </li>
    )
  }
)
ListItem.displayName = 'ListItem'

function sortByTypeAndScale(a: string, b: string) {
  const parse = (value: string) => {
    const lower = value.toLowerCase()
    let type = 'other'
    let scale = 0

    if (lower.startsWith('spei')) {
      type = 'spei'
    } else if (lower.startsWith('spi')) {
      type = 'spi'
    }

    const parts = lower.split('-')
    if (parts[1]) {
      const parsed = parseInt(parts[1], 10)
      if (!Number.isNaN(parsed)) {
        scale = parsed
      }
    }

    return { type, scale }
  }

  const aInfo = parse(a)
  const bInfo = parse(b)

  if (aInfo.type !== bInfo.type) {
    if (aInfo.type === 'spei') return -1
    if (bInfo.type === 'spei') return 1
    if (aInfo.type === 'spi') return -1
    if (bInfo.type === 'spi') return 1
  }

  return aInfo.scale - bInfo.scale
}
