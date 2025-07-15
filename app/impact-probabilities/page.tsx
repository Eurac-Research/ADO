import { getAllPosts } from '@/lib/api'
import { fetchImpactProbabilities as fetchImpactProbabilitiesUtil, fetchNutsGeoJSON, monthlyRevalidationOptions } from '@/lib/data-fetcher'
import { Suspense } from 'react'
import ImpactProbabilitiesClient from './impact-probabilities-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// Force this page to be dynamic to handle search params properly
// export const dynamic = 'force-dynamic'

export const dynamic = 'force-static'

// IMPORTANT: Do not use 'force-static' on this page
// This page uses search params (?type=spei|sma) in the client component
// Using force-static would cause router initialization issues with "NextRouter was not mounted" errors
// The server component data is still statically cached with data-fetcher.ts utilities

export const metadata: Metadata = {
  title: 'Impact Probabilities - Alpine Drought Observatory | Eurac Research',
  description: 'Drought impact probabilities across the Alpine region',
}

export default async function ImpactProbabilitiesPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  try {
    const [impactData, nutsMap] = await Promise.all([
      fetchImpactProbabilitiesUtil(),
      fetchNutsGeoJSON('nuts3', monthlyRevalidationOptions)
    ])

    return (
      <Suspense fallback={
        <div className="loading-container">
          <p>Loading impact probabilities data...</p>
        </div>
      }>
        <ImpactProbabilitiesClient
          impactData={impactData}
          nutsMap={nutsMap}
          allPosts={allPosts}
        />
      </Suspense>
    )
  } catch (error) {
    console.error('Error fetching impact probabilities:', error)

    return (
      <Suspense fallback={
        <div className="loading-container">
          <p>Loading impact probabilities data...</p>
        </div>
      }>
        <ImpactProbabilitiesClient
          impactData={[]}
          nutsMap={null}
          allPosts={allPosts}
        // serverError="Failed to load impact probability data. Please try again later."
        />
      </Suspense>
    )
  }
}
