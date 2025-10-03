'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-format-parse'
import { X, ExternalLink, Download, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import TimeSeriesLegend from '@/components/timeSeriesLegend'
import dynamic from 'next/dynamic'
import axios from 'axios'
import type { RegionInfo } from '@/types'

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

  // Region comparison state
  const [compareRegions, setCompareRegions] = useState(false)
  const [selectedComparisonRegion, setSelectedComparisonRegion] = useState<string | null>(null)
  const [comparisonRegionData, setComparisonRegionData] = useState<TimeSeriesData[] | null>(null)
  const [availableRegions, setAvailableRegions] = useState<RegionInfo[]>([])
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)

  // Function to download data as CSV
  const downloadCSV = useCallback(() => {
    if (!nutsData) return

    // Create CSV header
    const headers = ['date', ...indices.map(idx => idx.toUpperCase())]
    const csvContent = [
      headers.join(','),
      ...nutsData.map(row => {
        return [
          row.date,
          ...indices.map(idx => row[idx] !== undefined && row[idx] !== null ? row[idx] : '')
        ].join(',')
      })
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${nutsId}_${datatype}_timeseries.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [nutsData, nutsId, datatype, indices])

  // Function to download data as JSON
  const downloadJSON = useCallback(() => {
    if (!nutsData) return

    const jsonContent = JSON.stringify({
      region: {
        nutsId,
        nutsName,
        datatype
      },
      metadata: staticMetaData,
      data: nutsData
    }, null, 2)

    // Create blob and download
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${nutsId}_${datatype}_timeseries.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [nutsData, nutsId, nutsName, datatype, staticMetaData])

  // Function to extract available regions from GeoJSON
  const fetchAvailableRegions = useCallback(async () => {
    try {
      const response = await fetch(`https://${ADO_DATA_URL}/json/nuts/${datatype.toUpperCase()}-latest.geojson`)
      const geojson = await response.json()

      const regions: RegionInfo[] = geojson.features
        .map((feature: any) => ({
          id: feature.properties.NUTS_ID,
          name: feature.properties.NUTS_NAME || feature.properties.NAME_LATN
        }))
        .filter((region: RegionInfo) => region.id !== nutsId) // Exclude current region
        .sort((a: RegionInfo, b: RegionInfo) => a.name.localeCompare(b.name))

      setAvailableRegions(regions)
    } catch (error) {
      console.error('Error fetching available regions:', error)
    }
  }, [datatype, nutsId])

  // Function to fetch comparison region data
  const fetchComparisonRegionData = useCallback(async (regionId: string) => {
    setIsLoadingComparison(true)
    try {
      const url = `https://${ADO_DATA_URL}/json/nuts/timeseries/NUTS3_${regionId}.json`
      const result = await axios(url)
      setComparisonRegionData(result.data)
    } catch (error) {
      console.error('Error fetching comparison region data:', error)
      setComparisonRegionData(null)
    }
    setIsLoadingComparison(false)
  }, [])

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

  // Load available regions when comparison mode is enabled
  useEffect(() => {
    if (compareRegions && availableRegions.length === 0) {
      fetchAvailableRegions()
    }
  }, [compareRegions, availableRegions.length, fetchAvailableRegions])

  // Fetch comparison data when a region is selected
  useEffect(() => {
    if (selectedComparisonRegion) {
      fetchComparisonRegionData(selectedComparisonRegion)
    } else {
      setComparisonRegionData(null)
    }
  }, [selectedComparisonRegion, fetchComparisonRegionData])

  const containerClasses = mode === 'modal'
    ? "fixed inset-0 z-50 flex items-center justify-center"
    : "w-full min-h-screen"

  const contentClasses = mode === 'modal'
    ? "dataOverlay max-w-4xl max-h-[90vh] overflow-y-auto"
    : "container mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm"

  return (
    <div className={`${containerClasses} ${className}`} data-name="region-detail">
      {mode === 'modal' && (
        <div className="overlayContainer fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      )}

      <div className={contentClasses}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {nutsName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">
              {datatype} - {staticMetaData?.long_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                className="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 dark:text-red-300 font-medium mb-2">Data Loading Error</h3>
            <p className="text-red-700 dark:text-red-400 text-sm">
              Failed to load data for region {nutsId}. The file {ADO_DATA_URL}/json/timeseries/NUTS3_{nutsId}.json may not be available.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading region data...</span>
          </div>
        )}

        {/* Time Series Controls */}
        {!isLoading && !isError && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Historical Data & Analysis
              </h2>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2" title={compareRegions ? "Disabled: Region comparison is active" : ""}>
                  <input
                    type="checkbox"
                    checked={compareYears}
                    disabled={compareRegions}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Disable region comparison when enabling year comparison
                        setCompareRegions(false)
                        setSelectedComparisonRegion(null)
                        setComparisonRegionData(null)
                      } else {
                        // Reset to default years when disabling year comparison
                        const defaultYears = availableYears.slice(0, 3)
                        setSelectedYears(defaultYears)
                      }
                      setCompareYears(e.target.checked)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${compareRegions ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Compare by Year
                  </span>
                </label>

                <label className="flex items-center gap-2" title={compareYears ? "Disabled: Year comparison is active" : ""}>
                  <input
                    type="checkbox"
                    checked={compareRegions}
                    disabled={compareYears}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Disable year comparison when enabling region comparison
                        setCompareYears(false)
                        // Reset to default years when switching modes
                        const defaultYears = availableYears.slice(0, 3)
                        setSelectedYears(defaultYears)
                      } else {
                        // Clear region comparison data when disabling region comparison
                        setSelectedComparisonRegion(null)
                        setComparisonRegionData(null)
                      }
                      setCompareRegions(e.target.checked)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className={`text-sm ${compareYears ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Compare with Region
                  </span>
                </label>
              </div>
            </div>

            {/* Region Selection Controls (only show when compare mode is enabled) */}
            {compareRegions && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select Region to Compare:</h3>
                <div className="space-y-3">
                  <select
                    value={selectedComparisonRegion || ''}
                    onChange={(e) => setSelectedComparisonRegion(e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoadingComparison}
                  >
                    <option value="">Select a region...</option>
                    {availableRegions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name} ({region.id})
                      </option>
                    ))}
                  </select>

                  {isLoadingComparison && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading comparison data...</p>
                  )}

                  {selectedComparisonRegion && !isLoadingComparison && !comparisonRegionData && (
                    <p className="text-sm text-red-500 dark:text-red-400">Failed to load data for selected region.</p>
                  )}

                  {selectedComparisonRegion && comparisonRegionData && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Loaded data for {availableRegions.find(r => r.id === selectedComparisonRegion)?.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Year Selection Controls (only show when compare mode is enabled) */}
            {compareYears && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Select Years to Compare:</h3>
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
                      <span className="text-gray-700 dark:text-gray-300">{year}</span>
                    </label>
                  ))}
                </div>
                {selectedYears.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please select at least one year to compare.</p>
                )}
              </div>
            )}

            <TimeSeriesLegend />
          </div>
        )}

        {/* Time Series Chart */}
        {!isLoading && !isError && nutsData && (
          <div className="mb-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <TimeSeries
              key={`timeseries-${compareYears ? 'year' : ''}-${compareRegions ? 'region' : ''}-${selectedComparisonRegion || ''}-${selectedYears.join(',')}`}
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
              compareRegions={compareRegions}
              regionNames={[
                nutsName,
                ...(selectedComparisonRegion ? [availableRegions.find(r => r.id === selectedComparisonRegion)?.name || selectedComparisonRegion] : [])
              ]}
              comparisonData={
                compareRegions && selectedComparisonRegion && comparisonRegionData
                  ? { [selectedComparisonRegion]: comparisonRegionData }
                  : {}
              }
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">Region Information</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-blue-700 dark:text-blue-300">NUTS ID:</dt>
                <dd className="font-mono text-blue-900 dark:text-blue-100">{nutsId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700 dark:text-blue-300">Region Name:</dt>
                <dd className="text-blue-900 dark:text-blue-100">{nutsName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700 dark:text-blue-300">Current Index:</dt>
                <dd className="text-blue-900 dark:text-blue-100">{datatype}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-blue-700 dark:text-blue-300">Current Date:</dt>
                <dd className="text-blue-900 dark:text-blue-100">{day}</dd>
              </div>
            </dl>
          </div>

          {/* Data Resources */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Data Resources</h3>
            <div className="space-y-3">
              {/* Download Dataset */}
              {nutsData && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Download Dataset:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadCSV}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={downloadJSON}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      JSON
                    </button>
                  </div>
                </div>
              )}

              {/* Divider if both downloads and external resources exist */}
              {nutsData && (staticMetaData?.factsheet || staticMetaData?.doi) && (
                <div className="border-t border-gray-200 dark:border-gray-600 my-3"></div>
              )}

              {staticMetaData?.factsheet && (
                <a
                  href={staticMetaData.factsheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
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
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View DOI Reference
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}