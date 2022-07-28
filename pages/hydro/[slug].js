import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, { Source, Layer, ScaleControl, NavigationControl } from 'react-map-gl'
import ControlPanel from '../../components/ControlPanel'
import { updatePercentiles } from '../../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from "../../components/layout"
import TimeSeries from "../../components/timeseries"
import { getAllPosts } from '../../lib/api'
import { useThemeContext } from "../../context/theme";


const MAPBOX_TOKEN = 'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'

import {
  LineChart,
  Line,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts'


const indices = ['spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12', 'spi-1', 'spi-3', 'spi-6', 'spi-12', 'sspi-10', 'cdi', 'sma', 'vci', 'vhi']


export async function getStaticProps({ params }) {
  const datatype = params.slug ? params.slug.toUpperCase() : 'SPEI-1'

  const fetchCatchments = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/${datatype}-latest.geojson`)
  const catchmentData = await fetchCatchments.json()

  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()

  const fetchStations = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/gauging_stations.geojson`)
  const stationData = await fetchStations.json()

  const allPosts = getAllPosts([
    'title',
    'slug',
  ])

  return { props: { datatype, staticMetaData, catchmentData, stationData, allPosts } };
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



export default function App({ datatype, staticMetaData, catchmentData, stationData, allPosts }) {
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
    }
  }


  const [metaData, setMetaData] = useState()
  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.lastDate : staticMetaData?.timerange?.properties?.lastDate);
  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)
  const [htmlData, setHtmlData] = useState(null)
  const [timeseriesData, setTimeseriesData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const [theme, setTheme] = useThemeContext();


  const onHover = useCallback(event => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];
    //console.log("hoverfeat", hoveredFeature)
    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, []);

  const onOut = useCallback(event => {
    setHoverInfo(null)
  }, []);



  const onClick = useCallback(async (event) => {
    const {
      features
    } = event;
    const hoveredFeature = features && features[0];
    setClickInfo(
      hoveredFeature
        ? {
          feature: hoveredFeature
        }
        : null
    );
    const stationId = hoveredFeature ? hoveredFeature?.properties?.id_station : null
    getHtmlData(stationId)
  }, []);

  const onClose = useCallback(async (event) => {
    setClickInfo()
  }, []);



  const mapCatchmentData = useMemo(() => {
    return catchmentData && updatePercentiles(catchmentData, f => f.properties[`${datatype}`][day]);
  }, [datatype, catchmentData, day]);

  const metadata = useMemo(() => {
    return staticMetaData;
  }, [staticMetaData]);

  async function getHtmlData(id_station) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        const htmlUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_${id_station}.html`
        //const htmlUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_ADO_DSC_ITC1_0037.html`
        const timeseriesUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/timeseries/ID_STATION_${id_station ? `${id_station}` : ''}.json`
        const result = await axios(htmlUrl)

        setHtmlData(result.data)

        const timeseriesResult = await axios(timeseriesUrl)
        setTimeseriesData(timeseriesResult.data)

      } catch (error) {
        console.log("error",error);
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }

  const scaleControlStyle = {
  };
  const navControlStyle = {
    right: 10,
    bottom: 120
  };



  console.log("clickInfo",clickInfo);
  return (
    <Layout theme={theme} posts={allPosts}>
      <Head>
        <title>{staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research</title>
      </Head>

      <div className="reactMap">
        <Map reuseMaps
          initialViewState={{
            latitude: 46,
            longitude: 9,
            minZoom: 4,
            zoom: 5,
            bearing: 0,
            pitch: 0
          }}
          style={{ width: "100vw", height: "100vh" }}
          mapStyle={theme === 'dark' ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy' : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'}
          mapboxAccessToken={MAPBOX_TOKEN}
          interactiveLayerIds={['data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >

          <Source type="geojson" data={stationData}>
            <Layer {...stationPaintLayer} />
          </Source>

          <Source type="geojson" data={mapCatchmentData}>
            <Layer {...stationGeometryLayer} beforeId="waterway-shadow" />
          </Source>

          <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} position={"bottom-right"} />
          <NavigationControl style={navControlStyle} position={"bottom-right"} />

          {hoverInfo && (
            <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
              <span className='indexName'>{datatype} - {day}</span>
              <span className='indexValue'>{hoverInfo.feature.properties.value}</span>
              <span className='tooltipLocation'>{hoverInfo?.feature?.properties?.location_s}, {hoverInfo?.feature?.properties?.region}, {hoverInfo?.feature?.properties?.country}</span>
              {hoverInfo?.feature?.properties?.watercours && (
                <span>Water Course: {hoverInfo?.feature?.properties?.watercours}<br /></span>
              )}
              <span className='tooltipCTA'>Click to view details</span>


            </div>
          )}

        </Map>

      </div>

      {clickInfo && (
        <>
          <div className="overlayContainer" onClick={onClose}>
          </div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>close X</span>

            <h1>{clickInfo?.feature?.properties?.country}, {clickInfo?.feature?.properties?.region}, {clickInfo?.feature?.properties?.location_s} - {clickInfo?.feature?.properties?.id_station}</h1>

            <TimeSeries data={timeseriesData} indices={indices} index={datatype} style={{ width: "100%", height: "100%", position: "relative", zIndex: "102", top: "0", left: "0" }} />
            
            <div className='mapLink'>
              View all hydrological stations in the alpine region <a href="https://maps.eurac.edu/maps/85/view" target="_blank">https://maps.eurac.edu/maps/85/view</a>
            </div>
            
            {htmlData ?
              <iframe srcDoc={htmlData} width="100%" height="5500px" style={{ position: 'absolute', top: "auto", left: "0", height: "5500opx", width: "100%", paddingBottom: "150px" }}></iframe>
              : <>loading ...</>}

          </div>
        </>
      )}

      <div className="controlContainer">
        <div className="legend">
          {staticMetaData.colormap.legend.stops.map((item, index) => {
            return (
              <div key={`legend${index}`} className="legendItem">
                <div
                  className="legendColor"
                  style={{ background: item['2'] }}>
                </div>
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
          onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))}
        />

        <div className="navigation">
          <p>Indices</p>
          <Link prefetch={false} href="/hydro/cdi">
            <a className={router.query.slug === 'cdi' ? 'active' : ''}>cdi</a>
          </Link>
          <Link prefetch={false} href="/hydro/vci">
            <a className={router.query.slug === 'vci' ? 'active' : ''}>vci</a>
          </Link>
          <Link prefetch={false} href="/hydro/vhi">
            <a className={router.query.slug === 'vhi' ? 'active' : ''}>vhi</a>
          </Link>
          <Link prefetch={false} href="/hydro/sma">
            <a className={router.query.slug === 'sma' ? 'active' : ''}>sma</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-1">
            <a className={router.query.slug === 'spei-1' ? 'active' : ''}>spei-1</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-3">
            <a className={router.query.slug === 'spei-3' ? 'active' : ''}>spei-3</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-6">
            <a className={router.query.slug === 'spei-6' ? 'active' : ''}>spei-6</a>
          </Link>
          <Link prefetch={false} href="/hydro/spei-12">
            <a className={router.query.slug === 'spei-12' ? 'active' : ''}>spei-12</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-1">
            <a className={router.query.slug === 'spi-1' ? 'active' : ''}>spi-1</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-3">
            <a className={router.query.slug === 'spi-3' ? 'active' : ''}>spi-3</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-6">
            <a className={router.query.slug === 'spi-6' ? 'active' : ''}>spi-6</a>
          </Link>
          <Link prefetch={false} href="/hydro/spi-12">
            <a className={router.query.slug === 'spi-12' ? 'active' : ''}>spi-12</a>
          </Link>
        </div>
      </div>


    </Layout >
  );
}
