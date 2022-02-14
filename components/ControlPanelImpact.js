import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback } from 'react'


function ControlPanelImpact(props) {

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
          list="tickmarks"
          value={dayFromTimestamp}
          min={firstDayTimestamp}
          max={lastDayTimestamp}
          step={1}
          onChange={evt => props.onChange(evt.target.value)}
        />
        <datalist id="tickmarks">
          {rows}
        </datalist>

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

      {overlay && (
        <div className="overlayContainer" style={{ position: "fixed" }}>
          <div className="textOverlay">
            <span className="closeOverlay" onClick={onClose}>close X</span>
            <h3 className="overlayTitle">{metadata?.short_name} - {metadata?.long_name}</h3>
            <p>{metadata?.abstract}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(ControlPanelImpact);
