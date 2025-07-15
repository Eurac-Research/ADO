'use client'

import { useState, useRef, Suspense, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ReportedImpactsIntro from '@/components/ReportedImpactsIntro'
import Layout from '@/components/layout'
import { useThemeContext } from '@/context/theme'
import Link from 'next/link'
import type { PostData } from '@/types'

import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface VulnerabilityData {
  farm_input_intensity: any
  farm_size: any
  livestock_density: any
  share_permanent_grassland: any
  share_utilised_agric_area: any
  intensity_farming: any
  [key: string]: any
}

interface VulnerabilitiesClientProps {
  vulnerabilityData: VulnerabilityData | null
  nutsMap: any | null
  allPosts: PostData[]
}

function VulnerabilitiesContent({
  vulnerabilityData,
  nutsMap,
  allPosts
}: VulnerabilitiesClientProps) {
  const mapRef = useRef<any>(null)
  const [theme] = useThemeContext()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const type = searchParams.get('type') || 'farm_size'

  const [hoverInfo, setHoverInfo] = useState<any>(null)
  const [clickInfo, setClickInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

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

  if (!vulnerabilityData || isError) {
    return (
      <Layout posts={allPosts}>
        <div className="error-container">
          <h1>Error Loading Data</h1>
          <p>Failed to load vulnerability data. Please try again later.</p>
        </div>
      </Layout>
    )
  }

  // Complete data types from the original JS version
  const dataTypes = {
    farm_size: {
      row: 'farm_size_ha',
      postfix: ' ha',
      colorRange: [
        [0, 7.3, '255, 255, 212'],
        [7.3, 16.5, '254, 217, 142'],
        [16.5, 23.3, '254, 153, 41'],
        [23.3, 75.9, '217, 95, 14'],
      ],
      title: 'Farm size',
      variableName: 'Average utilised agricultural area per agricultural holding [ha]',
      unit: 'ha',
      desc: 'This factor has been calculated by dividing the total number of holdings with the utilised agricultural area (ha)',
      update: '2013',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/AEI_EF_LU$DEFAULTVIEW/default/table',
    },
    livestock_density: {
      row: 'livestock_density',
      postfix: ' units/ha',
      colorRange: [
        [0, 0.73, '255, 255, 212'],
        [0.73, 1.39, '254, 217, 142'],
        [1.39, 2.7, '254, 153, 41'],
        [2.7, 3.42, '217, 95, 14'],
        [3.42, 12.92, '153, 52, 4'],
      ],
      title: 'Livestock density',
      variableName: 'Livestock units per hectare',
      unit: 'units/ha',
      desc: 'This factor has been calculated by dividing the total number of livestock units by the hectares of permanent grassland (livestock/ha).',
      update: '2016',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/EF_LSK_MAIN$DEFAULTVIEW/default/table',
    },
    farm_input_intensity: {
      row: 'percentage',
      postfix: '%',
      colorRange: [
        [0, 31.6, '255, 255, 212'],
        [31.6, 41.9, '254, 217, 142'],
        [41.9, 51.1, '254, 153, 41'],
        [51.1, 60.6, '217, 95, 14'],
        [60.6, 83.2, '153, 52, 4'],
      ],
      title: 'High input farming [%]',
      variableName: 'Percentage of high input utilised agricultural area over total utilised agricultural area',
      unit: '%',
      desc: 'This dataset shows the hectares and the percentage of utilised agricultural area (UAA) managed by high-input farms. The inputs considered are purchased fertilisers and soil improvers, plant protection products such as pesticides, traps, bird scarers, anti-hail shells, frost protection etc. High intensity level means that the input level is greater than the 66th UAA quantiles.',
      update: '2019',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/AEI_PS_INP__custom_2982600/default/table',
    },
    farm_input_intensity_ha: {
      row: 'hectares',
      postfix: ' ha',
      colorRange: [
        [0, 37055, '255, 255, 212'],
        [37055, 109098, '254, 217, 142'],
        [109098, 201533, '254, 153, 41'],
        [201533, 276551, '217, 95, 14'],
        [276551, 531503, '153, 52, 4'],
      ],
      title: 'High input farming [ha]',
      variableName: 'Hectares of high input utilised agricultural area',
      unit: 'ha',
      desc: 'This dataset shows the hectares and the percentage of utilised agricultural area (UAA) managed by high-input farms. The inputs considered are purchased fertilisers and soil improvers, plant protection products such as pesticides, traps, bird scarers, anti-hail shells, frost protection etc. High intensity level means that the input level is greater than the 66th UAA quantiles.',
      update: '2019',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/AEI_PS_INP__custom_2982600/default/table',
    },
    intensity_farming: {
      row: 'total',
      postfix: ' t/ha',
      colorRange: [
        [0, 4.5, '255, 255, 212'],
        [4.5, 8.1, '254, 217, 142'],
        [8.1, 11, '254, 153, 41'],
        [11, 14.3, '217, 95, 14'],
      ],
      title: 'Production intensity',
      variableName: 'Crop production per hectare',
      unit: 't/ha',
      desc: 'This factor is calculated dividing the sum of crop production of cereals, dry pulses and protein (t) by the area of cultivation (ha)',
      update: '2020',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/APRO_CPSHR__custom_2974283/default/table',
    },
    share_utilised_agric_area: {
      row: 'share_utilised_agri_area',
      postfix: ' %',
      colorRange: [
        [7.5, 22.6, '255, 255, 212'],
        [22.6, 30, '254, 217, 142'],
        [30, 41.4, '254, 153, 41'],
        [41.4, 44.5, '217, 95, 14'],
        [44.5, 50.3, '153, 52, 4'],
      ],
      title: 'Share utilised agricultural area',
      variableName: 'Percentage of utilised agricultural area over the total NUTS2 area',
      unit: '%',
      desc: 'This factor shows the hectares of utilised agricultural areas and the share calculated by dividing the utilised agricultural area by the total area at each NUTS2 region.',
      update: '2016',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_MAIN__custom_2950047/default/table',
    },
    share_utilised_agric_area_ha: {
      row: 'utilised_agric_area_ha',
      postfix: ' ha',
      colorRange: [
        [6360, 179822, '255, 255, 212'],
        [179822, 308870, '254, 217, 142'],
        [308870, 391130, '254, 153, 41'],
        [391130, 713314, '217, 95, 14'],
        [713314, 1464350, '153, 52, 4'],
      ],
      title: 'Utilised agricultural area',
      variableName: 'Utilised agricultural area',
      unit: 'ha',
      desc: 'This factor shows the hectares of utilised agricultural areas and the share calculated by dividing the utilised agricultural area by the total area at each NUTS2 region.',
      update: '2016',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_MAIN__custom_2950047/default/table',
    },
    share_permanent_grassland: {
      row: 'share_permanent_grassland',
      postfix: ' %',
      colorRange: [
        [6, 20, '255, 255, 212'],
        [20, 30, '254, 217, 142'],
        [30, 50, '254, 153, 41'],
        [50, 77, '217, 95, 14'],
        [77, 99, '153, 52, 4'],
      ],
      title: 'Share permanent grassland',
      variableName: 'Percentage of permanent grassland over total utlised agricultural area',
      unit: '%',
      desc: 'This factor is calculated by substracting agricultural grassland not in use (ha) to permanent grassland (ha), and then dividing by the total utilised agricultural area.',
      update: '2016',
      dataset: 'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_PEGRASS__custom_2963027/default/table',
    }
  }

  // Select the appropriate data based on the type parameter
  let dataToUse: any[] = []
  if (type === 'farm_size') {
    dataToUse = vulnerabilityData!.farm_size
  } else if (type === 'livestock_density') {
    dataToUse = vulnerabilityData!.livestock_density
  } else if (type === 'farm_input_intensity' || type === 'farm_input_intensity_ha') {
    dataToUse = vulnerabilityData!.farm_input_intensity
  } else if (type === 'share_permanent_grassland') {
    dataToUse = vulnerabilityData!.share_permanent_grassland
  } else if (type === 'share_utilised_agric_area' || type === 'share_utilised_agric_area_ha') {
    dataToUse = vulnerabilityData!.share_utilised_agric_area
  } else if (type === 'intensity_farming') {
    dataToUse = vulnerabilityData!.intensity_farming
  } else {
    dataToUse = vulnerabilityData!.farm_size
  }

  // Select the appropriate data type configuration
  const currentData = dataTypes[type as keyof typeof dataTypes] || dataTypes.farm_size

  // Create match expression for map styling
  const matchExpression = ['match', ['get', 'NUTS_ID']]

  // Helper function to find data for a specific NUTS ID
  function getDataByNutsId(nutsId: string) {
    const result = dataToUse.find((item: any) => item.nuts_id === nutsId)
    return result || null
  }

  // Function to check if a value is in range
  function inRange(x: number, min: number, max: number): boolean {
    return (x - min) * (x - max) <= 0
  }

  // Function to get color based on value and range
  function getColor(value: number | string): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    for (const range of currentData.colorRange) {
      if (inRange(numValue, Number(range[0]), Number(range[1]))) {
        return String(range[2])
      }
    }
    return '0, 0, 0' // Default black if no range matches
  }

  // Add color mappings for each NUTS region with data
  if (dataToUse) {
    for (const row of dataToUse) {
      const value = row[currentData.row]
      if (value !== undefined && value !== null) {
        matchExpression.push(row.nuts_id, `rgb(${getColor(value)})`)
      }
    }
  }

  matchExpression.push('rgba(0, 0, 0, 0.1)') // default color

  const dataLayer = {
    id: 'data',
    type: 'fill',
    paint: {
      'fill-color': matchExpression,
      'fill-outline-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#000',
        '#fff',
      ],
    },
  }

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

  const onClick = (event: any) => {
    const { features } = event
    const hoveredFeature = features && features[0]
    setClickInfo(hoveredFeature ? { feature: hoveredFeature } : null)
  }

  const onClose = () => {
    setClickInfo(null)
  }

  const introHeadline = 'Vulnerability factors'
  const introText = (
    <>
      <p>
        <strong>
          The maps present the identified factors contributing to
          agriculture&apos;s vulnerability to drought based on the analyses of
          two case studies.
        </strong>
      </p>
      <p>
        For further details <Link href="/md/about-the-data">read more</Link>.
      </p>

      <hr style={{ margin: '1.5rem 0' }} />
      <h2 style={{ marginBottom: '1rem', fontSize: '20px' }}>
        {currentData.title}
      </h2>
      <p>
        <strong>{currentData.variableName}</strong>
      </p>

      <p>
        {currentData.desc}
        <br /> Latest update: {currentData.update}
      </p>
      <p>
        Underlying dataset:
        <br />
        <a href={currentData.dataset} target="_blank" rel="noreferrer">{currentData.dataset}</a>
      </p>
    </>
  )

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
          interactiveLayerIds={['data']}
          onMouseMove={onHover}
          onMouseLeave={onOut}
          onClick={onClick}
        >
          {isLoading ? (
            <div className="map-loading-overlay">
              <p>Loading map data...</p>
            </div>
          ) : !nutsMap ? (
            <div className="map-error-overlay">
              <p>Error loading map data</p>
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
              <div style={{ marginBottom: '6px' }}>
                {hoverInfo.feature.properties.NUTS_NAME} ({hoverInfo.feature.properties.NUTS_ID})
              </div>
              {getDataByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                <>
                  <div style={{ marginBottom: '6px' }}>
                    {currentData.variableName}
                  </div>
                  <div style={{ fontWeight: '600' }}>
                    {new Intl.NumberFormat('en-EN').format(
                      getDataByNutsId(hoverInfo.feature.properties.NUTS_ID)[currentData.row]
                    )}
                    {currentData.postfix}
                  </div>
                </>
              )}
            </div>
          )}
        </Map>
      </div>

      <div className="controlContainer impacts" style={{ opacity: clickInfo ? '0' : '1' }}>
        <div className="legend" style={{ maxWidth: 'none' }}>
          <p style={{ fontSize: '12px', marginBottom: '6px' }}>
            Unit: {currentData.postfix}
          </p>
          {currentData?.colorRange?.map((range, index) => (
            <div className="vulnerabilityLegend" key={index}>                <span
              style={{
                width: '20px',
                height: '20px',
                display: 'inline-block',
                background: `rgb(${range[2]})`,
              }}
            ></span>
              {new Intl.NumberFormat('en-EN').format(Number(range[0]))} -{' '}
              {new Intl.NumberFormat('en-EN').format(Number(range[1]))}
            </div>
          ))}
        </div>

        <div className="navigation probabilities">
          <p>Indices</p>

          <>
            <Link
              href="/vulnerabilities?type=farm_size"
              className={type === 'farm_size' || !type ? 'active' : ''}
            >
              Farm size
            </Link>
            <Link
              href="/vulnerabilities?type=livestock_density"
              className={type === 'livestock_density' ? 'active' : ''}
            >
              Livestock density
            </Link>
            <Link
              href="/vulnerabilities?type=farm_input_intensity"
              className={type === 'farm_input_intensity' ? 'active' : ''}
            >
              High input farming [%]
            </Link>
            <Link
              href="/vulnerabilities?type=farm_input_intensity_ha"
              className={type === 'farm_input_intensity_ha' ? 'active' : ''}
            >
              High input farming [ha]
            </Link>
            <Link
              href="/vulnerabilities?type=intensity_farming"
              className={type === 'intensity_farming' ? 'active' : ''}
            >
              Production intensity
            </Link>
            <Link
              href="/vulnerabilities?type=share_utilised_agric_area"
              className={type === 'share_utilised_agric_area' ? 'active' : ''}
            >
              uaa [%]
            </Link>
            <Link
              href="/vulnerabilities?type=share_utilised_agric_area_ha"
              className={type === 'share_utilised_agric_area_ha' ? 'active' : ''}
            >
              uaa [ha]
            </Link>
            <Link
              href="/vulnerabilities?type=share_permanent_grassland"
              className={type === 'share_permanent_grassland' ? 'active' : ''}
            >
              Share permanent grassland
            </Link>
          </>

        </div>
      </div>

      <ReportedImpactsIntro
        headline={introHeadline}
        text={introText}
      />

      {clickInfo && (
        <>
          <div className="overlayContainer" onClick={onClose}></div>
          <div className="dataOverlay">
            <span className="closeOverlay" onClick={onClose}>
              close X
            </span>
            <h3>{currentData.title}</h3>
            <p>{clickInfo.feature.properties.NUTS_NAME}</p>
            <p>
              {currentData.variableName}: {' '}
              {getDataByNutsId(clickInfo.feature.properties.NUTS_ID)
                ? `${new Intl.NumberFormat('en-EN').format(
                  getDataByNutsId(clickInfo.feature.properties.NUTS_ID)[currentData.row]
                )}${currentData.postfix}`
                : 'No data available'}
            </p>
            <p><strong>Description:</strong> {currentData.desc}</p>
            <p><strong>Last updated:</strong> {currentData.update}</p>
            <p>
              <strong>Data source:</strong>{' '}
              <a
                href={currentData.dataset}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Eurostat
              </a>
            </p>
          </div>
        </>
      )}
    </Layout>
  )
}

export default function VulnerabilitiesClient(props: VulnerabilitiesClientProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VulnerabilitiesContent {...props} />
    </Suspense>
  )
}

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

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.innerHTML = styles
  document.head.appendChild(styleElement)
}
