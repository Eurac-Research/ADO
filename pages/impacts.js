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

export async function getStaticProps({ params }) {
  const response = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/EDIIALPS_V1.0-minified.json`)
  const impactData = await response.json()
  return { props: { impactData } };
}


export default function App({ impactData }) {
  const router = useRouter()
  const [year, setYear] = useState("");

  const uniqueYears = [...new Set(impactData.map(item => item.Year_start))];

  console.log("year: ", year);

  const dataLayer = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': {
        property: 'percentile',
        stops: [
          [0, '#3288bd'],
          [1, '#66c2a5'],
          [2, '#abdda4'],
          [3, '#e6f598'],
          [4, '#ffffbf'],
          [5, '#fee08b'],
          [6, '#fdae61'],
          [7, '#f46d43'],
          [8, '#d53e4f']
        ]
      },
      'fill-opacity': 0.8
    }
  }

  const [viewport, setViewport] = useState({
    latitude: 46,
    longitude: 9,
    minZoom: 5,
    zoom: 5,
    bearing: 0,
    pitch: 0
  });
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)


  const NewComponent = () => (

    <div className='impactsWrapper'>
      {impactData && impactData
        .filter(item => item.Year_start === parseInt(year))
        .map((item, index) => (
          <div key={item.ID} className="impactsItem">
            <p>{item?.Year_start}</p>
            <p>{item?.Impact_category}</p>
            <p>{item?.Impact_description}</p>
          </div>
        ))
      }
    </div>
  )


  return (
    <Layout>
      <Head>
        <title>Impacts - Alpine Drought Observatory | Eurac Research</title>
      </Head>
      <div>

        <Header />

        <div className="reactMap">
          <Map
            {...viewport}
            style={{ width: "100vw", height: "100vh" }}
            mapStyle={'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'}
            mapboxAccessToken={MAPBOX_TOKEN}
          >
          </Map>
        </div>

        <div className="impactsYearRange">
          {uniqueYears && uniqueYears.map((yearitem) => (
            <div className={`selectYear${yearitem === year ? ` active` : ``}`} key={`year-${yearitem}`} onClick={() => setYear(yearitem)}>
              {yearitem}
            </div>
          ))
          }
        </div>

        <NewComponent />

      </div>
    </Layout>
  );
}
