import { Suspense } from 'react'
import { getAllPosts } from '@/lib/api'
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

  // Normalize index to lowercase (convention: 'spei-1', not 'SPEI-1')
  const index = rawIndex.toLowerCase()

  // Fetch posts on the server side
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  // Get current date
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

  return {
    title: `${regionId} - ${index.toUpperCase()} | Drought Observatory`,
    description: `Detailed drought analysis for region ${regionId} using ${index.toUpperCase()} index`,
  }
}