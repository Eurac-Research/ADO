import * as React from 'react'
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


export default function App() {
  const datatype = 'SPI-3'
  const dataLayer = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': {
        property: 'value',
        stops: [
          [1, '#3288bd'],
          [2, '#66c2a5'],
          [3, '#abdda4'],
          [4, '#e6f598'],
          [5, '#ffffbf'],
          [6, '#fee08b'],
          [7, '#fdae61'],
          [8, '#f46d43'],
          [9, '#d53e4f'],
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
  const [day, setDay] = useState('2017-09-24');
  const [allData, setAllData] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickInfo, setClickInfo] = useState(null);
  const [nutsData, setNutsData] = useState(null)
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/SPI-3-latest.geojson'
    )
      .then(resp => resp.json())
      .then(json => setAllData(json));
  }, []);

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

  const data = useMemo(() => {
    return allData && updatePercentiles(allData, f => f.properties[`${datatype}`][day]);
  }, [allData, day]);


  async function getNutsData(overlayNutsId) {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        const result = await axios(`/data/overlaydata${overlayNutsId ? `-${overlayNutsId}` : ''}.json`);
        setNutsData(result.data) ;
      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
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
              <div>SPI3: {hoverInfo.feature.properties.value}</div>
            </div>
          )}
        </MapGL>
        
        <ControlPanel title={datatype} day={day} onChange={value => setDay(format(new Date(value * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'))} />
      </div>

      {clickInfo && (
        <div className="overlayContainer">
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClick}>close X</span>
            {isError && (
              <p>file /data/overlaydata-{clickInfo.feature.properties.NUTS_ID}.json not found - fallback to dummy data</p> 
            )}
            just static data from one region! - 
            {day}, State: {clickInfo.feature.properties.NUTS_NAME}, NUTS_ID: {clickInfo.feature.properties.NUTS_ID}
            <div>SPI3: {clickInfo.feature.properties.value}</div>

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
                <ReferenceLine y={0} stroke="#ccc" />
                <Brush dataKey="date" height={30} stroke="#4e9589" />
                <Line type="monotone" dataKey="spi3" strokeWidth="3"  dot={false} stroke="#4e9589" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
