'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ControlPanel from '@/components/ControlPanel'
import { updatePercentiles } from '@/components/utils'
import Layout from '@/components/layout'
import TimeSeriesLegend from '@/components/timeSeriesLegend'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-format-parse'
import axios from 'axios'
import { useThemeContext } from '@/context/theme'
import type { PostData } from '@/types'
import { CloudRain, Droplets, Leaf, Snowflake, ChevronDown, Map as MapIcon } from 'lucide-react'
import { DROUGHT_CATEGORIES, getCategoryForIndex } from '@/lib/categories'
import RegionDetail from '@/components/RegionDetail'
import HighResTiffLayer from '@/components/HighResTiffLayer'
import { ColorStop } from '@/lib/tiff-renderer'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import React from 'react'

import 'mapbox-gl/dist/mapbox-gl.css'

// Dynamic import for TimeSeries to prevent SSR issues
const TimeSeries = dynamic(() => import('@/components/timeseries'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface IndexClientProps {
  datatype: string
  staticData: any
  staticMetaData: any
  extractedMetadata?: any
  allPosts: PostData[]
  indices: string[]
  error?: string
  onIndexChange?: (newIndex: string) => void
  onIndexHover?: (index: string) => Promise<void>
}

interface HoverInfo {
  rgbaColor: string
  feature: any
  x: number
  y: number
}

interface ClickInfo {
  feature: any
}

// ListItem component for NavigationMenu (from official Shadcn demo)
const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & {
    title: string
    children?: React.ReactNode
    href?: string
    onClick?: () => void
    isActive?: boolean
  }
>(({ className, title, children, href, onClick, isActive, onMouseEnter, ...props }, ref) => {
  const content = (
    <>
      <div className="text-sm font-medium leading-none">{title}</div>
      <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
        {children}
      </p>
    </>
  )

  const baseClasses = cn(
    "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-blue-50 hover:text-blue-900 dark:hover:bg-blue-900/20 dark:hover:text-blue-100 focus:bg-blue-50 focus:text-blue-900 dark:focus:bg-blue-900/20 dark:focus:text-blue-100",
    isActive && "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100 border border-blue-300 dark:border-blue-600",
    className
  )

  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          onMouseEnter={onMouseEnter as any}
          className={cn(baseClasses, "w-full text-left")}
        >
          {content}
        </button>
      </li>
    )
  }

  return (
    <li className='relative' data-name="nav-list-item">
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          href={href}
          className={baseClasses}
          onMouseEnter={onMouseEnter}
          {...props}
        >
          {content}
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

export default function IndexClient({
  datatype,
  staticData,
  staticMetaData,
  extractedMetadata,
  allPosts,
  indices,
  error,
  onIndexChange,
  onIndexHover
}: IndexClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [theme] = useThemeContext()

  // Get region from URL parameters
  const selectedRegion = searchParams.get('region')

  // State
  const [day, setDay] = useState(
    extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate
  )
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [showHighResMap, setShowHighResMap] = useState(false)

  // Forecast state - next 4 weeks with uncertainty levels
  const [forecastWeeks, setForecastWeeks] = useState(() => {
    const lastDate = extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate
    if (!lastDate) return []

    const lastDateTime = new Date(lastDate)
    const forecasts = []

    for (let week = 1; week <= 4; week++) {
      const forecastDate = new Date(lastDateTime)
      forecastDate.setDate(forecastDate.getDate() + (week * 7))

      forecasts.push({
        date: format(forecastDate, 'YYYY-MM-DD'),
        week: week,
        uncertainty: (week === 1 ? 'low' : week === 2 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
        confidence: week === 1 ? 85 : week === 2 ? 70 : week <= 3 ? 55 : 40
      })
    }

    return forecasts
  })

  // Memoized values
  const dataLayer = useMemo(() => {
    return staticMetaData ? staticMetaData?.colormap : {}
  }, [staticMetaData])


  // Memoized values
  const metadata = useMemo(() => {
    return staticMetaData
  }, [staticMetaData])

  // Helper function to determine active category
  const getActiveCategory = useMemo(() => {
    const category = getCategoryForIndex(datatype)
    return category?.id || null
  }, [datatype])

  const timestamp = format(day, 'X')
  const dayFromTimestamp = parseInt(timestamp) / 60 / 60 / 24
  const firstDayTimestamp =
    parseInt(format(extractedMetadata?.properties?.firstDate || staticData?.metadata?.properties?.firstDate, 'X')) / 60 / 60 / 24
  const lastDayTimestamp =
    parseInt(format(extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate, 'X')) / 60 / 60 / 24

  // Effect to update day when staticData changes (when index changes)
  useEffect(() => {
    const lastDate = extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate
    if (lastDate) {
      setDay(lastDate)
    }
  }, [extractedMetadata?.properties?.lastDate, staticData?.metadata?.properties?.lastDate, staticData?.metadata?.properties?.firstDate, datatype])

  // Fix day if it's out of range
  const fixedDay =
    dayFromTimestamp > lastDayTimestamp
      ? setDay(
        format(new Date(lastDayTimestamp * 60 * 60 * 24 * 1000), 'YYYY-MM-DD')
      )
      : dayFromTimestamp < firstDayTimestamp
        ? setDay(
          format(new Date(lastDayTimestamp * 60 * 60 * 24 * 1000), 'YYYY-MM-DD')
        )
        : day

  const data = useMemo(() => {
    const result = staticData &&
      updatePercentiles(staticData, (f: any) => f.properties[`${datatype}`][day])
    return result
  }, [datatype, staticData, day])

  // Event handlers
  const onHover = useCallback((event: any) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]
    const featureColor = `rgba(${Math.round(
      hoveredFeature?.layer?.paint?.['fill-color'].r * 255
    )},${Math.round(
      hoveredFeature?.layer?.paint?.['fill-color'].g * 255
    )},${Math.round(hoveredFeature?.layer?.paint?.['fill-color'].b * 255)},1)`

    setHoverInfo(hoveredFeature && {
      rgbaColor: featureColor,
      feature: hoveredFeature,
      x,
      y
    })
  }, [])

  const onOut = useCallback(() => {
    setHoverInfo(null)
  }, [])

  const onClick = useCallback(async (event: any) => {
    const { features } = event
    const hoveredFeature = features && features[0]
    const nutsId = hoveredFeature ? hoveredFeature?.properties?.NUTS_ID : null

    if (nutsId) {
      // Update URL to include region parameter
      const newSearchParams = new URLSearchParams(searchParams.toString())
      newSearchParams.set('region', nutsId)
      router.push(`?${newSearchParams.toString()}`, { scroll: false })
    }
  }, [router, searchParams])

  // Get selected region feature from the data
  const selectedRegionFeature = useMemo(() => {
    if (!selectedRegion || !data?.features) return null

    return data.features.find((feature: any) =>
      feature.properties?.NUTS_ID === selectedRegion
    )
  }, [selectedRegion, data])

  const onClose = useCallback(() => {
    // Remove region parameter from URL
    const newSearchParams = new URLSearchParams(searchParams.toString())
    newSearchParams.delete('region')
    const newPath = newSearchParams.toString() ? `?${newSearchParams.toString()}` : window.location.pathname
    router.push(newPath, { scroll: false })
  }, [router, searchParams])

  // Custom tooltip component
  function CustomTooltip({ payload, label, active }: any) {
    if (active && payload && payload.length) {
      const valueStyle = {
        color: payload[0].value > 0 ? `#000` : `#d73232`,
      }
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p>
            {payload[0].name}:{' '}
            <span style={valueStyle}>{payload[0].value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Loading state
  if (metadata === undefined) {
    return <>Loading...</>
  }

  // Error state
  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="error-container">
          <h1>Error Loading Data</h1>
          <p>{error}</p>
        </div>
      </Layout>
    )
  }

  const scaleControlStyle = {}
  const navControlStyle = {}



  return (
    <Layout posts={allPosts}>
      <div className="reactMap">
        <Map
          key="stable-map" // Stable key to prevent remounting
          initialViewState={{
            latitude: 46,
            longitude: 9,
            zoom: 5,
            bearing: 0,
            pitch: 0,
          }}
          minZoom={3}
          maxPitch={85}
          style={{ width: '100vw', height: '100vh' }}
          mapStyle={
            theme === 'dark'
              ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy'
              : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'
          }
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >
          <Source type="geojson" data={data} generateId={true}>
            <Layer {...dataLayer} beforeId="waterway-shadow" />
          </Source>

          {/* High-resolution TIFF layer */}
          <HighResTiffLayer
            index={datatype}
            colorStops={(() => {
              // Convert metadata colormap stops to ColorStop format
              const stops = staticMetaData?.colormap?.paint?.['fill-color']?.stops || []
              return stops.map((stop: any) => ({
                value: stop[0],
                color: stop[1]
              })) as ColorStop[]
            })()}
            isActive={showHighResMap}
          />

          <ScaleControl
            maxWidth={100}
            unit="metric"
            style={scaleControlStyle}
            position={'bottom-right'}
          />
          <NavigationControl
            style={navControlStyle}
            position={'bottom-right'}
          />
          {hoverInfo && (
            <div
              className="tooltip"
              style={{ left: hoverInfo.x, top: hoverInfo.y }}
            >
              <span className="indexName">
                {datatype} - {day}
              </span>
              <span className="indexValue">
                {hoverInfo?.feature?.properties?.value ? (
                  <>
                    <span
                      className="indexValueColorDot"
                      style={{ backgroundColor: hoverInfo?.rgbaColor }}
                    ></span>
                    {hoverInfo.feature.properties.value}

                    <span className="block text-xs">
                      {(() => {
                        const value = parseFloat(hoverInfo.feature.properties.value)
                        const stops = metadata.colormap.legend.stops

                        const sortedStops = [...stops].sort((a: any, b: any) =>
                          parseFloat(a[0]) - parseFloat(b[0])
                        )

                        if (value < parseFloat(sortedStops[0][0])) {
                          return sortedStops[0]['1']
                        }

                        if (value >= parseFloat(sortedStops[sortedStops.length - 1][0])) {
                          return sortedStops[sortedStops.length - 1]['1']
                        }

                        for (let i = 0; i < sortedStops.length - 1; i++) {
                          const currentValue = parseFloat(sortedStops[i][0])
                          const nextValue = parseFloat(sortedStops[i + 1][0])
                          if (value >= currentValue && value < nextValue) {
                            return sortedStops[i]['1']
                          }
                        }

                        return ''
                      })()}
                    </span>
                  </>
                ) : (
                  'no value'
                )}
              </span>
              <span className="tooltipLocation">
                {hoverInfo.feature.properties.NUTS_NAME}
              </span>
              <span className="tooltipCTA mt-2 text-white/60 leading-[120%]">
                Click to view details <br />and historical data
              </span>
            </div>
          )}
        </Map>
      </div>

      {/* Legend over the map */}
      <div className="controlContainer">

        <div className="legend relative bottom-[30vh]">

          {/* High Resolution Map Toggle Button */}
          {datatype.toLowerCase() === 'vhi' && (
            <button
              onClick={() => setShowHighResMap(!showHighResMap)}
              className={cn(
                "w-full mb-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg",
                showHighResMap
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-white/95 text-gray-800 hover:bg-white border-2 border-blue-500"
              )}
            >
              <MapIcon className="w-5 h-5" />
              {showHighResMap ? 'Standard Map' : 'High Resolution Map'}
            </button>
          )}

          {staticMetaData?.colormap?.legend.stops.map((item: any, index: number) => {
            return (
              <div key={`legend${index}`} className="legendItem">
                <div
                  className="legendColor"
                  style={{ background: item['2'] }}
                ></div>
                <p className="legendLabel">{item['1']}</p>
              </div>
            )
          })}
        </div>
      </div>


      <div className="navigationXXX z-20 absolute top-10 flex items-center w-full justify-center ">
        <p className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 hidden">Drought Indices</p>

        <NavigationMenu className=''>
          <NavigationMenuList>

            {/* Precipitation and Evapotranspiration Category */}
            <NavigationMenuItem className='relative'>
              <NavigationMenuTrigger className="bg-white/90">
                <div className="flex items-center space-x-2">
                  <CloudRain className="w-4 h-4" />
                  <span>Precipitation</span>
                </div>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700'>
                <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[900px] lg:grid-cols-[.75fr_1fr_1fr] lg:grid-rows-[repeat(4,_minmax(0,_1fr))]">
                  <li className="row-span-5 lg:row-span-5">
                    <NavigationMenuLink asChild>
                      <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-900 p-6 no-underline outline-none focus:shadow-md">
                        <CloudRain className="h-20 w-20" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          Precipitation & Evapotranspiration Indices
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Monitor drought through standardized precipitation and evapotranspiration measures.
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </li>
                  {indices?.filter(index =>
                    index.toLowerCase().startsWith('spi') || index.toLowerCase().startsWith('spei') || ['precipitation'].includes(index.toLowerCase())
                  )
                    .sort((a, b) => {
                      // Sort by type (SPEI first, then SPI) and then by time scale
                      const aLower = a.toLowerCase()
                      const bLower = b.toLowerCase()

                      // Extract type and scale
                      const getTypeAndScale = (index: string) => {
                        if (index.startsWith('spei')) {
                          return { type: 'spei', scale: parseInt(index.split('-')[1]) || 0 }
                        }
                        if (index.startsWith('spi')) {
                          return { type: 'spi', scale: parseInt(index.split('-')[1]) || 0 }
                        }
                        return { type: 'other', scale: 0 }
                      }

                      const aInfo = getTypeAndScale(aLower)
                      const bInfo = getTypeAndScale(bLower)

                      // First sort by type (SPEI before SPI)
                      if (aInfo.type !== bInfo.type) {
                        if (aInfo.type === 'spei') return -1
                        if (bInfo.type === 'spei') return 1
                        if (aInfo.type === 'spi') return -1
                        if (bInfo.type === 'spi') return 1
                      }

                      // Then sort by scale (1, 3, 6, 12)
                      return aInfo.scale - bInfo.scale
                    })
                    .map((index) => {
                      const indexLower = index.toLowerCase()
                      const isSpei = indexLower.startsWith('spei')
                      const isSpi = indexLower.startsWith('spi')

                      const title = isSpei ? `SPEI-${index.split('-')[1]}` : isSpi ? `SPI-${index.split('-')[1]}` : index.toUpperCase()

                      let description = "Precipitation data"
                      if (isSpei) {
                        const scale = index.split('-')[1]
                        description = `Standardised Precipitation-Evapotranspiration Index (${scale}-month scale)`
                      } else if (isSpi) {
                        const scale = index.split('-')[1]
                        description = `Standardised Precipitation Index (${scale}-month time scale)`
                      }

                      return (
                        <ListItem
                          key={index}
                          title={title}
                          href={onIndexChange ? undefined : `/${index}`}
                          onClick={onIndexChange ? () => onIndexChange(index) : undefined}
                          onMouseEnter={() => onIndexHover?.(index)}
                          isActive={datatype.toLowerCase() === index}
                        >
                          {description}
                        </ListItem>
                      )
                    })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Soil Moisture Category */}
            <NavigationMenuItem className='relative'>
              <NavigationMenuTrigger className="bg-white/90">
                <div className="flex items-center space-x-2">
                  <Droplets className="w-4 h-4" />
                  <span>Soil Moisture</span>
                </div>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700'>
                <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-900 p-6 no-underline outline-none focus:shadow-md">
                        <Droplets className="h-20 w-20" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          Soil Moisture Indices
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Monitor drought through soil water content and moisture anomalies.
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </li>
                  {indices?.filter(index =>
                    ['smi', 'soil_moisture', 'swi', 'sma'].includes(index.toLowerCase())
                  ).map((index) => {
                    const indexLower = index.toLowerCase()
                    const title = indexLower === 'sma' ? 'SMA' : index.toUpperCase()
                    const description = indexLower === 'sma' ? "Soil Moisture Anomalies" : "Soil moisture data"

                    return (
                      <ListItem
                        key={index}
                        title={title}
                        href={onIndexChange ? undefined : `/${index}`}
                        onClick={onIndexChange ? () => onIndexChange(index) : undefined}
                        onMouseEnter={() => onIndexHover?.(index)}
                        isActive={datatype.toLowerCase() === index}
                      >
                        {description}
                      </ListItem>
                    )
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Vegetation Category */}
            <NavigationMenuItem className='relative'>
              <NavigationMenuTrigger className="bg-white/90">
                <div className="flex items-center space-x-2">
                  <Leaf className="w-4 h-4" />
                  <span>Vegetation</span>
                </div>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700'>
                <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-4">
                    <NavigationMenuLink asChild>
                      <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-900 p-6 no-underline outline-none focus:shadow-md">
                        <Leaf className="h-20 w-20" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          Vegetation Indices
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Monitor vegetation health and condition through satellite-derived measurements.
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </li>
                  {indices?.filter(index =>
                    ['vci', 'vhi', 'ndvi', 'evi', 'vegetation', 'fapar', 'lai'].includes(index.toLowerCase())
                  ).map((index) => {
                    const indexLower = index.toLowerCase()
                    let title = index.toUpperCase()
                    let description = "Vegetation data"

                    if (indexLower === 'vhi') {
                      title = 'VHI'
                      description = "Vegetation Health Index"
                    } else if (indexLower === 'vci') {
                      title = 'VCI'
                      description = "Vegetation Condition Index"
                    }

                    return (
                      <ListItem
                        key={index}
                        title={title}
                        href={onIndexChange ? undefined : `/${index}`}
                        onClick={onIndexChange ? () => onIndexChange(index) : undefined}
                        onMouseEnter={() => onIndexHover?.(index)}
                        isActive={datatype.toLowerCase() === index}
                      >
                        {description}
                      </ListItem>
                    )
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Snow Category */}
            <NavigationMenuItem className='relative'>
              <NavigationMenuTrigger className="bg-white/90">
                <div className="flex items-center space-x-2">
                  <Snowflake className="w-4 h-4" />
                  <span>Snow</span>
                </div>
              </NavigationMenuTrigger>
              <NavigationMenuContent className='bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700'>
                <ul className="grid gap-3 p-6 md:w-[500px] lg:w-[600px] lg:grid-cols-[.75fr_1fr]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <div className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-900 p-6 no-underline outline-none focus:shadow-md">
                        <Snowflake className="h-20 w-20" />
                        <div className="mb-2 mt-4 text-lg font-medium">
                          Snow Indices
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Monitor snow cover, depth, and water equivalent for drought assessment.
                        </p>
                      </div>
                    </NavigationMenuLink>
                  </li>
                  {indices?.filter(index =>
                    index.toLowerCase().startsWith('sspi') || ['snow', 'swe', 'snow_depth', 'snow_cover', 'snowpack'].includes(index.toLowerCase())
                  ).map((index) => {
                    const indexLower = index.toLowerCase()
                    let title = index.toUpperCase()
                    let description = "Snow data"

                    if (indexLower.startsWith('sspi')) {
                      title = `SSPI-${index.split('-')[1]}`
                      description = "Standardised Snow Pack Index"
                    }

                    return (
                      <ListItem
                        key={index}
                        title={title}
                        href={onIndexChange ? undefined : `/${index}`}
                        onClick={onIndexChange ? () => onIndexChange(index) : undefined}
                        onMouseEnter={() => onIndexHover?.(index)}
                        isActive={datatype.toLowerCase() === index}
                      >
                        {description}
                      </ListItem>
                    )
                  })}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

          </NavigationMenuList>
          <NavigationMenuViewport />
        </NavigationMenu>
      </div>


      {/* Bottom Control Panel - Full Width */}
      {!showHighResMap && (
        <div className="controlContainerBottomXXX fixed bottom-0 w-full" >
          <div className='bg-white/80 dark:bg-black/80 h-[80px] w-full fixed bottom-0 -z-10' />
          <div className="controlPanelWrapperXX mx-auto pl-4 pr-20">
            {/* Index Navigation */}


            {/* Control Panel */}
            <ControlPanel
              metadata={metadata}
              day={day}
              firstDay={extractedMetadata?.properties?.firstDate || staticData?.metadata?.properties?.firstDate}
              lastDay={extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate}
              forecastWeeks={forecastWeeks}
              currentIndex={datatype}
              onChange={(value: any) =>
                setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
              }
            />
          </div>
        </div>
      )}

      {/* Region Detail Modal/Overlay */}
      {selectedRegion && selectedRegionFeature && (
        <RegionDetail
          nutsId={selectedRegion}
          nutsName={selectedRegionFeature.properties?.NUTS_NAME || 'Unknown Region'}
          datatype={datatype}
          staticMetaData={staticMetaData}
          indices={indices}
          day={day}
          mode="modal"
          onClose={onClose}
        />
      )}
    </Layout >
  )
}
