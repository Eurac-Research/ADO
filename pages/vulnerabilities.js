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

export async function getStaticProps({ params }) {
  // const response = await fetch(
  //   `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/EDIIALPS_V1.0-minified.json`
  // )
  // const impactData = await response.json()

  const farmSize = [
    {
      nuts_id: 'AT11',
      regions: 'Burgenland',
      hold_with_utilised_agric_area: 6850,
      'utilised_agricultural area_ha': 181970,
      farm_size_ha: 26.565,
    },
    {
      nuts_id: 'AT12',
      regions: 'Niederösterreich',
      hold_with_utilised_agric_area: 34360,
      'utilised_agricultural area_ha': 908850,
      farm_size_ha: 26.451,
    },
    {
      nuts_id: 'AT13',
      regions: 'Wien',
      hold_with_utilised_agric_area: 530,
      'utilised_agricultural area_ha': 8020,
      farm_size_ha: 15.132,
    },
    {
      nuts_id: 'AT21',
      regions: 'Kärnten',
      hold_with_utilised_agric_area: 13240,
      'utilised_agricultural area_ha': 220340,
      farm_size_ha: 16.642,
    },
    {
      nuts_id: 'AT22',
      regions: 'Steiermark',
      hold_with_utilised_agric_area: 30540,
      'utilised_agricultural area_ha': 375180,
      farm_size_ha: 12.285,
    },
    {
      nuts_id: 'AT31',
      regions: 'Oberösterreich',
      hold_with_utilised_agric_area: 27690,
      'utilised_agricultural area_ha': 517350,
      farm_size_ha: 18.684,
    },
    {
      nuts_id: 'AT32',
      regions: 'Salzburg',
      hold_with_utilised_agric_area: 8600,
      'utilised_agricultural area_ha': 178390,
      farm_size_ha: 20.743,
    },
    {
      nuts_id: 'AT33',
      regions: 'Tirol',
      hold_with_utilised_agric_area: 13990,
      'utilised_agricultural area_ha': 259010,
      farm_size_ha: 18.514,
    },
    {
      nuts_id: 'AT34',
      regions: 'Vorarlberg',
      hold_with_utilised_agric_area: 3810,
      'utilised_agricultural area_ha': 77780,
      farm_size_ha: 20.415,
    },
    {
      nuts_id: 'CH01',
      regions: 'Région lémanique',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH02',
      regions: 'Espace Mittelland',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH03',
      regions: 'Nordwestschweiz',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH04',
      regions: 'Zürich',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH05',
      regions: 'Ostschweiz',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH06',
      regions: 'Zentralschweiz',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'CH07',
      regions: 'Ticino',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE11',
      regions: 'Stuttgart',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE12',
      regions: 'Karlsruhe',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE13',
      regions: 'Freiburg',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE14',
      regions: 'Tübingen',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE21',
      regions: 'Oberbayern',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE22',
      regions: 'Niederbayern',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE23',
      regions: 'Oberpfalz',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE24',
      regions: 'Oberfranken',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE25',
      regions: 'Mittelfranken',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE26',
      regions: 'Unterfranken',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'DE27',
      regions: 'Schwaben',
      hold_with_utilised_agric_area: null,
      'utilised_agricultural area_ha': null,
      farm_size_ha: null,
    },
    {
      nuts_id: 'FRC2',
      regions: 'Franche-Comté',
      hold_with_utilised_agric_area: 8830,
      'utilised_agricultural area_ha': 669860,
      farm_size_ha: 75.862,
    },
    {
      nuts_id: 'FRF1',
      regions: 'Alsace',
      hold_with_utilised_agric_area: 10700,
      'utilised_agricultural area_ha': 341790,
      farm_size_ha: 31.943,
    },
    {
      nuts_id: 'FRK2',
      regions: 'Rhône-Alpes',
      hold_with_utilised_agric_area: 34750,
      'utilised_agricultural area_ha': 1507770,
      farm_size_ha: 43.389,
    },
    {
      nuts_id: 'FRL0',
      regions: 'Provence-Alpes-Côte d’Azur',
      hold_with_utilised_agric_area: 20510,
      'utilised_agricultural area_ha': 802030,
      farm_size_ha: 39.104,
    },
    {
      nuts_id: 'ITC1',
      regions: 'Piemonte',
      hold_with_utilised_agric_area: 48920,
      'utilised_agricultural area_ha': 948580,
      farm_size_ha: 19.39,
    },
    {
      nuts_id: 'ITC2',
      regions: 'Valle d’Aosta/Vallée d’Aoste',
      hold_with_utilised_agric_area: 2180,
      'utilised_agricultural area_ha': 52490,
      farm_size_ha: 24.078,
    },
    {
      nuts_id: 'ITC3',
      regions: 'Liguria',
      hold_with_utilised_agric_area: 7900,
      'utilised_agricultural area_ha': 37330,
      farm_size_ha: 4.725,
    },
    {
      nuts_id: 'ITC4',
      regions: 'Lombardia',
      hold_with_utilised_agric_area: 40340,
      'utilised_agricultural area_ha': 922320,
      farm_size_ha: 22.864,
    },
    {
      nuts_id: 'ITH1',
      regions: 'Provincia Autonoma di Bolzano/Bozen',
      hold_with_utilised_agric_area: 15430,
      'utilised_agricultural area_ha': 227900,
      farm_size_ha: 14.77,
    },
    {
      nuts_id: 'ITH2',
      regions: 'Provincia Autonoma di Trento',
      hold_with_utilised_agric_area: 8340,
      'utilised_agricultural area_ha': 131410,
      farm_size_ha: 15.757,
    },
    {
      nuts_id: 'ITH3',
      regions: 'Veneto',
      hold_with_utilised_agric_area: 85140,
      'utilised_agricultural area_ha': 796250,
      farm_size_ha: 9.352,
    },
    {
      nuts_id: 'ITH4',
      regions: 'Friuli-Venezia Giulia',
      hold_with_utilised_agric_area: 17860,
      'utilised_agricultural area_ha': 211130,
      farm_size_ha: 11.821,
    },
    {
      nuts_id: 'SI03',
      regions: 'Vzhodna Slovenija',
      hold_with_utilised_agric_area: 51300,
      'utilised_agricultural area_ha': 342480,
      farm_size_ha: 6.676,
    },
    {
      nuts_id: 'SI04',
      regions: 'Zahodna Slovenija',
      hold_with_utilised_agric_area: 20980,
      'utilised_agricultural area_ha': 143270,
      farm_size_ha: 6.829,
    },
  ]

  const allPosts = getAllPosts(['title', 'slug'])
  return { props: { farmSize, allPosts } }
}

export default function App({ farmSize, allPosts }) {
  const router = useRouter()
  const mapRef = React.useRef()

  const introHeadline = `Vulnerability factors`
  const introText = (
    <>
      <p>
        The maps present factors identified to contribute agricultures
        vulnerability to drought based on the analyses with two case studies.
        For further details read more. Read more text (in “About the data”): The
        mapped vulnerability factors were identified by analyzing agriculture's
        vulnerability to drought in the two case study regions of the project:
        Thurgau (CH) and Podravska (SI). During semi-structured interviews
        project partners and external experts were asked to identify the most
        important factors contributing to the overall vulnerability an in
        addition, whether the factor has an increasing or decreasing effect on
        the final vulnerability in order to be able to quantitatively describe
        the vulnerability component. They identified 10 common factors for both
        study regions, whereas they identified 6 factors solely for Thurgau and
        13 factors solely for Podravska. The applicability of these factors for
        other parts of the Alpine region can be questioned especially when
        considering the differences between the case study regions highlighting
        the region-specific character of vulnerability. However, the factors
        presented here and on the platform can be seen as a first estimate how
        vulnerable the agriculture across the Alpine Space is.
      </p>
      <p>
        For further details read: Deliverable DT3.3.1 and Stephan, R., Terzi,
        S., Erfurt, M., Cocuccioni, S., Stahl, K., and Zebisch, M.: Assessing
        agriculture's vulnerability to drought in European pre-Alpine regions,
        EGUsphere, 2022, 1–28,{' '}
        <a href="https://doi.org/10.5194/egusphere-2022-744">
          https://doi.org/10.5194/egusphere-2022-744
        </a>
        , available at:
        <a href="https://egusphere.copernicus.org/preprints/egusphere-2022-744/">
          https://egusphere.copernicus.org/preprints/egusphere-2022-744/
        </a>
        , 2022.
      </p>
    </>
  )
  const [nutsMap, setNutsMap] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)

  const [nutsid, setNutsid] = useState(null)
  const [nutsName, setNutsName] = useState(null)

  const [theme, setTheme] = useThemeContext()

  const [featuredId, setFeaturedId] = useState(null)

  const type = router.query.type

  const dataObject =
    type === 'farm_size'
      ? {
          row: 'farm_size_ha',
          divisor: 100 /* max value of this datatype - in order to get a 0 to 1 colormap */,
          fun: 'bla',
          color: [
            'step',
            ['get', 'value'],
            'rgba(236,11,0,0.9)',
            30,
            'rgba(237,69,61,0.9)',
            40,
            'rgba(238,127,122,0.9)',
            50,
            'rgba(239,239,239,0.9)',
            60,
            'rgba(213,233,237,0.9)',
            70,
            'rgba(200,229,236,0.9)',
            80,
            'rgba(187,226,234,0.9)',
          ],
        }
      : type === 'livestock_density'
      ? {
          row: 'livestock_density',
          divisor: 100,
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
        }
      : type === 'farm_input_intensity'
      ? {
          row: 'percentage',
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
        }
      : {
          row: 'farm_size_ha',
          divisor: 100,
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
        }

  console.log('dataO', dataObject.fun)

  const matchExpression = ['match', ['get', 'NUTS_ID']]

  for (const row of farmSize) {
    // Convert the range of data values to a suitable color
    const amount = row[`${dataObject.row}`]
    const zeroToOne = amount / dataObject.divisor
    // use colormap to interpolate between two colors, 0 - 1
    const colormap = interpolate(['#fcebbf', '#dd0035'])
    const color = colormap(zeroToOne)

    // do not provide a color if amount is null
    amount && matchExpression.push(row['nuts_id'], color)
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
      //'fill-color': dataObject?.color,

      // 'fill-opacity': [
      //   'case',
      //   ['boolean', ['feature-state', 'hover'], false],
      //   1,
      //   0.6,
      // ],

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

  useEffect(() => {
    /* global fetch */
    fetch(
      'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/nuts2_simple_4326.geojson'
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
                click to open impact
                <br />
                <div>NUTS_NAME: {hoverInfo.feature.properties.NUTS_NAME}</div>
                <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div>
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

          <div className="navigation probabilities">
            <p>Indices</p>
            <Link
              href="?type=farm_size"
              className={router.query.type === 'farm_size' ? 'active' : ''}
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
