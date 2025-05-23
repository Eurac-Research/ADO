import dynamic from 'next/dynamic'
import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'

import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ControlPanel from '../components/ControlPanel'
import { updatePercentiles } from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from '../components/layout'
import TimeSeriesLegend from '../components/timeSeriesLegend'

const TimeSeries = dynamic(() => import('../components/timeseries'), {
  loading: () => <p>Loading...</p>,
  ssr: false // Add this line to prevent server-side rendering
})

import { getAllPosts } from '../lib/api'
import { useThemeContext } from '../context/theme'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL
// dev data branch
//const ADO_DATA_URL = 'raw.githubusercontent.com/Eurac-Research/ado-data/dev'

// const indices = [
//   'spei-1',
//   'spei-2',
//   'spei-3',
//   'spei-6',
//   'spei-12',
//   'spi-1',
//   'spi-2',
//   'spi-3',
//   'spi-6',
//   'spi-12',
//   'sspi-10',
//   'sma',
//   'vci',
//   'vhi',
// ]

const indices = [
  'spei-1',
  'spei-2',
  'spei-3',
  'spei-6',
  'spei-12',
  'spi-1',
  'spi-2',
  'spi-3',
  'spi-6',
  'spi-12',
  'sspi-10',
  'sma',
  'vci',
  'vhi',
]

export async function getStaticProps({ params }) {
  const datatype = params.slug ? params.slug.toUpperCase() : 'SPEI-1'

  // check if slug is part of indices
  if (indices.includes(datatype.toLowerCase()) === false) {
    return
  }

  const response = await axios(
    `https://${ADO_DATA_URL}/json/nuts/${datatype}-latest.geojson`
  ).catch(function (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data)
      console.log(error.response.status)
      console.log(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message)
    }
    console.log(error.config)
  })
  const staticData = await response.data
  // const response = await fetch(
  //   `https://${ADO_DATA_URL}/json/nuts/${datatype}-latest.geojson`
  // )
  // if (!response.ok) {
  //   const message = `An error for response has occured: ${response.status}`;
  //   throw new Error(message);
  // }
  // const staticData = await response.json()

  const responseMeta = await axios(
    `https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`
  ).catch(function (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data)
      console.log(error.response.status)
      console.log(error.response.headers)
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request)
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message)
    }
    console.log(error.config)
  })
  const staticMetaData = await responseMeta.data
  // const responseMeta = await fetch(
  //   `https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`
  // )
  // if (!responseMeta.ok) {
  //   const message = `An error for responseMeta has occured: ${responseMeta.status}`;
  //   throw new Error(message);
  // }
  // const staticMetaData = await responseMeta.json()
  const allPosts = getAllPosts(['title', 'slug'])
  return { props: { datatype, staticData, staticMetaData, allPosts } }
}

// This function gets called at build time
export async function getStaticPaths() {
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: index },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export default function App({
  datatype,
  staticData,
  staticMetaData,
  allPosts,
}) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []
  const dataLayer = paint

  const [day, setDay] = useState(staticData?.metadata?.properties?.lastDate)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const [theme, setTheme] = useThemeContext()

  const onHover = useCallback((event) => {
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
    // prettier-ignore
    setHoverInfo(hoveredFeature && { rgbaColor: featureColor, feature: hoveredFeature, x, y });
  }, [])

  const onOut = useCallback((event) => {
    setHoverInfo(null)
  }, [])

  const onClick = useCallback(async (event) => {
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
    getNutsData(nutsId)
  }, [])

  const onClose = useCallback(async (event) => {
    setClickInfo()
  }, [])

  const metadata = useMemo(() => {
    return staticMetaData
  }, [staticMetaData])

  const timestamp = format(day, 'X')
  const dayFromTimestamp = timestamp / 60 / 60 / 24
  const firstDayTimestamp =
    format(staticData?.metadata?.properties?.firstDate, 'X') / 60 / 60 / 24
  const lastDayTimestamp =
    format(staticData?.metadata?.properties?.lastDate, 'X') / 60 / 60 / 24

  // indices does not have common timeranges ...
  // compare timestamps and set to last possible date if selected date is not available in an index
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

  // console.log("day", day)
  // console.log("fixedDay", fixedDay)

  const data = useMemo(() => {
    return (
      staticData &&
      updatePercentiles(staticData, (f) => f.properties[`${datatype}`][day])
    )
  }, [datatype, staticData, day])

  //console.log("data", data)

  async function getNutsData(overlayNutsId) {
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

  const scaleControlStyle = {}
  const navControlStyle = {}

  if (metadata === undefined) {
    return <>Loading...</>
  }

  function CustomTooltip({ payload, label, active }) {
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

  return (
    <Layout theme={theme} posts={allPosts}>
      <Head>
        <title>
          {`${staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research`}
        </title>
        <meta
          name="description"
          content="The Alpine Drought Observatory (ADO) provides a tool for an easy overview of the current drought situation and past drought situations in the last 40 years."
        />
      </Head>

      <div className="reactMap">
        <Map
          initialViewState={{
            latitude: 46,
            longitude: 9,
            minZoom: 3,
            zoom: 5,
            maxPitch: 85,
            bearing: 0,
            pitch: 0,
          }}
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
                {/* does not return a valid color code ... multiply by 255 

                https://stackoverflow.com/questions/73156238/mapbox-what-color-code-does-queryrenderedfeatures-return-how-to-convert-the-va/73156740#73156740

                https://docs.mapbox.com/mapbox-gl-js/api/map/#instance-members-querying-features
                https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures/
                --> example, added a question to the mapbox team there. */}

                {hoverInfo?.feature?.properties?.value ? (
                  <>
                    <span
                      className="indexValueColorDot"
                      style={{ backgroundColor: hoverInfo?.rgbaColor }}
                    ></span>
                    {hoverInfo.feature.properties.value}

                    {/* show the translated value - got the info from metadata.colormap.legend.stops */}
                    {/* Show translated value based on legend */}
                    <span className="block text-xs">
                      {(() => {
                        const value = parseFloat(hoverInfo.feature.properties.value);
                        const stops = metadata.colormap.legend.stops;

                        // Sort stops by their numeric value to ensure proper comparison
                        const sortedStops = [...stops].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

                        // Handle special case: value is less than the first stop
                        if (value < parseFloat(sortedStops[0][0])) {
                          return sortedStops[0]['1'];
                        }

                        // Handle special case: value is greater than or equal to the last stop
                        if (value >= parseFloat(sortedStops[sortedStops.length - 1][0])) {
                          return sortedStops[sortedStops.length - 1]['1'];
                        }

                        // Find the appropriate range
                        for (let i = 0; i < sortedStops.length - 1; i++) {
                          const currentValue = parseFloat(sortedStops[i][0]);
                          const nextValue = parseFloat(sortedStops[i + 1][0]);

                          if (value >= currentValue && value < nextValue) {
                            return sortedStops[i]['1'];
                          }
                        }

                        return '--'; // Fallback if no match is found
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
              {/* <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div> */}
              <span className="tooltipCTA mt-2 text-white/60 leading-[120%]">Click to view details <br />and historical data</span>
            </div>
          )}
        </Map>
      </div>

      <div className="controlContainer">
        <div className="legend">
          {metadata.colormap.legend.stops.map((item, index) => {
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
          firstDay={staticData?.metadata?.properties?.firstDate}
          lastDay={staticData?.metadata?.properties?.lastDate}
          onChange={(value) =>
            setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
          }
        />

        <div className="navigation">
          <p>Indices</p>
          {indices?.map((index) => (
            <Link
              prefetch={false}
              href={`/${index}`}
              key={index}
              className={router.query.slug === index ? 'active' : ''}
            >
              {index}
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
            <h3>
              {datatype} - {staticMetaData?.long_name}
            </h3>
            {isError && (
              <p>
                file
                {ADO_DATA_URL}/json/timeseries/NUTS3_
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
                new Date(day).setDate(new Date(day).getDate() - 5 * 365),
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
