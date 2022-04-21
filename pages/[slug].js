import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, { Source, Layer, ScaleControl, NavigationControl } from 'react-map-gl'
import ControlPanel from '../components/ControlPanel'
import { updatePercentiles } from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from "../components/layout"
import Header from "../components/Header"

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
  const datatype = params.slug ? params.slug.toUpperCase() : 'CDI'
  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/${datatype}-latest.geojson`)
  const staticData = await response.json()
  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()
  return { props: { datatype, staticData, staticMetaData } };
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

export default function App({ datatype, staticData, staticMetaData, href }) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []
  const dataLayer = paint

  const [metaData, setMetaData] = useState()
  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.lastDate : staticMetaData?.timerange?.properties?.lastDate);
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

    // prettier-ignore
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

  const yaxis = (datatype === 'VHI' || datatype === 'VCI') ?
    <YAxis
      type="number"
      domain={[0, 100]} />
    : (datatype === 'CDI') ?
      <YAxis
        type="number"
        domain={[0, 5]} />
      : (datatype === 'SMA' ||
        datatype === 'SPEI-1' ||
        datatype === 'SPEI-2' ||
        datatype === 'SPEI-3' ||
        datatype === 'SPEI-6' ||
        datatype === 'SPEI-12' ||
        datatype === 'SPI-1' ||
        datatype === 'SPI-3' ||
        datatype === 'SPI-6' ||
        datatype === 'SPI-12') ?
        <>
          <ReferenceLine y={0} label="long term medium" stroke="#aaa" strokeDasharray="4 4" />
          <YAxis
            type="number"
            domain={[-4, 4]} />
        </>
        : <YAxis
          type="number"
          domain={[dataMin => (Math.round(dataMin) - 3), dataMax => (Math.round(dataMax) + 3)]}
          allowDecimals={false} />

  if (metadata === undefined) {
    return <>Loading...</>;
  }


  const gradientOffset = () => {
    if (!nutsData) {
      return false
    }
    const dataMax = Math.max(...nutsData.map((i) => i[`${datatype}`]));
    const dataMin = Math.min(...nutsData.map((i) => i[`${datatype}`]));

    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }
    return dataMax / (dataMax - dataMin);
  };
  const off = nutsData ? gradientOffset() : 0;

  function CustomTooltip({ payload, label, active }) {
    if (active && payload && payload.length) {
      const valueStyle = {
        color: payload[0].value > 0 ? `#000` : `#d73232`
      }
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p>{payload[0].name}: <span style={valueStyle}>{payload[0].value}</span></p>
        </div >
      );
    }

    return null;
  }


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
              minZoom: 3,
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
            <Source type="geojson" data={data}>
              <Layer {...dataLayer} beforeId="waterway-shadow" />
            </Source>
            <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} position={"bottom-right"} />
            <NavigationControl style={navControlStyle} position={"bottom-right"} />
            {hoverInfo && (
              <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
                click to open timeline
                <br />
                <br />
                {day}
                <div>NUTS_NAME: {hoverInfo.feature.properties.NUTS_NAME}</div>
                <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div>
                <div>{datatype}: {hoverInfo.feature.properties.value}</div>
              </div>
            )}
          </Map>

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
              metadata={staticMetaData}
              day={day}
              firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''}
              lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''}
              onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))}
            />

            <div className="navigation">
              <p>Indices</p>
              {indices?.map((index) => (
                <Link prefetch={false} href={`/${index}`} key={index}>
                  <a className={router.query.slug === index ? 'active' : ''}>{index}</a>
                </Link>
              ))}
            </div>
          </div>

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

        {clickInfo && (
          <div className="overlayContainer">
            <div className="dataOverlay">
              <span className="closeOverlay" onClick={onClose}>close X</span>
              <h3>{datatype} - {staticMetaData?.long_name}</h3>
              {isError && (
                <p>file https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/timeseries/NUTS3_{clickInfo.feature.properties.NUTS_ID}.json - errors in file</p>
              )}
              <p>{clickInfo.feature.properties.NUTS_NAME} (nuts id: {clickInfo.feature.properties.NUTS_ID})</p>

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
                  {yaxis}
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Brush dataKey="date" height={30} stroke="#4e9589" />
                  <defs>
                    <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset={off} stopColor="#4e9589" stopOpacity={1} />
                      <stop offset={off} stopColor="#d73232" stopOpacity={1} /> {/* negative values */}
                    </linearGradient>
                  </defs>
                  <Line
                    type="monotone"
                    dataKey={datatype}
                    strokeWidth="3"
                    stroke="url(#splitColor)"
                    dot={false}
                    activeDot={{ fill: '#fff', stroke: '#666', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
