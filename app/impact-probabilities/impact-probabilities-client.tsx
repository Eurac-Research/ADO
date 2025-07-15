'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import Link from 'next/link'
import ControlPanelImpactsProbsTs from '@/components/ControlPanelImpactsProbsTs'
import ReportedImpactsIntro from '@/components/ReportedImpactsIntro'
import Layout from '@/components/layout'
import { useThemeContext } from '@/context/theme'
import interpolate from 'color-interpolate'
import type { PostData } from '@/types'

import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface ImpactProbabilitiesClientProps {
  impactData: any[]
  nutsMap: any | null
  allPosts: PostData[]
}

// Sub-component that contains all router-dependent logic
function ImpactProbabilitiesContent({
  impactData,
  nutsMap,
  allPosts,
}: {
  impactData: any[]
  nutsMap: any | null
  allPosts: PostData[]
}) {
  const mapRef = useRef<any>(null)
  const [theme] = useThemeContext()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const type = searchParams.get('type') || 'spei'

  const [spei, setSpei] = useState('-4')
  const [hoverInfo, setHoverInfo] = useState<any>(null)
  const [featuredId, setFeaturedId] = useState<number | null>(null)

  // Stabilize the onChange callback to prevent hydration issues
  const handleSpeiChange = useCallback((value: string) => {
    setSpei(value)
  }, [])

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <Layout posts={allPosts}>
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      </Layout>
    )
  }

  const selectedIndicatorValue = spei || '-4'
  const indexValue = type === 'sma' ? 'sma1' : 'spei3'
  const indexType = type === 'sma' ? 'SMA-1' : 'SPEI-3'

  const introHeadline = 'Impact probabilities'
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
        missing data. The method (model and scenario mapping) follows the method
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

  // Filter impact data by the selected indicator value
  const impactDataByIndicatorValue = impactData.filter(
    (item) => item[indexValue] == selectedIndicatorValue
  )

  // Determine the type of impact probability based on the route parameter
  const probabilityType = type === 'sma' ? 'DSM_PredictedProb' : 'DH_PredictedProb'

  // Helper function to find impact data for a specific NUTS ID
  function impactByNutsId(NUTS_ID: string) {
    const result = impactDataByIndicatorValue.find(
      (item) => item['NUTS_ID'] === NUTS_ID
    )
    if (result && result[probabilityType]) {
      return result
    }
    return null
  }

  // Build a match expression for coloring the map
  const matchExpression = ['match', ['get', 'NUTS_ID']]

  for (const row of impactDataByIndicatorValue) {
    // Get the probability value
    const amount = row[probabilityType]

    // Use colormap to interpolate between two colors, 0 - 1
    const colormap = interpolate(['#fcebbf', '#dd0035'])
    const color = colormap(amount)

    // Only provide a color if amount is not null
    amount && matchExpression.push(row['NUTS_ID'], color)
  }

  // Default color for regions with no data
  matchExpression.push('rgba(255, 255, 255, 1)')

  const dataLayer = {
    id: 'geojson',
    type: 'fill',
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

  // Event handlers for map interactions
  const onHover = (event: any) => {
    const {
      features,
      point: { x, y },
    } = event
    const hoveredFeature = features && features[0]
    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y })
  }

  const onOut = () => {
    setHoverInfo(null)
  }

  const removeNutsInformation = () => {
    if (mapRef.current && featuredId !== null) {
      const map = mapRef.current.getMap()
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
      setFeaturedId(null)
    }
  }

  // Error and loading states
  // if (isError || serverError) {
  //   return (
  //     <Layout posts={allPosts}>
  //       <div className="error-container">
  //         <h1>Error Loading Data</h1>
  //         <p>{serverError || 'Failed to load impact probability data. Please try again later.'}</p>
  //       </div>
  //     </Layout>
  //   )
  // }

  // Wait for component to be mounted before rendering
  // With useSearchParams, we don't need a manual mounted check for router readiness
  // if (!mounted) {
  //   return (
  //     <Layout posts={allPosts}>
  //       <div className="loading-container">
  //         <p>Loading...</p>
  //       </div>
  //     </Layout>
  //   )
  // }

  return (
    <Layout posts={allPosts}>
      <div className="reactMap">
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: 46,
            longitude: 9,
            zoom: 5,
            bearing: 0,
            pitch: 0,
          }}
          minZoom={3}
          maxPitch={85}
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
          {!nutsMap ? (
            <div className="map-loading-overlay">
              <p>Loading map data...</p>
            </div>
          ) : (
            <Source
              id="geojson"
              type="geojson"
              data={nutsMap}
              generateId={true}
            >
              <Layer {...dataLayer as any} beforeId="waterway-shadow" />
            </Source>
          )}

          <ScaleControl
            maxWidth={100}
            unit="metric"
            style={{}}
            position="bottom-right"
          />
          <NavigationControl style={{}} position="bottom-right" />

          {hoverInfo && (
            <div
              className="tooltip"
              style={{ left: hoverInfo.x, top: hoverInfo.y }}
            >
              <div>
                {hoverInfo.feature.properties.NUTS_NAME} ({hoverInfo.feature.properties.NUTS_ID})
              </div>
              {impactByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                <>
                  {type === 'sma' ? (
                    <div>
                      DSM impact probability:{' '}
                      {(
                        impactByNutsId(hoverInfo.feature.properties.NUTS_ID)?.DSM_PredictedProb * 100
                      ).toFixed(1)}
                      %
                    </div>
                  ) : (
                    <div>
                      DH impact probability:{' '}
                      {(
                        impactByNutsId(hoverInfo.feature.properties.NUTS_ID)?.DH_PredictedProb * 100
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

        {/* Control panel for SPEI/SMA selection */}
        <ControlPanelImpactsProbsTs
          spei={spei}
          type={type}
          onChange={handleSpeiChange}
        />

        {/* Navigation links for indices */}

        <div className="navigation probabilities">
          <p>Indices</p>
          <>
            <Link
              href="/impact-probabilities?type=spei"
              className={type !== 'sma' ? 'active' : ''}
            >
              DH impact probability
            </Link>
            <Link
              href="/impact-probabilities?type=sma"
              className={type === 'sma' ? 'active' : ''}
            >
              DSM impact probability
            </Link>
          </>
        </div>
      </div>

      <ReportedImpactsIntro headline={introHeadline} text={introText} />
    </Layout>
  )
}

// Main component: only theme context and passes props down, no router hooks
export default function ImpactProbabilitiesClient({
  impactData,
  nutsMap,
  allPosts,
}: ImpactProbabilitiesClientProps) {

  useEffect(() => {
    // Add global styles for loading and error states
    const styles = `
    .map-loading-overlay, .map-error-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .map-loading-overlay {
      background-color: rgba(255, 255, 255, 0.7);
    }

    .map-error-overlay {
      background-color: rgba(255, 200, 200, 0.8);
      color: #721c24;
    }

    .map-loading-overlay p, .map-error-overlay p {
      background-color: white;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      font-weight: bold;
    }

    .error-container {
      padding: 20px;
      margin: 20px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
    }
    `
    const styleElement = document.createElement('style')
    styleElement.innerHTML = styles
    document.head.appendChild(styleElement)

    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImpactProbabilitiesContent
        impactData={impactData}
        nutsMap={nutsMap}
        allPosts={allPosts}
      />
    </Suspense>
  )
}
