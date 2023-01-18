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
      : type === 'farm_input_intensity_ha'
      ? farm_input_intensity
      : type === 'share_permanent_grassland'
      ? share_permanent_grassland
      : type === 'share_utilised_agric_area'
      ? share_utilised_agric_area
      : type === 'share_utilised_agric_area_ha'
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
            [0, 7.3, '255, 255, 212'],
            [7.3, 16.5, '254, 217, 142'],
            [16.5, 23.3, '254, 153, 41'],
            [23.3, 75.9, '217, 95, 14'],
          ],
          title: 'Farm size',
          variableName:
            'Average utilised agricultural area per agricultural holding [ha]',
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
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/EF_LSK_MAIN$DEFAULTVIEW/default/table',
        }
      : type === 'farm_input_intensity'
      ? {
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
          variableName:
            'Percentage of high input utilised agricultural area over total utilised agricultural area',
          unit: '%',
          desc: 'This dataset shows the hectares and the percentage of utilised agricultural area (UAA) managed by high-input farms. The inputs considered are purchased fertilisers and soil improvers, plant protection products such as pesticides, traps, bird scarers, anti-hail shells, frost protection etc. High intensity level means that the input level is greater than the 66th UAA quantiles.',
          update: '2019',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_PS_INP__custom_2982600/default/table',
        }
      : type === 'farm_input_intensity_ha'
      ? {
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
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_PS_INP__custom_2982600/default/table',
        }
      : type === 'intensity_farming'
      ? {
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
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/APRO_CPSHR__custom_2974283/default/table',
        }
      : type === 'share_utilised_agric_area'
      ? {
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
          variableName:
            'Percentage of utilised agricultural area over the total NUTS2 area',
          unit: '%',
          desc: 'This factor shows the hectares of utilised agricultural areas and the share calculated by dividing the utilised agricultural area by the total area at each NUTS2 region.',
          update: '2016',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_MAIN__custom_2950047/default/table',
        }
      : type === 'share_utilised_agric_area_ha'
      ? {
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
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_MAIN__custom_2950047/default/table',
        }
      : type === 'share_permanent_grassland'
      ? {
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
          variableName:
            'Percentage of permanent grassland over total utlised agricultural area',
          unit: '%',
          desc: 'This factor is calculated by substracting agricultural grassland not in use (ha) to permanent grassland (ha), and then dividing by the total utilised agricultural area.',
          update: '2016',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/EF_LUS_PEGRASS__custom_2963027/default/table',
        }
      : {
          row: 'farm_size_ha',
          postfix: ' ha',
          colorRange: [
            [0, 0, '255, 255, 212'],
            [0, 7.3, '254, 217, 142'],
            [7.3, 16.5, '254, 153, 41'],
            [16.5, 23.3, '217, 95, 14'],
            [23.3, 75.9, '153, 52, 4'],
          ],
          title: 'Farm size',
          variableName:
            'Average utilised agricultural area per agricultural holding [ha]',
          unit: 'ha',
          desc: 'This factor has been calculated by dividing the total number of holdings with the utilised agricultural area (ha)',
          update: '2013',
          dataset:
            'https://ec.europa.eu/eurostat/databrowser/view/AEI_EF_LU$DEFAULTVIEW/default/table',
        }

  const introHeadline = `Vulnerability factors`
  const introText = (
    <>
      <p>
        <strong>
          The maps present the identified factors contributing to agriculture's
          vulnerability to drought based on the analyses of two case studies.
        </strong>
      </p>
      <p>
        For further details <Link href="/md/about-the-data">read more</Link>.
      </p>

      <hr style={{ margin: '1.5rem 0' }} />
      <h2 style={{ marginBottom: '1rem', fontSize: '20px' }}>
        {dataObject.title}
      </h2>
      <p>
        <strong>{dataObject.variableName}</strong>
      </p>

      <p>
        {dataObject.desc}
        <br /> Latest update: {dataObject.update}
      </p>
      <p>
        Underlying dataset:
        <br />
        <a href={dataObject.dataset}>{dataObject.dataset}</a>
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
      //console.log('result', result)
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
                <div style={{ marginBottom: '6px' }}>
                  {hoverInfo.feature.properties.NUTS_NAME} (
                  {hoverInfo.feature.properties.NUTS_ID})
                </div>
                {getDataByNutsId(hoverInfo?.feature?.properties?.NUTS_ID) && (
                  <>
                    <div style={{ marginBottom: '6px' }}>
                      {dataObject.variableName}
                    </div>
                    <div style={{ fontWeight: '600' }}>
                      {new Intl.NumberFormat('en-EN').format(
                        getDataByNutsId(hoverInfo.feature.properties.NUTS_ID)[
                          `${dataObject.row}`
                        ]
                      )}
                      {dataObject?.postfix}
                    </div>
                  </>
                )}
              </div>
            )}
          </Map>
        </div>

        <div className="controlContainer impacts">
          <div className="legend" style={{ maxWidth: 'none' }}>
            <p style={{ fontSize: '12px', marginBottom: '6px' }}>
              Unit: {dataObject.postfix}
            </p>
            {dataObject?.colorRange?.map((range, index) => (
              <div className="vulnerabilityLegend" key={index}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'inline-block',
                    background: `rgb(${range[2]}`,
                  }}
                ></span>
                {new Intl.NumberFormat('en-EN').format(range[0])} -{' '}
                {new Intl.NumberFormat('en-EN').format(range[1])}
              </div>
            ))}
          </div>

          <div className="navigation probabilities">
            <p>Indices</p>
            <Link
              href="?type=farm_size"
              title="Farm size"
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
              title="Livestock density"
              className={
                router.query.type === 'livestock_density' ? 'active' : ''
              }
            >
              Livestock density
            </Link>

            <Link
              href="?type=farm_input_intensity"
              title="High input farming [%]"
              className={
                router.query.type === 'farm_input_intensity' ? 'active' : ''
              }
            >
              High input farming [%]
            </Link>

            <Link
              href="?type=farm_input_intensity_ha"
              title="High input farming [ha]"
              className={
                router.query.type === 'farm_input_intensity_ha' ? 'active' : ''
              }
            >
              High input farming [ha]
            </Link>

            <Link
              href="?type=intensity_farming"
              title="Production intensity"
              className={
                router.query.type === 'intensity_farming' ? 'active' : ''
              }
            >
              Production intensity
            </Link>

            <Link
              href="?type=share_utilised_agric_area"
              title="Utilised agricultural area [%]"
              className={
                router.query.type === 'share_utilised_agric_area'
                  ? 'active'
                  : ''
              }
            >
              uaa [%]
            </Link>

            <Link
              href="?type=share_utilised_agric_area_ha"
              title="Utilised agricultural area [ha]"
              className={
                router.query.type === 'share_utilised_agric_area_ha'
                  ? 'active'
                  : ''
              }
            >
              uaa [ha]
            </Link>

            <Link
              href="?type=share_permanent_grassland"
              title="Share permanent grassland"
              className={
                router.query.type === 'share_permanent_grassland'
                  ? 'active'
                  : ''
              }
            >
              Share permanent grassland
            </Link>
          </div>
        </div>

        <ReportedImpactsIntro headline={introHeadline} text={introText} />
      </div>
    </Layout>
  )
}
