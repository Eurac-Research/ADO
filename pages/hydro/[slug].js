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
import Header from "../../components/Header"

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

export async function getStaticProps({ params }) {
  const datatype = params.slug ? params.slug.toUpperCase() : 'CDI'

  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/catchment_polygons.geojson`)
  const staticData = await response.json()

  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()



  const fetchStations = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/CDI-latest.geojson`)
  const stationData = await fetchStations.json()

  const cachmentsGeoJson = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/catchment_polygons.geojson`)
  const cachmentsLayer = await cachmentsGeoJson.json()


  return { props: { datatype, staticData, cachmentsLayer, staticMetaData, stationData } };
}

// This function gets called at build time
export async function getStaticPaths() {
  const indices = ['cdi', 'dsc', 'sma', 'spei-1', 'spei-12', 'spei-2', 'spei-3', 'spei-6', 'spi-1', 'spi-12', 'spi-3', 'spi-6', 'vci', 'vhi']
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: index },
  }))
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export default function App({ datatype, staticData, staticMetaData, cachmentsLayer, stationData, href }) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []
  const dataLayer = paint



  const catchmentsPaintLayer = {
    type: 'fill',
    id: 'catchments',
    paint: {
      'fill-color': "#2940D3",
      'fill-opacity': 0.15,
      'fill-outline-color': "transparent"
    }
  }


  const stationPaintLayer = {
    id: 'stationPoint',
    type: 'circle',
    source: 'stationData',
    paint: {
      'circle-color': '#11b4da',
      'circle-radius': 6,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff'
    }
  }

  const [hoverInfo, setHoverInfo] = useState(null)

  const onHover = useCallback(event => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];

    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, []);

  const onOut = useCallback(event => {
    setHoverInfo(null)
  }, []);




  /*   
    const [hoverInfo, setHoverInfo] = useState(null)
    const [clickInfo, setClickInfo] = useState(null)
    const [nutsData, setNutsData] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isError, setIsError] = useState(false)
  
  
    const onHover = useCallback(event => {
      const {
        features,
        point: { x, y }
      } = event;
      const hoveredFeature = features && features[0];
  
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
      const nutsId = hoveredFeature ? hoveredFeature?.properties?.NUTS_ID : null
      getNutsData(nutsId)
    }, []);
  
    const onClose = useCallback(async (event) => {
      setClickInfo()
    }, []);
   */


  /* https://www.zeromolecule.com/blog/5-utility-react-hooks-for-every-project/ */
  function useToggleState(
    initialState = false,
    [on, off] = ['dark', 'light']
  ) {
    const [state, setState] = useState(initialState);

    const toggleState = useCallback(() => {
      setState(s => (s === on ? off : on));
    }, [on, off]);

    return [state, toggleState, setState];
  }
  const [theme, toggleTheme] = useToggleState('light', ['dark', 'light']);

  /*   const data = useMemo(() => {
      return staticData && updatePercentiles(staticData, f => f.properties[`${datatype}`][day]);
    }, [datatype, staticData, day]);
    const metadata = useMemo(() => {
      return staticMetaData;
    }, [staticMetaData]);
   */
  async function getNutsData(overlayNutsId) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/timeseries/NUTS3_${overlayNutsId ? `${overlayNutsId}` : ''}.json`
        const result = await axios(url);
        setNutsData(result.data);
      } catch (error) {
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



  return (
    <Layout theme={theme}>
      <Head>
        <title>{staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research</title>
      </Head>
      <div>

        <Header />

        <div className="reactMap">
          <Map
            initialViewState={{
              latitude: 46,
              longitude: 9,
              minZoom: 5,
              zoom: 5,
              bearing: 0,
              pitch: 0
            }}
            style={{ width: "100vw", height: "100vh" }}
            mapStyle={theme === 'dark' ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy' : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'}
            mapboxAccessToken={MAPBOX_TOKEN}
            interactiveLayerIds={['stationPoint']}
            onMouseMove={onHover}
            onMouseLeave={onOut}
          >


            <Source type="geojson" data={cachmentsLayer}>
              <Layer {...catchmentsPaintLayer} />
            </Source>

            <Source type="geojson" data={stationData}>
              <Layer {...stationPaintLayer} />
            </Source>


            {hoverInfo && (
              <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
                TODO: onclick the static html station information should open in an overlay<br />
                station id: {hoverInfo?.feature?.properties?.id_station}
              </div>
            )}



          </Map>

          {/*
          <div className="controlContainer">

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

            */}

          <div className="darkModeToggle" onClick={toggleTheme} title={theme === 'light' ? 'switch to dark mode' : "switch to light mode"}>
            {theme === 'light' ?
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" title="moon">
                <path d="M283.21 512c78.96 0 151.08-35.92 198.86-94.8 7.07-8.7-.64-21.42-11.56-19.34-124.2 23.65-238.27-71.58-238.27-196.96a200.43 200.43 0 0 1 101.5-174.39C343.43 21 341 6.31 330 4.28A258.16 258.16 0 0 0 283.2 0c-141.3 0-256 114.51-256 256 0 141.3 114.51 256 256 256z" />
              </svg>
              : <svg xmlns="http://www.w3.org/2000/svg" title="sun" fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            }
          </div>

        </div>

      </div >
    </Layout >
  );
}
