import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
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

  const introHeadline = `Impact probabilities`
  const introText = (
    <>
      <p>
        Explore the probability of{' '}
        <strong>soil-moisture drought impacts (DSM)</strong> and{' '}
        <strong>hydrological drought impacts (DH)</strong> across the Alpine
        Space!
      </p>
      <p>
        DSM impacts cover mostly impacts on agriculture and forestry, and their
        occurrence probability is calculated with the Soil moisture anomalies
        (SMA-1). DH impacts cover mostly impacts on water supply, water quality,
        and freshwater ecosystems, and their occurrence probability is
        calculated with the Standardized Precipitation Evapotranspiration Index
        (SPEI-3). Select different index-scenarios to visualize the impact
        probability.
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

  const [nutsMap, setNutsMap] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [spei, setSpei] = useState('')
  const selectedIndicatorValue = spei ? spei : '-4'
  const [theme, setTheme] = useThemeContext()
  const [featuredId, setFeaturedId] = useState(null)
  const impactDataByIndicatorValue = impactData.filter(
    (item) => item.SPEI3 == selectedIndicatorValue
  )
  const type =
    router.query.type === 'sma' ? 'DSM_PredictedProb' : 'DH_PredictedProb'

  function impactByNutsId(NUTS_ID) {
    const result = impactDataByIndicatorValue.find(
      (item) => item['NUTS3_ID'] === NUTS_ID
    )
    if (result && result[`${type}`]) {
      return result // amount of impact items
    }
    return null
  }

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

    // do not provide a color if amount is null
    amount && matchExpression.push(row['NUTS3_ID'], color)
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

  const onHover = useCallback((event) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]

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

  return (
    <Layout posts={allPosts}>
      <Head>
        <title>
          Impact probabilities - Alpine Drought Observatory | Eurac Research
        </title>
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
                    {router.query.type === 'sma' && (
                      <div>
                        DSM impact probability:{' '}
                        {(
                          impactByNutsId(hoverInfo.feature.properties.NUTS_ID)
                            .DSM_PredictedProb * 100
                        ).toFixed(1)}
                        %
                      </div>
                    )}
                    {router.query.type !== 'sma' && (
                      <div>
                        DH impact probability:{' '}
                        {(
                          impactByNutsId(hoverInfo.feature.properties.NUTS_ID)
                            .DH_PredictedProb * 100
                        ).toFixed(1)}
                        %
                      </div>
                    )}
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
              <span>unlikely</span>
              <span>likely</span>
            </p>
          </div>

          <ControlPanelImpactsProbs
            spei={spei}
            type={type}
            onChange={(value) => setSpei(value)}
          />
          <div className="navigation probabilities">
            <p>Indices</p>
            <Link href="?type=spei">
              <a className={router.query.type !== 'sma' ? 'active' : ''}>
                DH impact probability
              </a>
            </Link>
            <Link href="?type=sma">
              <a className={router.query.type === 'sma' ? 'active' : ''}>
                DSM impact probability
              </a>
            </Link>
          </div>
        </div>

        <ReportedImpactsIntro headline={introHeadline} text={introText} />
      </div>
    </Layout>
  )
}
