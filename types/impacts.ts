export interface ImpactData {
  Year_start: number
  NUTS2_ID: string
  [key: string]: any // For other properties that may exist
}

export interface ImpactCategory {
  id: number
  categoryname: string
  color: string
}

export interface Post {
  title: string
  slug: string
  [key: string]: any // For other properties that may exist
}

export interface ImpactEntry {
  impactYear: number
  impactAmount: number
}

export interface HoverInfo {
  object?: any
  x?: number
  y?: number
  [key: string]: any
}

export interface ImpactsPageProps {
  impactData: ImpactData[]
  allPosts: Post[]
}

export interface ImpactsClientProps {
  impactData: ImpactData[]
  allPosts: Post[]
}
