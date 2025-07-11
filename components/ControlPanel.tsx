import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback, useEffect } from 'react'
import type { ControlPanelProps } from '@/types'

function ControlPanel(props: ControlPanelProps) {
  const { day, metadata, firstDay, lastDay } = props
  const timestamp = format(new Date(day), 'X')
  const dayFromTimestamp = parseInt(timestamp) / 60 / 60 / 24
  const originalFirstDayTimestamp = parseInt(format(new Date(firstDay), 'X')) / 60 / 60 / 24
  const lastDayTimestamp = parseInt(format(new Date(lastDay), 'X')) / 60 / 60 / 24

  const [overlay, setOverlay] = useState<boolean>(false)
  const [timeSpan, setTimeSpan] = useState<number | null>(30)
  const [currentFirstDay, setCurrentFirstDay] = useState<number>(originalFirstDayTimestamp)

  const onClose = useCallback(() => {
    setOverlay(false)
  }, [])

  // Effect to handle timespan changes
  useEffect(() => {
    if (timeSpan) {
      // Calculate new first day based on timespan
      const newFirstDay = Math.max(
        originalFirstDayTimestamp,
        lastDayTimestamp - timeSpan
      )
      setCurrentFirstDay(newFirstDay)
    }
  }, [timeSpan, lastDayTimestamp, originalFirstDayTimestamp])

  // Reset to full range
  const resetTimeRange = useCallback(() => {
    setCurrentFirstDay(originalFirstDayTimestamp)
    setTimeSpan(null)
  }, [originalFirstDayTimestamp])

  let rows: React.ReactElement[] = []
  for (let i = currentFirstDay; i <= lastDayTimestamp; i++) {
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
              aria-label={`Show all ${Math.round(lastDayTimestamp - originalFirstDayTimestamp)} days`}
            >
              Last {Math.round(lastDayTimestamp - originalFirstDayTimestamp)} days
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
              dayFromTimestamp > lastDayTimestamp
                ? lastDayTimestamp
                : dayFromTimestamp < currentFirstDay
                  ? lastDayTimestamp
                  : dayFromTimestamp
            }
            min={currentFirstDay}
            max={lastDayTimestamp}
            step={1}
            onChange={(evt) => props.onChange(evt.target.value)}
            aria-label="Select date"
            aria-controls="selected-date"
            aria-valuemin={currentFirstDay}
            aria-valuemax={lastDayTimestamp}
            aria-valuenow={dayFromTimestamp}
          />
          <datalist id="tickmarks">{rows}</datalist>

          {dayFromTimestamp < lastDayTimestamp ? (
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
                <a href={metadata?.factsheet} target="_blank" rel="noreferrer">
                  Download {metadata?.short_name} Factsheet
                </a>
              </p>
            )}
            {metadata?.doi && (
              <p>
                <a href={metadata?.doi} target="_blank" rel="noreferrer">
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

export default React.memo(ControlPanel)