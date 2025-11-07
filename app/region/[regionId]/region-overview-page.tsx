'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Activity } from 'lucide-react'
import Layout from '@/components/layout'
import RegionDetail from '@/components/RegionDetail'
import type { PostData } from '@/types'
import axios from 'axios'

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

// Available drought indices that can be shown in the chart
const availableIndices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi'
]

interface RegionOverviewPageProps {
  regionId: string
  allPosts: PostData[]
}

export default function RegionOverviewPage({ regionId, allPosts }: RegionOverviewPageProps) {
  const router = useRouter()
  const [regionName, setRegionName] = useState<string>('')
  const [staticMetaData, setStaticMetaData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<string>('spei-1') // Default active index

  // Mock day - in a real app, this might come from URL params or be current date
  const [day] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  useEffect(() => {
    const fetchRegionData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch region name from GeoJSON
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

        // Fetch metadata for the default active index
        const datatype = activeIndex.toUpperCase()
        const metadataUrl = `https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`
        const metadataResponse = await axios.get(metadataUrl)
        setStaticMetaData(metadataResponse.data)

      } catch (fetchError) {
        console.error('Error fetching region data:', fetchError)
        setError('Failed to load region data')
        setRegionName(regionId)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRegionData()
  }, [regionId, activeIndex])

  const handleBackToMap = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <Layout posts={allPosts}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-96">
              <div className="text-lg text-gray-600 dark:text-gray-400">Loading region overview...</div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout posts={allPosts}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 py-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Data</h2>
              <p className="text-red-600 dark:text-red-300">{error}</p>
              <button
                onClick={handleBackToMap}
                className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout posts={allPosts}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleBackToMap}
                className="inline-flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </button>
            </div>

            <div className="flex items-center space-x-3 mb-2">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {regionName}
              </h1>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Region ID: {regionId}</span>
            </div>
          </div>

          {/* Region Detail Component */}
          {staticMetaData && (
            <RegionDetail
              nutsId={regionId}
              nutsName={regionName}
              datatype={activeIndex}
              staticMetaData={staticMetaData}
              indices={availableIndices}
              day={day}
              mode="page"
              className="max-w-6xl mx-auto"
            />
          )}
        </div>
      </div>
    </Layout>
  )
}