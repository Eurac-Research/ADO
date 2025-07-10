import { getAllPosts } from '@/lib/api'
import DroughtMonitorClient from './drought-monitor-client'
import type { PostData } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Drought Monitor - Alpine Drought Observatory | Eurac Research',
  description: 'Interactive drought monitoring across the Alpine region with multiple drought indices',
}

// Available indices
const indices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi',
]

export default async function DroughtMonitorPage() {
  const allPosts = getAllPosts(['title', 'slug']) as PostData[]

  return (
    <DroughtMonitorClient
      allPosts={allPosts}
      indices={indices}
    />
  )
}
