import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getAllPosts } from '@/lib/api'
import RegionDetailPage from './region-detail-page'
import type { PostData } from '@/types'

interface PageProps {
  params: Promise<{
    regionId: string
    index: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { regionId, index } = await params

  // Fetch posts on the server side
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  return (
    <Suspense fallback={<div>Loading region details...</div>}>
      <RegionDetailPage regionId={regionId} index={index} allPosts={allPosts} />
    </Suspense>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { regionId, index } = await params

  return {
    title: `${regionId} - ${index} | Drought Observatory`,
    description: `Detailed drought analysis for region ${regionId} using ${index} index`,
  }
}