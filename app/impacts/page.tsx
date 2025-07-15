import { getAllPosts } from '@/lib/api'
import { fetchImpactData as fetchImpactDataUtil } from '@/lib/data-fetcher'
import ImpactsClient from './impacts-client'
import type { ImpactData, PostData } from '@/types'
import type { Metadata } from 'next'

// Force static generation
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Impacts - Alpine Drought Observatory | Eurac Research',
  description: 'Explore reported drought impacts across the Alpine region from the EDIIALPS database',
}

export default async function ImpactsPage() {
  try {
    const [impactData, allPosts] = await Promise.all([
      fetchImpactDataUtil(),
      getAllPosts(['title', 'slug']) as PostData[]
    ])

    return (
      <ImpactsClient
        impactData={impactData}
        allPosts={allPosts}
      />
    )
  } catch (error) {
    console.error('Error fetching data:', error)

    // Fallback - get posts and show error state
    const allPosts = getAllPosts(['title', 'slug']) as PostData[]

    return (
      <ImpactsClient
        impactData={[]}
        allPosts={allPosts}
        error="Failed to load impact data. Please try again later."
      />
    )
  }
}
