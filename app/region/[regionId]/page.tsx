import { Suspense } from 'react'
import { getAllPosts } from '@/lib/api'
import { getRegionName } from '@/lib/region-names'
import {
  fetchDroughtIndexMetadata,
  fetchRegionTimeseries,
} from '@/lib/data-fetcher'
import RegionDetail from '@/components/RegionDetail'
import type { PostData } from '@/types'
import {
  getIndexDescription,
  getRegionDatasetJsonLd,
  serializeJsonLd,
} from '@/lib/region-dataset'

// Available drought indices
const availableIndices = [
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

interface PageProps {
  params: Promise<{
    regionId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { regionId } = await params

  // Fetch posts on the server side
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  // Get current date
  const day = new Date().toISOString().split('T')[0]
  const index = 'spei-1'
  const [regionName, staticMetaData, timeSeries] = await Promise.all([
    getRegionName(regionId),
    fetchDroughtIndexMetadata(index).catch(() => null),
    fetchRegionTimeseries(regionId).catch(() => []),
  ])
  const dates = timeSeries
    .map((row) => row.date)
    .filter((date): date is string => Boolean(date))
    .sort()
  const jsonLd = getRegionDatasetJsonLd({
    regionId,
    regionName,
    index,
    timeCoverage: { startDate: dates[0], endDate: dates.at(-1) },
    metadata: staticMetaData,
  })

  // Use default index (spei-1) when no index is specified
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Suspense fallback={<div>Loading region details...</div>}>
        <RegionDetail
          nutsId={regionId}
          nutsName={regionName}
          staticMetaData={staticMetaData}
          datatype={index}
          indices={availableIndices}
          day={day}
          mode="page"
          allPosts={allPosts}
        />
      </Suspense>
      <section className="container mx-auto px-2 sm:px-4 pb-8" aria-label="Dataset description">
        <div className="max-w-6xl mx-auto rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <p>
            <strong>SPEI-1 drought data for {regionName}</strong>.{' '}
            {getIndexDescription(index, staticMetaData)} This regional dataset covers {regionName} ({regionId}) in the Alpine region.
          </p>
          {dates[0] && dates.at(-1) && (
            <p className="mt-1">Time coverage: {dates[0]} to {dates.at(-1)}.</p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a className="text-blue-600 hover:underline dark:text-blue-400" href={`/api/nuts/timeseries/${encodeURIComponent(regionId)}?format=json`}>Download JSON data</a>
            <a className="text-blue-600 hover:underline dark:text-blue-400" href={`/api/nuts/timeseries/${encodeURIComponent(regionId)}?format=csv`}>Download CSV data</a>
            {staticMetaData?.factsheet && <a className="text-blue-600 hover:underline dark:text-blue-400" href={staticMetaData.factsheet}>Factsheet</a>}
            {staticMetaData?.doi && <a className="text-blue-600 hover:underline dark:text-blue-400" href={staticMetaData.doi}>DOI</a>}
          </p>
        </div>
      </section>
    </>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { regionId } = await params

  const regionName = await getRegionName(regionId)

  return {
    title: `${regionName} – SPEI-1 | Alpine Drought Observatory`,
    description: `Drought analysis for ${regionName} (${regionId}) using the SPEI-1 index – Alpine Drought Observatory`,
  }
}
