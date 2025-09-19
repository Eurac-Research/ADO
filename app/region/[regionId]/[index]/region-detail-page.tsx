'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
import Layout from '@/components/layout'
import RegionDetail from '@/components/RegionDetail'
import axios from 'axios'

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface RegionDetailPageProps {
  regionId: string
  index: string
}

export default function RegionDetailPage({ regionId, index }: RegionDetailPageProps) {
  const router = useRouter()
  const [staticMetaData, setStaticMetaData] = useState<any>(null)
  const [indices, setIndices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [regionName, setRegionName] = useState<string>('')

  // Mock day - in a real app, this might come from URL params or be current date
  const [day] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  useEffect(() => {
    const fetchMetadata = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Convert index to uppercase for the API call (following the same pattern as main page)
        const datatype = index.toUpperCase()

        // Fetch metadata for the index using the correct URL pattern
        const metadataUrl = `https://${ADO_DATA_URL}/json/nuts/metadata/${datatype}.json`
        const metadataResponse = await axios.get(metadataUrl)
        setStaticMetaData(metadataResponse.data)        // For now, we'll set indices as just the current index
        // In a real app, you might want to fetch all available indices
        setIndices([index])

        // Try to get region name from a NUTS mapping or use regionId as fallback
        setRegionName(regionId) // This could be enhanced to fetch actual region names

      } catch (err) {
        console.error('Error fetching metadata:', err)
        setError('Failed to load region data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetadata()
  }, [regionId, index])

  const handleBackToMap = () => {
    router.push(`/${index}?region=${regionId}`)
  }

  if (isLoading) {
    return (
      <Layout posts={[]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading region details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout posts={[]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
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
    <Layout posts={[]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToMap}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Map
              </button>

              <div className="flex items-center gap-2 text-gray-500">
                <span>/</span>
                <MapPin className="w-4 h-4" />
                <span className="font-medium">Region {regionId}</span>
                <span>/</span>
                <span className="font-medium">{index.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 py-8">
          {staticMetaData && (
            <RegionDetail
              nutsId={regionId}
              nutsName={regionName}
              datatype={index}
              staticMetaData={staticMetaData}
              indices={indices}
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