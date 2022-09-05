import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import TimeSeries from '../components/timeseries'

import { getAllPosts } from '../lib/api'
import { useThemeContext } from '../context/theme'

const MAPBOX_TOKEN =
  'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'

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
  const response = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/${datatype}-latest.geojson`
  )
  const staticData = await response.json()
  const responseMeta = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/metadata/${datatype}.json`
  )
  // const staticMetaData = await responseMeta.json()

  const staticMetaData =
    datatype === 'SSPI-10'
      ? {
          short_name: 'SSPI-10',
          long_name: 'Standardized Snowpack Index',
          abstract:
            'The SSPI provides information of the relative volume of the snowpack in the catchment on a ten-daily basis compared to the period of reference.',
          timerange: {
            type: 'date',
            properties: {
              firstDate: '2022-07-21',
              lastDate: '2022-08-19',
            },
          },
          colormap: {
            id: 'data',
            type: 'fill',
            paint: {
              'fill-color': [
                'step',
                ['get', 'value'],
                'rgba(236,11,0,0.9)',
                -2,
                'rgba(237,69,61,0.9)',
                -1.5,
                'rgba(238,127,122,0.9)',
                -1,
                'rgba(239,239,239,0.9)',
                0,
                'rgba(213,233,237,0.9)',
                1,
                'rgba(200,229,236,0.9)',
                1.5,
                'rgba(187,226,234,0.9)',
              ],
              'fill-outline-color': 'transparent',
            },
            legend: {
              stops: [
                [-2, 'Highly less than normal', 'rgba(236,11,0,0.7)'],
                [-1.5, 'Much less than normal', 'rgba(237,69,61,0.7)'],
                [-1, 'Less than normal', 'rgba(238,127,122,0.7)'],
                [0, 'Near normal conditions', 'rgba(239,239,239,0.7)'],
                [1, 'More than normal', 'rgba(213,233,237,0.7)'],
                [1.5, 'Much more than normal', 'rgba(200,229,236,0.7)'],
                [2, 'Highly more than normal', 'rgba(187,226,234,0.7)'],
              ],
            },
          },
        }
      : {
          short_name: 'SPEI-1',
          long_name:
            'Standardized Precipitation and Evapotranspiration Index - 1',
          abstract:
            'The Standardized Precipitation Index (SPI) is the most commonly used indicator worldwide for detecting and characterizing meteorological droughts. The SPI indicator, which was developed by McKee et al. (1993), and described in detail by Edwards and McKee (1997), measures precipitation anomalies at a given location, based on a comparison of observed total precipitation amounts for an accumulation period of interest (e.g. 1, 3, 12, 48 months), with the long-term historic rainfall record for that period. For any given region, increasingly severe rainfall deficits (i.e., meteorological droughts) are indicated as SPI decreases below ‒1.0.  A new variation of SPI - the Standardized Precipitation and Evapotranspiration Index (SPEI) - has been developed (Vicente-Serrano et al., 2010), which includes precipitation and temperature, in order to identify increases in drought severity linked with higher water demand by evapotranspiration.',
          timerange: {
            type: 'date',
            properties: {
              firstDate: '2022-07-21',
              lastDate: '2022-08-19',
            },
          },
          colormap: {
            id: 'data',
            type: 'fill',
            paint: {
              'fill-color': [
                'step',
                ['get', 'value'],
                'rgba(215,25,28,0.7)',
                -2,
                'rgba(253,174,97,0.7)',
                -1.5,
                'rgba(255,255,191,0.7)',
                -1,
                'rgba(255,255,255,0.7)',
                0,
                'rgba(245,153,246,0.7)',
                1,
                'rgba(180,103,221,0.7)',
                1.5,
                'rgba(69,0,153,0.7)',
              ],
              'fill-outline-color': 'transparent',
            },
            legend: {
              stops: [
                [-2, 'Extremely dry', 'rgba(215,25,28,0.7)'],
                [-1.5, 'Very dry', 'rgba(253,174,97,0.7)'],
                [-1, 'Moderately dry', 'rgba(255,255,191,0.7)'],
                [0, 'Normal', 'rgba(255,255,255,0.7)'],
                [1, 'Moderately wet', 'rgba(245,153,246,0.7)'],
                [1.5, 'Very wet', 'rgba(180,103,221,0.7)'],
                [2, 'Extremely wet', 'rgba(69,0,153,0.7)'],
              ],
            },
          },
        }

  console.log('metadata', staticMetaData)

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

  const [metaData, setMetaData] = useState()
  const [day, setDay] = useState(
    metaData
      ? metaData?.timerange?.properties?.lastDate
      : staticMetaData?.timerange?.properties?.lastDate
  )
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
        const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/timeseries/NUTS3_${
          overlayNutsId ? `${overlayNutsId}` : ''
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
          {metadata?.long_name} - Alpine Drought Observatory | Eurac Research
        </title>
      </Head>

      <div className="reactMap">
        <Map
          initialViewState={{
            latitude: 46,
            longitude: 9,
            minZoom: 3,
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

                <span
                  className="indexValueColorDot"
                  style={{ backgroundColor: hoverInfo?.rgbaColor }}
                ></span>
                {hoverInfo.feature.properties.value}
              </span>
              <span className="tooltipLocation">
                {hoverInfo.feature.properties.NUTS_NAME}
              </span>
              {/* <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div> */}
              <span className="tooltipCTA">Click to view details</span>
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
          firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''}
          lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''}
          onChange={(value) =>
            setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))
          }
        />

        <div className="navigation">
          <p>Indices</p>
          {indices?.map((index) => (
            <Link prefetch={false} href={`/${index}`} key={index}>
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
            <h3>
              {datatype} - {staticMetaData?.long_name}
            </h3>
            {isError && (
              <p>
                file
                https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/timeseries/NUTS3_
                {clickInfo.feature.properties.NUTS_ID}.json - errors in file
              </p>
            )}
            <p>
              {clickInfo.feature.properties.NUTS_NAME} (nuts id:{' '}
              {clickInfo.feature.properties.NUTS_ID})
            </p>

            <TimeSeries
              data={nutsData}
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
          </div>
        </>
      )}
    </Layout>
  )
}
