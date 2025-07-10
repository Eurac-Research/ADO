import { getAllPosts } from '@/lib/api'
import { fetchDroughtIndexMetadata } from '@/lib/data-fetcher'
import DroughtMonitorClient from './drought-monitor/drought-monitor-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// Force static generation
export const dynamic = 'force-static'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const index = typeof params.index === 'string' ? params.index : 'spei-1'
  const datatype = index.toUpperCase()

  try {
    const metadata = await fetchDroughtIndexMetadata(datatype)
    return {
      title: `${metadata.long_name} - Alpine Drought Observatory | Eurac Research`,
      description: 'The Alpine Drought Observatory (ADO) provides a tool for an easy overview of the current drought situation and past drought situations in the last 40 years.',
    }
  } catch (error) {
    console.error('Failed to fetch metadata:', error)
  }

  return {
    title: `${datatype} - Alpine Drought Observatory | Eurac Research`,
    description: 'Interactive drought monitoring across the Alpine region with multiple drought indices',
  }
}

// Available indices
const indices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi',
]

export default async function RootPage({ searchParams }: PageProps) {
  const params = await searchParams
  const index = typeof params.index === 'string' ? params.index : 'spei-1'

  // Validate the index
  if (!indices.includes(index)) {
    redirect('/?index=spei-1')
  }

  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  return (
    <DroughtMonitorClient
      allPosts={allPosts}
      indices={indices}
      initialIndex={index}
    />
  )
}
