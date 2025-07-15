import { getAllPosts } from '@/lib/api'
import { fetchDroughtIndexMetadata } from '@/lib/data-fetcher'
import DroughtMonitorClient from './drought-monitor/drought-monitor-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// Force static generation
export const dynamic = 'force-static'
export const revalidate = false // Cache until next build

// Available indices
const indices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi',
]

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface InitialData {
  features: any[]
  staticMetaData: any
  baseGeometry: any // Add base geometry to initial data
  extractedMetadata?: any // Add extracted metadata from GeoJSON files
}

// Pre-fetch initial data including base geometry server-side
async function fetchInitialIndexData(index: string): Promise<InitialData | null> {
  const datatype = index.toUpperCase()

  try {
    const [featuresResponse, metadataResponse, baseGeometryResponse] = await Promise.all([
      fetch(`https://${ADO_DATA_URL}/json/nuts/${datatype}-latest-features.json`, {
        next: { revalidate: false } // Cache until next build
      }),
      fetch(`https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`, {
        next: { revalidate: false } // Cache until next build
      }),
      fetch(`https://${ADO_DATA_URL}/json/impacts/nuts3_simple_4326.geojson`, {
        next: { revalidate: false } // Cache until next build - this is the big win!
      })
    ])

    if (!featuresResponse.ok || !metadataResponse.ok || !baseGeometryResponse.ok) {
      return null
    }

    const [features, staticMetaData, baseGeometry] = await Promise.all([
      featuresResponse.json(),
      metadataResponse.json(),
      baseGeometryResponse.json()
    ])

    // Handle the new structure where features are nested under a 'features' property
    const actualFeatures = features.features || features
    const extractedMetadata = features.metadata || null

    return {
      features: actualFeatures,
      staticMetaData,
      baseGeometry,
      extractedMetadata
    }
  } catch (error) {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // Pre-fetch metadata for the default index to generate better metadata
  try {
    const metadata = await fetchDroughtIndexMetadata('SPEI-1')
    return {
      title: `${metadata.long_name} - Alpine Drought Observatory | Eurac Research`,
      description: 'The Alpine Drought Observatory (ADO) provides a tool for an easy overview of the current drought situation and past drought situations in the last 40 years.',
    }
  } catch (error) {
    // Fallback metadata if fetch fails
  }

  return {
    title: 'Alpine Drought Observatory | Eurac Research',
    description: 'Interactive drought monitoring across the Alpine region with multiple drought indices',
  }
}

export default async function RootPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  // Pre-fetch only the initial index for instant first load
  const initialData = await fetchInitialIndexData('spei-1')

  return (
    <DroughtMonitorClient
      allPosts={allPosts}
      indices={indices}
      initialIndex="spei-1"
      initialData={initialData}
    />
  )
}
