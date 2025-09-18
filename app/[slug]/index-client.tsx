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
import { useRouter } from 'next/navigation'
import { format } from 'date-format-parse'
import axios from 'axios'
import { useThemeContext } from '@/context/theme'
import type { PostData } from '@/types'

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
  const [theme] = useThemeContext()

  // State
  const [day, setDay] = useState(
    extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate
  )
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null)
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

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
    setClickInfo(
      hoveredFeature
        ? {
          feature: hoveredFeature,
        }
        : null
    )
    const nutsId = hoveredFeature ? hoveredFeature?.properties?.NUTS_ID : null
    if (nutsId) {
      await getNutsData(nutsId)
    }
  }, [])

  const onClose = useCallback(() => {
    setClickInfo(null)
    setNutsData(null)
  }, [])

  // Data fetching function
  async function getNutsData(overlayNutsId: string) {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)
      try {
        const url = `https://${ADO_DATA_URL}/json/nuts/timeseries/NUTS3_${overlayNutsId ? `${overlayNutsId}` : ''
          }.json`
        const result = await axios(url)
        setNutsData(result.data)
      } catch (error) {
        setIsError(true)
      }
      setIsLoading(false)
    }
    fetchData()
  }

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
        <div className="legend">
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


      <div className="navigation">
        <p>Indices</p>
        <div className="navigationButtons">
          {indices?.map((index) => (
            onIndexChange ? (
              <button
                key={index}
                onClick={() => onIndexChange(index)}
                onMouseEnter={() => onIndexHover?.(index)}
                className={datatype.toLowerCase() === index ? 'active' : ''}
              >
                {index}
              </button>
            ) : (
              <Link
                prefetch={true}
                href={`/${index}`}
                key={index}
                className={datatype.toLowerCase() === index ? 'active' : ''}
                onMouseEnter={() => onIndexHover?.(index)}
              >
                {index}
              </Link>
            )
          ))}
        </div>
      </div>


      {/* Bottom Control Panel - Full Width */}
      <div className="controlContainerBottom">
        <div className="controlPanelWrapper">
          {/* Index Navigation */}


          {/* Control Panel */}
          <ControlPanel
            metadata={metadata}
            day={day}
            firstDay={extractedMetadata?.properties?.firstDate || staticData?.metadata?.properties?.firstDate}
            lastDay={extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate}
            forecastWeeks={forecastWeeks}
            onChange={(value: any) =>
              setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
            }
          />
        </div>
      </div>

      {clickInfo && (
        <>
          <div className="overlayContainer" onClick={onClose}></div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>
              close X
            </span>
            <h3>
              {datatype} - {staticMetaData?.long_name}
            </h3>
            {isError && (
              <p>
                file {ADO_DATA_URL}/json/timeseries/NUTS3_
                {clickInfo.feature.properties.NUTS_ID}.json - errors in file
              </p>
            )}
            <p>{clickInfo.feature.properties.NUTS_NAME}</p>
            <TimeSeriesLegend />
            <TimeSeries
              data={nutsData}
              indices={indices}
              index={datatype}
              metadata={staticMetaData}
              firstDate={format(
                new Date(new Date(day).getTime() - 5 * 365 * 24 * 60 * 60 * 1000),
                'YYYY-MM-DD'
              )}
              lastDate={day}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                zIndex: '102',
                top: '0',
                left: '0',
              }}
            />
            {(staticMetaData?.doi || staticMetaData?.factsheet) && (
              <p
                style={{
                  marginTop: '1rem',
                  fontSize: '10px',
                  lineHeight: '2',
                }}
              >
                More information about the data:
                <br />
                {staticMetaData?.factsheet && (
                  <>
                    <a
                      href={staticMetaData?.factsheet}
                      target="_blank"
                      rel="noreferrer"
                      className='text-blue-600 underline'
                    >
                      Download {staticMetaData?.short_name} Factsheet
                    </a>
                    <br />
                  </>
                )}
                {staticMetaData?.doi && (
                  <a
                    href={staticMetaData?.doi}
                    target="_blank"
                    rel="noreferrer"
                    className='text-blue-600 underline'
                  >
                    {staticMetaData?.doi}
                  </a>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
