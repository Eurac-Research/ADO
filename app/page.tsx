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
  staticData: any
  staticMetaData: any
}

// Pre-fetch only the initial/default index at build time for instant first load
async function fetchInitialIndexData(index: string): Promise<InitialData | null> {
  const datatype = index.toUpperCase()

  try {
    console.log(`Pre-fetching initial index data for ${index} at build time...`)

    const [staticDataResponse, metadataResponse] = await Promise.all([
      fetch(`https://${ADO_DATA_URL}/json/nuts/${datatype}-latest.geojson`, {
        next: { revalidate: false } // Cache until next build
      }),
      fetch(`https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`, {
        next: { revalidate: false } // Cache until next build
      })
    ])

    if (!staticDataResponse.ok || !metadataResponse.ok) {
      console.error(`Failed to fetch initial data for ${index}: ${staticDataResponse.status} / ${metadataResponse.status}`)
      return null
    }

    const [staticData, staticMetaData] = await Promise.all([
      staticDataResponse.json(),
      metadataResponse.json()
    ])

    console.log(`✓ Successfully pre-fetched initial data for ${index}`)
    return { staticData, staticMetaData }
  } catch (error) {
    console.error(`Failed to fetch initial data for ${index}:`, error)
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
    console.error('Failed to fetch metadata for SPEI-1:', error)
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
