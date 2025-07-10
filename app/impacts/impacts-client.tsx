'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
  MapRef,
} from 'react-map-gl'
import ControlPanelImpacts from '@/components/ControlPanelImpacts'
import ReportedImpactsIntro from '@/components/ReportedImpactsIntro'
import Layout from '@/components/layout'
import uniqolor from 'uniqolor'
import { useThemeContext } from '@/context/theme'
import type {
  ImpactData,
  PostData,
  NutsGeoJSON,
  HoverInfo,
  YearAmount,
  ImpactCategory,
  NutsRegion,
  MapLayer,
  MatchExpression
} from '@/types'

import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// Utility function to darken colors
const darkenColor = (hexColor: string, amount: number): string => {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  const newR = Math.max(0, r - Math.floor(amount * 255))
  const newG = Math.max(0, g - Math.floor(amount * 255))
  const newB = Math.max(0, b - Math.floor(amount * 255))

  const toHex = (n: number): string => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
}

interface ImpactsClientProps {
  impactData: ImpactData[]
  allPosts: PostData[]
  error?: string
}

export default function ImpactsClient({
  impactData,
  allPosts,
  error
}: ImpactsClientProps) {
  const mapRef = useRef<MapRef>(null)
  const [nutsMap, setNutsMap] = useState<NutsGeoJSON | null>(null)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [nutsid, setNutsid] = useState<string | null>(null)
  const [nutsName, setNutsName] = useState<string | null>(null)
  const [year, setYear] = useState<string>('')
  const [theme] = useThemeContext()
  const [featuredId, setFeaturedId] = useState<number | null>(null)

  // Memoized calculations
  const impactDataByYear = useMemo(() =>
    impactData.filter((item) => item.Year_start.toString() === year),
    [impactData, year]
  )

  const uniqueYears = useMemo(() =>
    [...new Set(impactData.map((item) => item.Year_start))].sort(),
    [impactData]
  )

  const yearAndAmount = useMemo((): YearAmount[] =>
    uniqueYears.map((yearOfImpact) => ({
      impactYear: yearOfImpact,
      impactAmount: impactData.filter(
        (item) => item.Year_start === yearOfImpact
      ).length,
    })),
    [uniqueYears, impactData]
  )

  const impactsByYearForMap = useMemo(() =>
    year ? impactDataByYear : impactData,
    [year, impactDataByYear, impactData]
  )

  const uniqueImpactsByNutsID = useMemo(() =>
    impactsByYearForMap.reduce(
      (acc, item) => {
        acc[item.NUTS2_ID] = (acc[item.NUTS2_ID] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
    [impactsByYearForMap]
  )

  const impactEntries = useMemo(() =>
    Object.entries(uniqueImpactsByNutsID),
    [uniqueImpactsByNutsID]
  )

  // Function to get impact amount by NUTS ID
  const impactAmountByNutsId = useCallback((nutsId: string): number | null => {
    const result = impactEntries.find((item) => item[0] === nutsId)
    return result ? result[1] : null
  }, [impactEntries])

  // Mapbox layer configuration
  const matchExpression = useMemo((): MatchExpression => {
    const expression: MatchExpression = ['match', ['get', 'NUTS_ID']]

    if (impactEntries.length > 1) {
      impactEntries.forEach((row) => {
        const amount = row[1]
        const mycolor = darkenColor('#FFCEC3', amount / 100)
        expression.push(row[0], mycolor)
      })
    }

    expression.push('rgba(0, 0, 0, 0.1)')
    return expression
  }, [impactEntries])

  const nutsLayer: MapLayer = useMemo(() => ({
    type: 'fill',
    id: 'geojson',
    paint: {
      'fill-color': matchExpression,
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        0.6,
      ],
      'fill-outline-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#000',
        '#999',
      ],
    },
  }), [matchExpression])

  // Impact categories
  const impactCategories: ImpactCategory[] = [
    { id: 1, categoryname: 'Agriculture and livestock farming', color: '#A48C00' },
    { id: 2, categoryname: 'Forestry', color: '#1A8612' },
    { id: 3, categoryname: 'Freshwater aquaculture and fisheries', color: '#BAEEFF' },
    { id: 4, categoryname: 'Energy and industry', color: '#FCD900' },
    { id: 5, categoryname: 'Waterborne transportation', color: '#8895CB' },
    { id: 6, categoryname: 'Tourism and recreation', color: '#CF8FC8' },
    { id: 7, categoryname: 'Public water supply', color: '#6AD7F8' },
    { id: 8, categoryname: 'Water quality', color: '#2CA1D2' },
    { id: 9, categoryname: 'Freshwater ecosystems: habitats, plants and wildlife', color: '#CCE73E' },
    { id: 10, categoryname: 'Terrestrial ecosystems: habitats, plants and wildlife', color: '#80C31B' },
    { id: 11, categoryname: 'Soil system', color: '#AC6600' },
    { id: 12, categoryname: 'Wildfires', color: '#ED3333' },
    { id: 13, categoryname: 'Air quality', color: '#CDE1E6' },
    { id: 14, categoryname: 'Human health and public safety', color: '#A085C1' },
    { id: 15, categoryname: 'Conflicts', color: '#FD71BB' },
  ]

  // NUTS2 static data
  const nuts2static: NutsRegion[] = [
    { id: 1, nuts2id: 'CZ02', name: 'Střední Čechy' },
    { id: 2, nuts2id: 'CH01', name: 'Région lémanique' },
    { id: 3, nuts2id: 'AL01', name: 'Veri' },
    { id: 4, nuts2id: 'BE24', name: 'Prov. Vlaams-Brabant' },
    { id: 5, nuts2id: 'BG33', name: 'Североизточен' },
    { id: 6, nuts2id: 'DE14', name: 'Tübingen' },
    { id: 7, nuts2id: 'AT31', name: 'Oberösterreich' },
    { id: 8, nuts2id: 'CZ03', name: 'Jihozápad' },
    { id: 9, nuts2id: 'CY00', name: 'Κύπρος' },
    { id: 10, nuts2id: 'CZ01', name: 'Praha' },
    { id: 11, nuts2id: 'BG34', name: 'Югоизточен' },
    { id: 12, nuts2id: 'AT11', name: 'Burgenland' },
    { id: 13, nuts2id: 'AT13', name: 'Wien' },
    { id: 14, nuts2id: 'AT21', name: 'Kärnten' },
    { id: 15, nuts2id: 'BE25', name: 'Prov. West-Vlaanderen' },
    { id: 16, nuts2id: 'CZ06', name: 'Jihovýchod' },
    { id: 17, nuts2id: 'ES12', name: 'Principado de Asturias' },
    { id: 18, nuts2id: 'BE34', name: 'Prov. Luxembourg (BE)' },
    { id: 19, nuts2id: 'ES24', name: 'Aragón' },
    { id: 20, nuts2id: 'ES30', name: 'Comunidad de Madrid' },
    // Add more as needed - keeping it shorter for the migration example
  ]

  // Map event handlers
  const onClick = useCallback((event: any) => {
    const map = mapRef.current?.getMap()
    if (!map) return

    const { features } = event
    const hoveredFeature = features?.[0]
    const clickedNutsid = hoveredFeature?.properties?.NUTS_ID
    const clickedNutsName = hoveredFeature?.properties?.NUTS_NAME

    setNutsName(clickedNutsName || null)
    setNutsid(clickedNutsid || null)
    setYear('')

    if (featuredId !== null) {
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
    }

    if (clickedNutsid && hoveredFeature) {
      setFeaturedId(hoveredFeature.id)
      map.setFeatureState(
        { source: 'geojson', id: hoveredFeature.id },
        { hover: true }
      )
    }
  }, [featuredId])

  const onHover = useCallback((event: any) => {
    const { features, point } = event
    const hoveredFeature = features?.[0]
    setHoverInfo(hoveredFeature ? {
      feature: hoveredFeature,
      x: point.x,
      y: point.y
    } : null)
  }, [])

  const onOut = useCallback(() => {
    setHoverInfo(null)
  }, [])

  const removeNutsInformation = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (map && featuredId !== null) {
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
    }
    setNutsid(null)
    setFeaturedId(null)
  }, [featuredId])

  const closeImpactsWrapper = useCallback(() => {
    removeNutsInformation()
    setYear('')
  }, [removeNutsInformation])

  // Load NUTS map data
  useEffect(() => {
    fetch(
      'https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/impacts/nuts2_simple_4326.geojson'
    )
      .then((resp) => resp.json())
      .then((json: NutsGeoJSON) => {
        setNutsMap(json)
      })
      .catch((err) => console.error('Could not load NUTS data', err))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    // Capture the current value of the ref
    const mapRefCurrent = mapRef.current

    return () => {
      const currentFeaturedId = featuredId
      if (mapRefCurrent && currentFeaturedId !== null) {
        try {
          const map = mapRefCurrent.getMap()
          map.setFeatureState(
            { source: 'geojson', id: currentFeaturedId },
            { hover: false }
          )
        } catch (e) {
          // Ignore errors during unmount
        }
      }
    }
  }, [featuredId])

  // Handle change in year selection
  const handleYearChange = useCallback((value: string) => {
    setYear(value)
    setNutsid(null)
  }, [])

  // Component for displaying impact details
  const ImpactsDetailsComponent = () => (
    <div className="impactsWrapper">
      <div className="closeImpactWrapper" onClick={closeImpactsWrapper}>
        close x
      </div>

      {year && (
        <div className="impactsTitle">
          <h1 style={{ fontSize: '30px', marginBottom: '10px', marginTop: '10px' }}>
            {year}
          </h1>
          {yearAndAmount
            .filter((item) => item.impactYear.toString() === year)
            .map((item, index) => (
              <h2
                key={`${item.impactYear}-${index}`}
                style={{ fontSize: '18px', marginBottom: '20px', marginTop: '10px' }}
              >
                {item.impactAmount} impact{item.impactAmount > 1 ? 's' : ''}
              </h2>
            ))}
        </div>
      )}

      {nutsid && (
        <div className="impactsTitle">
          <h1 style={{ fontSize: '30px', marginBottom: '10px', marginTop: '10px' }}>
            {nutsName}
          </h1>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', marginTop: '10px' }}>
            {(() => {
              const amount = impactAmountByNutsId(nutsid)
              return amount
                ? amount > 1
                  ? `${amount} impacts`
                  : `${amount} impact`
                : 'no impacts'
            })()}
          </h2>
        </div>
      )}

      <div className="impactsContent">
        {year && impactDataByYear.map((item) => (
          <div key={item.ID} className="impactsItem">
            <p>
              <b>Description</b>
              <br />
              {item.Impact_description}
            </p>

            {impactCategories
              .filter((cat) => cat.id === item.Impact_category)
              .map((cat) => (
                <p key={cat.id}>
                  <b>Category</b>
                  <br />
                  {cat.categoryname}
                </p>
              ))}

            {item.NUTS2_ID && nuts2static
              .filter((nut) => nut.nuts2id === item.NUTS2_ID)
              .map((nut) => (
                <p key={nut.id}>
                  <b>Region</b>{' '}
                  <span style={{ fontSize: '12px' }}>
                    (<a
                      href="https://ec.europa.eu/eurostat/web/nuts/background"
                      target="_blank"
                      rel="noreferrer"
                    >
                      NUTS-2
                    </a>)
                  </span>
                  <br />
                  {nut.name}
                </p>
              ))}
          </div>
        ))}

        {nutsid && impactData
          .filter((item) => item.NUTS2_ID === nutsid)
          .reverse()
          .map((item) => (
            <div key={item.ID} className="impactsItem">
              <p>
                <b>Description:</b>
                <br />
                {item.Impact_description}
              </p>
              <p>
                <b>Category:</b>
                <br />
                {impactCategories
                  .filter((cat) => cat.id === item.Impact_category)
                  .map((cat) => (
                    <span key={cat.id}>{cat.categoryname}</span>
                  ))}
              </p>
              <p>
                <b>Year:</b>
                <br />
                {item.Year_start}
              </p>
            </div>
          ))}
      </div>
    </div>
  )

  // Introduction content
  const introHeadline = 'Reported Impacts'
  const introText = (
    <>
      <p>
        The reported drought impacts stem from the Alpine Drought Impact report
        Inventory (EDIIALPS V1.0) developed during the project period. To create
        EDIIALPS, information was gathered and transcribed from national
        databases and reports. Compiled knowledge on the impacts of historic and
        recent drought events from a variety of available information sources is
        presented as this has never been done across the European Alpine region.
        The Alpine Space covers the Alps and their foothills, as well as
        different climatic zones and therefore allows the consideration of water
        and natural resource flow and exchange typical of mountain regions. With
        the region&apos;s extent, we therefore include drought impacts not only
        at high altitudes, but also in downstream areas of the water-rich source
        regions (e.g. the river basins Po, Rhine, Danube etc.). Besides the most
        prominent impact category &apos;agriculture and livestock farming&apos;,
        many impact reports also relate to &apos;public water supply&apos;,
        &apos;forestry&apos;, &apos;aquatic ecosystems&apos;.
      </p>
      <p>
        For further information on the database please read: Stephan, R.,
        Erfurt, M., Terzi, S., Žun, M., Kristan, B., Haslinger, K., and Stahl,
        K.: An inventory of Alpine drought impact reports to explore past
        droughts in a mountain region, Natural Hazards and Earth System Sciences
        Discussions, 21, 2485–2501, available at{' '}
        <a href="https://doi.org/10.5194/nhess-21-2485-2021">
          https://doi.org/10.5194/nhess-21-2485-2021
        </a>
        , 2021. To access EDIIALPS as a plain dataset follow this link{' '}
        <a href="https://doi.org/10.6094/UNIFR/218623">
          https://doi.org/10.6094/UNIFR/218623
        </a>
      </p>
    </>
  )

  // Error state
  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="error-container">
          <h1>Error Loading Data</h1>
          <p>{error}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout posts={allPosts}>
      <div>
        <div className="reactMap">
          <Map
            ref={mapRef}
            initialViewState={{
              latitude: 46,
              longitude: 9,
              bearing: 0,
              pitch: 0,
              zoom: 5,
            }}
            minZoom={5}
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
            onClick={onClick}
          >
            {nutsMap && (
              <Source
                id="geojson"
                type="geojson"
                data={nutsMap as any}
                generateId={true}
              >
                <Layer {...nutsLayer as any} beforeId="waterway-shadow" />
              </Source>
            )}

            <ScaleControl
              maxWidth={100}
              unit="metric"
              style={{}}
              position="bottom-right"
            />
            <NavigationControl
              style={{ right: 10, bottom: 120 }}
              position="bottom-right"
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
                {impactAmountByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                  <>
                    amount: {impactAmountByNutsId(hoverInfo.feature.properties.NUTS_ID)}
                  </>
                )}
              </div>
            )}
          </Map>
        </div>

        {!nutsid && (
          <div className="controlContainer impacts" onClick={removeNutsInformation}>
            <ControlPanelImpacts
              year={year}
              yearRange={uniqueYears}
              yearAndAmount={yearAndAmount}
              onChange={handleYearChange}
            />

            <select
              style={{ position: 'relative' }}
              value={year}
              onChange={(evt) => handleYearChange(evt.target.value)}
            >
              <option value="">All years</option>
              {yearAndAmount.map((yearitem) => (
                <option
                  key={`year-${yearitem.impactYear}`}
                  value={yearitem.impactYear}
                >
                  {yearitem.impactYear} ({yearitem.impactAmount} impacts)
                </option>
              ))}
            </select>
          </div>
        )}

        {(year || nutsid) && <ImpactsDetailsComponent />}

        {!nutsid && !year && (
          <ReportedImpactsIntro headline={introHeadline} text={introText} />
        )}
      </div>
    </Layout>
  )
}
