'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Activity } from 'lucide-react'
import Layout from '@/components/layout'
import Link from 'next/link'
import type { PostData } from '@/types'
import axios from 'axios'
import dynamic from 'next/dynamic'

// Dynamic import for TimeSeries to prevent SSR issues
const TimeSeries = dynamic(() => import('@/components/timeseries'), {
  loading: () => <div className="flex items-center justify-center h-96"><p>Loading chart...</p></div>,
  ssr: false,
})

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

// Available drought indices
const availableIndices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi'
]

interface TimeSeriesData {
  date: string
  [key: string]: string | number
}
  {
    id: 'spi-2',
    name: 'SPI-2',
    description: 'Standardized Precipitation Index (2 months)',
    category: 'Meteorological'
  },
  {
    id: 'spi-3',
    name: 'SPI-3',
    description: 'Standardized Precipitation Index (3 months)',
    category: 'Meteorological'
  },
  {
    id: 'spi-6',
    name: 'SPI-6',
    description: 'Standardized Precipitation Index (6 months)',
    category: 'Meteorological'
  },
  {
    id: 'spi-12',
    name: 'SPI-12',
    description: 'Standardized Precipitation Index (12 months)',
    category: 'Meteorological'
  },
  {
    id: 'sspi-10',
    name: 'SSPI-10',
    description: 'Standardized Snow Pack Index (10 days)',
    category: 'Snow'
  },
  {
    id: 'sma',
    name: 'SMA',
    description: 'Soil Moisture Anomaly',
    category: 'Hydrological'
  },
  {
    id: 'vci',
    name: 'VCI',
    description: 'Vegetation Condition Index',
    category: 'Agricultural'
  },
  {
    id: 'vhi',
    name: 'VHI',
    description: 'Vegetation Health Index',
    category: 'Agricultural'
  },
]

interface RegionOverviewPageProps {
  regionId: string
  allPosts: PostData[]
}

export default function RegionOverviewPage({ regionId, allPosts }: RegionOverviewPageProps) {
  const router = useRouter()
  const [regionName, setRegionName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRegionName = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Try to fetch region name from any available GeoJSON file
        // We'll try SPEI-1 first as it's most commonly available
        const geojsonUrl = `https://${ADO_DATA_URL}/json/nuts/SPEI-1-latest.geojson`
        const geojsonResponse = await axios.get(geojsonUrl)
        const region = geojsonResponse.data.features.find((feature: any) =>
          feature.properties.NUTS_ID === regionId
        )
        if (region) {
          setRegionName(region.properties.NUTS_NAME || region.properties.NAME_LATN || regionId)
        } else {
          setRegionName(regionId)
        }
      } catch (geoError) {
        console.warn('Could not fetch region name from GeoJSON:', geoError)
        setRegionName(regionId)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRegionName()
  }, [regionId])

  const handleBackToMap = () => {
    router.push('/')
  }

  const groupedIndices = indices.reduce((acc, index) => {
    if (!acc[index.category]) {
      acc[index.category] = []
    }
    acc[index.category].push(index)
    return acc
  }, {} as Record<string, typeof indices>)

  if (isLoading) {
    return (
      <Layout posts={allPosts}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading region overview...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout posts={allPosts}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header with breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToMap}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Map
              </button>

              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <span>/</span>
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{regionName || regionId}</span>
                <span>/</span>
                <span className="font-medium">All Indices</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-8 mt-20">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {regionName || regionId}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Available drought indices for this region
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Region ID: {regionId}
              </p>
            </div>

            {/* Indices grouped by category */}
            {Object.entries(groupedIndices).map(([category, categoryIndices]) => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {category} Indices
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryIndices.map((index) => (
                    <Link
                      key={index.id}
                      href={`/region/${regionId}/${index.id}`}
                      className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {index.name}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          {index.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {index.description}
                      </p>
                      <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                        View Details →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}