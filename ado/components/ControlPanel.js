import * as React from 'react';
import { format } from 'date-format-parse';
import Link from 'next/link'

function ControlPanel(props) {
  const {day} = props;
  const timestamp = format(day, 'X');
  const dayFromTimestamp = timestamp / 60 / 60 / 24

  return (
    <div className="controlpanel">
      <h3>Interactive GeoJSON</h3>
      <hr />
      <div key={'day'} className="input">
        <label>Day: {day}</label>
        <input
          type="range"
          value={dayFromTimestamp}
          min={17532}
          max={17562}
          step={1}
          onChange={evt => props.onChange(evt.target.value)}
        />

        {dayFromTimestamp >= 17533 && (
            <button
            type="submit"
            value={dayFromTimestamp - 1}
            onClick={evt => props.onChange(evt.target.value)}>
              -1 day (timestamp {dayFromTimestamp - 1})
          </button>
        )}
        {dayFromTimestamp < 17562 && (
          <button
            type="submit"
            value={dayFromTimestamp + 1}
            onClick={evt => props.onChange(evt.target.value)}>
              +1 day (timestamp {dayFromTimestamp + 1})
          </button>
        )}
      </div>
      <div className="navigation">
        <Link href="/">
          <a>spi3</a>
        </Link>
        <Link href="/cdi">
          <a>cdi</a>
        </Link>
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
