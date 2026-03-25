import { getAllPosts } from '@/lib/api'
import { fetchAllVulnerabilityData } from '@/lib/data-fetcher'
import { Suspense } from 'react'
import VulnerabilitiesClient from './vulnerabilities-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Vulnerabilities - Alpine Drought Observatory | Eurac Research',
  description: 'Agricultural vulnerability indicators across the Alpine region',
}

export default async function VulnerabilitiesPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  let vulnerabilityData: any = null
  let nutsMap: any = null

  try {
    const result = await fetchAllVulnerabilityData()
    vulnerabilityData = result.data
    nutsMap = result.nutsMap
  } catch (error) {
    console.error('Error fetching vulnerability data:', error)
  }

  return (
    <Suspense fallback={<div>Loading vulnerabilities...</div>}>
      <VulnerabilitiesClient
        vulnerabilityData={vulnerabilityData}
        nutsMap={nutsMap}
        allPosts={allPosts}
      />
    </Suspense>
  )
}
