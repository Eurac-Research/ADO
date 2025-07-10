'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl
} from 'react-map-gl'
import ControlPanel from '@/components/ControlPanel'
import { updatePercentiles } from '@/components/utils'
import Layout from '@/components/layout'
import TimeSeriesLegend from '@/components/timeSeriesLegend'
import Link from 'next/link'
import { format } from 'date-format-parse'
import axios from 'axios'
import { useThemeContext } from '@/context/theme'
import { stationCache } from '@/lib/station-cache'
import type { PostData } from '@/types'

import 'mapbox-gl/dist/mapbox-gl.css'

// Dynamic import for TimeSeries to prevent SSR issues
const TimeSeries = dynamic(() => import('@/components/timeseries'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface HydroClientProps {
  datatype: string
  staticData: any
  staticMetaData: any
  stationsData: any
  allPosts: PostData[]
  indices: string[]
  error?: string
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

export default function HydroClient({
  datatype,
  staticData,
  staticMetaData,
  stationsData,
  allPosts,
  indices,
  error
}: HydroClientProps) {
  const mapRef = useRef<any>(null)
  const [theme] = useThemeContext()

  // Convert string dates to timestamps safely
  const getTimestamp = (dateStr: string | undefined): number => {
    if (!dateStr) return 0;
    try {
      return Math.floor(new Date(dateStr).getTime() / 1000);
    } catch (e) {
      console.error('Invalid date:', dateStr);
      return 0;
    }
  };

  // Memoized values for date calculations
  const firstDayTimestamp = useMemo(() => {
    return getTimestamp(staticData?.metadata?.properties?.firstDate ||
      staticMetaData?.timerange?.properties?.firstDate) / 60 / 60 / 24;
  }, [staticData?.metadata?.properties?.firstDate, staticMetaData?.timerange?.properties?.firstDate]);

  const lastDayTimestamp = useMemo(() => {
    return getTimestamp(staticData?.metadata?.properties?.lastDate ||
      staticMetaData?.timerange?.properties?.lastDate) / 60 / 60 / 24;
  }, [staticData?.metadata?.properties?.lastDate, staticMetaData?.timerange?.properties?.lastDate]);

  // State
  const [day, setDay] = useState<string>(() => {
    // In the legacy code, day state is initialized with:
    // metaData ? metaData?.timerange?.properties?.lastDate : staticMetaData?.timerange?.properties?.lastDate
    // Where metaData is from catchmentData, so prioritize that source first

    const lastDateFromCatchment = staticData?.metadata?.properties?.lastDate;
    const lastDateFromMetadata = staticMetaData?.timerange?.properties?.lastDate;

    // Log the available dates for debugging
    // console.log('Setting initial day value:', {
    //   lastDateFromCatchment,
    //   lastDateFromMetadata,
    //   hasMetadataInCatchment: !!staticData?.metadata?.properties
    // });

    // Prioritize the date from catchment data, exactly like in legacy code
    return lastDateFromCatchment || lastDateFromMetadata || "";
  })
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [clickInfo, setClickInfo] = useState<ClickInfo | null>(null)
  const [timeseriesData, setTimeseriesData] = useState(null)
  const [htmlData, setHtmlData] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  // Add a validation for selected day - make sure it exists in the range and data
  useEffect(() => {
    if (!staticData?.features?.length || !day) return;

    try {
      // First validate against the date range from metadata
      const timestamp = getTimestamp(day);
      const dayFromTimestamp = timestamp / 60 / 60 / 24;

      // Similar to legacy code's fixedDay validation
      if (dayFromTimestamp > lastDayTimestamp) {
        // console.log(`Day ${day} is after the last available date, adjusting to last available`);
        setDay(format(new Date(lastDayTimestamp * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'));
        return;
      } else if (dayFromTimestamp < firstDayTimestamp) {
        // console.log(`Day ${day} is before the first available date, adjusting to last available`);
        setDay(format(new Date(lastDayTimestamp * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'));
        return;
      }

      // Then check if the day exists in the actual data
      const firstFeature = staticData.features[0];
      const dtUpper = datatype.toUpperCase();

      // If the current day doesn't exist in the data, find the closest one
      if (firstFeature.properties[dtUpper] && !(day in firstFeature.properties[dtUpper])) {
        // console.log(`Day ${day} not found in data, finding closest available date...`);

        // Get all available dates and sort them
        const availableDates = Object.keys(firstFeature.properties[dtUpper]).sort();

        if (availableDates.length > 0) {
          // Find the closest date to the selected one
          const selectedDate = new Date(day);
          let closestDate = availableDates[0];
          let smallestDiff = Math.abs(new Date(closestDate).getTime() - selectedDate.getTime());

          for (const dateStr of availableDates) {
            const diff = Math.abs(new Date(dateStr).getTime() - selectedDate.getTime());
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestDate = dateStr;
            }
          }

          console.log(`Found closest available date: ${closestDate}`);
          setDay(closestDate);
        } else {
          // If no dates available, use the last date from metadata
          const fallbackDate = staticData?.metadata?.properties?.lastDate ||
            staticMetaData?.timerange?.properties?.lastDate;

          if (fallbackDate) {
            console.log(`No dates found in data, falling back to metadata lastDate: ${fallbackDate}`);
            setDay(fallbackDate);
          }
        }
      }
    } catch (error) {
      console.error('Error validating day:', error);
    }
  }, [day, staticData, datatype, staticMetaData?.timerange?.properties?.lastDate, firstDayTimestamp, lastDayTimestamp]);

  // Memoized values
  const paint = staticMetaData?.colormap;
  // console.log('Paint/colormap from metadata:', {
  //   hasPaint: !!paint,
  //   paintType: paint?.type,
  //   paintId: paint?.id,
  //   hasLegend: !!paint?.legend,
  //   legendStops: paint?.legend?.stops?.length
  // });

  const dataLayer = paint;

  const stationPaintLayer = {
    id: 'stationPoint',
    type: 'circle',
    source: 'stationData',
    paint: {
      'circle-color': '#426cb5',
      'circle-radius': 12,
      'circle-blur': 0,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#fff',
      'circle-stroke-opacity': 0.9,
    },
  }

  const metadata = useMemo(() => {
    return staticMetaData
  }, [staticMetaData])

  // Log available date ranges for debugging
  // console.log('Date range info:', {
  //   currentDay: day,
  //   firstDayFromCatchment: staticData?.metadata?.properties?.firstDate,
  //   lastDayFromCatchment: staticData?.metadata?.properties?.lastDate,
  //   firstDayFromMetadata: staticMetaData?.timerange?.properties?.firstDate,
  //   lastDayFromMetadata: staticMetaData?.timerange?.properties?.lastDate
  // });

  const data = useMemo(() => {
    if (!staticData || !staticData.features || !day) {
      console.log('Missing required data for map:', {
        hasStaticData: !!staticData,
        hasFeatures: staticData?.features?.length > 0,
        day
      });
      return null;
    }

    // Log the first feature to understand its structure
    const firstFeature = staticData.features[0];
    const propertyKeys = Object.keys(firstFeature.properties || {});
    const dtUpper = datatype.toUpperCase();

    // console.log('First feature data structure:', {
    //   propertyKeys,
    //   hasDatetypeUppercase: propertyKeys.includes(dtUpper),
    //   datatypeUpperPropType: typeof firstFeature.properties[dtUpper],
    //   availableDaysUpper: firstFeature.properties[dtUpper]
    //     ? Object.keys(firstFeature.properties[dtUpper]).slice(0, 5) : [],
    //   dayExists: firstFeature.properties[dtUpper] && firstFeature.properties[dtUpper][day] !== undefined,
    //   dayValue: firstFeature.properties[dtUpper] ? firstFeature.properties[dtUpper][day] : undefined
    // });

    // Use the exact same property access pattern as in the legacy code:
    // mapCatchmentData = useMemo(() => {
    //   return catchmentData && updatePercentiles(catchmentData, (f) => f.properties[`${datatype}`][day])
    // }, [datatype, catchmentData, day])

    return updatePercentiles(staticData, (f: any) => {
      try {
        // Match legacy access pattern exactly: f.properties[`${datatype}`][day]
        // In our case, we need to use the uppercase datatype like in our fetch URL
        if (f.properties[dtUpper] && day in f.properties[dtUpper]) {
          const value = f.properties[dtUpper][day];
          return value;
        }

        // Try alternate ways of accessing if the main path fails
        if (f.properties[datatype] && day in f.properties[datatype]) {
          console.log(`Using original case datatype for feature`, { id: f.properties.id || f.id });
          return f.properties[datatype][day];
        }

        // Only log once per 100 features to avoid console spam
        if (Math.random() < 0.01) {
          console.log(`No data for feature on day ${day}`, {
            id: f.properties.id || f.id,
            hasProperty: !!f.properties[dtUpper],
            availableDays: f.properties[dtUpper] ? Object.keys(f.properties[dtUpper]).slice(0, 3) : []
          });
        }
        return null;
      } catch (e) {
        console.error('Error accessing property for feature:', {
          featureId: f.properties.id || f.id,
          error: e instanceof Error ? e.message : String(e)
        });
        return null;
      }
    });
  }, [datatype, staticData, day])

  // Event handlers
  const onHover = useCallback((event: any) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]

    // Handle different layer types
    const featureColor = !hoveredFeature?.layer?.paint?.['fill-color']
      ? 'rgba(0,0,0,1)'
      : `rgba(${Math.round(
        hoveredFeature?.layer?.paint?.['fill-color'].r * 255
      )},${Math.round(
        hoveredFeature?.layer?.paint?.['fill-color'].g * 255
      )},${Math.round(
        hoveredFeature?.layer?.paint?.['fill-color'].b * 255)},1)`

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

    // Fetch timeseries data if available - handle both station_id and id_station formats
    const stationId = hoveredFeature?.properties?.station_id || hoveredFeature?.properties?.id_station
    if (stationId) {
      await getTimeseriesData(stationId)
      await getHtmlData(stationId)
    }
  }, [])

  const onClose = useCallback(() => {
    setClickInfo(null)
    setTimeseriesData(null)
    setHtmlData(null)
  }, [])

  // Data fetching functions with caching
  async function getHtmlData(stationId: string) {
    // Check cache first
    const cachedData = stationCache.getHtml(stationId)
    if (cachedData) {
      console.log('HTML data loaded from cache for station:', stationId)
      setHtmlData(cachedData)
      return
    }

    const fetchData = async () => {
      try {
        // Try both formats for HTML reports, prioritizing the legacy format
        const urls = [
          `https://${ADO_DATA_URL}/html/report_${stationId}.html`,
          `https://${ADO_DATA_URL}/html/hydro/${stationId}.html`
        ]

        for (const url of urls) {
          try {
            const result = await axios(url)
            if (result.data) {
              console.log('HTML data loaded from:', url)
              // Cache the result
              stationCache.setHtml(stationId, result.data)
              setHtmlData(result.data)
              return
            }
          } catch (error) {
            console.log('Failed to fetch from:', url)
          }
        }

        console.error('Error: Could not fetch HTML data from any URL')
        setHtmlData(null)
      } catch (error) {
        console.error('Error fetching HTML data:', error)
        setHtmlData(null)
      }
    }
    fetchData()
  }

  async function getTimeseriesData(stationId: string) {
    // Check cache first
    const cachedData = stationCache.getTimeseries(stationId)
    if (cachedData) {
      console.log('Timeseries data loaded from cache for station:', stationId)
      setTimeseriesData(cachedData)
      setIsLoading(false)
      return
    }

    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)
      try {
        // Try both formats for timeseries data, prioritizing the legacy format with ID_STATION_ prefix
        const urls = [
          `https://${ADO_DATA_URL}/json/hydro/timeseries/ID_STATION_${stationId}.json`,
          `https://${ADO_DATA_URL}/json/hydro/timeseries/${stationId}.json`
        ]

        for (const url of urls) {
          try {
            const result = await axios(url)
            if (result.data) {
              console.log('Timeseries data loaded from:', url)
              // Cache the result
              stationCache.setTimeseries(stationId, result.data)
              setTimeseriesData(result.data)
              setIsLoading(false)
              return
            }
          } catch (error) {
            console.log('Failed to fetch from:', url)
          }
        }

        console.error('Error: Could not fetch timeseries data from any URL')
        setIsError(true)
      } catch (error) {
        console.error('Error fetching timeseries data:', error)
        setIsError(true)
      }
      setIsLoading(false)
    }
    fetchData()
  }

  // Loading state
  if (metadata === undefined) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p>Please wait while we fetch the hydro data.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg max-w-2xl">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Data</h1>
            <p className="mb-4">{error}</p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-left overflow-auto">
              <pre>{JSON.stringify({ datatype, hasStaticData: !!staticData }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Data format error
  if (!staticData || !staticData.features || !staticData.features.length) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg max-w-2xl">
            <h1 className="text-2xl font-bold mb-4 text-yellow-600">Data Format Issue</h1>
            <p className="mb-4">The data was loaded but appears to be in an unexpected format.</p>
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-left overflow-auto">
              <pre>{JSON.stringify({
                datatype,
                hasStaticData: !!staticData,
                hasFeatures: staticData?.features?.length > 0,
                featuresType: typeof staticData?.features,
                firstFewProps: staticData?.features?.[0]?.properties ? Object.keys(staticData.features[0].properties).slice(0, 5) : []
              }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const scaleControlStyle = {}
  const navControlStyle = {}

  return (
    <Layout posts={allPosts}>
      <div className="reactMap">
        <Map
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
          style={{ width: '100vw', height: '100vh' }}
          mapStyle={
            theme === 'dark'
              ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy'
              : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'
          }
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['stationPoint', 'data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >
          <Source id="stationData" type="geojson" data={stationsData as any}>
            <Layer {...stationPaintLayer as any} />
          </Source>

          {data && (
            <Source type="geojson" data={data as any} generateId={true}>
              <Layer {...dataLayer as any} beforeId="waterway-shadow" />
            </Source>
          )}
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
                {datatype.toUpperCase()} - {day}
              </span>
              <span className="indexValue">
                {hoverInfo?.feature?.properties?.value !== undefined ? (
                  <>
                    <span
                      className="indexValueColorDot"
                      style={{ backgroundColor: hoverInfo?.rgbaColor }}
                    ></span>
                    {hoverInfo.feature.properties.value}

                    <span className="block text-xs">
                      {(() => {
                        if (!metadata?.colormap?.legend?.stops) return '';

                        const value = parseFloat(hoverInfo.feature.properties.value);
                        if (isNaN(value)) return 'No data';

                        const stops = metadata.colormap.legend.stops;
                        const sortedStops = [...stops].sort((a: any, b: any) =>
                          parseFloat(a[0]) - parseFloat(b[0])
                        );

                        if (value < parseFloat(sortedStops[0][0])) {
                          return sortedStops[0]['1'];
                        }

                        if (value >= parseFloat(sortedStops[sortedStops.length - 1][0])) {
                          return sortedStops[sortedStops.length - 1]['1'];
                        }

                        for (let i = 0; i < sortedStops.length - 1; i++) {
                          const currentValue = parseFloat(sortedStops[i][0]);
                          const nextValue = parseFloat(sortedStops[i + 1][0]);
                          if (value >= currentValue && value < nextValue) {
                            return sortedStops[i]['1'];
                          }
                        }

                        return '';
                      })()}
                    </span>
                  </>
                ) : (
                  'No data'
                )}
              </span>
              <div>
                {hoverInfo.feature.properties.station_name && (
                  <div>Station: {hoverInfo.feature.properties.station_name}</div>
                )}
                {hoverInfo.feature.properties.id_station && (
                  <div>ID: {hoverInfo.feature.properties.id_station}</div>
                )}
                {hoverInfo.feature.properties.station_id && (
                  <div>ID: {hoverInfo.feature.properties.station_id}</div>
                )}
                {hoverInfo.feature.properties.location_s && (
                  <div className="tooltipLocation">
                    {hoverInfo.feature.properties.location_s},{' '}
                    {hoverInfo.feature.properties.region},{' '}
                    {hoverInfo.feature.properties.country}
                  </div>
                )}
                {hoverInfo?.feature?.properties?.watercours && (
                  <div>
                    Water Course: {hoverInfo?.feature?.properties?.watercours}
                  </div>
                )}
              </div>
              <span className="tooltipCTA">Click to view details</span>
            </div>
          )}
        </Map>
      </div>

      <div
        className="controlContainer"
        style={{ opacity: clickInfo ? '0' : '1' }}
      >
        <div className="legend">
          {staticMetaData?.colormap?.legend?.stops?.map((item: any, index: number) => {
            if (!item || !item['1'] || !item['2']) return null;
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
          firstDay={staticData?.metadata?.properties?.firstDate || staticMetaData?.timerange?.properties?.firstDate}
          lastDay={staticData?.metadata?.properties?.lastDate || staticMetaData?.timerange?.properties?.lastDate}
          onChange={(value: any) => {
            try {
              // Parse the timestamp value received from the slider
              const timestamp = parseFloat(value);
              console.log('Slider change:', {
                rawValue: value,
                parsedTimestamp: timestamp,
                currentDay: day
              });

              // Create a date from the timestamp (seconds since epoch * 24 hours)
              const date = new Date(timestamp * 60 * 60 * 24 * 1000);

              // Format to YYYY-MM-DD, same as in the legacy code using format()
              // In legacy: format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD')
              const formattedDate = date.toISOString().split('T')[0];

              console.log('Formatted date:', {
                date: date.toString(),
                formattedDate,
                availableInData: staticData?.features?.[0]?.properties?.[datatype.toUpperCase()]?.[formattedDate] !== undefined
              });

              setDay(formattedDate);
            } catch (error) {
              console.error('Error processing date:', error);
            }
          }}
        />

        <div className="navigation">
          <p>Hydro Indices</p>
          {indices?.map((index) => (
            <Link
              prefetch={false}
              href={`/hydro/${index}`}
              key={index}
              className={datatype.toLowerCase() === index ? 'active' : ''}
            >
              {index.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>

      {clickInfo && (
        <>
          <div className="overlayContainer" onClick={onClose}></div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>
              close X
            </span>
            <h1>
              {clickInfo.feature.properties.country ? (
                <>
                  {clickInfo.feature.properties.country},{' '}
                  {clickInfo.feature.properties.region},{' '}
                  {clickInfo.feature.properties.location_s} -{' '}
                  {clickInfo.feature.properties.station_id || clickInfo.feature.properties.id_station}
                </>
              ) : (
                <>
                  {datatype.toUpperCase()} - {staticMetaData?.long_name}
                </>
              )}
            </h1>
            {isError && (
              <p>Error loading timeseries data</p>
            )}
            {clickInfo.feature.properties.station_name && (
              <p>Station: {clickInfo.feature.properties.station_name}</p>
            )}
            {(clickInfo.feature.properties.station_id || clickInfo.feature.properties.id_station) && (
              <p>ID: {clickInfo.feature.properties.station_id || clickInfo.feature.properties.id_station}</p>
            )}
            <TimeSeriesLegend />
            {timeseriesData && (
              <TimeSeries
                key={`timeseries-${datatype.toLowerCase()}-${clickInfo?.feature?.properties?.id_station || clickInfo?.feature?.properties?.station_id}`}
                data={timeseriesData}
                indices={indices}
                index={datatype.toUpperCase()}
                metadata={staticMetaData}
                firstDate={day ? new Date(new Date(day).getTime() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ""}
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
            )}

            <div className="mapLink">
              View all hydrological stations in the alpine region{' '}
              <a
                href="https://maps.eurac.edu/catalogue/#/map/85"
                rel="noreferrer"
                target="_blank"
              >
                https://maps.eurac.edu/catalogue/#/map/85
              </a>
            </div>

            {htmlData && (
              <iframe
                srcDoc={htmlData}
                width="100%"
                height="15000px"
                style={{
                  position: 'absolute',
                  top: 'auto',
                  left: '0',
                  height: '550px',
                  width: '100%',
                  paddingBottom: '150px',
                }}
              ></iframe>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
