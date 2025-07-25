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
    features: any[]
    staticMetaData: any
    baseGeometry: any // Add baseGeometry here
    extractedMetadata?: any // Add extracted metadata
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
  const [dataCache, setDataCache] = useState<Map<string, { features: any[], staticMetaData: any, extractedMetadata?: any }>>(
    () => {
      const initialCache = new Map()

      // Pre-populate cache with initial data if available
      if (initialData && startingIndex === 'spei-1') {
        // Initial data already contains features in the correct format
        initialCache.set('spei-1', {
          features: initialData.features,
          staticMetaData: initialData.staticMetaData,
          extractedMetadata: initialData.extractedMetadata
        })
      }

      return initialCache
    }
  )

  const [loadingIndex, setLoadingIndex] = useState<string | null>(null)

  // Use server-provided base geometry instead of fetching client-side
  const [baseGeometry, setBaseGeometry] = useState<any>(initialData?.baseGeometry || null)
  const [baseGeometryLoaded, setBaseGeometryLoaded] = useState(!!initialData?.baseGeometry)

  // Fetch data for a specific index - only the feature values
  const fetchIndexData = useCallback(async (index: string) => {
    const datatype = index.toUpperCase()

    try {
      const [featuresResponse, metadataResponse] = await Promise.all([
        fetch(`https://${ADO_DATA_URL}/json/nuts/${datatype}-latest-features.json`, {
          cache: 'force-cache',
          next: { revalidate: false }
        }),
        fetch(`https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`, {
          cache: 'force-cache',
          next: { revalidate: false }
        })
      ])

      if (!featuresResponse.ok || !metadataResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const [features, staticMetaData] = await Promise.all([
        featuresResponse.json(),
        metadataResponse.json()
      ])

      // Handle the new structure where features are nested under a 'features' property
      const actualFeatures = features.features || features
      const extractedMetadata = features.metadata || null

      return {
        features: actualFeatures,
        staticMetaData,
        extractedMetadata
      }
    } catch (error) {
      return null
    }
  }, [])

  // Merge geometry with feature data
  const mergeGeometryWithFeatures = useCallback((features: any[], geometry: any) => {
    if (!geometry || !features) return null

    // Create a lookup map for features by NUTS_ID
    const featureMap = new Map()
    features.forEach(feature => {
      if (feature.NUTS_ID) {
        featureMap.set(feature.NUTS_ID, feature)
      }
    })

    // Merge geometry with feature data
    const mergedFeatures = geometry.features.map((geoFeature: any) => {
      const nutsId = geoFeature.properties.NUTS_ID
      const featureData = featureMap.get(nutsId)

      return {
        ...geoFeature,
        properties: {
          ...geoFeature.properties,
          ...featureData
        }
      }
    })

    return {
      ...geometry,
      features: mergedFeatures
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
  const isLoading = (!currentData && loadingIndex === currentIndex) || !baseGeometryLoaded

  // Merge geometry with current data when both are available
  const mergedStaticData = currentData && baseGeometry
    ? mergeGeometryWithFeatures(currentData.features, baseGeometry)
    : null

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

  if (!currentData || !mergedStaticData) {
    return (
      <Layout posts={allPosts}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Error Loading Data</h1>
            <p>Failed to load data for {currentIndex.toUpperCase()}. Please try again.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <IndexClient
      datatype={currentIndex.toUpperCase()}
      staticData={mergedStaticData}
      staticMetaData={currentData.staticMetaData}
      extractedMetadata={currentData.extractedMetadata}
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
