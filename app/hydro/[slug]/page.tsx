import { getAllPosts } from '@/lib/api'
import {
  fetchHydroData as fetchHydroDataUtil,
  fetchHydroMetadata,
  fetchGaugingStations
} from '@/lib/data-fetcher'
import HydroClient from './hydro-client'
import { notFound } from 'next/navigation'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// Force static generation
export const dynamic = 'force-static'

interface HydroPageProps {
  params: Promise<{
    slug: string
  }>
}

const hydroIndices = [
  'spei-1',
  'spei-2',
  'spei-3',
  'spei-6',
  'spei-12',
  'spi-1',
  'spi-3',
  'spi-6',
  'spi-12',
  'sspi-10',
  'sma',
  'vci',
  'vhi',
]

export async function generateStaticParams() {
  return hydroIndices.map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: HydroPageProps): Promise<Metadata> {
  const { slug } = await params

  return {
    title: `${slug.toUpperCase()} - Hydro - Alpine Drought Observatory | Eurac Research`,
    description: `Hydrological drought monitoring with ${slug.toUpperCase()} across the Alpine region`,
  }
}

async function fetchHydroData(datatype: string) {
  const datatypeUpper = datatype.toUpperCase();

  try {
    const [catchmentData, staticMetaData, stationsData] = await Promise.all([
      fetchHydroDataUtil(datatypeUpper),
      fetchHydroMetadata(datatypeUpper),
      fetchGaugingStations()
    ])

    return { staticData: catchmentData, staticMetaData, stationsData }
  } catch (error) {
    console.error('Error fetching hydro data:', error)
    return { staticData: null, staticMetaData: null, stationsData: null, error: 'Failed to load data' }
  }
}

export default async function HydroPage({ params }: HydroPageProps) {
  const { slug } = await params
  const dataSlug = slug || 'spei-1' // Add fallback to spei-1 if no slug is provided

  if (!hydroIndices.includes(dataSlug)) {
    notFound()
  }

  const allPosts = getAllPosts(['title', 'slug']) as PostData[]
  // Always fetch using the provided slug or fallback
  const { staticData, staticMetaData, stationsData, error } = await fetchHydroData(dataSlug)

  // Log the latest date from the metadata and catchment data for debugging
  if (staticData?.metadata?.properties?.lastDate || staticMetaData?.timerange?.properties?.lastDate) {
    // console.log('Available dates in hydro data:', {
    //   lastDateFromCatchment: staticData?.metadata?.properties?.lastDate,
    //   lastDateFromMetadata: staticMetaData?.timerange?.properties?.lastDate,
    //   firstDateFromCatchment: staticData?.metadata?.properties?.firstDate,
    //   firstDateFromMetadata: staticMetaData?.timerange?.properties?.firstDate,
    //   hasCatchmentMetadata: !!staticData?.metadata?.properties,
    // });

    // If the data has features, inspect the date range in the first feature
    if (staticData?.features?.[0]?.properties) {
      const firstFeature = staticData.features[0];
      const dtUpper = dataSlug.toUpperCase();
      if (firstFeature.properties[dtUpper]) {
        const dateKeys = Object.keys(firstFeature.properties[dtUpper]);
        const sortedDates = dateKeys.sort();
        // console.log('Date range in actual feature data:', {
        //   firstDate: sortedDates[0],
        //   lastDate: sortedDates[sortedDates.length - 1],
        //   totalDates: sortedDates.length
        // });
      }
    }
  }

  return (
    <HydroClient
      datatype={dataSlug}
      staticData={staticData}
      staticMetaData={staticMetaData}
      stationsData={stationsData}
      allPosts={allPosts}
      indices={hydroIndices}
      error={error}
    />
  )
}
