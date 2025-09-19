'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-format-parse'
import { X, ExternalLink, Download, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import TimeSeriesLegend from '@/components/timeSeriesLegend'
import dynamic from 'next/dynamic'
import axios from 'axios'

// Dynamic import for TimeSeries to prevent SSR issues
const TimeSeries = dynamic(() => import('@/components/timeseries'), {
  loading: () => <p>Loading...</p>,
  ssr: false,
})

const ADO_DATA_URL = process.env.NEXT_PUBLIC_ADO_DATA_URL || 'raw.githubusercontent.com/Eurac-Research/ado-data/main'

interface RegionDetailProps {
  // Required props
  nutsId: string
  nutsName: string
  datatype: string
  staticMetaData: any
  indices: string[]
  day: string

  // Display mode
  mode?: 'modal' | 'page'

  // Event handlers
  onClose?: () => void

  // Optional styling
  className?: string
}

interface TimeSeriesData {
  date: string
  [key: string]: string | number
}

export default function RegionDetail({
  nutsId,
  nutsName,
  datatype,
  staticMetaData,
  indices,
  day,
  mode = 'modal',
  onClose,
  className = ''
}: RegionDetailProps) {
  const [nutsData, setNutsData] = useState<TimeSeriesData[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [compareYears, setCompareYears] = useState(false)
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // Fetch data for the region
  useEffect(() => {
    const fetchData = async () => {
      if (!nutsId) return

      setIsError(false)
      setIsLoading(true)
      try {
        const url = `https://${ADO_DATA_URL}/json/nuts/timeseries/NUTS3_${nutsId}.json`
        const result = await axios(url)
        setNutsData(result.data)
        
        // Extract available years from the data
        if (result.data && Array.isArray(result.data)) {
          const years = [...new Set(result.data.map((item: TimeSeriesData) => {
            return new Date(item.date).getFullYear()
          }))].sort((a, b) => b - a) // Sort descending (newest first)
          
          setAvailableYears(years)
          
          // Set default selected years (last 3 years)
          const defaultYears = years.slice(0, 3)
          setSelectedYears(defaultYears)
        }
      } catch (error) {
        console.error('Error fetching NUTS data:', error)
        setIsError(true)
      }
      setIsLoading(false)
    }

    fetchData()
  }, [nutsId])

  const containerClasses = mode === 'modal'
    ? "fixed inset-0 z-50 flex items-center justify-center"
    : "w-full min-h-screen"

  const contentClasses = mode === 'modal'
    ? "dataOverlay max-w-4xl max-h-[90vh] overflow-y-auto"
    : "container mx-auto p-6 bg-white rounded-lg shadow-sm"

  return (
    <div className={`${containerClasses} ${className}`} data-name="region-detail">
      {mode === 'modal' && (
        <div className="overlayContainer fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      )}

      <div className={contentClasses}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {nutsName}
            </h1>
            <p className="text-lg text-gray-600 mb-1">
              {datatype} - {staticMetaData?.long_name}
            </p>
            <p className="text-sm text-gray-500">
              Region ID: {nutsId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'modal' && (
              <Link
                href={`/region/${nutsId}/${datatype}`}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title="Open in full page"
              >
                <Maximize2 className="w-4 h-4" />
                Full Page
              </Link>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close region details"
              >
                <X className="w-4 h-4" />
                {mode === 'modal' ? 'Close' : 'Back to Map'}
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">Data Loading Error</h3>
            <p className="text-red-700 text-sm">
              Failed to load data for region {nutsId}. The file {ADO_DATA_URL}/json/timeseries/NUTS3_{nutsId}.json may not be available.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading region data...</span>
          </div>
        )}

        {/* Time Series Controls */}
        {!isLoading && !isError && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Historical Data & Analysis
              </h2>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={compareYears}
                    onChange={(e) => setCompareYears(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Compare by Year</span>
                </label>
              </div>
            </div>

            {/* Year Selection Controls (only show when compare mode is enabled) */}
            {compareYears && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Select Years to Compare:</h3>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map((year) => (
                    <label key={year} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(year)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedYears([...selectedYears, year])
                          } else {
                            setSelectedYears(selectedYears.filter(y => y !== year))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{year}</span>
                    </label>
                  ))}
                </div>
                {selectedYears.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">Please select at least one year to compare.</p>
                )}
              </div>
            )}

            <TimeSeriesLegend />
          </div>
        )}

        {/* Time Series Chart */}
        {!isLoading && !isError && nutsData && (
          <div className="mb-8 bg-gray-50 rounded-lg p-4">
            <TimeSeries
              data={nutsData}
              indices={indices}
              index={datatype}
              metadata={staticMetaData}
              firstDate={format(
                new Date(new Date(day).getTime() - 5 * 365 * 24 * 60 * 60 * 1000),
                'YYYY-MM-DD'
              )}
              lastDate={day}
              compareYears={compareYears}
              selectedYears={selectedYears}
              style={{
                width: '100%',
                height: '400px',
                position: 'relative',
              }}
            />
          </div>
        )}

        {/* Region Information & Resources */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Region Stats */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Region Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-blue-700">NUTS ID:</dt>
                <dd className="font-mono text-blue-900">{nutsId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700">Region Name:</dt>
                <dd className="text-blue-900">{nutsName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700">Current Index:</dt>
                <dd className="text-blue-900">{datatype}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700">Current Date:</dt>
                <dd className="text-blue-900">{day}</dd>
              </div>
            </dl>
          </div>

          {/* Data Resources */}
          {(staticMetaData?.doi || staticMetaData?.factsheet) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Data Resources</h3>
              <div className="space-y-3">
                {staticMetaData?.factsheet && (
                  <a
                    href={staticMetaData.factsheet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download {staticMetaData?.short_name} Factsheet
                  </a>
                )}
                {staticMetaData?.doi && (
                  <a
                    href={staticMetaData.doi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View DOI Reference
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Tools Section (Future Enhancement) */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Coming Soon</h3>
          <p className="text-yellow-700 text-sm">
            Enhanced analysis tools including drought trend analysis, comparison with neighboring regions,
            and downloadable reports will be available in future updates.
          </p>
        </div>
      </div>
    </div>
  )
}