import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback } from 'react'


function ControlPanel(props) {

  const { day, metadata, firstDay, lastDay } = props;
  const timestamp = format(day, 'X');
  const dayFromTimestamp = timestamp / 60 / 60 / 24
  const firstDayTimestamp = format(firstDay, 'X') / 60 / 60 / 24
  const lastDayTimestamp = format(lastDay, 'X') / 60 / 60 / 24

  const [overlay, setOverlay] = useState(null)
  const onClose = useCallback(async (event) => {
    setOverlay()
  }, []);

  let rows = [];
  for (let i = firstDayTimestamp; i <= lastDayTimestamp; i++) {
    rows.push(<option key={i} value={i}></option>);
  }

  return (
    <div className="controlpanel">
      <h2>{metadata?.short_name} - {metadata?.long_name} <span className="getMoreInfoIcon" onClick={setOverlay}>i</span></h2>
      <h1>{day}</h1>
      <div key={'day'} className="timerangeSlider">

        {dayFromTimestamp > firstDayTimestamp
          ? (
            <button
              title="prev"
              type="submit"
              value={dayFromTimestamp - 1}
              onClick={evt => props.onChange(evt.target.value)}>
              &lt;
            </button>
          )
          : <button disabled={true}>&lt;</button>
        }
        <input
          type="range"
          value={dayFromTimestamp}
          min={firstDayTimestamp}
          max={lastDayTimestamp}
          step={1}
          onChange={evt => props.onChange(evt.target.value)}
        />

        {dayFromTimestamp < lastDayTimestamp
          ? (
            <button
              title="next"
              type="submit"
              value={dayFromTimestamp + 1}
              onClick={evt => props.onChange(evt.target.value)}>
              &gt;
            </button>
          )
          : <button disabled={true}>&gt;</button>
        }
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
