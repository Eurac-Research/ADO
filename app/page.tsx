import { getAllPosts } from '@/lib/api'
import { fetchDroughtIndexMetadata } from '@/lib/data-fetcher'
import DroughtMonitorClient from './drought-monitor/drought-monitor-client'
import DeferredWelcomeModal from '@/components/DeferredWelcomeModal'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// Keep data fetches immutable between deploys.
export const revalidate = false

// Available indices
const indices = [
  'spei-1',
  'spei-2',
  'spei-3',
  'spei-6',
  'spei-12',
  'spi-1',
  'spi-2',
  'spi-3',
  'spi-6',
  'spi-12',
  'sspi-10',
  'sma',
  'vci',
  'vhi',
]

const DEFAULT_INDEX = 'spei-1'

const ADO_DATA_URL =
  process.env.NEXT_PUBLIC_ADO_DATA_URL ||
  'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface RootPageProps {
  searchParams?: Promise<{
    index?: string | string[]
  }>
}

interface InitialData {
  features: any[]
  staticMetaData: any
  baseGeometry: any // Add base geometry to initial data
  extractedMetadata?: any // Add extracted metadata from GeoJSON files
}

// Pre-fetch initial data including base geometry server-side
async function fetchInitialIndexData(
  index: string
): Promise<InitialData | null> {
  const datatype = index.toUpperCase()

  try {
    const [featuresResponse, metadataResponse, baseGeometryResponse] =
      await Promise.all([
        fetch(
          `https://${ADO_DATA_URL}/json/nuts/${datatype}-latest-features.json`,
          {
            next: { revalidate: false }, // Cache until next build
          }
        ),
        fetch(`https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`, {
          next: { revalidate: false }, // Cache until next build
        }),
        fetch(
          `https://${ADO_DATA_URL}/json/impacts/nuts3_simple_4326.geojson`,
          {
            next: { revalidate: false }, // Cache until next build - this is the big win!
          }
        ),
      ])

    if (
      !featuresResponse.ok ||
      !metadataResponse.ok ||
      !baseGeometryResponse.ok
    ) {
      return null
    }

    const [features, staticMetaData, baseGeometry] = await Promise.all([
      featuresResponse.json(),
      metadataResponse.json(),
      baseGeometryResponse.json(),
    ])

    // Handle the new structure where features are nested under a 'features' property
    const actualFeatures = features.features || features
    const extractedMetadata = features.metadata || null

    return {
      features: actualFeatures,
      staticMetaData,
      baseGeometry,
      extractedMetadata,
    }
  } catch (error) {
    return null
  }
}

function resolveIndexParam(indexParam?: string | string[]): string {
  const raw = Array.isArray(indexParam) ? indexParam[0] : indexParam
  if (!raw) return DEFAULT_INDEX

  const normalized = raw.toLowerCase()
  return indices.includes(normalized) ? normalized : DEFAULT_INDEX
}

async function generateMetadataWithIndex({
  searchParams,
}: RootPageProps): Promise<Metadata> {
  const params = await searchParams
  const selectedIndex = resolveIndexParam(params?.index)
  const selectedIndexUpper = selectedIndex.toUpperCase()
  const canonical =
    selectedIndex === DEFAULT_INDEX ? '/' : `/?index=${selectedIndex}`

  try {
    const metadata = await fetchDroughtIndexMetadata(selectedIndexUpper)
    const title = `${metadata.long_name} - Alpine Drought Observatory | Eurac Research`
    const description =
      metadata.abstract ||
      `Explore current and historical drought conditions for ${selectedIndexUpper} in the Alpine region.`

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        images: ['/og-image.png'],
        url: canonical,
      },
    }
  } catch {
    const title = `${selectedIndexUpper} - Alpine Drought Observatory | Eurac Research`
    const description = `Explore current and historical drought conditions for ${selectedIndexUpper} in the Alpine region.`

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        images: ['/og-image.png'],
        url: canonical,
      },
    }
  }
}

export async function generateMetadata({
  searchParams,
}: RootPageProps): Promise<Metadata> {
  return generateMetadataWithIndex({ searchParams })
}

export default async function RootPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  // Pre-fetch only the initial index for instant first load
  const initialData = await fetchInitialIndexData(DEFAULT_INDEX)

  return (
    <>
      <DeferredWelcomeModal />
      <DroughtMonitorClient
        allPosts={allPosts}
        indices={indices}
        initialIndex={DEFAULT_INDEX}
        initialData={initialData}
      />
    </>
  )
}
