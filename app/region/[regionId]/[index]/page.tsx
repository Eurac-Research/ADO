import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import RegionDetailPage from './region-detail-page'

interface PageProps {
  params: Promise<{
    regionId: string
    index: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { regionId, index } = await params

  return (
    <Suspense fallback={<div>Loading region details...</div>}>
      <RegionDetailPage regionId={regionId} index={index} />
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