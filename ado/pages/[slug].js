import * as React from 'react'
import { useRouter } from 'next/router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import MapGL, {Source, Layer } from 'react-map-gl'
import ControlPanel from '../components/ControlPanel'
import {updatePercentiles} from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format }  from 'date-format-parse'


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

  //console.log("slug: ", params.slug);
  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/${datatype}-latest.geojson`)
  const staticData = await response.json()

  const responseMeta = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/metadata/${datatype}.json`)
  const staticMetaData = await responseMeta.json()

  return { props: { datatype, staticData, staticMetaData } };
}


// This function gets called at build time
export async function getStaticPaths() {
  // Call an external API endpoint to get posts
  // const res = await fetch('https://.../posts')
  // const posts = await res.json()

  const indices = ['/', 'cdi','sma','spei-1','spei-12','spei-2','spei-3','spei-6','spi-1', 'spi-12', 'spi-3', 'spi-6', 'vci', 'vhi']
  // Get the paths we want to pre-render based on posts
  const paths = indices.map((index) => ({
    params: { slug: index },
  }))


  // console.log("path", paths);

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export default function App( { datatype, staticData, staticMetaData } ) {

  //console.log("staticdata in app: ", staticData);


  const dataLayer = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': {
        property: 'value',
        stops: [
          [1, '#3288bd'],
          [2, '#abdda4'],
          [3, '#fee08b'],
          [4, '#f46d43'],
          [5, '#d53e4f'],
        ]
      },
      'fill-opacity': 0.7
    }
  };

  const [viewport, setViewport] = useState({
    latitude: 46,
    longitude: 9,
    minZoom: 5,
    zoom: 5,
    bearing: 0,
    pitch: 0
  });


  const [metaData, setMetaData] = useState();
  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.firstDate : '2018-08-20');
  const [allData, setAllData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickInfo, setClickInfo] = useState(null);
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

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
  }, [staticMetaData, day]);

  const metadata = useMemo(() => {
    return staticMetaData;
  });

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

  return (
    <>
      <div className="reactMap">
        <MapGL
          {...viewport}
          width="100vw"
          height="100vh"
          mapStyle="mapbox://styles/mapbox/light-v9"
          onViewportChange={setViewport}
          mapboxApiAccessToken={'pk.eyJ1IjoidGlhY29wIiwiYSI6ImNrdWY2amV3YzEydGYycXJ2ZW94dHVqZjMifQ.kQv7jZ5lernZkyYI_3gd5A'}
          interactiveLayerIds={['data']}
          onHover={onHover}
          onClick={onClick}
        >
          <Source type="geojson" data={data}>
            <Layer {...dataLayer} />
          </Source>
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
        
        <ControlPanel title={datatype} day={day} firstDay={metadata ? metadata?.timerange?.properties?.firstDate : ''} lastDay={metadata ? metadata?.timerange?.properties?.lastDate : ''} onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))} />
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
