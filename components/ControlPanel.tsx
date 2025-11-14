import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { DROUGHT_CATEGORIES, getCategoryForIndex } from '@/lib/categories'
import type { ControlPanelProps } from '@/types'

function ControlPanel(props: ControlPanelProps) {
  const { day, metadata, firstDay, lastDay } = props
  const timestamp = format(new Date(day), 'X')
  const dayFromTimestamp = parseInt(timestamp) / 60 / 60 / 24

  // Debug logging for day changes
  useEffect(() => {

    // Update the internal day tracking
    const newDayValue = parseInt(format(new Date(day), 'X')) / 60 / 60 / 24
    currentDayRef.current = newDayValue

    // Reset the auto-play flag after the day prop has been updated
    setTimeout(() => {
      isAutoPlayChangeRef.current = false
    }, 0)
  }, [day])

  const [overlay, setOverlay] = useState<boolean>(false)
  const [timeSpan, setTimeSpan] = useState<number | null>(30)

  // Auto-play state
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [playSpeed, setPlaySpeed] = useState<number>(500) // milliseconds between day changes
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Flag to track if change is from auto-play to avoid stopping auto-play
  const isAutoPlayChangeRef = useRef<boolean>(false)

  // Track current day internally for auto-play
  const currentDayRef = useRef<number>(0)

  // Use refs to store current values for the interval
  const currentFirstDayRef = useRef<number>(0)
  const currentLastDayRef = useRef<number>(0)

  const [currentFirstDay, setCurrentFirstDay] = useState<number>(() => {
    // Initialize with the correct value based on firstDay prop
    const value = parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
    currentFirstDayRef.current = value // Initialize ref too
    return value
  })
  const [currentOriginalFirstDayTimestamp, setCurrentOriginalFirstDayTimestamp] = useState<number>(() => {
    return parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
  })
  const [currentLastDayTimestamp, setCurrentLastDayTimestamp] = useState<number>(() => {
    const value = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24
    currentLastDayRef.current = value // Initialize ref too
    return value
  })

  const onClose = useCallback(() => {
    setOverlay(false)
  }, [])

  // Auto-play functions
  const stopAutoPlay = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
      playIntervalRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const startAutoPlay = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }

    const firstDay = currentFirstDayRef.current
    const lastDay = currentLastDayRef.current

    // Initialize current day from props
    currentDayRef.current = parseInt(format(new Date(props.day), 'X')) / 60 / 60 / 24
    const currentDay = currentDayRef.current


    // If we're already at the last day, start from the beginning
    if (currentDay >= lastDay) {
      currentDayRef.current = firstDay // Update internal tracking
      isAutoPlayChangeRef.current = true
      props.onChange(firstDay.toString())
    }

    setIsPlaying(true)
    playIntervalRef.current = setInterval(() => {

      // Use the internal current day tracking instead of props
      const currentDay = currentDayRef.current
      const firstDay = currentFirstDayRef.current
      const lastDay = currentLastDayRef.current


      // If we've reached the end, loop back to beginning
      if (currentDay >= lastDay) {
        currentDayRef.current = firstDay // Update internal tracking
        isAutoPlayChangeRef.current = true
        props.onChange(firstDay.toString())
      } else {
        // Move to next day
        const nextDay = currentDay + 1
        currentDayRef.current = nextDay // Update internal tracking
        isAutoPlayChangeRef.current = true
        props.onChange(nextDay.toString())
      }
    }, playSpeed)
  }, [playSpeed, props])

  const toggleAutoPlay = useCallback(() => {
    if (isPlaying) {
      stopAutoPlay()
    } else {
      startAutoPlay()
    }
  }, [isPlaying, startAutoPlay, stopAutoPlay])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [])

  // Effect to handle timespan changes and prop changes (when index changes)
  useEffect(() => {
    const newOriginalFirstDayTimestamp = parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
    const newLastDayTimestamp = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24

    // Update state with new values
    setCurrentOriginalFirstDayTimestamp(newOriginalFirstDayTimestamp)
    setCurrentLastDayTimestamp(newLastDayTimestamp)

    // Reset currentFirstDay based on current timeSpan
    let newFirstDay: number
    if (timeSpan) {
      newFirstDay = Math.max(
        newOriginalFirstDayTimestamp,
        newLastDayTimestamp - timeSpan
      )
      setCurrentFirstDay(newFirstDay)
    } else {
      newFirstDay = newOriginalFirstDayTimestamp
      setCurrentFirstDay(newOriginalFirstDayTimestamp)
    }

    // Update refs with current values for auto-play
    currentFirstDayRef.current = newFirstDay
    currentLastDayRef.current = newLastDayTimestamp
  }, [firstDay, lastDay, timeSpan])

  // Stop auto-play when time range changes (after the main effect)
  useEffect(() => {
    // Use a ref to avoid the dependency issue
    const currentlyPlaying = playIntervalRef.current !== null
    if (currentlyPlaying) {
      stopAutoPlay()
    }
  }, [timeSpan, firstDay, lastDay, stopAutoPlay])

  // Reset to full range
  const resetTimeRange = useCallback(() => {
    // Stop auto-play when resetting time range
    if (isPlaying) {
      stopAutoPlay()
    }
    setCurrentFirstDay(currentOriginalFirstDayTimestamp)
    setTimeSpan(null)
  }, [currentOriginalFirstDayTimestamp, isPlaying, stopAutoPlay])

  let rows: React.ReactElement[] = []
  for (let i = currentFirstDay; i <= currentLastDayTimestamp; i++) {
    rows.push(<option key={i} value={i}></option>)
  }

  const handleTimeSpanChange = (newTimeSpan: number | null) => {
    // Stop auto-play when changing time range
    if (isPlaying) {
      stopAutoPlay()
    }
    setTimeSpan(newTimeSpan)
  }

  const handleButtonClick = (value: number) => {
    // Stop auto-play when user manually changes day (not from auto-play)
    if (isPlaying && !isAutoPlayChangeRef.current) {
      stopAutoPlay()
    }
    isAutoPlayChangeRef.current = false // Reset flag
    props.onChange(value.toString())
  }

  const handleSliderChange = (value: string) => {
    // Stop auto-play when user manually changes day (not from auto-play)
    if (isPlaying && !isAutoPlayChangeRef.current) {
      stopAutoPlay()
    }
    isAutoPlayChangeRef.current = false // Reset flag
    props.onChange(value)
  }

  const currentIndexId = props.currentIndex || metadata?.short_name || ''
  const indexCategory = useMemo(() => {
    if (!currentIndexId) return null
    return getCategoryForIndex(currentIndexId) ?? DROUGHT_CATEGORIES.other
  }, [currentIndexId])
  const CategoryIcon = indexCategory?.icon

  return (
    <>
      <div className="controlpanel">
        <h2 onClick={() => setOverlay(true)}>
          {metadata?.short_name} - {metadata?.long_name}{' '}
          <span className="getMoreInfoIcon">i</span>
        </h2>


        <div className='flex flex-wrap gap-6'>


          {CategoryIcon && (
            <>
              <CategoryIcon aria-hidden="true" className="h-8 w-8 md:h-14 md:w-14 mt-4 dark:stroke-white" />
              {indexCategory?.shortName && (
                <span className="sr-only">{indexCategory.shortName} index icon</span>
              )}
            </>

          )}
          <div>
            {!props.hideDaySwitchTabs && (
              <div className="timeSpanButtons flex gap-1 md:gap-3 text-[10px] md:text-xs mb-4" role="group" aria-label="Time range selection">
                <button
                  onClick={() => handleTimeSpanChange(30)}
                  className={`px-3 py-1 rounded ${timeSpan === 30 ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === 30}
                  aria-label="Show last 30 days"
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => handleTimeSpanChange(90)}
                  className={`px-3 py-1 rounded ${timeSpan === 90 ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === 90}
                  aria-label="Show last 90 days"
                >
                  Last 90 days
                </button>
                <button
                  onClick={resetTimeRange}
                  className={`px-3 py-1 rounded ${timeSpan === null ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === null}
                  aria-label={`Show all ${Math.round(currentLastDayTimestamp - currentOriginalFirstDayTimestamp)} days`}
                >
                  Last {Math.round(currentLastDayTimestamp - currentOriginalFirstDayTimestamp)} days
                </button>
              </div>

            )}

            <h1 id="selected-date" aria-live="polite">{day}</h1>
          </div>
        </div>


        <div className='flex flex-col md:flex-row items-start justify-start gap-4 mb-4'>
          {/* Auto-play controls */}
          <div className="auto-play-controls flex items-center gap-2 mb-4">

            <button
              onClick={toggleAutoPlay}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors focus:outline-none ${isPlaying
                ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-500'
                : 'bg-transparent border-blue-500 hover:bg-blue-50'
                }`}
              aria-label={isPlaying ? 'Pause auto-play' : 'Start auto-play'}
              title={isPlaying ? 'Pause auto-play' : 'Start auto-play'}
            >
              {isPlaying ? (
                // Pause icon (two vertical bars)
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-white"></div>
                  <div className="w-1 h-4 bg-white"></div>
                </div>
              ) : (
                // Play icon (triangle)
                // <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[15px] border-l-transparent border-r-transparent border-b-blue-500"></div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className='fill-blue-500 w-8 h-8'>
                  <path d="M8 5v14l11-7z" />
                </svg>

              )}
            </button>

            <div className="flex  items-center gap-2 text-sm">

              <select
                value={playSpeed}
                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                className="text-xs px-1 py-1 border rounded bg-white w-fit"
                disabled={isPlaying}
                title="Playback speed"
              >
                <option value={1000}>0.5x</option>
                <option value={500}>1x</option>
                <option value={250}>2x</option>
                <option value={125}>4x</option>
                {/* <option value={125}>Very Fast (4x)</option> */}
              </select>
            </div>

            {/* {isPlaying && (
              <span className="text-xs text-gray-600 animate-pulse">
                Playing...
              </span>
            )} */}
          </div>

          {/* timerangeSlider */}
          <div key={'day'} className="timerangeSlider" role="group" aria-label="Day selection controls">
            {dayFromTimestamp > currentFirstDay ? (
              <button
                title="Previous day"
                type="button"
                onClick={() => handleButtonClick(dayFromTimestamp - 1)}
                className='p-2'
                aria-label="Go to previous day"
                aria-controls="selected-date"
              >
                &lt;
              </button>
            ) : (
              <button
                disabled={true}
                className='p-2'
                aria-label="Previous day (not available)"
                aria-disabled="true"
              >&lt;</button>
            )}

            <input
              type="range"
              list="tickmarks"
              value={
                dayFromTimestamp > currentLastDayTimestamp
                  ? currentLastDayTimestamp
                  : dayFromTimestamp < currentFirstDay
                    ? currentLastDayTimestamp
                    : dayFromTimestamp
              }
              min={currentFirstDay}
              max={currentLastDayTimestamp}
              step={1}
              onChange={(evt) => handleSliderChange(evt.target.value)}
              aria-label="Select date"
              aria-controls="selected-date"
              aria-valuemin={currentFirstDay}
              aria-valuemax={currentLastDayTimestamp}
              aria-valuenow={dayFromTimestamp}
            />
            <datalist id="tickmarks">{rows}</datalist>

            {dayFromTimestamp < currentLastDayTimestamp ? (
              <button
                title="Next day"
                type="button"
                onClick={() => handleButtonClick(dayFromTimestamp + 1)}
                className='p-2'
                aria-label="Go to next day"
                aria-controls="selected-date"
              >
                &gt;
              </button>
            ) : (
              <button
                disabled={true}
                className='p-2'
                aria-label="Next day (not available)"
                aria-disabled="true"
              >&gt;</button>
            )}
          </div>

        </div>
      </div >

      {overlay && (
        <>
          <div className="overlayContainer" onClick={onClose}></div>
          <div className="textOverlay">
            <span className="closeOverlay" onClick={onClose}>
              close X
            </span>
            <h3 className="overlayTitle">
              {metadata?.short_name} - {metadata?.long_name}
            </h3>
            <p style={{ marginBottom: '1rem' }}>{metadata?.abstract}</p>
            {metadata?.factsheet && (
              <p style={{ marginBottom: '1rem' }}>
                <a href={metadata?.factsheet} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Download {metadata?.short_name} Factsheet
                </a>
              </p>
            )}
            {metadata?.doi && (
              <p>
                <a href={metadata?.doi} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  {metadata?.doi}
                </a>
              </p>
            )}
          </div>
        </>
      )
      }
    </>
  )
}

export default ControlPanel
