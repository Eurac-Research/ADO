import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { ControlPanelProps } from '@/types'
import { getCategoryForIndex } from '@/lib/categories'

function ControlPanel(props: ControlPanelProps) {
  const { day, metadata, firstDay, lastDay, forecastWeeks = [], currentIndex } = props
  const timestamp = format(new Date(day), 'X')
  const dayFromTimestamp = parseInt(timestamp) / 60 / 60 / 24

  // Get the category for the current index
  const category = currentIndex ? getCategoryForIndex(currentIndex) : null
  const CategoryIcon = category?.icon

  // Calculate extended timeline that includes forecasts
  const lastHistoricalDay = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24
  const lastForecastDay = forecastWeeks.length > 0
    ? parseInt(format(new Date(forecastWeeks[forecastWeeks.length - 1].date), 'X')) / 60 / 60 / 24
    : lastHistoricalDay

  // Debug logging for day changes
  useEffect(() => {

    // Update the internal day tracking
    const newDayValue = parseInt(format(new Date(day), 'X')) / 60 / 60 / 24
    currentDayRef.current = newDayValue

    // Reset local slider index when day changes externally
    setLocalSliderIndex(null)

    // Reset the auto-play flag after the day prop has been updated
    setTimeout(() => {
      isAutoPlayChangeRef.current = false
    }, 0)
  }, [day])

  const [overlay, setOverlay] = useState<boolean>(false)
  const [timeSpan, setTimeSpan] = useState<number | null>(30)

  // Local slider position state for immediate UI updates
  const [localSliderIndex, setLocalSliderIndex] = useState<number | null>(null)

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
    const historicalLastDay = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24
    const forecastLastDay = forecastWeeks.length > 0
      ? parseInt(format(new Date(forecastWeeks[forecastWeeks.length - 1].date), 'X')) / 60 / 60 / 24
      : historicalLastDay
    const value = Math.max(historicalLastDay, forecastLastDay)
    currentLastDayRef.current = value // Initialize ref too
    return value
  })

  // Create discrete time points for slider (after states are defined)
  const discreteTimePoints = useMemo(() => {
    const points: Array<{
      dayValue: number
      type: 'historical' | 'forecast'
      date: string
      week?: number
      uncertainty?: 'low' | 'medium' | 'high'
      confidence?: number
      sliderIndex: number
    }> = []

    // Use the displayed time range (affected by timeSpan)
    const firstDayTimestamp = currentFirstDay
    let sliderIndex = 0

    console.log('Building discrete points from', firstDayTimestamp, 'to', lastHistoricalDay)

    // Add all historical days (each day gets its own slider position)
    for (let day = firstDayTimestamp; day <= lastHistoricalDay; day++) {
      points.push({
        dayValue: day,
        type: 'historical',
        date: format(new Date(day * 60 * 60 * 24 * 1000), 'YYYY-MM-DD'),
        sliderIndex: sliderIndex++
      })
    }

    // Add forecast weeks - one position per week for clean navigation
    forecastWeeks.forEach((forecast) => {
      const forecastDayValue = parseInt(format(new Date(forecast.date), 'X')) / 60 / 60 / 24
      console.log('Adding forecast week', forecast.week, 'at day value', forecastDayValue, 'slider index', sliderIndex)

      points.push({
        dayValue: forecastDayValue,
        type: 'forecast',
        date: forecast.date,
        week: forecast.week,
        uncertainty: forecast.uncertainty,
        confidence: forecast.confidence,
        sliderIndex: sliderIndex++
      })
    })

    console.log('Final discrete points:', points.length)
    return points
  }, [currentFirstDay, lastHistoricalDay, forecastWeeks])

  const maxSliderIndex = discreteTimePoints.length - 1

  // Map between slider index and day value
  const sliderIndexToValue = useCallback((index: number) => {
    const point = discreteTimePoints[Math.max(0, Math.min(maxSliderIndex, index))]
    return point?.dayValue || parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
  }, [discreteTimePoints, maxSliderIndex, firstDay])

  const valueToSliderIndex = useCallback((dayValue: number) => {
    const point = discreteTimePoints.find(p => p.dayValue === dayValue)
    return point?.sliderIndex || 0
  }, [discreteTimePoints])

  // Check if current day is in forecast range
  const getCurrentTimelineItem = useCallback((dayValue: number) => {
    return discreteTimePoints.find(item => item.dayValue === dayValue)
  }, [discreteTimePoints])

  // Get current slider index based on day value
  const getCurrentSliderIndex = useCallback((dayValue: number) => {
    const item = discreteTimePoints.find(item => item.dayValue === dayValue)
    if (item) {
      console.log('Found slider index', item.sliderIndex, 'for day value', dayValue, 'type:', item.type)
      return item.sliderIndex
    }
    console.log('No slider index found for day value', dayValue, 'defaulting to 0')
    return 0
  }, [discreteTimePoints])

  const currentTimelineItem = getCurrentTimelineItem(dayFromTimestamp)
  const isInForecastRange = currentTimelineItem?.type === 'forecast'
  const getForecastUncertainty = () => currentTimelineItem?.uncertainty

  // Use local slider index for immediate UI updates, fallback to calculated index
  const currentSliderIndex = localSliderIndex !== null ? localSliderIndex : getCurrentSliderIndex(dayFromTimestamp)

  // Get the current timeline item based on the slider position
  const currentSliderTimelineItem = discreteTimePoints[currentSliderIndex]
  const isSliderInForecastRange = currentSliderTimelineItem?.type === 'forecast'
  const getSliderForecastUncertainty = () => currentSliderTimelineItem?.uncertainty

  // Additional debug for forecast detection
  useEffect(() => {
    if (currentTimelineItem) {
      console.log('Current timeline item found:', currentTimelineItem)
      if (currentTimelineItem.type === 'forecast') {
        console.log('✅ IN FORECAST RANGE - Week', currentTimelineItem.week, 'Uncertainty:', currentTimelineItem.uncertainty)
      } else {
        console.log('📅 In historical range')
      }
    } else {
      console.log('❌ No timeline item found for day value:', dayFromTimestamp)
    }
  }, [currentTimelineItem, dayFromTimestamp])

  // Calculate the percentage where historical data ends for styling
  const historicalEndPercentage = useMemo(() => {
    if (discreteTimePoints.length === 0) return 100

    // Find the last historical item
    const lastHistoricalItem = discreteTimePoints
      .filter(item => item.type === 'historical')
      .pop()

    if (!lastHistoricalItem) return 0

    return ((lastHistoricalItem.sliderIndex + 1) / (maxSliderIndex + 1)) * 100
  }, [discreteTimePoints, maxSliderIndex])

  // Debug logging
  useEffect(() => {
    console.log('=== Slider Debug Info ===')
    console.log('Total discrete points:', discreteTimePoints.length)
    console.log('Historical points:', discreteTimePoints.filter(p => p.type === 'historical').length)
    console.log('Forecast points:', discreteTimePoints.filter(p => p.type === 'forecast').length)
    console.log('Max slider index:', maxSliderIndex)
    console.log('Current slider index:', currentSliderIndex)
    console.log('Current day value:', dayFromTimestamp)
    console.log('Historical end percentage:', historicalEndPercentage)
    console.log('Forecast weeks:', forecastWeeks.map(fw => `Week ${fw.week}: ${fw.date}`))
    console.log('Last 5 discrete points:', discreteTimePoints.slice(-5))
    if (discreteTimePoints.length > 0) {
      console.log('Slider range: 0 to', discreteTimePoints.length - 1)
      console.log('When at max index, position should be:', ((discreteTimePoints.length - 1) / Math.max(1, discreteTimePoints.length - 1)) * 100, '%')
    }
  }, [discreteTimePoints, maxSliderIndex, currentSliderIndex, dayFromTimestamp, historicalEndPercentage, forecastWeeks])

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
    const historicalLastDayTimestamp = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24
    const forecastLastDayTimestamp = forecastWeeks.length > 0
      ? parseInt(format(new Date(forecastWeeks[forecastWeeks.length - 1].date), 'X')) / 60 / 60 / 24
      : historicalLastDayTimestamp
    const newLastDayTimestamp = Math.max(historicalLastDayTimestamp, forecastLastDayTimestamp)

    // Update state with new values
    setCurrentOriginalFirstDayTimestamp(newOriginalFirstDayTimestamp)
    setCurrentLastDayTimestamp(newLastDayTimestamp)

    // Reset currentFirstDay based on current timeSpan
    let newFirstDay: number
    if (timeSpan) {
      // When we have a timespan, calculate from the HISTORICAL last day, not the total last day
      // This ensures forecast weeks are always included even with timespan restrictions
      newFirstDay = Math.max(
        newOriginalFirstDayTimestamp,
        historicalLastDayTimestamp - timeSpan
      )
      setCurrentFirstDay(newFirstDay)
    } else {
      newFirstDay = newOriginalFirstDayTimestamp
      setCurrentFirstDay(newOriginalFirstDayTimestamp)
    }

    // Update refs with current values for auto-play
    currentFirstDayRef.current = newFirstDay
    currentLastDayRef.current = newLastDayTimestamp
  }, [firstDay, lastDay, timeSpan, forecastWeeks])

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

  // Calculate the nearest valid position for the slider
  const getNearestValidPosition = useCallback((sliderIndex: number) => {
    if (discreteTimePoints.length === 0) return { dayValue: dayFromTimestamp, sliderIndex: 0 }

    // Clamp to valid range
    const clampedIndex = Math.max(0, Math.min(maxSliderIndex, sliderIndex))

    // Get the discrete time point at this index
    const targetItem = discreteTimePoints[clampedIndex]

    if (!targetItem) {
      // Return first available point as fallback
      const firstPoint = discreteTimePoints[0]
      return { dayValue: firstPoint?.dayValue || dayFromTimestamp, sliderIndex: 0 }
    }

    return { dayValue: targetItem.dayValue, sliderIndex: targetItem.sliderIndex }
  }, [discreteTimePoints, maxSliderIndex, dayFromTimestamp])

  // Track current autoplay index internally
  const autoPlayIndexRef = useRef<number>(0)

  const startAutoPlay = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current)
    }

    const firstSliderIndex = 0
    const lastSliderIndex = maxSliderIndex

    // Initialize autoplay index from current slider position
    autoPlayIndexRef.current = currentSliderIndex

    // If we're already at the last position, start from the beginning
    if (autoPlayIndexRef.current >= lastSliderIndex) {
      autoPlayIndexRef.current = firstSliderIndex
      const targetPoint = discreteTimePoints[firstSliderIndex]
      if (targetPoint) {
        isAutoPlayChangeRef.current = true
        props.onChange(targetPoint.dayValue.toString())
      }
    }

    setIsPlaying(true)
    playIntervalRef.current = setInterval(() => {
      // Use ref value for reliable state tracking in interval
      const currentIndex = autoPlayIndexRef.current

      // If we've reached the end, loop back to beginning
      if (currentIndex >= lastSliderIndex) {
        autoPlayIndexRef.current = firstSliderIndex
        const targetPoint = discreteTimePoints[firstSliderIndex]
        if (targetPoint) {
          isAutoPlayChangeRef.current = true
          props.onChange(targetPoint.dayValue.toString())
        }
      } else {
        // Move to next position
        const nextIndex = currentIndex + 1
        autoPlayIndexRef.current = nextIndex
        const targetPoint = discreteTimePoints[nextIndex]

        if (targetPoint) {
          isAutoPlayChangeRef.current = true
          props.onChange(targetPoint.dayValue.toString())
        }
      }
    }, playSpeed)
  }, [playSpeed, props, maxSliderIndex, discreteTimePoints, currentSliderIndex])

  const toggleAutoPlay = useCallback(() => {
    if (isPlaying) {
      stopAutoPlay()
    } else {
      startAutoPlay()
    }
  }, [isPlaying, startAutoPlay, stopAutoPlay])

  const handleSliderChange = (value: string) => {
    // Stop auto-play when user manually changes day (not from auto-play)
    if (isPlaying && !isAutoPlayChangeRef.current) {
      stopAutoPlay()
    }
    isAutoPlayChangeRef.current = false // Reset flag

    const targetSliderIndex = parseInt(value)
    console.log('Slider change: index', targetSliderIndex, 'of max', maxSliderIndex)

    // Update local slider index immediately for UI responsiveness
    setLocalSliderIndex(targetSliderIndex)

    // Direct approach: get the exact point from the array
    const targetPoint = discreteTimePoints[targetSliderIndex]

    if (targetPoint) {
      console.log('Target:', targetPoint.type, targetPoint.week ? `week ${targetPoint.week}` : targetPoint.date)
      props.onChange(targetPoint.dayValue.toString())
    } else {
      console.log('No target point found, using fallback')
      // Fallback to nearest valid position
      const { dayValue } = getNearestValidPosition(targetSliderIndex)
      props.onChange(dayValue.toString())
    }
  }

  return (
    <>
      <div className="controlpanelXX">




        <div className='flex items-end justify-center gap-4 mb-4'>


          <div className=' w-fit max-w-[500px] px-4  relative bottom-0'>
            <div className="flex items-center justify-start gap-4 mb-2">
              {CategoryIcon && <CategoryIcon className="w-16 h-16 text-black" />}
              <h2 onClick={() => setOverlay(true)} className="items-center gap-2 text-xl mb-4 max-w-[70%]">

                <span className='block'>{metadata?.short_name}</span>

                <span className='block text-sm'>{metadata?.long_name}{' '}</span>

                <span className='block font-bold text-sm' id="selected-date" aria-live="polite">

                  {format(new Date(day), 'ddd, MMM DD, YYYY')}

                  {isSliderInForecastRange && (
                    <span className={`forecast-indicator text-green-600  forecast-${getSliderForecastUncertainty()}`}>
                      {" "}
                      FORECAST {currentSliderTimelineItem?.week ? `WEEK ${currentSliderTimelineItem.week}` : ''}
                      {getSliderForecastUncertainty() && (
                        <span className="uncertainty-badge">
                          {getSliderForecastUncertainty()?.toUpperCase()} UNCERTAINTY
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </h2>
              <span onClick={() => setOverlay(true)} className="getMoreInfoIcon cursor-pointer absolute top-0 right-0 rounded-full bg-blue-600 h-6 w-6 shrink-0 flex items-center justify-center text-white ">i</span>
            </div>

            {!props.hideDaySwitchTabs && (
              <div className="timeSpanButtons flex gap-1 md:gap-3 text-[10px] md:text-[12px]" role="group" aria-label="Time range selection">
                <button
                  onClick={() => handleTimeSpanChange(30)}
                  className={`px-3 py-1 rounded ${timeSpan === 30 ? 'bg-blue-500 text-white font-medium' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === 30}
                  aria-label="Show last 30 days plus forecasts"
                >
                  Last 30 days
                </button>
                <button
                  onClick={() => handleTimeSpanChange(90)}
                  className={`px-3 py-1 rounded ${timeSpan === 90 ? 'bg-blue-500 text-white font-medium' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === 90}
                  aria-label="Show last 90 days plus forecasts"
                >
                  Last 90 days
                </button>
                <button
                  onClick={resetTimeRange}
                  className={`px-3 py-1 rounded ${timeSpan === null ? 'bg-blue-500 text-white font-medium' : 'bg-gray-200'}`}
                  aria-pressed={timeSpan === null}
                  aria-label={`Show all ${Math.round(currentLastDayTimestamp - currentOriginalFirstDayTimestamp)} days including forecasts`}
                >
                  All data
                </button>
              </div>

            )}

            {/* <h1 id="selected-date" aria-live="polite">
              {day}
              {isSliderInForecastRange && (
                <span className={`forecast-indicator forecast-${getSliderForecastUncertainty()}`}>
                  FORECAST {currentSliderTimelineItem?.week ? `WEEK ${currentSliderTimelineItem.week}` : ''}
                  {getSliderForecastUncertainty() && (
                    <span className="uncertainty-badge">
                      {getSliderForecastUncertainty()?.toUpperCase()} UNCERTAINTY
                    </span>
                  )}
                </span>
              )}
            </h1> */}
          </div>



          {/* Auto-play controls - positioned left of slider */}
          <div className="auto-play-controls flex items-center gap-2">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className='fill-blue-500 w-8 h-8'>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

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
            </select>
          </div>

          {/* Full-width timeline slider */}
          <div key={'day'} className="timerangeSlider flex-1 mb-4" role="group" aria-label="Timeline selection controls">
            <div className="timeline-container" style={{
              '--historical-end': `${historicalEndPercentage}%`,
              '--total-range': currentLastDayTimestamp - currentFirstDay
            } as React.CSSProperties}>

              {/* Timeline track with different styling for historical vs forecast */}
              <div className="timeline-track">
                <div className="historical-track" style={{ width: `${historicalEndPercentage}%` }}></div>
              </div>

              {/* Navigation buttons */}
              <div className="timeline-controls">
                {currentSliderIndex > 0 ? (
                  <button
                    title={isInForecastRange && currentTimelineItem?.week && currentTimelineItem.week > 1
                      ? "Previous week"
                      : isInForecastRange && currentTimelineItem?.week === 1
                        ? "Back to historical data"
                        : "Previous day"
                    }
                    type="button"
                    onClick={() => {
                      if (isInForecastRange && currentTimelineItem?.week && currentTimelineItem.week > 1) {
                        // Navigate to previous forecast week (jump back 1 slider position)
                        const targetIndex = currentSliderIndex - 1
                        const { dayValue } = getNearestValidPosition(targetIndex)
                        handleButtonClick(dayValue)
                      } else if (isInForecastRange && currentTimelineItem?.week === 1) {
                        // Navigate back to last historical day
                        handleButtonClick(lastHistoricalDay)
                      } else {
                        // Normal day navigation
                        const targetIndex = currentSliderIndex - 1
                        const { dayValue } = getNearestValidPosition(targetIndex)
                        handleButtonClick(dayValue)
                      }
                    }}
                    className={`timeline-nav-btn ${isInForecastRange ? 'forecast-nav' : 'historical-nav'}`}
                    aria-label={isInForecastRange ? "Go to previous week" : "Go to previous day"}
                    aria-controls="selected-date"
                  >
                    &#8249;
                  </button>
                ) : (
                  <button
                    disabled={true}
                    className='timeline-nav-btn'
                    aria-label="Previous (not available)"
                    aria-disabled="true"
                  >&#8249;</button>
                )}

                {/* Main slider container */}
                <div className="relative flex-1 mx-2 pt-12 pb-6">
                  {/* Date label that follows the thumb */}
                  <div
                    className="absolute -top-4 rounded-lg px-6 py-3 text-base font-semibold shadow-lg z-10 transform -translate-x-1/2 whitespace-nowrap cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${(currentSliderIndex / Math.max(1, discreteTimePoints.length - 1)) * 100}%`,
                      color: 'white',
                      backgroundColor: isSliderInForecastRange ? '#22c55e' : '#3b82f6',
                      border: 'none',
                      minWidth: isSliderInForecastRange ? '160px' : '140px'
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const sliderContainer = e.currentTarget.parentElement;
                      if (!sliderContainer) return;

                      const rect = sliderContainer.getBoundingClientRect();
                      const startX = e.clientX;
                      const startIndex = currentSliderIndex;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const containerWidth = rect.width;
                        const deltaPercent = (deltaX / containerWidth) * 100;
                        const deltaIndex = Math.round((deltaPercent / 100) * (discreteTimePoints.length - 1));
                        const newIndex = Math.max(0, Math.min(discreteTimePoints.length - 1, startIndex + deltaIndex));

                        setLocalSliderIndex(newIndex);
                        const targetPoint = discreteTimePoints[newIndex];
                        if (targetPoint) {
                          props.onChange(targetPoint.dayValue.toString());
                        }
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      const sliderContainer = e.currentTarget.parentElement;
                      if (!sliderContainer || !e.touches[0]) return;

                      const rect = sliderContainer.getBoundingClientRect();
                      const startX = e.touches[0].clientX;
                      const startIndex = currentSliderIndex;

                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        if (!moveEvent.touches[0]) return;
                        const deltaX = moveEvent.touches[0].clientX - startX;
                        const containerWidth = rect.width;
                        const deltaPercent = (deltaX / containerWidth) * 100;
                        const deltaIndex = Math.round((deltaPercent / 100) * (discreteTimePoints.length - 1));
                        const newIndex = Math.max(0, Math.min(discreteTimePoints.length - 1, startIndex + deltaIndex));

                        setLocalSliderIndex(newIndex);
                        const targetPoint = discreteTimePoints[newIndex];
                        if (targetPoint) {
                          props.onChange(targetPoint.dayValue.toString());
                        }
                      };

                      const handleTouchEnd = () => {
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };

                      document.addEventListener('touchmove', handleTouchMove);
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  >
                    {isSliderInForecastRange && currentSliderTimelineItem?.week
                      ? `Week ${currentSliderTimelineItem.week} - ${format(new Date(currentSliderTimelineItem.date), 'ddd, YYYY')}`
                      : format(new Date(day), 'ddd, MMM DD, YYYY')
                    }
                    {/* Small arrow pointing down */}
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor: isSliderInForecastRange ? '#22c55e' : '#3b82f6'
                      }}
                    />
                  </div>                  <input
                    type="range"
                    list="timeline-tickmarks"
                    value={currentSliderIndex}
                    min={0}
                    max={discreteTimePoints.length - 1}
                    step={1}
                    onChange={(evt) => {
                      console.log('Slider onChange triggered with value:', evt.target.value)
                      handleSliderChange(evt.target.value)
                    }}
                    onInput={(evt) => {
                      const target = evt.target as HTMLInputElement
                      console.log('Slider onInput triggered with value:', target.value)
                      handleSliderChange(target.value)
                    }}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${historicalEndPercentage}%, #22c55e ${historicalEndPercentage}%, #22c55e 100%)`
                    }}
                    aria-label={isSliderInForecastRange ? "Select forecast week" : "Select historical date"}
                    aria-controls="selected-date"
                    aria-valuemin={0}
                    aria-valuemax={discreteTimePoints.length - 1}
                    aria-valuenow={currentSliderIndex}
                    title={isSliderInForecastRange
                      ? `Forecast Week ${currentSliderTimelineItem?.week} (${getSliderForecastUncertainty()} uncertainty)`
                      : `Historical data: ${day}`
                    }
                  />

                  {/* Tick marks overlay */}
                  <div className="absolute top-full w-full pointer-events-none">
                    {discreteTimePoints.map((item, index) => {
                      const position = (index / Math.max(1, discreteTimePoints.length - 1)) * 100

                      // Enhanced spacing logic for forecast vs historical
                      let isMajorTick = false
                      let shouldShowTick = false
                      let tickHeight = 'h-3'
                      let tickColor = 'bg-gray-400'

                      if (item.type === 'forecast') {
                        // All forecast weeks are major ticks with enhanced styling
                        isMajorTick = true
                        shouldShowTick = true
                        tickHeight = 'h-6' // Taller for forecast weeks
                        tickColor = 'bg-green-600' // Green color for forecast
                      } else {
                        // For historical data, show major ticks every 3 days for more detail
                        const isHistoricalEnd = index < discreteTimePoints.length - 1 &&
                          discreteTimePoints[index + 1]?.type === 'forecast'
                        isMajorTick = index % 3 === 0 || index === 0 || isHistoricalEnd
                        shouldShowTick = isMajorTick
                        if (isMajorTick) {
                          tickHeight = 'h-4'
                          tickColor = 'bg-blue-600' // Blue color for historical
                        }
                      }

                      if (!shouldShowTick) return null

                      return (
                        <div
                          key={`tick-${index}`}
                          className={`absolute transform -translate-x-1/2`}
                          style={{ left: `${position}%` }}
                        >
                          <div className={`w-[2px] ${item.type === 'forecast' ? 'hidden' : ''} ${tickHeight} ${tickColor}`} />
                          {isMajorTick && (
                            <div className="relative">
                              <span className={`absolute top-full mt-1 text-xs font-medium whitespace-nowrap transform -translate-x-1/2 ${item.type === 'forecast' ? 'text-green-800' : 'text-blue-700'
                                }`}>
                                {/* {item.type === 'forecast'
                                  ? `WEEK ${item.week}`
                                  : format(new Date(item.date), 'MMM DD')
                                } */}
                                {item.type === 'forecast'
                                  ? ``
                                  : format(new Date(item.date), 'MMM DD')
                                }
                              </span>
                              {/* Add a visual indicator for forecast weeks */}
                              {/* {item.type === 'forecast' && (
                                <div className="absolute top-full mt-6 transform -translate-x-1/2 text-xs text-green-600 font-medium">
                                  Forecast
                                </div>
                              )} */}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Datalist for discrete tick marks (hidden, for accessibility) */}
                <datalist id="timeline-tickmarks">
                  {discreteTimePoints.map(item => (
                    <option key={item.sliderIndex} value={item.sliderIndex} />
                  ))}
                </datalist>

                {currentSliderIndex < maxSliderIndex ? (
                  <button
                    title={isInForecastRange && currentTimelineItem?.week && currentTimelineItem.week < 4
                      ? "Next week"
                      : !isInForecastRange && dayFromTimestamp === lastHistoricalDay && forecastWeeks.length > 0
                        ? "Enter forecast period"
                        : "Next day"
                    }
                    type="button"
                    onClick={() => {
                      if (isInForecastRange && currentTimelineItem?.week && currentTimelineItem.week < 4) {
                        // Navigate to next forecast week (jump forward 1 slider position)
                        const targetIndex = currentSliderIndex + 1
                        const { dayValue } = getNearestValidPosition(targetIndex)
                        handleButtonClick(dayValue)
                      } else if (!isInForecastRange && dayFromTimestamp === lastHistoricalDay && forecastWeeks.length > 0) {
                        // Navigate to first forecast week
                        const firstForecast = forecastWeeks[0]
                        const firstForecastDay = parseInt(format(new Date(firstForecast.date), 'X')) / 60 / 60 / 24
                        handleButtonClick(firstForecastDay)
                      } else {
                        // Normal day navigation
                        const targetIndex = currentSliderIndex + 1
                        const { dayValue } = getNearestValidPosition(targetIndex)
                        handleButtonClick(dayValue)
                      }
                    }}
                    className={`timeline-nav-btn ${isInForecastRange ? 'forecast-nav' : 'historical-nav'}`}
                    aria-label={isInForecastRange ? "Go to next week" : "Go to next day"}
                    aria-controls="selected-date"
                  >
                    &#8250;
                  </button>
                ) : (
                  <button
                    disabled={true}
                    className='timeline-nav-btn'
                    aria-label="Next (not available)"
                    aria-disabled="true"
                  >&#8250;</button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

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
      )}
    </>
  )
}

export default ControlPanel