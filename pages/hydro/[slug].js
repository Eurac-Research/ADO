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
import TimeSeries from "../../components/timeseries"


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



  /*   const fetchStations = await fetch(`https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/gauging_stations.geojson`)
    const stationData = await fetchStations.json()
   */


  const stationData = {
    "type": "FeatureCollection",
    "name": "gauging_stations",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:EPSG::3035" } },
    "features": [
      { "type": "Feature", "properties": { "id": 206, "id_station": "ADO_DSC_AT31_0206", "country": "Austria", "region": "Oberösterreich", "location_s": "Lambach (Traunbrücke)", "lat": 48.0900632, "lon": 13.87600537, "start_date": "1975-08-05 00:00:00", "end_date": "2016-12-31 00:00:00", "watercours": "Traun", "height_mas": 341.45, "catchment_": 2740.9, "source_id": "205468", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [13.87600537, 48.0900632,] } },
      { "type": "Feature", "properties": { "id": 254, "id_station": "ADO_DSC_AT31_0254", "country": "Austria", "region": "Oberösterreich", "location_s": "Wels-Lichtenegg (Summenstation)", "lat": 48.14101684, "lon": 13.99579292, "start_date": "1951-01-01 00:00:00", "end_date": "2016-12-31 00:00:00", "watercours": "Traun m.Welser Mühlbach", "height_mas": 309.0, "catchment_": 3387.1, "source_id": "206409", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [13.99579292, 48.14101684] } },
      { "type": "Feature", "properties": { "id": 280, "id_station": "ADO_DSC_AT12_0280", "country": "Austria", "region": "Niederösterreich", "location_s": "Kienstock", "lat": 48.38228215, "lon": 15.46258165, "start_date": "1978-01-01 00:00:00", "end_date": "2016-12-31 00:00:00", "watercours": "Donau", "height_mas": 194.0, "catchment_": 95970.0, "source_id": "207357", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [15.46258165, 48.38228215] } },
      { "type": "Feature", "properties": { "id": 607, "id_station": "ADO_DSC_SI03_0033", "country": "Slovenia", "region": "Vzhodna Slovenija", "location_s": "HE Dravograd", "lat": 46.58695904, "lon": 15.02349159, "start_date": "1965-01-01 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": "Drava", "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [15.02349159, 46.58695904] } },
      { "type": "Feature", "properties": { "id": 729, "id_station": "ADO_DSC_SI03_0148", "country": "Slovenia", "region": "Vzhodna Slovenija", "location_s": "Videm", "lat": 46.36864982, "lon": 15.90787648, "start_date": "1946-01-01 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": "Dravinja", "height_mas": 209.04, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [15.90787648, 46.36864982] } },
      { "type": "Feature", "properties": { "id": 756, "id_station": "ADO_DSC_FRK2_0041", "country": "France", "region": "Rhône-Alpes", "location_s": "La Drôme à Saillans", "lat": 44.68989986, "lon": 5.208544273, "start_date": "1910-01-01 00:00:00", "end_date": "2021-09-26 00:00:00", "watercours": null, "height_mas": null, "catchment_": 1150.0, "source_id": "V4264010", "note_influ": "not or low" }, "geometry": { "type": "Point", "coordinates": [5.2409825, 44.68989986] } },
      { "type": "Feature", "properties": { "id": 807, "id_station": "ADO_DSC_FRK2_0042", "country": "France", "region": "Rhône-Alpes", "location_s": "Le Rhône à Viviers", "lat": 44.48131666, "lon": 4.700911105, "start_date": "1920-01-01 00:00:00", "end_date": "2017-12-31 00:00:00", "watercours": null, "height_mas": null, "catchment_": 70900.0, "source_id": "V4530010", "note_influ": "strong during low water period" }, "geometry": { "type": "Point", "coordinates": [4.700911105, 44.48131666] } },
      { "type": "Feature", "properties": { "id": 973, "id_station": "ADO_DSC_CH07_0006", "country": "Swizwerland", "region": "Ticino", "location_s": "Bellinzona", "lat": 46.19376452, "lon": 9.009287671, "start_date": "1911-01-02 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": null, "height_mas": 1679.0, "catchment_": 1517.0, "source_id": "2020", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [9.009287671, 46.19376452] } },
      { "type": "Feature", "properties": { "id": 978, "id_station": "ADO_DSC_CH04_0011", "country": "Swizwerland", "region": "Zürich", "location_s": "Andelfingen", "lat": 47.59652082, "lon": 8.681974706, "start_date": "1904-01-02 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": null, "height_mas": 770.0, "catchment_": 1702.0, "source_id": "2044", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [8.681974706, 47.59652082] } },
      { "type": "Feature", "properties": { "id": 1042, "id_station": "ADO_DSC_CH03_0075", "country": "Swizwerland", "region": "Nordwestschweiz", "location_s": "Basel Rheinhalle", "lat": 47.55942555, "lon": 7.61667542, "start_date": "02\/01\/1869  00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": null, "height_mas": 1052.0, "catchment_": 35878.0, "source_id": "2289", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [7.61667542, 47.55942555] } },
      { "type": "Feature", "properties": { "id": 1067, "id_station": "ADO_DSC_CH07_0100", "country": "Swizwerland", "region": "Ticino", "location_s": "Locarno Solduno", "lat": 46.16831994, "lon": 8.77358438, "start_date": "1970-01-02 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": null, "height_mas": 1530.0, "catchment_": 927.0, "source_id": "2368", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [8.77358438, 46.16831994] } },
      { "type": "Feature", "properties": { "id": 1114, "id_station": "ADO_DSC_CH07_0147", "country": "Swizwerland", "region": "Ticino", "location_s": "Pollegio Campagna", "lat": 46.35930143, "lon": 8.947473095, "start_date": "1986-05-01 00:00:00", "end_date": "2018-11-30 00:00:00", "watercours": null, "height_mas": 1796.0, "catchment_": 444.0, "source_id": "2494", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [8.947473095, 46.35930143] } },
      { "type": "Feature", "properties": { "id": 1152, "id_station": "ADO_DSC_CH05_0201", "country": "Swizwerland", "region": "Ostschweiz", "location_s": "HALDEN", "lat": 47.5058, "lon": 9.2116, "start_date": "1965-01-01 00:00:00", "end_date": "2016-12-31 00:00:00", "watercours": "Thur", "height_mas": null, "catchment_": 1085.0, "source_id": "6935401", "note_influ": null }, "geometry": { "type": "Point", "coordinates": [9.2116, 47.5058] } },
      { "type": "Feature", "properties": { "id": 1251, "id_station": "ADO_DSC_ITC1_0020", "country": "Italy", "region": "Piemonte", "location_s": "Casale Monferrato Po", "lat": 45.141817, "lon": 8.447651, "start_date": "2009-01-01 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": "Po", "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [8.447651, 45.141817] } },
      { "type": "Feature", "properties": { "id": 1267, "id_station": "ADO_DSC_ITC1_0037", "country": "Italy", "region": "Piemonte", "location_s": "Isola S. Antonio Po", "lat": 45.036153, "lon": 8.821928, "start_date": "1996-01-02 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": "Po", "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [8.821928, 45.036153] } },
      { "type": "Feature", "properties": { "id": 1301, "id_station": "ADO_DSC_ITC1_0072", "country": "Italy", "region": "Piemonte", "location_s": "San Benigno Orco", "lat": 45.246795, "lon": 7.80616, "start_date": "2002-01-07 00:00:00", "end_date": "2019-12-31 00:00:00", "watercours": null, "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [7.80616, 45.246795] } },
      { "type": "Feature", "properties": { "id": 1360, "id_station": "ADO_DSC_ITH2_0035", "country": "Italy", "region": "Provincia Autonoma di Trento", "location_s": "Vò Destro", "lat": 45.735043, "lon": 10.957414, "start_date": "1994-07-27 00:00:00", "end_date": "2020-12-30 23:45:00", "watercours": "Adige", "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [10.957414, 45.735043] } },
      { "type": "Feature", "properties": { "id": 1372, "id_station": "ADO_DSC_ITH1_0012", "country": "Italy", "region": "Provincia Autonoma di Bolzano\/Bozen", "location_s": "Etsch - Branzoll", "lat": 46.41377201, "lon": 11.31535647, "start_date": "1980-01-01 00:10:00", "end_date": "2021-07-21 00:00:00", "watercours": null, "height_mas": null, "catchment_": null, "source_id": null, "note_influ": null }, "geometry": { "type": "Point", "coordinates": [11.31535647, 46.41377201] } }
    ]
  }


  return { props: { datatype, staticMetaData, catchmentData, stationData } };
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



export default function App({ datatype, staticMetaData, catchmentData, stationData }) {
  const router = useRouter()
  const paint = staticMetaData ? staticMetaData?.colormap : []

  const stationGeometryLayer = paint

  const stationPaintLayer = {
    id: 'stationPoint',
    type: 'circle',
    source: 'stationData',
    paint: {
      'circle-color': 'red',
      'circle-radius': 8,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#fff',
    }
  }


  const [metaData, setMetaData] = useState()

  const [day, setDay] = useState(metaData ? metaData?.timerange?.properties?.lastDate : staticMetaData?.timerange?.properties?.lastDate);

  const [hoverInfo, setHoverInfo] = useState(null)


  const [stationHoverInfo, setStationHoverInfo] = useState(null)



  const [clickInfo, setClickInfo] = useState(null)

  const [htmlData, setHtmlData] = useState(null)
  const [timeseriesData, setTimeseriesData] = useState(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)



  const onHover2 = useCallback(event => {
    const {
      features,
      point: { x, y }
    } = event;
    const hoveredFeature = features && features[0];
    setStationHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, []);

  const onOut2 = useCallback(event => {
    setStationHoverInfo(null)
  }, []);



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
    const stationId = hoveredFeature ? hoveredFeature?.properties?.id_station : null
    getHtmlData(stationId)
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
        // const url = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_${id_station ? `${id_station}` : ''}.html`
        const htmlUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/html/report_ADO_DSC_ITC1_0037.html`
        const timeseriesUrl = `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/hydro/timeseries/ID_STATION_${id_station ? `${id_station}` : ''}.json`

        const result = await axios(htmlUrl)
        setHtmlData(result.data)

        const timeseriesResult = await axios(timeseriesUrl)
        setTimeseriesData(timeseriesResult.data)

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

      <Header />

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
          interactiveLayerIds={['data', 'stationPoint']}
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
              Click to open station details<br />
              station id: {hoverInfo?.feature?.properties?.id_station}
            </div>
          )}


          {stationHoverInfo && (
            <div className="tooltip" style={{ left: stationHoverInfo.x, top: stationHoverInfo.y }}>
              XXXX Click to open station details<br />
              station id: {stationHoverInfo?.feature?.properties?.id_station}
            </div>
          )}


        </Map>


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
        <>
          <div className="overlayContainer" onClick={onClose}>
          </div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>close X</span>

            <TimeSeries data={timeseriesData} indices={indices} index={datatype} style={{ width: "100%", height: "100%", position: "relative", zIndex: "102", top: "0", left: "0" }} />
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
