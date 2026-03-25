import { getAllPosts } from '@/lib/api'
import {
  fetchImpactData as fetchImpactDataUtil,
  fetchNutsGeoJSON,
} from '@/lib/data-fetcher'
import ImpactsClient from './impacts-client'
import type { ImpactData, PostData } from '@/types'
import type { Metadata } from 'next'

// Force static generation
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Impacts - Alpine Drought Observatory | Eurac Research',
  description:
    'Explore reported drought impacts across the Alpine region from the EDIIALPS database',
}

export default async function ImpactsPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  let impactData: ImpactData[] = []
  let nutsMap = null
  let error: string | undefined

  try {
    ;[impactData, nutsMap] = await Promise.all([
      fetchImpactDataUtil(),
      fetchNutsGeoJSON('nuts2'),
    ])
  } catch (e) {
    console.error('Error fetching data:', e)
    error = 'Failed to load impact data. Please try again later.'
  }

  return (
    <ImpactsClient
      impactData={impactData}
      allPosts={allPosts}
      nutsMap={nutsMap}
      error={error}
    />
  )
}
