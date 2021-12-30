import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import MapGL, { Source, Layer, ScaleControl, NavigationControl } from 'react-map-gl'
import ControlPanel from '../components/ControlPanel'
import { updatePercentiles } from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from "../components/layout";


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
  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/${datatype}-latest.geojson`)
  const staticData = await response.json()
  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()
  return { props: { datatype, staticData, staticMetaData } };
}

// This function gets called at build time
export async function getStaticPaths() {
  const indices = ['cdi', 'sma', 'spei-1', 'spei-12', 'spei-2', 'spei-3', 'spei-6', 'spi-1', 'spi-12', 'spi-3', 'spi-6', 'vci', 'vhi']
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
  const [hoverInfo, setHoverInfo] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)




  const onHover = useCallback(event => {
    const {
      features,
      srcEvent: { offsetX, offsetY }
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

  const scaleControlStyle = {
    right: 10,
    bottom: 80
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
    <Layout>
      <Head>
        <title>{staticMetaData?.long_name} - Alpine Drought Observatory | Eurac Research</title>
      </Head>
      <div className={theme}>
        <div className="header">
          <Link href="/">
            <a>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 243.23 66" className="ado-logo">
                <path fill="#404649" d="M86.73 25.91 82.41 39h3.83l.76-2.5h4.32l.75 2.5h3.84l-4.32-13.09Zm1.07 7.93 1.31-4.32h.1l1.31 4.32Z" />
                <path fill="#404649" d="M106.01 36.14h-5.29V25.91h-3.56V39h8.85Z" />
                <path fill="#404649" d="M110.99 35.12h2a5.84 5.84 0 0 0 2.62-.56 4.19 4.19 0 0 0 1.75-1.58 5.13 5.13 0 0 0 0-4.87 4.09 4.09 0 0 0-1.7-1.62 5.33 5.33 0 0 0-2.55-.58h-5.65V39h3.55Zm1.26-6.37a2.49 2.49 0 0 1 1.07.21 1.63 1.63 0 0 1 .68.62 1.82 1.82 0 0 1 .24 1 1.9 1.9 0 0 1-.24 1 1.66 1.66 0 0 1-.68.63 2.49 2.49 0 0 1-1.07.22h-1.26v-3.68Z" />
                <path fill="#404649" d="M119.25 25.91h3.55V39h-3.55z" />
                <path fill="#404649" d="M128.05 32.12h.08l4.72 6.88h2.97V25.91h-3.55v6.85h-.11l-4.65-6.85h-3.02V39h3.56Z" />
                <path fill="#404649" d="M146.92 36.14h-5.86v-2.25h5.4v-2.87h-5.4v-2.25h5.88v-2.86h-9.43V39h9.41Z" />
                <path fill="#404649" d="M160.78 38.22a5.39 5.39 0 0 0 2.26-2.25 8.1 8.1 0 0 0 0-7 5.4 5.4 0 0 0-2.27-2.25 7.29 7.29 0 0 0-3.5-.79h-5v13.09h5a7.24 7.24 0 0 0 3.51-.8Zm-4.94-2.23v-7.06h1.23a4.22 4.22 0 0 1 1.73.31 2.18 2.18 0 0 1 1.08 1.08 6.51 6.51 0 0 1 0 4.27 2.15 2.15 0 0 1-1 1.08 4 4 0 0 1-1.66.32Z" />
                <path fill="#404649" d="M169.07 34.65h1.23l2.3 4.32h3.86l-2.66-4.88a3.81 3.81 0 0 0 1.6-1.39 4.23 4.23 0 0 0 .63-2.37 4.47 4.47 0 0 0-.61-2.39 4 4 0 0 0-1.7-1.53 5.84 5.84 0 0 0-2.55-.53h-5.65v13.09h3.55Zm1.26-5.93a3.12 3.12 0 0 1 1.07.17 1.43 1.43 0 0 1 .68.52 1.63 1.63 0 0 1 .24.92 1.54 1.54 0 0 1-.24.9 1.34 1.34 0 0 1-.68.5 3.13 3.13 0 0 1-1.07.16h-1.26v-3.14Z" />
                <path fill="#404649" d="M180.58 38.41a6.79 6.79 0 0 0 3.23.77 6.63 6.63 0 0 0 3.22-.77 5.64 5.64 0 0 0 2.3-2.27 8.41 8.41 0 0 0 0-7.37 5.71 5.71 0 0 0-2.3-2.27 7.14 7.14 0 0 0-6.45 0 5.75 5.75 0 0 0-2.29 2.27 8.48 8.48 0 0 0 0 7.36 5.77 5.77 0 0 0 2.29 2.28Zm.83-7.94a2.41 2.41 0 0 1 2.4-1.64 2.54 2.54 0 0 1 1.49.42 2.5 2.5 0 0 1 .91 1.22 6.51 6.51 0 0 1 0 4 2.54 2.54 0 0 1-4.8 0 6.51 6.51 0 0 1 0-4Z" />
                <path fill="#404649" d="M200.42 38.57a4.63 4.63 0 0 0 2-1.69 4.54 4.54 0 0 0 .72-2.58v-8.39h-3.56v8.08a2.18 2.18 0 0 1-.27 1.09 2 2 0 0 1-.74.74 2.32 2.32 0 0 1-2.17 0 2 2 0 0 1-.74-.74 2.18 2.18 0 0 1-.27-1.09v-8.08h-3.56v8.39a4.5 4.5 0 0 0 2.69 4.27 7.72 7.72 0 0 0 5.92 0Z" />
                <path fill="#404649" d="M207.81 38.37a6.79 6.79 0 0 0 3.36.81 6.63 6.63 0 0 0 3-.67 5.06 5.06 0 0 0 2.08-1.94 5.84 5.84 0 0 0 .76-3.06v-1.86h-5.8v2.53h2.37a2 2 0 0 1-.26 1 1.75 1.75 0 0 1-.81.67 3.35 3.35 0 0 1-1.36.24 2.46 2.46 0 0 1-2.47-1.69 5.47 5.47 0 0 1-.31-2 5.11 5.11 0 0 1 .33-1.94 2.52 2.52 0 0 1 2.48-1.66 3.13 3.13 0 0 1 .77.09 2 2 0 0 1 .61.27 1.7 1.7 0 0 1 .44.45 1.66 1.66 0 0 1 .26.59h3.6a4.53 4.53 0 0 0-.58-1.81 4.8 4.8 0 0 0-1.24-1.42 5.66 5.66 0 0 0-1.77-.94 6.9 6.9 0 0 0-2.17-.33 6.82 6.82 0 0 0-2.48.45 5.8 5.8 0 0 0-2 1.31 6.11 6.11 0 0 0-1.37 2.12 7.74 7.74 0 0 0-.5 2.87 7.45 7.45 0 0 0 .81 3.58 5.69 5.69 0 0 0 2.25 2.34Z" />
                <path fill="#404649" d="M226.97 31.02h-4.7v-5.11h-3.56V39h3.56v-5.11h4.7V39h3.55V25.91h-3.55Z" />
                <path fill="#404649" d="M231.85 25.91v2.86h3.94V39h3.5V28.77h3.94v-2.86Z" />
                <path fill="#404649" d="M92.38 48.5a7.14 7.14 0 0 0-6.45 0 5.68 5.68 0 0 0-2.29 2.27 8.39 8.39 0 0 0 0 7.36 5.71 5.71 0 0 0 2.29 2.28 6.79 6.79 0 0 0 3.23.77 6.66 6.66 0 0 0 3.22-.77 5.71 5.71 0 0 0 2.3-2.27 8.41 8.41 0 0 0 0-7.37 5.77 5.77 0 0 0-2.3-2.27Zm-.82 7.94a2.59 2.59 0 0 1-.91 1.23 2.85 2.85 0 0 1-3 0 2.59 2.59 0 0 1-.91-1.23 6.51 6.51 0 0 1 0-4 2.54 2.54 0 0 1 4.8 0 6.51 6.51 0 0 1 0 4Z" />
                <path fill="#404649" d="M106.42 54.65a3.31 3.31 0 0 0-1.54-.42v-.13a3.53 3.53 0 0 0 1.33-.55 2.84 2.84 0 0 0 .89-1 2.73 2.73 0 0 0 .32-1.31 2.92 2.92 0 0 0-.53-1.74 3.21 3.21 0 0 0-1.54-1.13 6.8 6.8 0 0 0-2.51-.41h-5.68v13.09h6.16a5.8 5.8 0 0 0 2.46-.48 3.77 3.77 0 0 0 1.59-1.31 3.4 3.4 0 0 0 .56-1.91 3.14 3.14 0 0 0-.41-1.62 3 3 0 0 0-1.1-1.08Zm-5.7-3.9h1.5a1.82 1.82 0 0 1 1.1.32 1.1 1.1 0 0 1 .44.93 1.14 1.14 0 0 1-.2.68 1.28 1.28 0 0 1-.56.43 2.16 2.16 0 0 1-.83.15h-1.45Zm3 7.13a2.26 2.26 0 0 1-1.34.34h-1.66v-2.77h1.71a2.38 2.38 0 0 1 .93.17 1.27 1.27 0 0 1 .6.49 1.38 1.38 0 0 1 .21.78 1.16 1.16 0 0 1-.45.94Z" />
                <path fill="#404649" d="M118.85 54.65a4.48 4.48 0 0 0-1.26-.88 7.6 7.6 0 0 0-1.87-.61l-1.07-.23a6.81 6.81 0 0 1-.8-.22 2.25 2.25 0 0 1-.56-.27.93.93 0 0 1-.32-.34 1 1 0 0 1 .09-.94 1.1 1.1 0 0 1 .51-.35 2.6 2.6 0 0 1 .9-.13 2 2 0 0 1 1.29.36 1.4 1.4 0 0 1 .48 1h3.4a4.08 4.08 0 0 0-.64-2.24 4.16 4.16 0 0 0-1.79-1.5 6.56 6.56 0 0 0-2.74-.53 6.81 6.81 0 0 0-2.75.53 4.38 4.38 0 0 0-1.87 1.46 3.55 3.55 0 0 0-.67 2.18 3.05 3.05 0 0 0 1 2.42 6 6 0 0 0 2.74 1.26l1.31.28a6.16 6.16 0 0 1 1.15.35 1.52 1.52 0 0 1 .62.41.82.82 0 0 1 .2.52 1 1 0 0 1-.21.57 1.24 1.24 0 0 1-.58.39 2.89 2.89 0 0 1-1 .14 3 3 0 0 1-1.17-.21 1.68 1.68 0 0 1-.76-.62 2 2 0 0 1-.3-1h-3.37a4.85 4.85 0 0 0 .7 2.7 4.13 4.13 0 0 0 2 1.55 8 8 0 0 0 3 .51 7.84 7.84 0 0 0 2.85-.47 3.92 3.92 0 0 0 1.82-1.36 3.73 3.73 0 0 0 .65-2.19 4.34 4.34 0 0 0-.24-1.38 3.3 3.3 0 0 0-.74-1.16Z" />
                <path fill="#404649" d="M121.17 61h9.41v-2.86h-5.86v-2.25h5.4v-2.87h-5.4v-2.25h5.88v-2.86h-9.43Z" />
                <path fill="#404649" d="M142.25 54.73a4.23 4.23 0 0 0 .63-2.37 4.47 4.47 0 0 0-.61-2.39 4 4 0 0 0-1.7-1.53 5.84 5.84 0 0 0-2.55-.53h-5.65V61h3.55v-4.35h1.23l2.3 4.32h3.86l-2.66-4.88a3.81 3.81 0 0 0 1.6-1.36Zm-6.33-4h1.26a3.12 3.12 0 0 1 1.07.17 1.43 1.43 0 0 1 .68.52 1.63 1.63 0 0 1 .24.92 1.54 1.54 0 0 1-.24.9 1.34 1.34 0 0 1-.68.5 3.13 3.13 0 0 1-1.07.16h-1.26Z" />
                <path fill="#404649" d="m153.03 47.91-2.69 9.23h-.1l-2.68-9.23h-4.02L147.86 61h4.86l4.32-13.09Z" />
                <path fill="#404649" d="M160.07 47.91 155.75 61h3.84l.75-2.5h4.32l.76 2.5h3.83l-4.32-13.09Zm1.08 7.93 1.3-4.32h.1l1.31 4.32Z" />
                <path fill="#404649" d="M168.44 50.77h3.94V61h3.51V50.77h3.93v-2.86h-11.38Z" />
                <path fill="#404649" d="M190.07 48.5a7.16 7.16 0 0 0-6.46 0 5.66 5.66 0 0 0-2.28 2.27 8.39 8.39 0 0 0 0 7.36 5.69 5.69 0 0 0 2.28 2.28 6.8 6.8 0 0 0 3.24.77 6.69 6.69 0 0 0 3.22-.77 5.68 5.68 0 0 0 2.29-2.27 8.41 8.41 0 0 0 0-7.37 5.75 5.75 0 0 0-2.29-2.27Zm-.82 7.94a2.61 2.61 0 0 1-.92 1.23 2.84 2.84 0 0 1-3 0 2.61 2.61 0 0 1-.92-1.23 6.51 6.51 0 0 1 0-4 2.58 2.58 0 0 1 .92-1.22 2.84 2.84 0 0 1 3 0 2.58 2.58 0 0 1 .92 1.22 6.51 6.51 0 0 1 0 4Z" />
                <path fill="#404649" d="M204.74 54.73a4.23 4.23 0 0 0 .62-2.37 4.56 4.56 0 0 0-.6-2.39 4.07 4.07 0 0 0-1.7-1.53 5.84 5.84 0 0 0-2.55-.53h-5.65V61h3.55v-4.35h1.23l2.3 4.32h3.86l-2.66-4.88a3.87 3.87 0 0 0 1.6-1.36Zm-6.33-4h1.25a3 3 0 0 1 1.07.17 1.41 1.41 0 0 1 .69.52 1.63 1.63 0 0 1 .24.92 1.54 1.54 0 0 1-.24.9 1.33 1.33 0 0 1-.69.5 3.05 3.05 0 0 1-1.07.16h-1.25Z" />
                <path fill="#404649" d="M212.96 53.23h-.1l-2.56-5.32h-3.96l4.8 8.97V61h3.53v-4.12l4.81-8.97h-3.97Z" />
                <path fill="#8c9091" d="M90.46 11.32h-.15l-3.04-7.41h-4.43V17h3.48V9.38h.1l2.92 7.52h2.1l2.91-7.47h.1V17h3.48V3.91h-4.42Z" />
                <path fill="#8c9091" d="M109.15 4.5a7.14 7.14 0 0 0-6.45 0 5.75 5.75 0 0 0-2.29 2.27 8.48 8.48 0 0 0 0 7.36 5.77 5.77 0 0 0 2.29 2.28 6.79 6.79 0 0 0 3.23.77 6.63 6.63 0 0 0 3.22-.77 5.64 5.64 0 0 0 2.3-2.27 8.41 8.41 0 0 0 0-7.37 5.71 5.71 0 0 0-2.3-2.27Zm-.82 7.94a2.54 2.54 0 0 1-4.8 0 6.51 6.51 0 0 1 0-4 2.41 2.41 0 0 1 2.4-1.64 2.54 2.54 0 0 1 1.49.42 2.5 2.5 0 0 1 .91 1.22 6.51 6.51 0 0 1 0 4Z" />
                <path fill="#8c9091" d="M121.71 10.76h-.1l-4.66-6.85h-3.02V17h3.56v-6.88h.07L122.3 17h2.96V3.91h-3.55Z" />
                <path fill="#8c9091" d="M126.95 3.91h3.55V17h-3.55z" />
                <path fill="#8c9091" d="M131.83 6.77h3.94V17h3.5V6.77h3.94V3.91h-11.38Z" />
                <path fill="#8c9091" d="M153.46 4.5a7.14 7.14 0 0 0-6.45 0 5.75 5.75 0 0 0-2.29 2.27 8.39 8.39 0 0 0 0 7.36 5.77 5.77 0 0 0 2.29 2.28 6.79 6.79 0 0 0 3.23.77 6.63 6.63 0 0 0 3.22-.77 5.64 5.64 0 0 0 2.3-2.27 8.41 8.41 0 0 0 0-7.37 5.71 5.71 0 0 0-2.3-2.27Zm-.82 7.94a2.59 2.59 0 0 1-.91 1.23 2.85 2.85 0 0 1-3 0 2.59 2.59 0 0 1-.91-1.23 6.51 6.51 0 0 1 0-4 2.54 2.54 0 0 1 4.8 0 6.51 6.51 0 0 1 0 4Z" />
                <path fill="#8c9091" d="M168.13 10.73a4.31 4.31 0 0 0 .62-2.37 4.47 4.47 0 0 0-.61-2.39 4 4 0 0 0-1.69-1.53 5.88 5.88 0 0 0-2.56-.53h-5.65V17h3.56v-4.35h1.27l2.3 4.32h3.86l-2.67-4.88a3.9 3.9 0 0 0 1.57-1.36Zm-6.33-4h1.27a3.08 3.08 0 0 1 1.07.17 1.34 1.34 0 0 1 .68.52 1.63 1.63 0 0 1 .24.92 1.54 1.54 0 0 1-.24.9 1.26 1.26 0 0 1-.68.5 3.09 3.09 0 0 1-1.07.16h-1.25Z" />
                <path fill="#8c9091" d="M170.26 3.91h3.55V17h-3.55z" />
                <path fill="#8c9091" d="M183.27 10.76h-.1l-4.65-6.85h-3.02V17h3.56v-6.88h.07l4.73 6.88h2.97V3.91h-3.56Z" />
                <path fill="#8c9091" d="M194.96 9.65v2.53h2.37a1.86 1.86 0 0 1-.26 1 1.75 1.75 0 0 1-.81.67 3.33 3.33 0 0 1-1.35.24 2.49 2.49 0 0 1-2.48-1.69 5.47 5.47 0 0 1-.31-2 5.11 5.11 0 0 1 .33-1.94 2.52 2.52 0 0 1 2.48-1.66 3.13 3.13 0 0 1 .77.09 2 2 0 0 1 .61.27 1.57 1.57 0 0 1 .44.45 1.88 1.88 0 0 1 .27.59h3.59a4.53 4.53 0 0 0-.58-1.81 4.8 4.8 0 0 0-1.24-1.42 5.56 5.56 0 0 0-1.77-.94 6.88 6.88 0 0 0-2.16-.33 6.75 6.75 0 0 0-2.48.45 5.8 5.8 0 0 0-2 1.31A6 6 0 0 0 189 7.58a7.74 7.74 0 0 0-.5 2.87 7.45 7.45 0 0 0 .81 3.58 5.65 5.65 0 0 0 2.26 2.31 6.73 6.73 0 0 0 3.35.81 6.6 6.6 0 0 0 3-.67 5.08 5.08 0 0 0 2.09-1.94 5.93 5.93 0 0 0 .75-3.06V9.65Z" />
                <g>
                  <g>
                    <circle cx="33" cy="33" r="33" fill="none" />
                    <path fill="#8c9091" d="M33 66a33 33 0 1 1 33-33 33 33 0 0 1-33 33Zm0-64.5A31.5 31.5 0 1 0 64.5 33 31.5 31.5 0 0 0 33 1.5Z" />
                  </g>
                  <g fill="#8c9091">
                    <path d="M16.31 49.87V15.36h-.89v35.4h35.26v-.89Z" />
                    <path d="m25.37 32.97 4.5-4.11L37.27 44a.74.74 0 0 0 .51.4.71.71 0 0 0 .63-.16l8.87-7.56v3.05h.89v-4.68a.44.44 0 0 0-.44-.44h-4.17v.89h2.84l-8.22 7-7.42-15.17a.71.71 0 0 0-.52-.4.72.72 0 0 0-.63.17l-5 4.58h-3.87v1.48h4.16a.73.73 0 0 0 .47-.19Z" />
                    <path d="M47.12 24.02h.89v-4.68a.45.45 0 0 0-.45-.45h-4.19v.89h3.75Z" />
                    <path d="M20.18 47.06a.43.43 0 0 0 .31-.12l.06-.06a.45.45 0 0 0-.63-.63h-.05a.45.45 0 0 0 0 .63.44.44 0 0 0 .32.13Z" />
                    <path d="m21.32 44.87-.1.1a.45.45 0 1 0 .62.64l.1-.1a.44.44 0 0 0-.61-.63Z" />
                    <path d="M38.9 28.51a.44.44 0 0 0 .31-.13l.1-.1a.44.44 0 0 0 0-.63.45.45 0 0 0-.63 0l-.1.1a.45.45 0 0 0 .31.76Z" />
                    <path d="m22.67 43.51-.1.1a.45.45 0 0 0 .63.63l.1-.1a.45.45 0 0 0 0-.63.44.44 0 0 0-.63 0Z" />
                    <path d="M36.12 31.26a.44.44 0 0 0 .31-.13l.1-.1a.44.44 0 1 0-.62-.63l-.1.1a.45.45 0 0 0 0 .63.48.48 0 0 0 .32.13Z" />
                    <path d="M37.51 29.88a.43.43 0 0 0 .31-.12l.1-.1a.44.44 0 0 0-.61-.63l-.1.1a.44.44 0 0 0 0 .63.4.4 0 0 0 .31.13Z" />
                    <path d="M41.68 25.76a.4.4 0 0 0 .31-.13l.1-.1a.44.44 0 1 0-.62-.63l-.1.1a.44.44 0 0 0 0 .63.42.42 0 0 0 .32.13Z" />
                    <path d="m44.22 22.15-.1.1a.45.45 0 0 0 0 .63.44.44 0 0 0 .63 0l.1-.1a.44.44 0 0 0 0-.63.45.45 0 0 0-.63 0Z" />
                    <path d="M43.07 24.39a.46.46 0 0 0 .31-.13l.1-.1a.44.44 0 0 0 0-.63.45.45 0 0 0-.63 0l-.1.1a.45.45 0 0 0 0 .63.42.42 0 0 0 .32.13Z" />
                    <path d="M40.29 27.14a.44.44 0 0 0 .31-.13l.1-.1a.45.45 0 0 0-.62-.64l-.1.1a.45.45 0 0 0 .31.77Z" />
                    <path d="m26.84 39.38-.1.1a.45.45 0 0 0 .63.64l.1-.1a.44.44 0 0 0-.61-.63Z" />
                    <path d="m25.45 40.76-.1.1a.45.45 0 0 0 .63.63l.1-.1a.45.45 0 0 0-.63-.63Z" />
                    <path d="m24.07 42.13-.1.1a.45.45 0 0 0 .63.63l.1-.1a.45.45 0 0 0-.63-.63Z" />
                    <path d="M34.73 32.65a.47.47 0 0 0 .32-.12l.1-.1a.43.43 0 1 0-.6-.63l-.1.1a.45.45 0 0 0 0 .63.42.42 0 0 0 .32.13Z" />
                    <path d="m31.01 35.26-.1.1a.44.44 0 0 0 0 .63.43.43 0 0 0 .62 0l.1-.1a.44.44 0 0 0 0-.63.45.45 0 0 0-.63 0Z" />
                    <path d="m29.62 36.65-.1.1a.45.45 0 0 0 0 .63.43.43 0 0 0 .63 0l.1-.1a.44.44 0 0 0-.61-.63Z" />
                    <path d="m28.23 38.01-.1.1a.45.45 0 0 0 .61.65l.1-.1a.45.45 0 0 0-.63-.63Z" />
                    <path d="M45.56 20.83v.05a.45.45 0 0 0 .63.64v-.06a.43.43 0 0 0 0-.62.44.44 0 0 0-.63 0Z" />
                  </g>
                </g>
              </svg>
            </a>
          </Link>
          <a href="https://www.eurac.edu/en" className="eurac-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="178.793" height="22" viewBox="0 0 178.793 19.536" className="eurac-logo"><g fill="#838b93"><path d="M165.199 19.215c.679-.027 1.709-.081 2.768-.081 1.031 0 2.144.054 2.822.081v-.76l-.9-.135c-.6-.109-.9-.272-.9-2.171V8.303a6.188 6.188 0 0 1 3.147-1.058c2.307 0 2.849 1.275 2.849 3.337v5.562c0 1.9-.271 2.062-.9 2.171l-.9.135v.765c.678-.027 1.709-.081 2.767-.081 1.031 0 2.144.054 2.822.081v-.76l-.9-.135c-.6-.109-.9-.272-.9-2.171v-5.866c0-2.74-.923-4.639-4.124-4.639a6.3 6.3 0 0 0-3.88 1.763V0a20.047 20.047 0 0 1-3.771 1.465v.65c1.763.352 1.763.678 1.763 2.062v11.967c0 1.9-.271 2.062-.9 2.171l-.9.135zm-6.539.326a4.838 4.838 0 0 0 4.016-1.737l-.136-.705a5.725 5.725 0 0 1-3.147.841c-2.822 0-4.8-1.927-4.8-5.4 0-3.608 1.927-5.725 4.232-5.725 1.927 0 2.551 1.031 2.632 2.577h1.031c0-.9.027-2.2.109-3.093a10.729 10.729 0 0 0-3.608-.651c-3.555 0-6.513 3.12-6.513 7.163 0 4.124 2.306 6.729 6.186 6.729m-16.037-.325c.678-.027 1.709-.109 2.767-.109 1.031 0 2.5.082 3.175.109v-.76l-1.247-.14c-.6-.082-.9-.272-.9-2.171V8.466a4.73 4.73 0 0 1 2.879-1.031 4.092 4.092 0 0 1 1.493.244l.218-1.872a4.463 4.463 0 0 0-1.167-.163 5.094 5.094 0 0 0-3.419 1.9V5.508a26.914 26.914 0 0 1-3.771 1.3v.651c1.764.352 1.764.678 1.764 2.062v6.62c0 1.9-.272 2.062-.9 2.171l-.9.135zm-9.415-1.248a2.045 2.045 0 0 1-2.225-2.152c0-1.655 1.248-2.659 4.042-2.659.3 0 .761 0 1.059.028-.027.569-.081 2.6-.081 3.581a3.744 3.744 0 0 1-2.795 1.194m-.732 1.574a4.534 4.534 0 0 0 3.608-1.845h.055a1.777 1.777 0 0 0 1.98 1.845 4.134 4.134 0 0 0 2.063-.489v-.76c-1.656 0-2.144-.379-2.144-1.709 0-2.442.109-4.5.109-6.62 0-2.632-1.52-4.314-4.586-4.314a5.427 5.427 0 0 0-3.717 1.546l.136.787a6.281 6.281 0 0 1 3.094-.732c2.116 0 3.039 1.112 3.039 3.2v1.578c-.407-.027-1.086-.027-1.466-.027-3.473 0-5.725 1.628-5.725 4.178a3.316 3.316 0 0 0 3.555 3.365m-14.19-8.846c.217-1.845 1.356-3.852 3.636-3.852a2.977 2.977 0 0 1 2.846 3.256c0 .379-.162.6-.624.6zm3.88 8.846c1.953 0 3.663-.842 4.178-1.683l-.081-.678a7.9 7.9 0 0 1-3.581.76c-3.039 0-4.5-2.442-4.5-5.372 0-.245 0-.516.027-.786h8.764a5.816 5.816 0 0 0 .055-.977 4.832 4.832 0 0 0-4.993-5.155c-3.527 0-6 3.039-6 7.163 0 4.151 2.144 6.729 6.133 6.729m-13.648 0c2.713 0 4.694-1.818 4.694-3.989 0-4.857-6.838-3.554-6.838-6.7 0-1.383 1.059-2.089 2.687-2.089 1.818 0 2.632.9 2.767 2.632h1a22.693 22.693 0 0 1-.054-3.039 10.491 10.491 0 0 0-3.609-.705c-2.632 0-4.585 1.411-4.585 3.581 0 4.911 6.81 3.256 6.81 6.648 0 1.519-1.194 2.469-2.9 2.469-2.307 0-2.876-1.058-3.12-2.985h-1a31.179 31.179 0 0 1 .074 3.555 12.844 12.844 0 0 0 4.07.624m-15.38-8.849c.217-1.845 1.357-3.852 3.636-3.852a2.978 2.978 0 0 1 2.845 3.256c0 .379-.163.6-.624.6zm3.88 8.846c1.954 0 3.663-.842 4.179-1.683l-.082-.678a7.9 7.9 0 0 1-3.581.76c-3.038 0-4.5-2.442-4.5-5.372 0-.245 0-.516.027-.786h8.764a5.931 5.931 0 0 0 .054-.977 4.832 4.832 0 0 0-4.992-5.155c-3.528 0-6 3.039-6 7.163 0 4.151 2.144 6.729 6.132 6.729m-15.986-.322c.678-.027 1.709-.109 2.767-.109 1.032 0 2.5.082 3.175.109v-.76l-1.248-.14c-.6-.082-.9-.272-.9-2.171V8.466a4.728 4.728 0 0 1 2.881-1.031 4.091 4.091 0 0 1 1.492.244l.218-1.872a4.458 4.458 0 0 0-1.167-.163 5.091 5.091 0 0 0-3.419 1.9V5.508a26.95 26.95 0 0 1-3.772 1.3v.651c1.764.352 1.764.678 1.764 2.062v6.62c0 1.9-.272 2.062-.9 2.171l-.9.135zM67.738 19.536a10.166 10.166 0 0 0 3.687-.663v-4.032a5.963 5.963 0 0 1-3.283.778c-1.7 0-2.707-1.152-2.707-3.283 0-2.592 1.094-3.629 2.679-3.629a8.352 8.352 0 0 1 3.082.6V5.366a12.034 12.034 0 0 0-3.573-.518c-5.011 0-7.6 3.2-7.6 7.488 0 4.464 2.362 7.2 7.719 7.2M50.66 16.048c-.806 0-1.325-.259-1.325-1.066 0-.95.518-1.325 1.959-1.325a5.282 5.282 0 0 1 .633.029V15.5a1.742 1.742 0 0 1-1.267.547m-1.76 3.489a4.211 4.211 0 0 0 3.718-1.788 3.347 3.347 0 0 0 3.37 1.786 4.056 4.056 0 0 0 2.391-.576v-3.2a2.9 2.9 0 0 1-.462.058c-.576 0-.806-.346-.806-1.009v-4.43c0-3.772-1.872-5.529-6.48-5.529a14.844 14.844 0 0 0-4.751.72v3.83a14.846 14.846 0 0 1 3.859-.6c1.556 0 2.189.547 2.189 1.728v.461c-.2 0-.433-.029-.921-.029-3.888 0-6.711 1.095-6.711 4.349 0 2.966 2.045 4.233 4.609 4.233m-15.525-.234h5.184v-9.274a7.4 7.4 0 0 1 3.11-.72 6.513 6.513 0 0 1 1.584.173V4.992a3.481 3.481 0 0 0-1.152-.144 4.839 4.839 0 0 0-3.657 1.728V5.078H33.38zm-12.3.231a6.047 6.047 0 0 0 3.888-1.354v1.123h5.04V5.078h-5.182v9.706a3.025 3.025 0 0 1-1.728.748c-1.037 0-1.555-.461-1.555-1.757V5.078H16.33v9.476c0 2.851 1.239 4.982 4.752 4.982M5.414 10.548c.058-1.009.49-2.045 1.728-2.045 1.095 0 1.555.95 1.555 1.872v.173zm2.42 8.986a13.961 13.961 0 0 0 4.838-.806v-3.829a11.914 11.914 0 0 1-4.406.864c-2.3 0-2.852-.864-2.938-2.419h8.324a13.521 13.521 0 0 0 .086-1.527c0-3.657-1.584-6.969-6.624-6.969C2.275 4.848 0 8.39 0 12.163c0 4.32 2.16 7.373 7.834 7.373"></path></g></svg>
          </a>
        </div>
        <div className="reactMap">
          <MapGL
            {...viewport}
            width="100vw"
            height="100vh"
            mapStyle={theme === 'dark' ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10'}
            onViewportChange={setViewport}
            mapboxApiAccessToken={'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'}
            interactiveLayerIds={['data']}
            onHover={onHover}
            onClick={onClick}
          >
            <Source type="geojson" data={data}>
              <Layer {...dataLayer} beforeId="waterway-label" />
            </Source>
            <NavigationControl style={navControlStyle} />
            <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />
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
          </MapGL>

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
