import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ControlPanel from '../../components/ControlPanel'
import { updatePercentiles } from '../../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from '../../components/layout'
import TimeSeries from '../../components/timeseries'
import TimeSeriesLegend from '../../components/timeSeriesLegend'

import { getAllPosts } from '../../lib/api'
import { useThemeContext } from '../../context/theme'
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

//const indices = ['spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12', 'spi-1', 'spi-3', 'spi-6', 'spi-12', 'sspi-10', 'cdi', 'sma', 'vci', 'vhi']
const indices = [
  'spei-1',
  'spei-2',
  'spei-3',
  'spei-6',
  'spei-12',
  'spi-1',
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

  const fetchCatchments = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/${datatype}-latest.geojson`
  )
  const catchmentData = await fetchCatchments.json()

  const responseMeta = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/metadata/${datatype}.json`
  )
  const staticMetaData = await responseMeta.json()

  const fetchStations = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/gauging_stations.geojson`
  )
  const stationData = await fetchStations.json()

  const allPosts = getAllPosts(['title', 'slug'])

  return {
    props: { datatype, staticMetaData, catchmentData, stationData, allPosts },
  }
}

// This function gets called at build time
export async function getStaticPaths() {
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: `${index}` },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: 'blocking' }
}

export default function App({
  datatype,
  staticMetaData,
  catchmentData,
  stationData,
  allPosts,
}) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []

  const stationGeometryLayer = paint

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

  const [metaData, setMetaData] = useState()
  const [day, setDay] = useState(
    metaData
      ? metaData?.timerange?.properties?.lastDate
      : staticMetaData?.timerange?.properties?.lastDate
  )
  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)
  const [htmlData, setHtmlData] = useState(null)
  const [timeseriesData, setTimeseriesData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const [theme, setTheme] = useThemeContext()

  const onHover = useCallback((event) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]

    // fill-color does not exist on mouse over for station points. return rgba(0,0,0,1) for stations.
    const featureColor = !hoveredFeature?.layer?.paint?.['fill-color']
      ? 'rgba(0,0,0,1)'
      : `rgba(${Math.round(
          hoveredFeature?.layer?.paint?.['fill-color'].r * 255
        )},${Math.round(
          hoveredFeature?.layer?.paint?.['fill-color'].g * 255
        )},${Math.round(
          hoveredFeature?.layer?.paint?.['fill-color'].b * 255
        )},1)`
    // prettier-ignore
    setHoverInfo(
      hoveredFeature && {
        rgbaColor: featureColor,
        feature: hoveredFeature,
        x,
        y,
      }
    )
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
    const stationId = hoveredFeature
      ? hoveredFeature?.properties?.id_station
      : null
    getHtmlData(stationId)
    getTimeseries(stationId)
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
    format(metadata?.timerange?.properties?.firstDate, 'X') / 60 / 60 / 24
  const lastDayTimestamp =
    format(metadata?.timerange?.properties?.lastDate, 'X') / 60 / 60 / 24

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

  const mapCatchmentData = useMemo(() => {
    return (
      catchmentData &&
      updatePercentiles(catchmentData, (f) => f.properties[`${datatype}`][day])
    )
  }, [datatype, catchmentData, day])

  async function getHtmlData(id_station) {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)
      try {
        const htmlUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_${id_station}.html`
        const result = await axios(htmlUrl)

        setHtmlData(result.data)
      } catch (error) {
        console.log('error', error)
        setIsError(true)
      }
      setIsLoading(false)
    }
    fetchData()
  }

  async function getTimeseries(id_station) {
    const fetchData = async () => {
      setIsError(false)
      setIsLoading(true)
      try {
        const timeseriesUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/timeseries/ID_STATION_${
          id_station ? `${id_station}` : ''
        }.json`

        const timeseriesResult = await axios(timeseriesUrl)
        setTimeseriesData(timeseriesResult.data)
      } catch (error) {
        console.log('error', error)
        setIsError(true)
      }
      setIsLoading(false)
    }
    fetchData()
  }

  const scaleControlStyle = {}
  const navControlStyle = {
    right: 10,
    bottom: 120,
  }

  return (
    <Layout theme={theme} posts={allPosts}>
      <Head>
        <title>
          {`${staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research`}
        </title>
      </Head>

      <div className="reactMap">
        <Map
          reuseMaps
          initialViewState={{
            latitude: 46,
            longitude: 9,
            minZoom: 4,
            zoom: 5,
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
          interactiveLayerIds={['stationPoint', 'data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >
          <Source id="stationPoint" type="geojson" data={stationData}>
            <Layer {...stationPaintLayer} />
          </Source>

          <Source type="geojson" data={mapCatchmentData}>
            <Layer {...stationGeometryLayer} beforeId="waterway-shadow" />
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
                <span
                  className="indexValueColorDot"
                  style={{ backgroundColor: hoverInfo?.rgbaColor }}
                ></span>
                {hoverInfo.feature.properties.value}
              </span>
              <span className="tooltipLocation">
                {hoverInfo?.feature?.properties?.location_s},{' '}
                {hoverInfo?.feature?.properties?.region},{' '}
                {hoverInfo?.feature?.properties?.country}
              </span>
              {hoverInfo?.feature?.properties?.watercours && (
                <span>
                  Water Course: {hoverInfo?.feature?.properties?.watercours}
                  <br />
                </span>
              )}
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
          {staticMetaData.colormap.legend.stops.map((item, index) => {
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
          firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''}
          lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''}
          onChange={(value) =>
            setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
          }
        />

        <div className="navigation">
          <p>Indices</p>
          {indices?.map((index) => (
            <Link prefetch={false} href={`/hydro/${index}`} key={index}>
              <a className={router.query.slug === index ? 'active' : ''}>
                {index}
              </a>
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
              {clickInfo?.feature?.properties?.country},{' '}
              {clickInfo?.feature?.properties?.region},{' '}
              {clickInfo?.feature?.properties?.location_s} -{' '}
              {clickInfo?.feature?.properties?.id_station}
            </h1>

            <TimeSeriesLegend />
            <TimeSeries
              data={timeseriesData}
              indices={indices}
              index={datatype}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                zIndex: '102',
                top: '0',
                left: '0',
              }}
            />

            <div className="mapLink">
              View all hydrological stations in the alpine region{' '}
              <a
                href="https://maps.eurac.edu/maps/85/view"
                rel="noreferrer"
                target="_blank"
              >
                https://maps.eurac.edu/maps/85/view
              </a>
            </div>

            {htmlData ? (
              <iframe
                srcDoc={htmlData}
                width="100%"
                height="15000px"
                style={{
                  position: 'absolute',
                  top: 'auto',
                  left: '0',
                  height: '5500opx',
                  width: '100%',
                  paddingBottom: '150px',
                }}
              ></iframe>
            ) : (
              <>loading ...</>
            )}
          </div>
        </>
      )}
    </Layout>
  )
}
