// Impact data types
export interface ImpactData {
  ID: string;
  Impact_description: string;
  Year_start: number;
  NUTS2_ID: string;
  NUTS3_ID?: string;
  Impact_category: number;
}

// Post types for blog/markdown content
export interface PostData {
  title: string;
  slug: string;
  date?: string;
  content?: string;
  excerpt?: string;
}

// NUTS region types
export interface NutsRegion {
  id: number;
  nuts2id: string;
  name: string;
}

// Impact category types
export interface ImpactCategory {
  id: number;
  categoryname: string;
  color: string;
}

// GeoJSON types for map data
export interface NutsProperties {
  NUTS_ID: string;
  NUTS_NAME: string;
}

export interface NutsFeature {
  type: 'Feature';
  id: number;
  properties: NutsProperties;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface NutsGeoJSON {
  type: 'FeatureCollection';
  features: NutsFeature[];
}

// Hover info type for map tooltip
export interface HoverInfo {
  feature: NutsFeature;
  x: number;
  y: number;
}

// Year and amount data for timeline
export interface YearAmount {
  impactYear: number;
  impactAmount: number;
}

// Theme context types
export type Theme = 'light' | 'dark';
export type ThemeContextType = [Theme, (theme: Theme) => void];

// Component prop types
export interface ControlPanelImpactsProps {
  year: string;
  yearRange: number[];
  yearAndAmount: YearAmount[];
  onChange: (value: string) => void;
}

export interface ReportedImpactsIntroProps {
  headline: string;
  text: React.ReactNode;
}

export interface LayoutProps {
  children: React.ReactNode;
  posts: PostData[];
}

// Page props for impacts page
export interface ImpactsPageProps {
  impactData: ImpactData[];
  allPosts: PostData[];
}

// Map layer types
export interface MapLayer {
  type: string;
  id: string;
  paint: {
    [key: string]: any;
  };
}

export interface MatchExpression extends Array<any> {
  0: 'match';
  1: Array<string>;
}

// Additional types for index pages
export interface IndexClientProps {
  datatype: string
  staticData: any
  staticMetaData: any
  allPosts: PostData[]
  indices: string[]
  error?: string
}

export interface IndexPageProps {
  params: {
    slug: string
  }
}


