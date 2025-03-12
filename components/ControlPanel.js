import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback, useEffect } from 'react'

function ControlPanel(props) {
  const { day, metadata, firstDay, lastDay } = props
  const timestamp = format(day, 'X')
  const dayFromTimestamp = timestamp / 60 / 60 / 24
  const originalFirstDayTimestamp = format(firstDay, 'X') / 60 / 60 / 24
  const lastDayTimestamp = format(lastDay, 'X') / 60 / 60 / 24

  const [overlay, setOverlay] = useState(null)
  // Initialize timeSpan with 30 days instead of null
  const [timeSpan, setTimeSpan] = useState(30)
  const [currentFirstDay, setCurrentFirstDay] = useState(originalFirstDayTimestamp)

  const onClose = useCallback(async (event) => {
    setOverlay()
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
    setTimeSpan(null)  // Also reset the timeSpan when going to full range
  }, [originalFirstDayTimestamp])

  let rows = []
  for (let i = currentFirstDay; i <= lastDayTimestamp; i++) {
    rows.push(<option key={i} value={i}></option>)
  }

  return (
    <>
      <div className="controlpanel">
        <h2 onClick={() => setOverlay(true)}>
          {metadata?.short_name} - {metadata?.long_name}{' '}
          <span className="getMoreInfoIcon">i</span>
        </h2>

        <div className="timeSpanButtons flex gap-1 md:gap-3 text-[10px] md:text-xs mb-4">
          <button
            onClick={() => setTimeSpan(30)}
            className={`px-3 py-1 rounded ${timeSpan === 30 ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setTimeSpan(90)}
            className={`px-3 py-1 rounded ${timeSpan === 90 ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
          >
            Last 90 days
          </button>
          <button
            onClick={resetTimeRange}
            className={`px-3 py-1 rounded ${timeSpan === null ? 'bg-blue-500 text-white font-bold' : 'bg-gray-200'}`}
          >
            Last {Math.round(lastDayTimestamp - originalFirstDayTimestamp)} days
          </button>
        </div>

        <h1>{day}</h1>
        <div key={'day'} className="timerangeSlider">
          {dayFromTimestamp > currentFirstDay ? (
            <button
              title="prev"
              type="submit"
              value={dayFromTimestamp - 1}
              onClick={(evt) => props.onChange(evt.target.value)}
              className='p-2'
            >
              &lt;
            </button>
          ) : (
            <button disabled={true} className='p-2'>&lt;</button>
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
          />
          <datalist id="tickmarks">{rows}</datalist>

          {dayFromTimestamp < lastDayTimestamp ? (
            <button
              title="next"
              type="submit"
              value={dayFromTimestamp + 1}
              onClick={(evt) => props.onChange(evt.target.value)}
              className='p-2'
            >
              &gt;
            </button>
          ) : (
            <button disabled={true} className='p-2'>&gt;</button>
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
