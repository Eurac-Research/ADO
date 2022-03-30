import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, { Source, Layer, ScaleControl, NavigationControl } from 'react-map-gl'
import ControlPanelImpacts from '../components/ControlPanelImpacts'
import { updatePercentiles } from '../components/utils'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { format } from 'date-format-parse'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from "../components/layout"
import Header from "../components/Header"
import uniqolor from 'uniqolor'
const { Color, ColorImmutable } = require('frostcolor')


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
import { match } from 'assert'

export async function getStaticProps({ params }) {
  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/EDIIALPS_V1.0-minified.json`)
  const impactData = await response.json()
  return { props: { impactData } };
}


export default function App({ impactData }) {
  const router = useRouter()

  function impactAmountByNutsId(NUTS_ID) {
    const result = impactEntries.find(item => item[0] === NUTS_ID)
    if (result) {
      return result[1] // amount of impact items
    }
    return null
  }


  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [nutsMap, setNutsMap] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null)
  const [nutsData, setNutsData] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)

  const [nutsid, setNutsid] = useState(null)
  const [nutsName, setNutsName] = useState(null)
  const [year, setYear] = useState("")



  const impactDataByYear = impactData.filter(item => item.Year_start == year);

  console.log("impactDataByYear", impactDataByYear);


  const uniqueYears = [...new Set(impactData.map(item => item.Year_start))]

  // console.log("uniqueYears ", uniqueYears);

  const yearAndAmount = uniqueYears.map(yearOfImpact => {
    return { impactYear: yearOfImpact, impactAmount: impactData.filter(item => item.Year_start === yearOfImpact).length }
  })

  // console.log("yearAndAmount", yearAndAmount);


  // Build a GL match expression that defines the color for every vector tile feature
  // Use the ISO 3166-1 alpha 3 code as the lookup key for the country shape
  const matchExpression = ['match', ['get', 'NUTS_ID']];


  // count number of distict values AKA number of impacts for a given nutsid
  // result: [ITC18: 4, ITC14: 11]
  //console.log("impactData", impactData)


  const impactsByYearForMap = year ? impactDataByYear : impactData


  const uniqueImpactsByNutsID = impactsByYearForMap.reduce((acc, o) => (acc[o.NUTS2_ID] = (acc[o.NUTS2_ID] || 0) + 1, acc), {});
  // console.log("unique arr", uniqueImpactsByNutsID);



  // create array
  const impactEntries = Object.entries(uniqueImpactsByNutsID);
  console.log("impactEntries", impactEntries);


  // Calculate color values for each NUTS2id
  for (const row of impactEntries) {
    const amount = row['1']
    const color = uniqolor(amount, {
      saturation: [50, 75],
      lightness: [50, 70],
      differencePoint: 90,
    })

    // get color by basecolor - darken color by amount of impacts per nutsregion
    const mycolor = Color.fromString("#FFCEC3").darken((amount / 100)).toHexString()
    // console.log(`mycolor amount ${mycolor}, ${amount / 100}`);

    matchExpression.push(row['0'], mycolor)
  }

  // Last value is the default, used where there is no data
  matchExpression.push('rgba(0, 0, 0, 0)')

  // Add layer from the vector tile source to create the choropleth
  // Insert it below the 'admin-1-boundary-bg' layer in the style


  // console.log("matchExpression", matchExpression);


  const nutsLayer = {
    type: 'fill',
    id: 'nuts',
    paint: {
      'fill-color': matchExpression,
      'fill-opacity': 0.6,
      'fill-outline-color': "#666"
    }
  }

  const scaleControlStyle = {
  };
  const navControlStyle = {
    right: 10,
    bottom: 120
  };



  const NewComponent = () => (
    <div className='impactsWrapper'>
      {year && (
        <h1 style={{ fontSize: "30px", marginBottom: "20px", marginTop: "10px" }}> {year}</h1>
      )}
      {(year && impactData) && impactData
        .filter(item => item.Year_start === parseInt(year))
        .map((item, index) => (
          <div key={item.ID} className="impactsItem">
            <p><b>impact category:</b><br /> {item?.Impact_category}</p>
            <p><b>description:</b><br /> {item?.Impact_description}</p>
            <p><b>nuts:</b><br /> {item?.NUTS1_ID} / {item?.NUTS2_ID} / {item?.NUTS2_ID}</p>
            <p><b>year:</b><br /> {item?.Year_start}</p>
          </div>
        ))
      }

      {(nutsName && nutsid) && (
        <>
          <h1 style={{ fontSize: "30px", marginBottom: "10px", marginTop: "10px" }}>{nutsName}</h1>
          <h2 style={{ fontSize: "18px", marginBottom: "30px", marginTop: "10px" }}>{nutsid}</h2>
        </>
      )}
      {(nutsid && impactData) && impactData
        .filter(item => item.NUTS2_ID === nutsid)
        .reverse()
        .map((item, index) => (
          <div key={item.ID} className="impactsItem">
            <p><b>impact category:</b><br /> {item?.Impact_category}</p>
            <p><b>description:</b><br /> {item?.Impact_description}</p>
            <p><b>nuts:</b><br /> {item?.NUTS1_ID} / {item?.NUTS2_ID} / {item?.NUTS2_ID}</p>
            <p><b>year:</b><br /> {item?.Year_start}</p>
          </div>
        ))
      }
    </div>
  )

  const onClick = useCallback(async (event) => {
    const {
      features
    } = event;
    const hoveredFeature = features && features[0];
    const clickedNutsid = hoveredFeature ? hoveredFeature?.properties?.NUTS_ID : null
    const clickedNutsName = hoveredFeature ? hoveredFeature?.properties?.NUTS_NAME : null
    setYear("")
    setNutsName(clickedNutsName)
    setNutsid(clickedNutsid)
  }, []);



  useEffect(() => {
    /* global fetch */
    fetch('https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/nuts2_simple_4326.geojson')
      .then(resp => resp.json())
      .then(json => {
        // Note: In a real application you would do a validation of JSON data before doing anything with it,
        // but for demonstration purposes we ingore this part here and just trying to select needed data...
        const features = json;
        setNutsMap(features)
      })
      .catch(err => console.error('Could not load data', err)); // eslint-disable-line
  }, []);

  /*   const data = useMemo(() => {
      return allDays ? earthquakes : filterFeaturesByDay(earthquakes, selectedTime);
    }, [earthquakes, allDays, selectedTime]);
   
   */

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




  return (
    <Layout>
      <Head>
        <title>Impacts - Alpine Drought Observatory | Eurac Research</title>
      </Head>
      <div>

        <Header />

        <div className="reactMap">
          <Map
            initialViewState={{
              latitude: 46,
              longitude: 9,
              bearing: 0,
              pitch: 0,
              minZoom: 5,
              zoom: 5,
            }}
            style={{ width: "100vw", height: "100vh" }}
            mapStyle={'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'}
            mapboxAccessToken={MAPBOX_TOKEN}
            interactiveLayerIds={['nuts']}
            onMouseMove={onHover}
            onMouseLeave={onOut}
            onClick={onClick}
          >

            {nutsMap && (
              <>
                <Source id="geojson" type="geojson" data={nutsMap}>
                  <Layer {...nutsLayer} />
                </Source>
                {/*                 <Source id="my-data" type="geojson" data={geojson}>
                  <Layer {...layerStyle} />
                </Source>
 */}              </>
            )}
            <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} position={"bottom-right"} />
            <NavigationControl style={navControlStyle} position={"bottom-right"} />
            {hoverInfo && (
              <div className="tooltip" style={{ left: hoverInfo.x, top: hoverInfo.y }}>
                click to open impact
                <br />
                <div>NUTS_NAME: {hoverInfo.feature.properties.NUTS_NAME}</div>
                <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div>
                amount: {impactAmountByNutsId(hoverInfo.feature.properties.NUTS_ID)}
              </div>
            )}
          </Map>
        </div>

        <div className="controlContainer">
          <ControlPanelImpacts
            year={year}
            yearRange={uniqueYears}
            yearAndAmount={yearAndAmount}
            onChange={value => setYear(value)}
          />

          <select
            value={year}
            onChange={evt => setYear(evt.target.value) + setNutsid(null)}>
            {yearAndAmount && yearAndAmount.map((yearitem) => (
              <option
                key={`year-${yearitem.impactYear}`}
                value={yearitem.impactYear}>
                {yearitem.impactYear} ({yearitem.impactAmount} impacts)
              </option>
            ))
            }
          </select>

        </div>




        {/* 
        <div className="impactsYearRange">
          {yearAndAmount && yearAndAmount.map((yearitem) => (
            <div className={`selectYear${yearitem.impactYear === year ? ` active` : ``}`} key={`year-${yearitem.impactYear}`} onClick={() => setYear(yearitem.impactYear) + setNutsid(null)}>
              <span>{yearitem.impactYear}<br />({yearitem.impactAmount} impacts)</span>
            </div>
          ))
          }
        </div> */}

        {
          year && (
            <NewComponent />
          )
        }
        {
          nutsid && (
            <NewComponent />
          )
        }

      </div >
    </Layout >
  );
}
