import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import MapGL, {Source, Layer, ScaleControl, NavigationControl} from 'react-map-gl'
import ControlPanel from '../components/ControlPanel'
import {updatePercentiles} from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format }  from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'


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
  ResponsiveContainer} from 'recharts'

const MAPBOX_TOKEN = ''; // Set your mapbox token here


export async function getStaticProps({params}) {
  const datatype = params.slug ? params.slug.toUpperCase() : 'CDI'

  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/${datatype}-latest.geojson`)
  const staticData = await response.json()

  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()

  return { props: { datatype, staticData, staticMetaData } };
}

// This function gets called at build time
export async function getStaticPaths() {
  const indices = ['cdi','sma','spei-1','spei-12','spei-2','spei-3','spei-6','spi-1', 'spi-12', 'spi-3', 'spi-6', 'vci', 'vhi']
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: index },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export default function App( { datatype, staticData, staticMetaData, href } ) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []
  const dataLayer = paint

  const [viewport, setViewport] = useState({
    latitude: 46,
    longitude: 9,
    minZoom: 5,
    zoom: 5,
    bearing: 0,
    pitch: 0
  });

  const [metaData, setMetaData] = useState()
  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.firstDate : '2018-08-20');
  const [allData, setAllData] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const onHover = useCallback(event => {
    const {
      features,
      srcEvent: {offsetX, offsetY}
    } = event;
    const hoveredFeature = features && features[0];

    setHoverInfo(
      hoveredFeature
        ? {
            feature: hoveredFeature,
            x: offsetX,
            y: offsetY
          }
        : null
    );
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
    const nutsId = hoveredFeature ? hoveredFeature?.properties?.NUTS_ID : null
    getNutsData(nutsId)
  }, []);


  const onClose = useCallback(async (event) => {
    setClickInfo()
  }, []);

  
  const data = useMemo(() => {
    return staticData && updatePercentiles(staticData, f => f.properties[`${datatype}`][day]);
  }, [datatype, staticData, day]);

  const metadata = useMemo(() => {
    return staticMetaData;
  }, [staticMetaData]);

  async function getNutsData(overlayNutsId) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/timeseries/NUTS3_${overlayNutsId ? `${overlayNutsId}` : ''}.json`
        const result = await axios(url);
        setNutsData(result.data);
      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }

  if (metadata === undefined) {
    return <>Loading...</>;
  }

  const scaleControlStyle= {
    right: 10,
    bottom: 80
  };
  const navControlStyle= {
    right: 10,
    bottom: 120
  };

  return (
    <>
      <Head>
        <title>{staticMetaData?.short_name} - {staticMetaData?.long_name} | Eurac Research</title>
      </Head>
      <div className="reactMap">
        <MapGL
          {...viewport}
          width="100vw"
          height="100vh"
          mapStyle="mapbox://styles/mapbox/light-v10"
          onViewportChange={setViewport}
          mapboxApiAccessToken={'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'}
          interactiveLayerIds={['data']}
          onHover={onHover}
          onClick={onClick}
        >
          <Source type="geojson" data={data}>
            <Layer {...dataLayer} />
          </Source>
          <NavigationControl style={navControlStyle} />
          <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />
          {hoverInfo && (
            <div className="tooltip" style={{left: hoverInfo.x, top: hoverInfo.y}}>
              click to open timeline
              <br/>
              <br/>
              {day}
              <div>NUTS_NAME: {hoverInfo.feature.properties.NUTS_NAME}</div>
              <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div>
              <div>{datatype}: {hoverInfo.feature.properties.value}</div>
            </div>
          )}
        </MapGL>
        
        <div className="controlContainer">
          <div className="legend">
              {staticMetaData.colormap.legend.stops.map((item, index) => {
                return (
                  <div key={`legend${index}`} className="legendItem">
                    <div
                      className="legendColor" 
                      style={{ background:  item['2']}}>
                    </div>
                    <p className="legendLabel">{item['1']}</p>
                  </div>
                )
              })}
          </div>

          {console.log(router.query.slug)}
          <ControlPanel 
            metadata={staticMetaData} 
            day={day} 
            firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''} 
            lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''} 
            onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))} 
          />
          <div className="navigation">
            <p>Indices</p>
            <Link prefetch={false} href="/cdi">
              <a className={router.query.slug === 'cdi' ? 'active' : ''}>cdi</a>
            </Link>
            <Link prefetch={false} href="/vci">
              <a className={router.query.slug === 'vci' ? 'active' : ''}>vci</a>
            </Link>
            <Link prefetch={false} href="/vhi">
              <a className={router.query.slug === 'vhi' ? 'active' : ''}>vhi</a>
            </Link>
            <Link prefetch={false} href="/sma">
              <a className={router.query.slug === 'sma' ? 'active' : ''}>sma</a>
            </Link>
            <Link prefetch={false} href="/spei-1">
              <a className={router.query.slug === 'spei-1' ? 'active' : ''}>spei-1</a>
            </Link>
            <Link prefetch={false} href="/spei-3">
              <a className={router.query.slug === 'spei-3' ? 'active' : ''}>spei-3</a>
            </Link>
            <Link prefetch={false} href="/spei-6">
              <a className={router.query.slug === 'spei-6' ? 'active' : ''}>spei-6</a>
            </Link>
            <Link prefetch={false} href="/spei-12">
              <a className={router.query.slug === 'spei-12' ? 'active' : ''}>spei-12</a>
            </Link>
            <Link prefetch={false} href="/spi-1">
              <a className={router.query.slug === 'spi-1' ? 'active' : ''}>spi-1</a>
            </Link>
            <Link prefetch={false} href="/spi-3">
              <a className={router.query.slug === 'spi-3' ? 'active' : ''}>spi-3</a>
            </Link>
            <Link prefetch={false} href="/spi-6">
              <a className={router.query.slug === 'spi-6' ? 'active' : ''}>spi-6</a>
            </Link>
            <Link prefetch={false} href="/spi-12">
              <a className={router.query.slug === 'spi-12' ? 'active' : ''}>spi-12</a>
            </Link>
          </div>
        </div>
      </div>

      {clickInfo && (
        <div className="overlayContainer">
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>close X</span>
            <h3>{datatype} - {clickInfo.feature.properties.NUTS_NAME}</h3>
            {isError && (
              <p>file https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/timeseries/NUTS3_{clickInfo.feature.properties.NUTS_ID}.json - errors in file</p> 
              )}
            <p>NUTS_ID: {clickInfo.feature.properties.NUTS_ID}</p>

            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={nutsData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="1 1" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Brush dataKey="date" height={30} stroke="#4e9589" />
                <Line type="monotone" dataKey={datatype} strokeWidth="3" dot={false} stroke="#4e9589" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
