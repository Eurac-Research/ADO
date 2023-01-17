import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ReportedImpactsIntro from '../components/ReportedImpactsIntro'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Layout from '../components/layout'
import uniqolor from 'uniqolor'
import interpolate from 'color-interpolate'

import { getAllPosts } from '../lib/api'
import { useThemeContext } from '../context/theme'
import Link from 'next/link'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export async function getServerSideProps() {
  const allPosts = getAllPosts(['title', 'slug'])

  // + farm_input_intensity
  // + farm_size
  // + intensity_farming
  // + livestock_density
  // + share_permanent_grassland
  // + share_utilised_agric_area

  const response0 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/farm_input_intensity.json`
  )
  const farm_input_intensity = await response0.json()

  const response1 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/farm_size.json`
  )
  const farm_size = await response1.json()

  const response2 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/livestock_density.json`
  )
  const livestock_density = await response2.json()

  const response3 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/share_permanent_grassland.json`
  )
  const share_permanent_grassland = await response3.json()

  const response4 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/share_utilised_agric_area.json`
  )
  const share_utilised_agric_area = await response4.json()

  const response5 = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/vulnerabilities/intensity_farming.json`
  )
  const intensity_farming = await response5.json()
  return {
    props: {
      allPosts,
      farm_size,
      livestock_density,
      farm_input_intensity,
      share_permanent_grassland,
      share_utilised_agric_area,
      intensity_farming,
    },
  }
}

export default function App({
  allPosts,
  farm_size,
  livestock_density,
  farm_input_intensity,
  share_permanent_grassland,
  share_utilised_agric_area,
  intensity_farming,
}) {
  const router = useRouter()
  const mapRef = React.useRef()

  const introHeadline = `Vulnerability factors`
  const introText = (
    <>
      <p>
        <strong>
          The maps present factors identified to contribute agricultures
          vulnerability to drought based on the analyses with two case studies.
        </strong>
      </p>
      <p>
        For further details <Link href="/md/about-the-data">read more</Link>.
      </p>
      {/* <p>
        The mapped vulnerability factors were identified by analyzing
        agriculture&apos;s vulnerability to drought in the two case study
        regions of the project: Thurgau (CH) and Podravska (SI). During
        semi-structured interviews project partners and external experts were
        asked to identify the most important factors contributing to the overall
        vulnerability an in addition, whether the factor has an increasing or
        decreasing effect on the final vulnerability in order to be able to
        quantitatively describe the vulnerability component. They identified 10
        common factors for both study regions, whereas they identified 6 factors
        solely for Thurgau and 13 factors solely for Podravska. The
        applicability of these factors for other parts of the Alpine region can
        be questioned especially when considering the differences between the
        case study regions highlighting the region-specific character of
        vulnerability. However, the factors presented here and on the platform
        can be seen as a first estimate how vulnerable the agriculture across
        the Alpine Space is.
      </p>
      <p>
        For further details read: Deliverable DT3.3.1 and Stephan, R., Terzi,
        S., Erfurt, M., Cocuccioni, S., Stahl, K., and Zebisch, M.: Assessing
        agriculture&apos;s vulnerability to drought in European pre-Alpine
        regions, EGUsphere, 2022, 1–28,{' '}
        <a href="https://doi.org/10.5194/egusphere-2022-744">
          https://doi.org/10.5194/egusphere-2022-744
        </a>
        , available at:
        <a href="https://egusphere.copernicus.org/preprints/egusphere-2022-744/">
          https://egusphere.copernicus.org/preprints/egusphere-2022-744/
        </a>
        , 2022.
      </p> */}
    </>
  )
  const [nutsMap, setNutsMap] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [theme, setTheme] = useThemeContext()

  const type = router.query.type

  const dataToUse =
    type === 'farm_size'
      ? farm_size
      : type === 'livestock_density'
      ? livestock_density
      : type === 'farm_input_intensity'
      ? farm_input_intensity
      : type === 'share_permanent_grassland'
      ? share_permanent_grassland
      : type === 'share_utilised_agric_area'
      ? share_utilised_agric_area
      : type === 'intensity_farming'
      ? intensity_farming
      : farm_size
  //console.log('datatouse', dataToUse)

  const dataObject =
    type === 'farm_size'
      ? {
          row: 'farm_size_ha',
          postfix: ' ha',
          colorRange: [
            [0, 0, '255,255,178'],
            [0, 7.3, '254,204,92'],
            [7.3, 16.5, '253,141,60'],
            [16.5, 23.3, '240,59,32'],
            [23.3, 75.9, '189,0,38'],

            [75.9, 1000, '18,255,17'],
          ],
          title: 'Farm size',
          unit: 'ha',
          desc: 'This factor has been calculated by dividing the total number of holdings with the utilised agricultural area (ha)',
          update: '2013',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_EF_LU$DEFAULTVIEW/default/table',
        }
      : type === 'livestock_density'
      ? {
          row: 'livestock_density',
          postfix: ' units/ha',
          colorRange: [
            [-1000, 0.32, '18,255,17'],

            [0.32, 0.73, '255,255,178'],
            [0.73, 1.39, '254,204,92'],
            [1.39, 2.7, '253,141,60'],
            [2.7, 3.42, '240,59,32'],
            [3.42, 12.92, '189,0,38'],

            [12.92, 1000, '18,255,17'],
          ],
          title: 'Livestock density',
          unit: 'units/ha',
          desc: 'This factor has been calculated by dividing the total number of livestock units by the hectares of permanent grassland (livestock/ha).',
          update: '2016',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/EF_LSK_MAIN$DEFAULTVIEW/default/table',
        }
      : type === 'farm_input_intensity'
      ? {
          row: 'percentage',
          postfix: '%',
          colorRange: [
            [0, 31.6, '255,255,178'],
            [31.6, 41.9, '254,204,92'],
            [41.9, 51.1, '253,141,60'],
            [51.1, 60.6, '240,59,32'],
            [60.6, 83.2, '189,0,38'],

            [83.2, 1000, '18,255,17'],
          ],
          title: 'High input farming [%]',
          unit: '%',
          desc: 'This dataset shows the hectares and the percentage of utilised agricultural area (UAA) managed by high-input farms. The inputs considered are purchased fertilisers and soil improvers, plant protection products such as pesticides, traps, bird scarers, anti-hail shells, frost protection etc. High intensity level means that the input level is greater than the 66th UAA quantiles.',
          update: '2019',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_PS_INP__custom_2982600/default/table',
        }
      : type === 'intensity_farming'
      ? {
          row: 'total_farm_intensity',
          divisor: 10,
          color: [
            'step',
            ['get', 'value'],
            'rgba(236,11,0,0.9)',
            -2,
            'rgba(237,69,61,0.9)',
            -1.5,
            'rgba(238,127,122,0.9)',
            -1,
            'rgba(239,239,239,0.9)',
            0,
            'rgba(213,233,237,0.9)',
            1,
            'rgba(200,229,236,0.9)',
            1.5,
            'rgba(187,226,234,0.9)',
          ],
          title: '',
          unit: '',
          desc: '',
          update: '',
          dataset: '',
        }
      : {
          row: 'farm_size_ha',
          postfix: ' ha',
          colorRange: [
            [0, 0, '255,255,178'],
            [0, 7.3, '254,204,92'],
            [7.3, 16.5, '253,141,60'],
            [16.5, 23.3, '240,59,32'],
            [23.3, 75.9, '189,0,38'],

            [75.9, 1000, '18,255,17'],
          ],
          title: 'Farm size',
          unit: 'ha',
          desc: 'This factor has been calculated by dividing the total number of holdings with the utilised agricultural area (ha)',
          update: '2013',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_EF_LU$DEFAULTVIEW/default/table',
        }

  const matchExpression = ['match', ['get', 'NUTS_ID']]

  // return true if in range, otherwise false
  function inRange(x, min, max) {
    return (x - min) * (x - max) <= 0
  }

  // check if value is in the given data-range and get the corresponing color provided
  function getColor(value) {
    for (const range of dataObject?.colorRange) {
      //console.log('value', value)
      if (inRange(value, range[0], range[1]) === true) {
        //console.log('getColor return', range[2])
        return range[2]
      }
    }
  }
  for (const row of dataToUse) {
    // Convert the range of data values to a suitable color
    const value = row[`${dataObject.row}`]

    // do not provide a color if amount is null. pass the value to getColor function
    value && matchExpression.push(row['nuts_id'], `rgb(${getColor(value)})`)
  }

  // Last value is the default, used where there is no data
  matchExpression.push('rgba(0, 0, 0, 0.1)')

  // Add layer from the vector tile source to create the choropleth
  // Insert it below the 'admin-1-boundary-bg' layer in the style

  const nutsLayer = {
    type: 'fill',
    id: 'geojson',
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

  const scaleControlStyle = {}
  const navControlStyle = {
    right: 10,
    bottom: 120,
  }

  function getDataByNutsId(NUTS_ID) {
    const result = dataToUse.find((item) => item['nuts_id'] === NUTS_ID)
    if (result) {
      console.log('result', result)
      return result // amount of impact items
    }
    return null
  }

  useEffect(() => {
    /* global fetch */
    fetch(
      'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/nuts2_simple_4326.geojson'
    )
      .then((resp) => resp.json())
      .then((json) => {
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
    // const map = mapRef.current.getMap()

    // map.setFeatureState(
    //   { source: 'geojson', id: hoverInfo && hoverInfo.feature.id },
    //   { hover: false }
    // )

    // prettier-ignore
    setHoverInfo(hoveredFeature && { feature: hoveredFeature, x, y });
  }, [])

  const onOut = useCallback((event) => {
    setHoverInfo(null)
  }, [])

  return (
    <Layout posts={allPosts}>
      <Head>
        <title>
          Vulnerability factors - Alpine Drought Observatory | Eurac Research
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
                {getDataByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                  <div>
                    Value:{' '}
                    {
                      getDataByNutsId(hoverInfo.feature.properties.NUTS_ID)[
                        `${dataObject.row}`
                      ]
                    }
                    {dataObject?.postfix}
                  </div>
                )}
              </div>
            )}
          </Map>
        </div>

        <div className="controlContainer impacts">
          <div className="legend" style={{ maxWidth: 'none' }}>
            {dataObject?.colorRange?.map((range, index) => (
              <div style={{ fontSize: '12px' }} key={index}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'inline-block',
                    background: `rgb(${range[2]}`,
                  }}
                ></span>
                {range[0]} - {range[1]}
              </div>
            ))}
          </div>

          <div className="navigation probabilities">
            <p>Indices</p>
            <Link
              href="?type=farm_size"
              className={
                router.query.type === 'farm_size' || !router.query.type
                  ? 'active'
                  : ''
              }
            >
              Farm size
            </Link>
            <Link
              href="?type=livestock_density"
              className={
                router.query.type === 'livestock_density' ? 'active' : ''
              }
            >
              Livestock density
            </Link>

            <Link
              href="?type=farm_input_intensity"
              className={
                router.query.type === 'farm_input_intensity' ? 'active' : ''
              }
            >
              High input farming (%)
            </Link>
          </div>
        </div>

        <ReportedImpactsIntro headline={introHeadline} text={introText} />
      </div>
    </Layout>
  )
}
