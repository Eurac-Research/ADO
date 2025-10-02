import { Suspense } from 'react'
import { getAllPosts } from '@/lib/api'
import RegionOverviewPage from './region-overview-page'
import type { PostData } from '@/types'

interface PageProps {
  params: Promise<{
    regionId: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { regionId } = await params

  // Fetch posts on the server side
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  return (
    <Suspense fallback={<div>Loading region overview...</div>}>
      <RegionOverviewPage regionId={regionId} allPosts={allPosts} />
    </Suspense>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { regionId } = await params

  return {
    title: `${regionId} - All Indices | Drought Observatory`,
    description: `Overview of all drought indices for region ${regionId}`,
  }
}