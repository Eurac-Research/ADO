import { Suspense } from 'react'
import { getAllPosts } from '@/lib/api'
import { getRegionName } from '@/lib/region-names'
import RegionDetail from '@/components/RegionDetail'
import type { PostData } from '@/types'

// Available drought indices
const availableIndices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi'
]

interface PageProps {
  params: Promise<{
    regionId: string
    index: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { regionId, index: rawIndex } = await params
  const index = rawIndex.toLowerCase()
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]
  const day = new Date().toISOString().split('T')[0]

  return (
    <Suspense fallback={<div>Loading region details...</div>}>
      <RegionDetail
        nutsId={regionId}
        datatype={index}
        indices={availableIndices}
        day={day}
        mode="page"
        allPosts={allPosts}
      />
    </Suspense>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { regionId, index: rawIndex } = await params
  const index = rawIndex.toLowerCase()
  const regionName = await getRegionName(regionId)

  return {
    title: `${regionName} – ${index.toUpperCase()} | Alpine Drought Observatory`,
    description: `Drought analysis for ${regionName} (${regionId}) using the ${index.toUpperCase()} index – Alpine Drought Observatory`,
  }
}