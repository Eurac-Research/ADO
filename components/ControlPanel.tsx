import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback, useEffect } from 'react'
import type { ControlPanelProps } from '@/types'

function ControlPanel(props: ControlPanelProps) {
  const { day, metadata, firstDay, lastDay } = props
  const timestamp = format(new Date(day), 'X')
  const dayFromTimestamp = parseInt(timestamp) / 60 / 60 / 24

  const [overlay, setOverlay] = useState<boolean>(false)
  const [timeSpan, setTimeSpan] = useState<number | null>(30)
  const [currentFirstDay, setCurrentFirstDay] = useState<number>(() => {
    // Initialize with the correct value based on firstDay prop
    return parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
  })
  const [currentOriginalFirstDayTimestamp, setCurrentOriginalFirstDayTimestamp] = useState<number>(() => {
    return parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
  })
  const [currentLastDayTimestamp, setCurrentLastDayTimestamp] = useState<number>(() => {
    return parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24
  })

  const onClose = useCallback(() => {
    setOverlay(false)
  }, [])

  // Effect to handle timespan changes and prop changes (when index changes)
  useEffect(() => {
    console.log('ControlPanel: Props changed', { firstDay, lastDay, timeSpan })
    const newOriginalFirstDayTimestamp = parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
    const newLastDayTimestamp = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24

    console.log('ControlPanel: Calculated timestamps', {
      newOriginalFirstDayTimestamp,
      newLastDayTimestamp,
      firstDay,
      lastDay
    })

    // Update state with new values
    setCurrentOriginalFirstDayTimestamp(newOriginalFirstDayTimestamp)
    setCurrentLastDayTimestamp(newLastDayTimestamp)

    // Reset currentFirstDay based on current timeSpan
    if (timeSpan) {
      const newFirstDay = Math.max(
        newOriginalFirstDayTimestamp,
        newLastDayTimestamp - timeSpan
      )
      setCurrentFirstDay(newFirstDay)
    } else {
      setCurrentFirstDay(newOriginalFirstDayTimestamp)
    }
  }, [firstDay, lastDay, timeSpan])

  // Reset to full range
  const resetTimeRange = useCallback(() => {
    setCurrentFirstDay(currentOriginalFirstDayTimestamp)
    setTimeSpan(null)
  }, [currentOriginalFirstDayTimestamp])

  let rows: React.ReactElement[] = []
  for (let i = currentFirstDay; i <= currentLastDayTimestamp; i++) {
    rows.push(<option key={i} value={i}></option>)
  }

  const handleTimeSpanChange = (newTimeSpan: number | null) => {
    setTimeSpan(newTimeSpan)
  }

  const handleButtonClick = (value: number) => {
    props.onChange(value.toString())
  }

  return (
    <>
      <div className="controlpanel">
        <h2 onClick={() => setOverlay(true)}>
          {metadata?.short_name} - {metadata?.long_name}{' '}
          <span className="getMoreInfoIcon">i</span>
        </h2>

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
            onChange={(evt) => props.onChange(evt.target.value)}
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