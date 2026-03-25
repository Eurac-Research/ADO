import { getAllPosts } from '@/lib/api'
import RegionsClient from './regions-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

const ADO_DATA_URL = 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Regions Overview – Alpine Drought Observatory | Eurac Research',
  description:
    'Browse all 272 NUTS-3 regions across the Alpine region with current drought indicator values.',
}

interface RegionEntry {
  id: string
  name: string
  value: number | null
}

export default async function RegionsPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  let regions: RegionEntry[] = []
  let lastDate: string | null = null
  try {
    const res = await fetch(
      `https://${ADO_DATA_URL}/json/nuts/SPEI-3-latest.geojson`,
      { next: { revalidate: false } }
    )
    if (res.ok) {
      const data = await res.json()
      lastDate = data.metadata?.properties?.lastDate ?? null
      regions = data.features.map(
        (f: {
          properties: {
            NUTS_ID: string
            NUTS_NAME: string
            'SPEI-3'?: Record<string, number | null>
          }
        }) => {
          const ts = f.properties['SPEI-3']
          let value: number | null = null
          if (ts && typeof ts === 'object') {
            // Use lastDate from metadata, or fall back to the last key
            const dateKey = lastDate ?? Object.keys(ts).sort().pop()
            if (dateKey) {
              const raw = ts[dateKey]
              value =
                typeof raw === 'number' && Number.isFinite(raw) ? raw : null
            }
          }
          return {
            id: f.properties.NUTS_ID,
            name: f.properties.NUTS_NAME,
            value,
          }
        }
      )
    }
  } catch (error) {
    console.error('Error fetching region data:', error)
  }

  return (
    <RegionsClient regions={regions} allPosts={allPosts} lastDate={lastDate} />
  )
}
