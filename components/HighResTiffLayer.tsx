'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useMap } from 'react-map-gl'
import { renderOptimizedGeoTIFF, getAvailableWeeks, ColorStop } from '@/lib/tiff-renderer'

interface HighResTiffLayerProps {
  index: string
  colorStops: ColorStop[]
  isActive: boolean
  onWeekChange?: (week: number) => void
}

// Cache for rendered TIFFs to avoid re-processing and re-downloading
// Store both the blob URL (for display) and bounds (for georeferencing)
const tiffCache = new Map<string, {
  imageUrl: string; // blob URL created from cached image data
  bounds: [number, number, number, number];
  isPreloaded: boolean; // whether the image has been fully downloaded
}>()

// Preload images to create blob URLs and avoid re-downloading
const preloadedImages = new Map<string, Blob>()

async function preloadImage(url: string): Promise<string> {
  // Check if already preloaded
  const cached = preloadedImages.get(url)
  if (cached) {
    console.log('Using preloaded image from cache')
    return URL.createObjectURL(cached)
  }

  console.log('Preloading image:', url)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }

  const blob = await response.blob()
  console.log('Image loaded. Size:', Math.round(blob.size / 1024 / 1024), 'MB')

  // Cache the blob
  preloadedImages.set(url, blob)

  // Create and return blob URL
  return URL.createObjectURL(blob)
}

export default function HighResTiffLayer({ index, colorStops, isActive, onWeekChange }: HighResTiffLayerProps) {
  const { current: map } = useMap()
  const [currentWeek, setCurrentWeek] = useState(20)
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedWeek = useRef<number | null>(null)
  const year = 2025

  // Track the current active index/year to cancel stale preloads
  const activeIndexRef = useRef<string>(index)
  const activeYearRef = useRef<number>(year)

  // Update refs when index or year changes
  useEffect(() => {
    activeIndexRef.current = index
    activeYearRef.current = year
  }, [index, year])

  // Get available weeks for the current index
  useEffect(() => {
    getAvailableWeeks(index, year).then(weeks => {
      setAvailableWeeks(weeks)
      if (weeks.length > 0) {
        setCurrentWeek(weeks[0])
      }
    })
  }, [index])

  // Load and display TIFF
  const loadTiff = useCallback(async (week: number) => {
    if (!map || !isActive) return

    // Skip if already loaded
    if (loadedWeek.current === week) {
      console.log('Week already loaded, skipping:', week)
      return
    }

    // Get the underlying Mapbox GL map instance
    const mapInstance = map.getMap()
    if (!mapInstance) return

    setIsLoading(true)
    setError(null)

    try {
      const cacheKey = `${index}-${year}-${week}`
      let imageUrl: string
      let bounds: [number, number, number, number]
      let isYFlipped: boolean = false

      // Check cache first
      const cached = tiffCache.get(cacheKey)
      if (cached && cached.isPreloaded) {
        console.log('Using fully cached TIFF (no re-download):', cacheKey)
        imageUrl = cached.imageUrl
        bounds = cached.bounds
      } else {
        console.log('Loading TIFF metadata and preloading image:', cacheKey)
        // Load the TIFF for georeferencing
        const result = await renderOptimizedGeoTIFF(week, year, index)
        bounds = result.bounds
        isYFlipped = result.isYFlipped || false

        // Preload the JPG image and create blob URL to avoid re-downloading
        imageUrl = await preloadImage(result.imageUrl)

        // Cache both the blob URL and bounds
        tiffCache.set(cacheKey, { imageUrl, bounds, isPreloaded: true })
        console.log('TIFF fully cached (blob URL). Cache size:', tiffCache.size)
      }

      // Remove existing layer and source if they exist
      if (mapInstance.getLayer('high-res-tiff-layer')) {
        mapInstance.removeLayer('high-res-tiff-layer')
      }
      if (mapInstance.getSource('high-res-tiff-source')) {
        mapInstance.removeSource('high-res-tiff-source')
      }

      console.log('Adding Mapbox image source')
      console.log('  Bounds:', bounds)
      console.log('  Image URL:', imageUrl.substring(0, 50), '...')
      console.log('  Y-axis flipped:', isYFlipped)

      // Standard Mapbox coordinates (always top-left, top-right, bottom-right, bottom-left)
      // The bounds are [minLon, minLat, maxLon, maxLat]
      const coordinates = [
        [bounds[0], bounds[3]], // top-left: [minLon, maxLat]
        [bounds[2], bounds[3]], // top-right: [maxLon, maxLat]
        [bounds[2], bounds[1]], // bottom-right: [maxLon, minLat]
        [bounds[0], bounds[1]], // bottom-left: [minLon, minLat]
      ]

      console.log('Image corners (TL, TR, BR, BL):', coordinates)

      mapInstance.addSource('high-res-tiff-source', {
        type: 'image',
        url: imageUrl,
        coordinates,
      })

      // Add the layer
      mapInstance.addLayer({
        id: 'high-res-tiff-layer',
        type: 'raster',
        source: 'high-res-tiff-source',
        paint: {
          'raster-opacity': 0.8,
          'raster-fade-duration': 300,
        },
      })

      loadedWeek.current = week
      setIsLoading(false)
      onWeekChange?.(week)
    } catch (err) {
      console.error('Error loading TIFF:', err)
      setError(err instanceof Error ? err.message : 'Failed to load TIFF')
      setIsLoading(false)
    }
  }, [map, index, year, isActive, onWeekChange])

  // Load TIFF when active or week changes
  useEffect(() => {
    let isMounted = true // Track if component is still mounted
    const currentIndexSnapshot = index // Capture current index for this effect
    const currentYearSnapshot = year // Capture current year for this effect

    if (isActive && availableWeeks.length > 0) {
      loadTiff(currentWeek)

      // Preload adjacent weeks in background for instant navigation
      const currentIndex = availableWeeks.indexOf(currentWeek)
      const weeksToPreload: number[] = []

      if (currentIndex > 0) {
        weeksToPreload.push(availableWeeks[currentIndex - 1]) // Previous week
      }
      if (currentIndex < availableWeeks.length - 1) {
        weeksToPreload.push(availableWeeks[currentIndex + 1]) // Next week
      }

      // Preload in background without blocking
      weeksToPreload.forEach(week => {
        const cacheKey = `${currentIndexSnapshot}-${currentYearSnapshot}-${week}`
        const cached = tiffCache.get(cacheKey)

        if (!cached || !cached.isPreloaded) {
          console.log('Background preloading week:', week, 'for index:', currentIndexSnapshot)
          renderOptimizedGeoTIFF(week, currentYearSnapshot, currentIndexSnapshot)
            .then(async (result) => {
              // Check if component is unmounted OR if index/year has changed
              if (!isMounted || activeIndexRef.current !== currentIndexSnapshot || activeYearRef.current !== currentYearSnapshot) {
                console.log('Skipping preload - component unmounted or index/year changed. Week:', week, 'Index:', currentIndexSnapshot)
                return
              }
              const imageUrl = await preloadImage(result.imageUrl)
              tiffCache.set(cacheKey, {
                imageUrl,
                bounds: result.bounds,
                isPreloaded: true
              })
              console.log('Background preload complete for week:', week, 'index:', currentIndexSnapshot)
            })
            .catch(err => {
              // Only log error if component is still mounted AND index/year hasn't changed
              if (isMounted && activeIndexRef.current === currentIndexSnapshot && activeYearRef.current === currentYearSnapshot) {
                console.warn('Background preload failed for week:', week, 'index:', currentIndexSnapshot, err)
              } else {
                console.log('Ignoring preload error (stale request) for week:', week, 'index:', currentIndexSnapshot)
              }
            })
        }
      })
    } else if (!isActive && map) {
      // Remove layer when inactive
      const mapInstance = map.getMap()
      if (mapInstance && mapInstance.getLayer('high-res-tiff-layer')) {
        mapInstance.removeLayer('high-res-tiff-layer')
      }
      if (mapInstance && mapInstance.getSource('high-res-tiff-source')) {
        mapInstance.removeSource('high-res-tiff-source')
      }
      loadedWeek.current = null
    }

    // Cleanup function to mark component as unmounted
    return () => {
      isMounted = false
    }
  }, [isActive, currentWeek, availableWeeks, loadTiff, map, index, year])

  // Cleanup on unmount - remove layer when component is destroyed
  useEffect(() => {
    return () => {
      if (map) {
        const mapInstance = map.getMap()
        if (mapInstance) {
          if (mapInstance.getLayer('high-res-tiff-layer')) {
            mapInstance.removeLayer('high-res-tiff-layer')
          }
          if (mapInstance.getSource('high-res-tiff-source')) {
            mapInstance.removeSource('high-res-tiff-source')
          }
        }
      }
      console.log('HighResTiffLayer unmounted - layer cleaned up')
    }
  }, [map])

  // Handle week change
  const handleWeekChange = (week: number) => {
    if (availableWeeks.includes(week)) {
      setCurrentWeek(week)
    }
  }

  const handlePrevious = () => {
    const currentIndex = availableWeeks.indexOf(currentWeek)
    if (currentIndex > 0) {
      handleWeekChange(availableWeeks[currentIndex - 1])
    }
  }

  const handleNext = () => {
    const currentIndex = availableWeeks.indexOf(currentWeek)
    if (currentIndex < availableWeeks.length - 1) {
      handleWeekChange(availableWeeks[currentIndex + 1])
    }
  }

  if (!isActive || availableWeeks.length === 0) return null

  const currentIndex = availableWeeks.indexOf(currentWeek)
  const minWeek = availableWeeks[0]
  const maxWeek = availableWeeks[availableWeeks.length - 1]

  return (
    <>
      {/* Loading overlay on map */}
      {isLoading && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 flex flex-col items-center gap-3">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Loading High Resolution Image</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Week {currentWeek} • ~15-20 MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl p-4 min-w-[500px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              High Resolution Timeline
            </h3>
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Loading image...</span>
              </div>
            )}
            {error && (
              <span className="text-xs text-red-600 dark:text-red-400">Error loading data</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Week {minWeek}</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Week {currentWeek}
              </span>
              <span>Week {maxWeek}</span>
            </div>

            <input
              type="range"
              min={0}
              max={availableWeeks.length - 1}
              step={1}
              value={currentIndex}
              onChange={(e) => {
                const newIndex = parseInt(e.target.value)
                handleWeekChange(availableWeeks[newIndex])
              }}
              disabled={isLoading}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0 || isLoading}
                className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Week {currentWeek} ({currentIndex + 1} of {availableWeeks.length})
              </span>
              <button
                onClick={handleNext}
                disabled={currentIndex === availableWeeks.length - 1 || isLoading}
                className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
