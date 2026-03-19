import type { PostData } from '@/types'
import { getAllPosts } from '@/lib/api'
import {
  fetchDryAlpsDatasetByMode,
  resolveDryAlpsDataMode,
} from '@/lib/dryalps'
import DryAlpsClient from './dryalps-client'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export const metadata = {
  title: 'DryAlps - Alpine Drought Observatory | Eurac Research',
  description:
    'Explore a growing chronology of drought impacts in the Italian Alps, linked to place, sector, timing and supporting news coverage.',
}

interface DryAlpsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DryAlpsPage({ searchParams }: DryAlpsPageProps) {
  try {
    const params = searchParams ? await searchParams : {}
    const sourceParam = Array.isArray(params?.source)
      ? params.source[0]
      : params?.source
    const dataMode = resolveDryAlpsDataMode(sourceParam)
    const [dataset, allPosts] = await Promise.all([
      fetchDryAlpsDatasetByMode(dataMode),
      Promise.resolve(getAllPosts(['title', 'slug']) as PostData[]),
    ])

    return (
      <DryAlpsClient
        dataset={dataset}
        allPosts={allPosts}
        dataMode={dataMode}
      />
    )
  } catch (error) {
    console.error('Error fetching DryAlps data:', error)

    const allPosts = getAllPosts(['title', 'slug']) as PostData[]

    return (
      <DryAlpsClient
        dataset={{ impacts: [], nutsMap: { type: 'FeatureCollection', features: [] } }}
        allPosts={allPosts}
        dataMode={resolveDryAlpsDataMode()}
        error="Failed to load DryAlps data. Please try again later."
      />
    )
  }
}
