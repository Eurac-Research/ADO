'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ControlPanel from '@/components/ControlPanel'
import { updatePercentiles } from '@/components/utils'
import Layout from '@/components/layout'
import { useRouter } from 'next/navigation'
import { format } from 'date-format-parse'
import { useThemeContext } from '@/context/theme'
import type { PostData } from '@/types'
import RegionDetail from '@/components/RegionDetail'
import IndicesNavigation from '@/components/IndicesNavigation'

import 'mapbox-gl/dist/mapbox-gl.css'

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
  }, [])

  const onClose = useCallback(() => {
    setClickInfo(null)
  }, [])

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

      <div
        className="controlContainer"
      >
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

        <ControlPanel
          metadata={metadata}
          day={day}
          firstDay={extractedMetadata?.properties?.firstDate || staticData?.metadata?.properties?.firstDate}
          lastDay={extractedMetadata?.properties?.lastDate || staticData?.metadata?.properties?.lastDate}
          onChange={(value: any) =>
            setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
          }
        />

      </div>

      <IndicesNavigation
        indices={indices}
        activeIndex={datatype}
        onIndexChange={onIndexChange}
        onIndexHover={onIndexHover}
      />

      {clickInfo && (
        <RegionDetail
          nutsId={clickInfo.feature.properties.NUTS_ID}
          nutsName={clickInfo.feature.properties.NUTS_NAME}
          datatype={datatype}
          indices={indices}
          day={day}
          staticMetaData={staticMetaData}
          allPosts={allPosts}
          mode="modal"
          onClose={onClose}
        />
      )}
    </Layout>
  )
}
