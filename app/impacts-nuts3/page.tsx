import { getAllPosts } from '@/lib/api'
import {
  fetchImpactData as fetchImpactDataUtil,
  fetchNutsGeoJSON,
} from '@/lib/data-fetcher'
import { Suspense } from 'react'
import ImpactsNuts3Client from './impacts-nuts3-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// Force static generation
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Impacts NUTS3 - Alpine Drought Observatory | Eurac Research',
  description:
    'Explore drought impacts across NUTS3 regions in the Alpine Space with interactive maps and detailed regional analysis.',
}

export default async function ImpactsNuts3Page() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  let impactData: any[] = []
  let nutsMap = null

  try {
    ;[impactData, nutsMap] = await Promise.all([
      fetchImpactDataUtil(),
      fetchNutsGeoJSON('nuts3'),
    ])
  } catch (error) {
    console.error('Error fetching impact data:', error)
  }

  return (
    <Suspense fallback={<div>Loading impacts...</div>}>
      <ImpactsNuts3Client
        impactData={impactData}
        allPosts={allPosts}
        nutsMap={nutsMap}
      />
    </Suspense>
  )
}
