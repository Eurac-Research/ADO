import * as React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import Link from 'next/link'
import ControlPanelImpactsProbs from '../components/ControlPanelImpactsProbs'
import ReportedImpactsIntro from '../components/ReportedImpactsIntro'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from '../components/layout'
import interpolate from 'color-interpolate'

import { getAllPosts } from '../lib/api'
import { useThemeContext } from '../context/theme'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export async function getStaticProps({ params }) {
  const response = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/impacts-predictedProb.json`
  )
  const impactData = await response.json()
  const allPosts = getAllPosts(['title', 'slug'])
  return { props: { impactData, allPosts } }
}

export default function App({ impactData, allPosts }) {
  const router = useRouter()
  const mapRef = React.useRef()

  const indices = ['spei', 'sma']
  const introHeadline = `Impact probabilities`
  const introText = (
    <>
      <p>
        Scenarios of impact probabilities of hydrological drought (SPEI-3) or
        soil-moisture drought (SMA-1) impacts for selected drought index levels.
      </p>
      <p>
        <strong style={{ color: '#dd0035', fontWeight: 'bold' }}>
          The darker the red, the more likely impacts occur.{' '}
        </strong>
        <br />
        Regions without any impacts are coloured in white.
      </p>
      <p>
        These risk maps have been developed with impact data from the EDIIALPS
        V1.0. Impacts in each NUTS region were assigned to two groups:
        soil-moisture drought impacts (DSM) and hydrological drought impacts
        (DH). The DSM impacts stem mostly from the impact categories Forestry,
        and Agriculture and livestock farming (see Deliverable DT3.1.1). The
        so-called hydrological drought impacts stem mostly from the impact
        categories Public water supply, Freshwater ecosystems and Water quality.
        For each NUTS3 region, we fit a generalized linear model with a logit
        link to regress the likelihood of a drought impact against SPEI-3 and
        SMA-1. With the fitted model we then predicted impact occurrences for
        different SPEI-3 and SMA-1 values in order to estimate the occurrence
        probability for each NUTS 3 region. NUTS 3 regions without sufficient
        DSM or DH impact data to estimate a model are shown as regions with
        missing ata. The method (model and scenario mapping) follows the method
        by Blauhut et al. (2015).
      </p>
      <p>
        For further details on the application for ADO, please read: Deliverable
        DT3.2.1. Blauhut V., Gudmundsson L., Stahl K. (2015) Towards
        pan-European drought risk maps: quantifying the link between drought
        indices and reported drought impacts, Environmental Research Letters 10,
        014008{' '}
        <a href="https://doi.org/10.1088/1748-9326/10/1/014008">
          https://doi.org/10.1088/1748-9326/10/1/014008
        </a>
      </p>
    </>
  )

  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [nutsMap, setNutsMap] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)

  const [nutsData, setNutsData] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)

  const [nutsid, setNutsid] = useState(null)
  const [nutsName, setNutsName] = useState(null)
  const [spei, setSpei] = useState('')

  const selectedIndicatorValue = spei ? spei : '-4'

  const [mapClicked, setMapClicked] = useState(false)

  const [theme, setTheme] = useThemeContext()

  const [featuredId, setFeaturedId] = useState(null)

  const impactDataByIndicatorValue = impactData.filter(
    (item) => item.SPEI3 == selectedIndicatorValue
  )
  //console.log('impactDataByIndicatorValue', impactDataByIndicatorValue)

  function impactByNutsId(NUTS_ID) {
    const result = impactDataByIndicatorValue.find(
      (item) => item['NUTS3_ID'] === NUTS_ID
    )
    if (result) {
      return result // amount of impact items
    }
    return null
  }

  const uniqueSPEI = [...new Set(impactData.map((item) => item.SPEI3))]

  //console.log('uniqueSPEI', uniqueSPEI)
  //console.log('spei', spei)

  // const SPEIandPredictedProb = uniqueSPEI.map((spei) => {
  //   return {
  //     selectedIndicatorValue: spei,
  //     PredictedProb: impactData.filter((item) => item.SPEI3 === spei).length,
  //   }
  // })

  //console.log('SPEIandPredictedProb', SPEIandPredictedProb)

  // const impactsBySPEIForMap = spei ? impactDataByIndicatorValue : impactData

  // const uniqueImpactsByNutsID = impactsBySPEIForMap.reduce(
  //   (acc, o) => ((acc[o.NUTS3_ID] = (acc[o.NUTS3_ID] || 0) + 1), acc),
  //   {}
  // )
  //console.log('unique arr', uniqueImpactsByNutsID)

  // create array
  // const impactEntries = Object.entries(uniqueImpactsByNutsID)
  // console.log('impactEntries', impactEntries)

  const type =
    router.query.type === 'sma' ? 'PredictedProbSMA' : 'PredictedProbSPEI'

  // https://docs.mapbox.com/mapbox-gl-js/example/data-join/
  // Build a GL match expression that defines the color for every vector tile feature
  // Use the ISO 3166-1 alpha 3 code as the lookup key for the country shape
  const matchExpression = ['match', ['get', 'NUTS_ID']]

  // Calculate color values for each country based on 'hdi' value
  for (const row of impactDataByIndicatorValue) {
    // Convert the range of data values to a suitable color
    const amount = row[`${type}`]

    // use colormap to interpolate between two colors, 0 - 1
    const colormap = interpolate(['#fcebbf', '#dd0035'])
    const color = colormap(amount)
    matchExpression.push(row['NUTS3_ID'], color)
  }
  // Last value is the default, used where there is no data
  matchExpression.push('rgba(255, 255, 255, 1)')

  const nutsLayer = {
    type: 'fill',
    id: 'geojson',
    paint: {
      'fill-color': matchExpression,
      'fill-outline-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#000',
        '#999',
      ],
    },
  }

  const scaleControlStyle = {}
  const navControlStyle = {
    right: 10,
    bottom: 120,
  }

  // const NewComponent = () => (
  //   <div className="impactsWrapper">
  //     <div className="closeImpactWrapper" onClick={closeImpactsWrapper}>
  //       close x
  //     </div>

  //     {spei && (
  //       <div className="impactsTitle">
  //         <h1
  //           style={{
  //             fontSize: '30px',
  //             marginBottom: '10px',
  //             marginTop: '10px',
  //           }}
  //         >
  //           {' '}
  //           {spei}
  //         </h1>
  //       </div>
  //     )}

  //     {nutsid && (
  //       <div className="impactsTitle">
  //         <h1
  //           style={{
  //             fontSize: '30px',
  //             marginBottom: '10px',
  //             marginTop: '10px',
  //           }}
  //         >
  //           {nutsName}
  //         </h1>
  //         <h2
  //           style={{
  //             fontSize: '18px',
  //             marginBottom: '20px',
  //             marginTop: '10px',
  //           }}
  //         >
  //           {impactAmountByNutsId(nutsid)
  //             ? impactAmountByNutsId(nutsid) > 1
  //               ? `${impactAmountByNutsId(nutsid)} impacts`
  //               : `${impactAmountByNutsId(nutsid)} impact`
  //             : 'no impacts'}
  //         </h2>
  //       </div>
  //     )}

  //     <div className="impactsContent">
  //       {/* year selected */}
  //       {spei && (
  //         <>
  //           {impactData &&
  //             impactData
  //               .filter((item) => item.SPEI3 === parseInt(spei))
  //               .map((item, index) => (
  //                 <div key={item.ID} className="impactsItem">
  //                   <p>
  //                     <b>Description</b>
  //                     <br />
  //                     {item?.Impact_description}
  //                   </p>

  //                   {item?.NUTS3_ID &&
  //                     nutsMap.features
  //                       .filter(
  //                         (nut) => nut.properties.NUTS_ID === item?.NUTS3_ID
  //                       )
  //                       .map((nut, index) => (
  //                         <p key={index}>
  //                           <b>Region</b>{' '}
  //                           <span style={{ fontSize: '12px' }}>
  //                             (
  //                             <a
  //                               href="https://ec.europa.eu/eurostat/web/nuts/background"
  //                               target="_blank"
  //                               rel="noreferrer"
  //                             >
  //                               NUTS-3
  //                             </a>
  //                             )
  //                           </span>
  //                           <br />
  //                           {nut.properties.NUTS_NAME}
  //                         </p>
  //                       ))}
  //                 </div>
  //               ))}
  //         </>
  //       )}

  //       {/* click on a region on the map */}
  //       {nutsid && (
  //         <>
  //           {impactData &&
  //             impactData
  //               .filter((item) => item.NUTS2_ID === nutsid)
  //               .reverse()
  //               .map((item, index) => (
  //                 <div key={item.ID} className="impactsItem">
  //                   <p>
  //                     <b>Description:</b>
  //                     <br /> {item?.Impact_description}
  //                   </p>
  //                   <p>
  //                     <b>Category:</b>
  //                     <br />
  //                     {impactCategories
  //                       .filter((cat) => cat?.id === item?.Impact_category)
  //                       .map((cat, index) => (
  //                         <span key={cat.id}>{cat.categoryname}</span>
  //                       ))}
  //                   </p>
  //                   <p>
  //                     <b>Year:</b>
  //                     <br /> {item?.Year_start}
  //                   </p>
  //                 </div>
  //               ))}
  //         </>
  //       )}
  //     </div>
  //   </div>
  // )

  // const onClick = useCallback(
  //   async (event) => {
  //     const map = mapRef.current.getMap()

  //     const { features } = event
  //     const hoveredFeature = features && features[0]
  //     const clickedNutsid = hoveredFeature
  //       ? hoveredFeature?.properties?.NUTS_ID
  //       : null
  //     const clickedNutsName = hoveredFeature
  //       ? hoveredFeature?.properties?.NUTS_NAME
  //       : null
  //     setNutsName(clickedNutsName)
  //     setNutsid(clickedNutsid)
  //     setSpei('')

  //     if (featuredId === null && hoveredFeature) {
  //       map.setFeatureState(
  //         { source: 'geojson', id: hoveredFeature.id },
  //         { hover: true }
  //       )
  //     }

  //     if (featuredId !== null) {
  //       map.setFeatureState(
  //         { source: 'geojson', id: featuredId },
  //         { hover: false }
  //       )
  //     }
  //     if (clickedNutsid !== null) {
  //       setFeaturedId(hoveredFeature.id)
  //       map.setFeatureState(
  //         { source: 'geojson', id: hoveredFeature.id },
  //         { hover: true }
  //       )
  //     }
  //   },
  //   [featuredId]
  // )

  useEffect(() => {
    /* global fetch */
    fetch(
      'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/nuts3_simple_4326.geojson'
    )
      .then((resp) => resp.json())
      .then((json) => {
        // Note: In a real application you would do a validation of JSON data before doing anything with it,
        // but for demonstration purposes we ingore this part here and just trying to select needed data...
        const features = json
        setNutsMap(features)
      })
      .catch((err) => console.error('Could not load data', err)) // eslint-disable-line
  }, [])

  /*   const data = useMemo(() => {
      return allDays ? earthquakes : filterFeaturesByDay(earthquakes, selectedTime);
    }, [earthquakes, allDays, selectedTime]);
   
   */

  const onHover = useCallback((event) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]

    //console.log('hoveredFeature', hoveredFeature)
    // prettier-ignore
    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, [])

  const onOut = useCallback((event) => {
    setHoverInfo(null)
  }, [])

  const removeNutsInformation = useCallback(
    (event) => {
      const map = mapRef.current.getMap()
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
      setNutsid(null)
      setFeaturedId(null)
    },
    [featuredId]
  )

  const closeImpactsWrapper = useCallback(
    (event) => {
      removeNutsInformation()
      setSpei('')
      const map = mapRef.current.getMap()
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
    },
    [featuredId]
  )

  //console.log('impactData', impactData)

  return (
    <Layout posts={allPosts}>
      <Head>
        <title>Impacts - Alpine Drought Observatory | Eurac Research</title>
      </Head>
      <div>
        <div className="reactMap">
          <Map
            ref={mapRef}
            initialViewState={{
              latitude: 46,
              longitude: 9,
              bearing: 0,
              pitch: 0,
              minZoom: 5,
              zoom: 5,
            }}
            style={{ width: '100vw', height: '100vh' }}
            mapStyle={
              theme === 'dark'
                ? 'mapbox://styles/tiacop/ckxsylx3u0qoj14muybrpmlpy'
                : 'mapbox://styles/tiacop/ckxub0vjxd61x14myndikq1dl'
            }
            mapboxAccessToken={MAPBOX_TOKEN}
            interactiveLayerIds={['geojson']}
            onMouseMove={onHover}
            onMouseLeave={onOut}
          >
            {nutsMap && (
              <>
                <Source
                  id="geojson"
                  type="geojson"
                  data={nutsMap}
                  generateId={true}
                >
                  <Layer {...nutsLayer} beforeId="waterway-shadow" />
                </Source>
                {/*                 <Source id="my-data" type="geojson" data={geojson}>
                  <Layer {...layerStyle} />
                </Source>
                */}
              </>
            )}
            <ScaleControl
              maxWidth={100}
              unit="metric"
              style={scaleControlStyle}
              position={'bottom-right'}
            />
            <NavigationControl
              style={navControlStyle}
              position={'bottom-right'}
            />
            {hoverInfo && (
              <div
                className="tooltip"
                style={{ left: hoverInfo.x, top: hoverInfo.y }}
              >
                <div>
                  {hoverInfo.feature.properties.NUTS_NAME} (
                  {hoverInfo.feature.properties.NUTS_ID})
                </div>
                {impactByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                  <>
                    <div
                      style={{
                        color: router.query.type !== 'sma' ? '#dd0035' : '',
                      }}
                    >
                      SPEI-3 probability:{' '}
                      {(
                        impactByNutsId(hoverInfo.feature.properties.NUTS_ID)
                          .PredictedProbSPEI * 100
                      ).toFixed(1)}
                      %
                    </div>
                    <div
                      style={{
                        color: router.query.type === 'sma' ? '#dd0035' : '',
                      }}
                    >
                      SMA-1 probability:{' '}
                      {(
                        impactByNutsId(hoverInfo.feature.properties.NUTS_ID)
                          .PredictedProbSMA * 100
                      ).toFixed(1)}
                      %
                    </div>
                  </>
                )}
              </div>
            )}
          </Map>
        </div>

        <div className="controlContainer impacts">
          <div className="legend" style={{ maxWidth: 'none' }}>
            <div className="probabilityLegend"></div>
            <p className="probabilityLegendLabel">
              <span>likely</span>
              <span>unlikely</span>
            </p>
          </div>

          <ControlPanelImpactsProbs
            spei={spei}
            onChange={(value) => setSpei(value) + setNutsid(null)}
          />
          <div className="navigation">
            <p>Indices</p>
            <Link href="?type=spei">
              <a className={router.query.type !== 'sma' ? 'active' : 'adsf'}>
                SPEI-3
              </a>
            </Link>
            <Link href="?type=sma">
              <a className={router.query.type === 'sma' ? 'active' : 'adsf'}>
                SMA-1
              </a>
            </Link>
          </div>
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

        {/* {spei && <NewComponent />}
        {nutsid && <NewComponent />} */}

        <ReportedImpactsIntro headline={introHeadline} text={introText} />
      </div>
    </Layout>
  )
}
