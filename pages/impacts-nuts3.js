import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import Map, {
  Source,
  Layer,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl'
import ControlPanelImpacts from '../components/ControlPanelImpacts'
import ReportedImpactsIntro from '../components/ReportedImpactsIntro'
import 'mapbox-gl/dist/mapbox-gl.css'
import Head from 'next/head'
import Layout from '../components/layout'
import uniqolor from 'uniqolor'
const { Color, ColorImmutable } = require('frostcolor')

import { getAllPosts } from '../lib/api'
import { useThemeContext } from '../context/theme'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export async function getStaticProps({ params }) {
  const response = await fetch(
    `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json//impacts/EDIIALPS_V1.0-minified.json`
  )
  const impactData = await response.json()
  const allPosts = getAllPosts(['title', 'slug'])
  return { props: { impactData, allPosts } }
}

export default function App({ impactData, allPosts }) {
  const mapRef = React.useRef()

  function impactAmountByNutsId(NUTS_ID) {
    const result = impactEntries.find((item) => item[0] === NUTS_ID)

    if (result) {
      return result[1] // amount of impact items
    }
    return null
  }

  const introHeadline = `Reported Impacts`
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

  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [nutsMap, setNutsMap] = useState(null)
  const [hoverInfo, setHoverInfo] = useState(null)
  const [nutsData, setNutsData] = useState(null)
  const [clickInfo, setClickInfo] = useState(null)

  const [nutsid, setNutsid] = useState(null)
  const [nutsName, setNutsName] = useState(null)
  const [year, setYear] = useState('')

  const [mapClicked, setMapClicked] = useState(false)

  const [theme, setTheme] = useThemeContext()

  const [featuredId, setFeaturedId] = useState(null)

  const impactDataByYear = impactData.filter((item) => item.Year_start == year)

  /*   console.log("impactDataByYear", impactDataByYear);
   */

  const uniqueYears = [...new Set(impactData.map((item) => item.Year_start))]

  // console.log("uniqueYears ", uniqueYears);

  const yearAndAmount = uniqueYears.map((yearOfImpact) => {
    return {
      impactYear: yearOfImpact,
      impactAmount: impactData.filter(
        (item) => item.Year_start === yearOfImpact
      ).length,
    }
  })

  /*   console.log("yearAndAmount", yearAndAmount);
   */

  // count number of distict values AKA number of impacts for a given nutsid
  // result: [ITC18: 4, ITC14: 11]
  //console.log("impactData", impactData)

  const impactsByYearForMap = year ? impactDataByYear : impactData

  const uniqueImpactsByNutsID = impactsByYearForMap.reduce(
    (acc, o) => ((acc[o.NUTS3_ID] = (acc[o.NUTS3_ID] || 0) + 1), acc),
    {}
  )
  // console.log("unique arr", uniqueImpactsByNutsID);

  // create array
  const impactEntries = Object.entries(uniqueImpactsByNutsID)
  //console.log("impactEntries", impactEntries);

  // https://docs.mapbox.com/mapbox-gl-js/example/data-join/
  // Build a GL match expression that defines the color for every vector tile feature
  // Use the ISO 3166-1 alpha 3 code as the lookup key for the country shape
  const matchExpression = ['match', ['get', 'NUTS_ID']]

  // Calculate color values for each nuts3id
  if (impactEntries.length > 1) {
    for (const row of impactEntries) {
      const amount = row['1']
      const color = uniqolor(amount, {
        saturation: [50, 75],
        lightness: [50, 70],
        differencePoint: 90,
      })

      // get color by basecolor - darken color by amount of impacts per nutsregion
      const mycolor = Color.fromString('#FFCEC3')
        .darken(amount / 100)
        .toHexString()
      // console.log(`mycolor amount ${mycolor}, ${amount / 100}`);

      matchExpression.push(row['0'], mycolor)
    }
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
  }

  const scaleControlStyle = {}
  const navControlStyle = {
    right: 10,
    bottom: 120,
  }

  const impactCategories = [
    {
      id: 1,
      categoryname: 'Agriculture and livestock farming',
      color: '#A48C00',
    },
    {
      id: 2,
      categoryname: 'Forestry',
      color: '#1A8612',
    },
    {
      id: 3,
      categoryname: 'Freshwater aquaculture and fisheries',
      color: '#BAEEFF',
    },
    {
      id: 4,
      categoryname: 'Energy and industry',
      color: '#FCD900',
    },
    {
      id: 5,
      categoryname: 'Waterborne transportation',
      color: '#8895CB',
    },
    {
      id: 6,
      categoryname: 'Tourism and recreation',
      color: '#CF8FC8',
    },
    {
      id: 7,
      categoryname: 'Public water supply',
      color: '#6AD7F8',
    },
    {
      id: 8,
      categoryname: 'Water quality',
      color: '#2CA1D2',
    },
    {
      id: 9,
      categoryname: 'Freshwater ecosystems: habitats, plants and wildlife',
      color: '#CCE73E',
    },
    {
      id: 10,
      categoryname: 'Terrestrial ecosystems: habitats, plants and wildlife',
      color: '#80C31B',
    },
    {
      id: 11,
      categoryname: 'Soil system',
      color: '#AC6600',
    },
    {
      id: 12,
      categoryname: 'Wildfires',
      color: '#ED3333',
    },
    {
      id: 13,
      categoryname: 'Air quality',
      color: '#CDE1E6',
    },
    {
      id: 14,
      categoryname: 'Human health and public safety',
      color: '#A085C1',
    },
    {
      id: 15,
      categoryname: 'Conflicts',
      color: '#FD71BB',
    },
  ]

  const nuts2static = [
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
    { id: 21, nuts2id: 'DE25', name: 'Mittelfranken' },
    { id: 22, nuts2id: 'CH07', name: 'Ticino' },
    { id: 23, nuts2id: 'AT12', name: 'Niederösterreich' },
    { id: 24, nuts2id: 'AT22', name: 'Steiermark' },
    { id: 25, nuts2id: 'BE22', name: 'Prov. Limburg (BE)' },
    { id: 26, nuts2id: 'ES64', name: 'Ciudad de Melilla' },
    { id: 27, nuts2id: 'FR10', name: 'Ile-de-France' },
    { id: 28, nuts2id: 'BE23', name: 'Prov. Oost-Vlaanderen' },
    { id: 29, nuts2id: 'DE21', name: 'Oberbayern' },
    { id: 30, nuts2id: 'BG41', name: 'Югозападен' },
    { id: 31, nuts2id: 'DE13', name: 'Freiburg' },
    { id: 32, nuts2id: 'ES53', name: 'Illes Balears' },
    { id: 33, nuts2id: 'AT33', name: 'Tirol' },
    { id: 34, nuts2id: 'EL30', name: 'Aττική' },
    { id: 35, nuts2id: 'DE72', name: 'Gießen' },
    { id: 36, nuts2id: 'DED2', name: 'Dresden' },
    { id: 37, nuts2id: 'AT34', name: 'Vorarlberg' },
    {
      id: 38,
      nuts2id: 'BE10',
      name: 'Région de Bruxelles-Capitale/ Brussels Hoofdstedelijk Gewest',
    },
    { id: 39, nuts2id: 'FI1D', name: 'Pohjois- ja Itä-Suomi' },
    { id: 40, nuts2id: 'ES11', name: 'Galicia' },
    { id: 41, nuts2id: 'DEF0', name: 'Schleswig-Holstein' },
    { id: 42, nuts2id: 'BE21', name: 'Prov. Antwerpen' },
    { id: 43, nuts2id: 'BG42', name: 'Южен централен' },
    { id: 44, nuts2id: 'DE71', name: 'Darmstadt' },
    { id: 45, nuts2id: 'PL21', name: 'Małopolskie' },
    { id: 46, nuts2id: 'DE92', name: 'Hannover' },
    { id: 47, nuts2id: 'ITH3', name: 'Veneto' },
    { id: 48, nuts2id: 'ES61', name: 'Andalucía' },
    { id: 49, nuts2id: 'ITH2', name: 'Provincia Autonoma di Trento' },
    { id: 50, nuts2id: 'DE23', name: 'Oberpfalz' },
    { id: 51, nuts2id: 'FRD1', name: 'Basse-Normandie' },
    { id: 52, nuts2id: 'DE73', name: 'Kassel' },
    { id: 53, nuts2id: 'DE40', name: 'Brandenburg' },
    { id: 54, nuts2id: 'DEB1', name: 'Koblenz' },
    { id: 55, nuts2id: 'ITG1', name: 'Sicilia' },
    { id: 56, nuts2id: 'BE31', name: 'Prov. Brabant Wallon' },
    { id: 57, nuts2id: 'CZ08', name: 'Moravskoslezsko' },
    { id: 58, nuts2id: 'CH06', name: 'Zentralschweiz' },
    { id: 59, nuts2id: 'BG32', name: 'Северен централен' },
    { id: 60, nuts2id: 'BE32', name: 'Prov. Hainaut' },
    { id: 61, nuts2id: 'BE33', name: 'Prov. Liège' },
    { id: 62, nuts2id: 'CZ05', name: 'Severovýchod' },
    { id: 63, nuts2id: 'AT32', name: 'Salzburg' },
    { id: 64, nuts2id: 'CH02', name: 'Espace Mittelland' },
    { id: 65, nuts2id: 'CH03', name: 'Nordwestschweiz' },
    { id: 66, nuts2id: 'DE12', name: 'Karlsruhe' },
    { id: 67, nuts2id: 'RO22', name: 'Sud-Est' },
    { id: 68, nuts2id: 'PL72', name: 'Świętokrzyskie' },
    { id: 69, nuts2id: 'DE26', name: 'Unterfranken' },
    { id: 70, nuts2id: 'NL22', name: 'Gelderland' },
    { id: 71, nuts2id: 'PT20', name: 'Região Autónoma dos Açores' },
    { id: 72, nuts2id: 'AL02', name: 'Qender' },
    { id: 73, nuts2id: 'AL03', name: 'Jug' },
    { id: 74, nuts2id: 'FI19', name: 'Länsi-Suomi' },
    { id: 75, nuts2id: 'DK05', name: 'Nordjylland' },
    { id: 76, nuts2id: 'PL51', name: 'Dolnośląskie' },
    { id: 77, nuts2id: 'PL52', name: 'Opolskie' },
    { id: 78, nuts2id: 'PL41', name: 'Wielkopolskie' },
    { id: 79, nuts2id: 'PL42', name: 'Zachodniopomorskie' },
    { id: 80, nuts2id: 'PL43', name: 'Lubuskie' },
    { id: 81, nuts2id: 'PL62', name: 'Warmińsko-mazurskie' },
    { id: 82, nuts2id: 'ITI2', name: 'Umbria' },
    { id: 83, nuts2id: 'CH04', name: 'Zürich' },
    { id: 84, nuts2id: 'CH05', name: 'Ostschweiz' },
    { id: 85, nuts2id: 'BG31', name: 'Северозападен' },
    { id: 86, nuts2id: 'DE22', name: 'Niederbayern' },
    { id: 87, nuts2id: 'DE11', name: 'Stuttgart' },
    { id: 88, nuts2id: 'BE35', name: 'Prov. Namur' },
    { id: 89, nuts2id: 'ES51', name: 'Cataluña' },
    { id: 90, nuts2id: 'ES23', name: 'La Rioja' },
    { id: 91, nuts2id: 'FRB0', name: 'Centre — Val de Loire' },
    { id: 92, nuts2id: 'CZ04', name: 'Severozápad' },
    { id: 93, nuts2id: 'CZ07', name: 'Střední Morava' },
    { id: 94, nuts2id: 'ES62', name: 'Región de Murcia' },
    { id: 95, nuts2id: 'ES63', name: 'Ciudad de Ceuta' },
    { id: 96, nuts2id: 'DE30', name: 'Berlin' },
    { id: 97, nuts2id: 'DE50', name: 'Bremen' },
    { id: 98, nuts2id: 'DEA4', name: 'Detmold' },
    { id: 99, nuts2id: 'ES13', name: 'Cantabria' },
    { id: 100, nuts2id: 'DEA2', name: 'Köln' },
    { id: 101, nuts2id: 'ITG2', name: 'Sardegna' },
    { id: 102, nuts2id: 'ITH1', name: 'Provincia Autonoma di Bolzano/Bozen' },
    { id: 103, nuts2id: 'DEG0', name: 'Thüringen' },
    { id: 104, nuts2id: 'DK01', name: 'Hovedstaden' },
    { id: 105, nuts2id: 'EL54', name: 'Ήπειρος' },
    { id: 106, nuts2id: 'ES42', name: 'Castilla-La Mancha' },
    { id: 107, nuts2id: 'DE60', name: 'Hamburg' },
    { id: 108, nuts2id: 'ES43', name: 'Extremadura' },
    { id: 109, nuts2id: 'NL13', name: 'Drenthe' },
    { id: 110, nuts2id: 'LT02', name: 'Vidurio ir vakarų Lietuvos regionas' },
    { id: 111, nuts2id: 'RS12', name: 'Регион Војводине' },
    { id: 112, nuts2id: 'FRK1', name: 'Auvergne' },
    { id: 113, nuts2id: 'SI04', name: 'Zahodna Slovenija' },
    { id: 114, nuts2id: 'DEC0', name: 'Saarland' },
    { id: 115, nuts2id: 'DEE0', name: 'Sachsen-Anhalt' },
    { id: 116, nuts2id: 'EL65', name: 'Πελοπόννησος' },
    { id: 117, nuts2id: 'EL43', name: 'Κρήτη' },
    { id: 118, nuts2id: 'ES41', name: 'Castilla y León' },
    { id: 119, nuts2id: 'FRI2', name: 'Limousin' },
    { id: 120, nuts2id: 'ITI1', name: 'Toscana' },
    { id: 121, nuts2id: 'PT18', name: 'Alentejo' },
    { id: 122, nuts2id: 'DED5', name: 'Leipzig' },
    { id: 123, nuts2id: 'FI20', name: 'Åland' },
    { id: 124, nuts2id: 'DED4', name: 'Chemnitz' },
    { id: 125, nuts2id: 'FI1B', name: 'Helsinki-Uusimaa' },
    { id: 126, nuts2id: 'FI1C', name: 'Etelä-Suomi' },
    { id: 127, nuts2id: 'EL53', name: 'Δυτική Μακεδονία' },
    { id: 128, nuts2id: 'LI00', name: 'Liechtenstein' },
    { id: 129, nuts2id: 'DEA1', name: 'Düsseldorf' },
    { id: 130, nuts2id: 'EL64', name: 'Στερεά Ελλάδα' },
    { id: 131, nuts2id: 'EL52', name: 'Κεντρική Μακεδονία' },
    { id: 132, nuts2id: 'DEA3', name: 'Münster' },
    { id: 133, nuts2id: 'ES22', name: 'Comunidad Foral de Navarra' },
    { id: 134, nuts2id: 'DE27', name: 'Schwaben' },
    { id: 135, nuts2id: 'PT30', name: 'Região Autónoma da Madeira' },
    { id: 136, nuts2id: 'DK03', name: 'Syddanmark' },
    { id: 137, nuts2id: 'EE00', name: 'Eesti' },
    { id: 138, nuts2id: 'EL41', name: 'Βόρειο Αιγαίο' },
    { id: 139, nuts2id: 'EL42', name: 'Νότιο Αιγαίο' },
    { id: 140, nuts2id: 'PT11', name: 'Norte' },
    { id: 141, nuts2id: 'EL51', name: 'Aνατολική Μακεδονία, Θράκη' },
    { id: 142, nuts2id: 'EL62', name: 'Ιόνια Νησιά' },
    { id: 143, nuts2id: 'EL63', name: 'Δυτική Ελλάδα' },
    { id: 144, nuts2id: 'DE93', name: 'Lüneburg' },
    { id: 145, nuts2id: 'DE24', name: 'Oberfranken' },
    { id: 146, nuts2id: 'DE94', name: 'Weser-Ems' },
    { id: 147, nuts2id: 'DK02', name: 'Sjælland' },
    { id: 148, nuts2id: 'ES52', name: 'Comunitat Valenciana' },
    { id: 149, nuts2id: 'EL61', name: 'Θεσσαλία' },
    { id: 150, nuts2id: 'DEA5', name: 'Arnsberg' },
    { id: 151, nuts2id: 'DE80', name: 'Mecklenburg-Vorpommern' },
    { id: 152, nuts2id: 'DEB3', name: 'Rheinhessen-Pfalz' },
    { id: 153, nuts2id: 'DK04', name: 'Midtjylland' },
    { id: 154, nuts2id: 'DEB2', name: 'Trier' },
    { id: 155, nuts2id: 'ES21', name: 'País Vasco' },
    { id: 156, nuts2id: 'DE91', name: 'Braunschweig' },
    { id: 157, nuts2id: 'ES70', name: 'Canarias' },
    { id: 158, nuts2id: 'NL11', name: 'Groningen' },
    { id: 159, nuts2id: 'LT01', name: 'Sostinės regionas' },
    { id: 160, nuts2id: 'FRL0', name: 'Provence-Alpes-Côte d’Azur' },
    { id: 161, nuts2id: 'FRI3', name: 'Poitou-Charentes' },
    { id: 162, nuts2id: 'PL61', name: 'Kujawsko-pomorskie' },
    { id: 163, nuts2id: 'RS22', name: 'Регион Јужне и Источне Србије' },
    { id: 164, nuts2id: 'SE11', name: 'Stockholm' },
    { id: 165, nuts2id: 'SE12', name: 'Östra Mellansverige' },
    { id: 166, nuts2id: 'PL63', name: 'Pomorskie' },
    { id: 167, nuts2id: 'PL71', name: 'Łódzkie' },
    { id: 168, nuts2id: 'FRF3', name: 'Lorraine' },
    { id: 169, nuts2id: 'ME00', name: 'Црна Гора' },
    { id: 170, nuts2id: 'NL12', name: 'Friesland (NL)' },
    { id: 171, nuts2id: 'PT15', name: 'Algarve' },
    { id: 172, nuts2id: 'RO31', name: 'Sud-Muntenia' },
    { id: 173, nuts2id: 'ITH5', name: 'Emilia-Romagna' },
    { id: 174, nuts2id: 'ITI3', name: 'Marche' },
    { id: 175, nuts2id: 'NL21', name: 'Overijssel' },
    { id: 176, nuts2id: 'FRJ1', name: 'Languedoc-Roussillon' },
    { id: 177, nuts2id: 'HR03', name: 'Jadranska Hrvatska' },
    { id: 178, nuts2id: 'NL42', name: 'Limburg (NL)' },
    { id: 179, nuts2id: 'SE21', name: 'Småland med öarna' },
    { id: 180, nuts2id: 'RO21', name: 'Nord-Est' },
    { id: 181, nuts2id: 'PL84', name: 'Podlaskie' },
    { id: 182, nuts2id: 'FRD2', name: 'Haute-Normandie' },
    { id: 183, nuts2id: 'MK00', name: 'Северна Македонија' },
    { id: 184, nuts2id: 'HU31', name: 'Észak-Magyarország' },
    { id: 185, nuts2id: 'ITH4', name: 'Friuli-Venezia Giulia' },
    { id: 186, nuts2id: 'PT17', name: 'Área Metropolitana de Lisboa' },
    { id: 187, nuts2id: 'NL33', name: 'Zuid-Holland' },
    { id: 188, nuts2id: 'NL23', name: 'Flevoland' },
    { id: 189, nuts2id: 'ITF1', name: 'Abruzzo' },
    { id: 190, nuts2id: 'ITF2', name: 'Molise' },
    { id: 191, nuts2id: 'ITC4', name: 'Lombardia' },
    { id: 192, nuts2id: 'PT16', name: 'Centro (PT)' },
    { id: 193, nuts2id: 'PL22', name: 'Śląskie' },
    { id: 194, nuts2id: 'PL92', name: 'Mazowiecki regionalny' },
    { id: 195, nuts2id: 'LU00', name: 'Luxembourg' },
    { id: 196, nuts2id: 'LV00', name: 'Latvija' },
    { id: 197, nuts2id: 'ITF3', name: 'Campania' },
    { id: 198, nuts2id: 'HR02', name: 'Panonska Hrvatska' },
    { id: 199, nuts2id: 'FRJ2', name: 'Midi-Pyrénées' },
    { id: 200, nuts2id: 'MT00', name: 'Malta' },
    { id: 201, nuts2id: 'NL31', name: 'Utrecht' },
    { id: 202, nuts2id: 'HU11', name: 'Budapest' },
    { id: 203, nuts2id: 'RO12', name: 'Centru' },
    { id: 204, nuts2id: 'FRI1', name: 'Aquitaine' },
    { id: 205, nuts2id: 'FRC1', name: 'Bourgogne' },
    { id: 206, nuts2id: 'RO11', name: 'Nord-Vest' },
    { id: 207, nuts2id: 'NL34', name: 'Zeeland' },
    { id: 208, nuts2id: 'NL32', name: 'Noord-Holland' },
    { id: 209, nuts2id: 'RS21', name: 'Регион Шумадије и Западне Србије' },
    { id: 210, nuts2id: 'NL41', name: 'Noord-Brabant' },
    { id: 211, nuts2id: 'PL82', name: 'Podkarpackie' },
    { id: 212, nuts2id: 'UKM8', name: 'West Central Scotland' },
    { id: 213, nuts2id: 'RO32', name: 'Bucureşti-Ilfov' },
    { id: 214, nuts2id: 'FRK2', name: 'Rhône-Alpes' },
    { id: 215, nuts2id: 'SK02', name: 'Západné Slovensko' },
    { id: 216, nuts2id: 'FRF1', name: 'Alsace' },
    { id: 217, nuts2id: 'SE23', name: 'Västsverige' },
    { id: 218, nuts2id: 'FRM0', name: 'Corse' },
    { id: 219, nuts2id: 'FRE1', name: 'Nord-Pas de Calais' },
    {
      id: 220,
      nuts2id: 'UKJ1',
      name: 'Berkshire, Buckinghamshire and Oxfordshire',
    },
    { id: 221, nuts2id: 'HU22', name: 'Nyugat-Dunántúl' },
    { id: 222, nuts2id: 'SK04', name: 'Východné Slovensko' },
    { id: 223, nuts2id: 'UKM7', name: 'Eastern Scotland' },
    {
      id: 224,
      nuts2id: 'UKG1',
      name: 'Herefordshire, Worcestershire and Warwickshire',
    },
    { id: 225, nuts2id: 'ITC3', name: 'Liguria' },
    { id: 226, nuts2id: 'UKF3', name: 'Lincolnshire' },
    { id: 227, nuts2id: 'UKK3', name: 'Cornwall and Isles of Scilly' },
    { id: 228, nuts2id: 'UKL2', name: 'East Wales' },
    { id: 229, nuts2id: 'UKM5', name: 'North Eastern Scotland' },
    { id: 230, nuts2id: 'UKM6', name: 'Highlands and Islands' },
    { id: 231, nuts2id: 'SK03', name: 'Stredné Slovensko' },
    { id: 232, nuts2id: 'FRE2', name: 'Picardie' },
    { id: 233, nuts2id: 'HU32', name: 'Észak-Alföld' },
    { id: 234, nuts2id: 'ITF4', name: 'Puglia' },
    { id: 235, nuts2id: 'UKC1', name: 'Tees Valley and Durham' },
    { id: 236, nuts2id: 'RS11', name: 'Београдски регион' },
    { id: 237, nuts2id: 'ITC2', name: 'Valle d’Aosta/Vallée d’Aoste' },
    { id: 238, nuts2id: 'IE06', name: 'Eastern and Midland' },
    { id: 239, nuts2id: 'IS00', name: 'Ísland' },
    { id: 240, nuts2id: 'UKG2', name: 'Shropshire and Staffordshire' },
    { id: 241, nuts2id: 'FRG0', name: 'Pays de la Loire' },
    { id: 242, nuts2id: 'UKH3', name: 'Essex' },
    { id: 243, nuts2id: 'PL91', name: 'Warszawski stołeczny' },
    { id: 244, nuts2id: 'RO41', name: 'Sud-Vest Oltenia' },
    { id: 245, nuts2id: 'ITC1', name: 'Piemonte' },
    { id: 246, nuts2id: 'HU23', name: 'Dél-Dunántúl' },
    { id: 247, nuts2id: 'FRC2', name: 'Franche-Comté' },
    { id: 248, nuts2id: 'PL81', name: 'Lubelskie' },
    { id: 249, nuts2id: 'ITI4', name: 'Lazio' },
    { id: 250, nuts2id: 'RO42', name: 'Vest' },
    { id: 251, nuts2id: 'HU12', name: 'Pest' },
    { id: 252, nuts2id: 'ITF5', name: 'Basilicata' },
    { id: 253, nuts2id: 'ITF6', name: 'Calabria' },
    { id: 254, nuts2id: 'UKM9', name: 'Southern Scotland' },
    { id: 255, nuts2id: 'UKH2', name: 'Bedfordshire and Hertfordshire' },
    { id: 256, nuts2id: 'IE05', name: 'Southern' },
    { id: 257, nuts2id: 'UKJ3', name: 'Hampshire and Isle of Wight' },
    { id: 258, nuts2id: 'UKN0', name: 'Northern Ireland' },
    { id: 259, nuts2id: 'SK01', name: 'Bratislavský kraj' },
    { id: 260, nuts2id: 'SI03', name: 'Vzhodna Slovenija' },
    { id: 261, nuts2id: 'HU21', name: 'Közép-Dunántúl' },
    { id: 262, nuts2id: 'SE31', name: 'Norra Mellansverige' },
    { id: 263, nuts2id: 'UKC2', name: 'Northumberland and Tyne and Wear' },
    { id: 264, nuts2id: 'UKE3', name: 'South Yorkshire' },
    { id: 265, nuts2id: 'SE32', name: 'Mellersta Norrland' },
    { id: 266, nuts2id: 'SE33', name: 'Övre Norrland' },
    { id: 267, nuts2id: 'UKD6', name: 'Cheshire' },
    { id: 268, nuts2id: 'UKD7', name: 'Merseyside' },
    { id: 269, nuts2id: 'UKG3', name: 'West Midlands' },
    { id: 270, nuts2id: 'FRF2', name: 'Champagne-Ardenne' },
    { id: 271, nuts2id: 'FRH0', name: 'Bretagne' },
    { id: 272, nuts2id: 'UKH1', name: 'East Anglia' },
    { id: 273, nuts2id: 'UKD1', name: 'Cumbria' },
    { id: 274, nuts2id: 'UKD3', name: 'Greater Manchester' },
    { id: 275, nuts2id: 'UKL1', name: 'West Wales and The Valleys' },
    { id: 276, nuts2id: 'UKJ2', name: 'Surrey, East and West Sussex' },
    { id: 277, nuts2id: 'UKD4', name: 'Lancashire' },
    { id: 278, nuts2id: 'UKE4', name: 'West Yorkshire' },
    { id: 279, nuts2id: 'UKE2', name: 'North Yorkshire' },
    { id: 280, nuts2id: 'HU33', name: 'Dél-Alföld' },
    { id: 281, nuts2id: 'IE04', name: 'Northern and Western' },
    { id: 282, nuts2id: 'UKJ4', name: 'Kent' },
    { id: 283, nuts2id: 'UKK2', name: 'Dorset and Somerset' },
    {
      id: 284,
      nuts2id: 'UKF2',
      name: 'Leicestershire, Rutland and Northamptonshire',
    },
    {
      id: 285,
      nuts2id: 'UKK1',
      name: 'Gloucestershire, Wiltshire and Bristol/Bath area',
    },
    { id: 286, nuts2id: 'UKK4', name: 'Devon' },
    { id: 287, nuts2id: 'SE22', name: 'Sydsverige' },
    {
      id: 288,
      nuts2id: 'UKE1',
      name: 'East Yorkshire and Northern Lincolnshire',
    },
    { id: 289, nuts2id: 'UKF1', name: 'Derbyshire and Nottinghamshire' },
    { id: 290, nuts2id: 'UKI6', name: 'Outer London — South' },
    { id: 291, nuts2id: 'UKI7', name: 'Outer London — West and North West' },
    { id: 292, nuts2id: 'UKI3', name: 'Inner London — West' },
    { id: 293, nuts2id: 'UKI4', name: 'Inner London — East' },
    { id: 294, nuts2id: 'UKI5', name: 'Outer London — East and North East' },
    { id: 295, nuts2id: 'TR81', name: 'Zonguldak, Karabük, Bartın' },
    { id: 296, nuts2id: 'TR82', name: 'Kastamonu, Çankırı, Sinop' },
    { id: 297, nuts2id: 'TR63', name: 'Hatay, Kahramanmaraş, Osmaniye' },
    { id: 298, nuts2id: 'HR05', name: 'Grad Zagreb' },
    { id: 299, nuts2id: 'TR72', name: 'Kayseri, Sivas, Yozgat' },
    { id: 300, nuts2id: 'TRB1', name: 'Malatya, Elazığ, Bingöl, Tunceli' },
    { id: 301, nuts2id: 'TRA1', name: 'Erzurum, Erzincan, Bayburt' },
    { id: 302, nuts2id: 'TRC2', name: 'Şanlıurfa, Diyarbakır' },
    { id: 303, nuts2id: 'TRC3', name: 'Mardin, Batman, Şırnak, Siirt' },
    { id: 304, nuts2id: 'TRB2', name: 'Van, Muş, Bitlis, Hakkari' },
    {
      id: 305,
      nuts2id: 'TR90',
      name: 'Trabzon, Ordu, Giresun, Rize, Artvin, Gümüşhane',
    },
    { id: 306, nuts2id: 'TR83', name: 'Samsun, Tokat, Çorum, Amasya' },
    { id: 307, nuts2id: 'TRA2', name: 'Ağrı, Kars, Iğdır, Ardahan' },
    {
      id: 308,
      nuts2id: 'TR71',
      name: 'Kırıkkale, Aksaray, Niğde, Nevşehir, Kırşehir',
    },
    { id: 309, nuts2id: 'TRC1', name: 'Gaziantep, Adıyaman, Kilis' },
    { id: 310, nuts2id: 'TR33', name: 'Manisa, Afyonkarahisar, Kütahya, Uşak' },
    { id: 311, nuts2id: 'TR41', name: 'Bursa, Eskişehir, Bilecik' },
    { id: 312, nuts2id: 'NO02', name: 'Innlandet' },
    { id: 313, nuts2id: 'NO06', name: 'Trøndelag' },
    { id: 314, nuts2id: 'NO07', name: 'Nord-Norge' },
    { id: 315, nuts2id: 'TR22', name: 'Balıkesir, Çanakkale' },
    { id: 316, nuts2id: 'TR61', name: 'Antalya, Isparta, Burdur' },
    { id: 317, nuts2id: 'TR62', name: 'Adana, Mersin' },
    { id: 318, nuts2id: 'HR06', name: 'Sjeverna Hrvatska' },
    { id: 319, nuts2id: 'TR21', name: 'Tekirdağ, Edirne, Kırklareli' },
    { id: 320, nuts2id: 'TR42', name: 'Kocaeli, Sakarya, Düzce, Bolu, Yalova' },
    { id: 321, nuts2id: 'TR51', name: 'Ankara' },
    { id: 322, nuts2id: 'TR52', name: 'Konya, Karaman' },
    { id: 323, nuts2id: 'TR31', name: 'İzmir' },
    { id: 324, nuts2id: 'TR10', name: 'İstanbul' },
    { id: 325, nuts2id: 'TR32', name: 'Aydın, Denizli, Muğla' },
    { id: 326, nuts2id: 'NO08', name: 'Oslo og Viken' },
    { id: 327, nuts2id: 'NO09', name: 'Agder og Sør-Østlandet' },
    { id: 328, nuts2id: 'NO0A', name: 'Vestlandet' },
  ]

  const NewComponent = () => (
    <div className="impactsWrapper">
      <div className="closeImpactWrapper" onClick={closeImpactsWrapper}>
        close x
      </div>

      {year && (
        <div className="impactsTitle">
          <h1
            style={{
              fontSize: '30px',
              marginBottom: '10px',
              marginTop: '10px',
            }}
          >
            {' '}
            {year}
          </h1>
          {yearAndAmount
            .filter((item) => parseInt(year) === item?.impactYear)
            .map((item, index) => (
              <h2
                key={item?.impactYear + index}
                style={{
                  fontSize: '18px',
                  marginBottom: '20px',
                  marginTop: '10px',
                }}
              >
                {item?.impactAmount} impact{item?.impactAmount > 1 && <>s</>}
              </h2>
            ))}
        </div>
      )}

      {nutsid && (
        <div className="impactsTitle">
          <h1
            style={{
              fontSize: '30px',
              marginBottom: '10px',
              marginTop: '10px',
            }}
          >
            {nutsName}
          </h1>
          <h2
            style={{
              fontSize: '18px',
              marginBottom: '20px',
              marginTop: '10px',
            }}
          >
            {impactAmountByNutsId(nutsid)
              ? impactAmountByNutsId(nutsid) > 1
                ? `${impactAmountByNutsId(nutsid)} impacts`
                : `${impactAmountByNutsId(nutsid)} impact`
              : 'no impacts'}
          </h2>
        </div>
      )}

      <div className="impactsContent">
        {/* year selected */}
        {year && (
          <>
            {impactData &&
              impactData
                .filter((item) => item.Year_start === parseInt(year))
                .map((item, index) => (
                  <div key={item.ID} className="impactsItem">
                    <p>
                      <b>Description</b>
                      <br />
                      {item?.Impact_description}
                    </p>

                    <>
                      {impactCategories
                        .filter((cat) => cat?.id === item?.Impact_category)
                        .map((cat, index) => (
                          <p key={cat.id}>
                            <b>Category</b>
                            <br />
                            {cat.categoryname}
                          </p>
                        ))}
                    </>

                    {item?.NUTS3_ID &&
                      nutsMap.features
                        .filter(
                          (nut) => nut.properties.NUTS_ID === item?.NUTS3_ID
                        )
                        .map((nut, index) => (
                          <p key={index}>
                            <b>Region</b>{' '}
                            <span style={{ fontSize: '12px' }}>
                              (
                              <a
                                href="https://ec.europa.eu/eurostat/web/nuts/background"
                                target="_blank"
                                rel="noreferrer"
                              >
                                NUTS-3
                              </a>
                              )
                            </span>
                            <br />
                            {nut.properties.NUTS_NAME}
                          </p>
                        ))}
                    {!item?.NUTS3_ID &&
                      item?.NUTS2_ID &&
                      nuts2static
                        .filter((nut) => nut.nuts2id === item?.NUTS2_ID)
                        .map((nut, index) => (
                          <p key={nut.id + index}>
                            <b>Region</b>{' '}
                            <span style={{ fontSize: '12px' }}>
                              (
                              <a
                                href="https://ec.europa.eu/eurostat/web/nuts/background"
                                target="_blank"
                                rel="noreferrer"
                              >
                                NUTS-2
                              </a>
                              )
                            </span>
                            <br />
                            {nut.name}
                          </p>
                        ))}
                  </div>
                ))}
          </>
        )}

        {/* click on a region on the map */}
        {nutsid && (
          <>
            {impactData &&
              impactData
                .filter((item) => item.NUTS3_ID === nutsid)
                .reverse()
                .map((item, index) => (
                  <div key={item.ID} className="impactsItem">
                    <p>
                      <b>Description:</b>
                      <br /> {item?.Impact_description}
                    </p>
                    <p>
                      <b>Category:</b>
                      <br />
                      {impactCategories
                        .filter((cat) => cat?.id === item?.Impact_category)
                        .map((cat, index) => (
                          <span key={cat.id}>{cat.categoryname}</span>
                        ))}
                    </p>
                    <p>
                      <b>Year:</b>
                      <br /> {item?.Year_start}
                    </p>
                  </div>
                ))}
          </>
        )}
      </div>
    </div>
  )

  const onClick = useCallback(
    async (event) => {
      const map = mapRef.current.getMap()

      const { features } = event
      const hoveredFeature = features && features[0]
      const clickedNutsid = hoveredFeature
        ? hoveredFeature?.properties?.NUTS_ID
        : null
      const clickedNutsName = hoveredFeature
        ? hoveredFeature?.properties?.NUTS_NAME
        : null
      setNutsName(clickedNutsName)
      setNutsid(clickedNutsid)
      setYear('')

      if (featuredId === null && hoveredFeature) {
        console.log('hadfasdfasfasdf')
        map.setFeatureState(
          { source: 'geojson', id: hoveredFeature.id },
          { hover: true }
        )
      }

      if (featuredId !== null) {
        map.setFeatureState(
          { source: 'geojson', id: featuredId },
          { hover: false }
        )
      }
      if (clickedNutsid !== null) {
        setFeaturedId(hoveredFeature.id)
        map.setFeatureState(
          { source: 'geojson', id: hoveredFeature.id },
          { hover: true }
        )
      }
    },
    [featuredId]
  )

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
      setYear('')
      const map = mapRef.current.getMap()
      map.setFeatureState(
        { source: 'geojson', id: featuredId },
        { hover: false }
      )
    },
    [featuredId]
  )

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
              maxPitch: 85,
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
            onClick={onClick}
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
                click to open impact
                <br />
                <div>NUTS_NAME: {hoverInfo.feature.properties.NUTS_NAME}</div>
                <div>NUTS_ID: {hoverInfo.feature.properties.NUTS_ID}</div>
                {impactAmountByNutsId(hoverInfo.feature.properties.NUTS_ID) && (
                  <>
                    amount:{' '}
                    {impactAmountByNutsId(hoverInfo.feature.properties.NUTS_ID)}
                  </>
                )}
              </div>
            )}
          </Map>
        </div>

        {!nutsid && (
          <div
            className="controlContainer impacts"
            onClick={removeNutsInformation}
          >
            <ControlPanelImpacts
              year={year}
              yearRange={uniqueYears}
              yearAndAmount={yearAndAmount}
              onChange={(value) => setYear(value) + setNutsid(null)}
            />

            <select
              style={{ position: 'relative' }}
              value={year}
              onChange={(evt) => setYear(evt.target.value) + setNutsid(null)}
            >
              {yearAndAmount &&
                yearAndAmount.map((yearitem) => (
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

        {/* 
        <div className="impactsYearRange">
          {yearAndAmount && yearAndAmount.map((yearitem) => (
            <div className={`selectYear${yearitem.impactYear === year ? ` active` : ``}`} key={`year-${yearitem.impactYear}`} onClick={() => setYear(yearitem.impactYear) + setNutsid(null)}>
              <span>{yearitem.impactYear}<br />({yearitem.impactAmount} impacts)</span>
            </div>
          ))
          }
        </div> */}

        {year && <NewComponent />}
        {nutsid && <NewComponent />}
        {!nutsid && !year && (
          <ReportedImpactsIntro headline={introHeadline} text={introText} />
        )}
      </div>
    </Layout>
  )
}
