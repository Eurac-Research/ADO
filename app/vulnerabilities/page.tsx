import { getAllPosts } from '@/lib/api'
import { fetchAllVulnerabilityData } from '@/lib/data-fetcher'
import { Suspense } from 'react'
import VulnerabilitiesClient from './vulnerabilities-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

// // Force this page to be dynamic to handle search params properly
// export const dynamic = 'force-dynamic'

// IMPORTANT: Do not use 'force-static' on this page
// This page uses search params (?type=farm_size|livestock_density|etc) in the client component
// Using force-static would cause router initialization issues with "NextRouter was not mounted" errors
// The server component data is still statically cached with data-fetcher.ts utilities

export const metadata: Metadata = {
  title: 'Vulnerabilities - Alpine Drought Observatory | Eurac Research',
  description: 'Agricultural vulnerability indicators across the Alpine region',
}

export default async function VulnerabilitiesPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  try {
    const result = await fetchAllVulnerabilityData()

    return (
      <Suspense fallback={<div>Loading vulnerabilities...</div>}>
        <VulnerabilitiesClient
          vulnerabilityData={result.data}
          nutsMap={result.nutsMap}
          allPosts={allPosts}
        />
      </Suspense>
    )
  } catch (error) {
    console.error('Error fetching vulnerability data:', error)

    return (
      <Suspense fallback={<div>Loading vulnerabilities...</div>}>
        <VulnerabilitiesClient
          vulnerabilityData={null}
          nutsMap={null}
          allPosts={allPosts}
        />
      </Suspense>
    )
  }
}
