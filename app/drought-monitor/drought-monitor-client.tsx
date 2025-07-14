'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import IndexClient from '../[slug]/index-client'
import Layout from '@/components/layout'
import type { PostData } from '@/types'

interface DroughtMonitorClientProps {
  allPosts: PostData[]
  indices: string[]
  initialIndex?: string
  initialData?: {
    staticData: any
    staticMetaData: any
  } | null
}

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

function DroughtMonitorContent({
  allPosts,
  indices,
  initialIndex = 'spei-1',
  initialData = null
}: DroughtMonitorClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get initial index from props or URL params
  const urlIndex = searchParams.get('index')
  const startingIndex = urlIndex || initialIndex
  const [currentIndex, setCurrentIndex] = useState(startingIndex)

  // Initialize cache with pre-fetched initial data
  const [dataCache, setDataCache] = useState<Map<string, { staticData: any, staticMetaData: any }>>(
    () => {
      const initialCache = new Map()

      // Pre-populate cache with initial data if available
      if (initialData && startingIndex === 'spei-1') {
        initialCache.set('spei-1', initialData)
      }

      return initialCache
    }
  )

  const [loadingIndex, setLoadingIndex] = useState<string | null>(null)

  // Fetch data for a specific index with browser caching
  const fetchIndexData = useCallback(async (index: string) => {
    const datatype = index.toUpperCase()

    try {
      const [staticDataResponse, metadataResponse] = await Promise.all([
        fetch(`https://${ADO_DATA_URL}/json/nuts/${datatype}-latest.geojson`, {
          // Let browser handle caching - don't force reload
          cache: 'default'
        }),
        fetch(`https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`, {
          cache: 'default'
        })
      ])

      if (!staticDataResponse.ok || !metadataResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [staticData, staticMetaData] = await Promise.all([
        staticDataResponse.json(),
        metadataResponse.json()
      ])

      return { staticData, staticMetaData }
    } catch (error) {
      return null
    }
  }, [])

  // Optional: Prefetch related indices (same type, different periods)
  const prefetchRelatedIndices = useCallback(async (baseIndex: string) => {
    const baseType = baseIndex.split('-')[0] // e.g., 'spei' from 'spei-1'
    const relatedIndices = indices.filter(idx =>
      idx.startsWith(baseType) && idx !== baseIndex && !dataCache.has(idx)
    ).slice(0, 2) // Only prefetch 2 most related ones

    for (const relatedIndex of relatedIndices) {
      if (loadingIndex !== relatedIndex) {
        const data = await fetchIndexData(relatedIndex)
        if (data) {
          setDataCache(prev => new Map(prev).set(relatedIndex, data))
        }
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }, [indices, dataCache, loadingIndex, fetchIndexData])

  // Load data for current index (only if not cached)
  useEffect(() => {
    const loadData = async () => {
      if (dataCache.has(currentIndex)) {
        return // Data already cached
      }

      setLoadingIndex(currentIndex)
      const data = await fetchIndexData(currentIndex)

      if (data) {
        setDataCache(prev => new Map(prev).set(currentIndex, data))
      }
      setLoadingIndex(null)
    }

    loadData()
  }, [currentIndex, dataCache, fetchIndexData])

  // Prefetch related indices after initial load (much smarter than prefetching all)
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchRelatedIndices(currentIndex)
    }, 2000) // Wait 2 seconds after initial load
    return () => clearTimeout(timer)
  }, [currentIndex, prefetchRelatedIndices])

  // Smart prefetching - only prefetch on hover + related indices
  const handleIndexHover = useCallback(async (index: string) => {
    // Only prefetch if not already cached and not currently loading
    if (!dataCache.has(index) && loadingIndex !== index) {
      const data = await fetchIndexData(index)
      if (data) {
        setDataCache(prev => new Map(prev).set(index, data))
      }
    }
  }, [dataCache, loadingIndex, fetchIndexData])

  // Handle index change
  const handleIndexChange = useCallback((newIndex: string) => {
    setCurrentIndex(newIndex)
    // Update URL without triggering a page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('index', newIndex)
    router.replace(`/?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Get current data
  const currentData = dataCache.get(currentIndex)
  const isLoading = !currentData && loadingIndex === currentIndex

  if (isLoading) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p>Please wait while we fetch the {currentIndex.toUpperCase()} data.</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!currentData) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error Loading Data</h1>
            <p>Failed to load data for {currentIndex.toUpperCase()}. Please try again.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <IndexClient
      datatype={currentIndex.toUpperCase()}
      staticData={currentData.staticData}
      staticMetaData={currentData.staticMetaData}
      allPosts={allPosts}
      indices={indices}
      onIndexChange={handleIndexChange}
      onIndexHover={handleIndexHover}
    />
  )
}

export default function DroughtMonitorClient({
  allPosts,
  indices,
  initialIndex,
  initialData
}: DroughtMonitorClientProps) {
  return (
    <Suspense fallback={
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p>Please wait while we load the drought monitor.</p>
          </div>
        </div>
      </Layout>
    }>
      <DroughtMonitorContent
        allPosts={allPosts}
        indices={indices}
        initialIndex={initialIndex}
        initialData={initialData}
      />
    </Suspense>
  )
}
