import React from 'react'

// Impact data types
export interface ImpactData {
  ID: string
  Impact_description: string
  Year_start: number
  NUTS2_ID: string
  NUTS3_ID?: string
  Impact_category: number
  [key: string]: any
}

// Post types for blog/markdown content
export interface PostData {
  title: string
  slug: string
  date?: string
  content?: string
  excerpt?: string
  [key: string]: any
}

// NUTS region types
export interface NutsRegion {
  id: number
  nuts2id: string
  name: string
}

export interface RegionInfo {
  id: string
  name: string
}

// Impact category types
export interface ImpactCategory {
  id: number
  categoryname: string
  color: string
}

// GeoJSON types for map data
export interface NutsProperties {
  NUTS_ID: string
  NUTS_NAME: string
  value?: number
  [key: string]: any
}

export interface NutsFeature {
  type: 'Feature'
  id: number
  properties: NutsProperties
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface NutsGeoJSON {
  type: 'FeatureCollection'
  features: NutsFeature[]
}

// Hover info type for map tooltip
export interface HoverInfo {
  feature: NutsFeature
  x: number
  y: number
  object?: any
  rgbaColor?: string
  [key: string]: any
}

// Year and amount data for timeline
export interface YearAmount {
  impactYear: number
  impactAmount: number
}

// Theme context types
export type Theme = 'light' | 'dark'
export type ThemeContextType = [Theme, (theme: Theme) => void]

// Metadata interface
export interface Metadata {
  short_name?: string
  long_name?: string
  abstract?: string
  factsheet?: string
  doi?: string
  colormap?: {
    legend: {
      stops: Array<[string, string, string]>
    }
    [key: string]: any
  }
  [key: string]: any
}

// Forecast types
export interface ForecastWeek {
  date: string
  week: number
  uncertainty: 'low' | 'medium' | 'high'
  confidence: number
}

// Component prop types
export interface ControlPanelProps {
  day: string
  metadata: Metadata
  firstDay: string
  lastDay: string
  onChange: (value: string) => void
  hideDaySwitchTabs?: boolean
  forecastWeeks?: ForecastWeek[]
  currentIndex?: string
}

export interface ControlPanelImpactsProps {
  year: string
  yearRange: number[]
  yearAndAmount: YearAmount[]
  onChange: (value: string) => void
}

export interface ReportedImpactsIntroProps {
  headline: string
  text: React.ReactNode
}

export interface LayoutProps {
  children: React.ReactNode
  posts: PostData[]
}

export interface SideBarProps {
  posts: PostData[]
  sideBarPositionRelative: number
}

export interface HeaderProps {
  headerModeWithBackground: number
}

// Page props for impacts page
export interface ImpactsPageProps {
  impactData: ImpactData[]
  allPosts: PostData[]
}

export interface ImpactsClientProps {
  impactData: ImpactData[]
  allPosts: PostData[]
}

// Map layer types
export interface MapLayer {
  type: string
  id: string
  paint: {
    [key: string]: any
  }
}

export interface MatchExpression extends Array<any> {
  0: 'match'
  1: Array<string>
}

// Index page types
export interface IndexClientProps {
  datatype: string
  staticData: any
  staticMetaData: any
  allPosts: PostData[]
  indices: string[]
  error?: string
  onIndexChange?: (newIndex: string) => void
  onIndexHover?: (index: string) => Promise<void>
}

export interface IndexPageProps {
  params: {
    slug: string
  }
}

// TimeSeries component types
export interface TimeSeriesData {
  date: string
  [key: string]: string | number
}

export interface TimeSeriesProps {
  data: TimeSeriesData[] | null
  indices: string[]
  index: string
  firstDate: string
  lastDate: string
  metadata?: Metadata
  style?: React.CSSProperties
  compareYears?: boolean
  selectedYears?: number[]
  compareRegions?: boolean
  regionNames?: string[]
  comparisonData?: {
    [regionId: string]: TimeSeriesData[]
  }
  onIndexChange?: (newIndex: string) => void
}


