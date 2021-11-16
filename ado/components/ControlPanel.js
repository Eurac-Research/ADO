import * as React from 'react';
import { format } from 'date-format-parse';
import Link from 'next/link'

function ControlPanel(props) {

  const {day} = props;
  const {title} = props;
  const timestamp = format(day, 'X');
  const dayFromTimestamp = timestamp / 60 / 60 / 24

  return (
    <div className="controlpanel">
      <h3>{title} prototype</h3>
      <hr />
      <div key={'day'} className="input">
        <label>Day: {day}</label>
        <input
          type="range"
          value={dayFromTimestamp}
          min={17434}
          max={17533}
          step={1}
          onChange={evt => props.onChange(evt.target.value)}
        />
        {dayFromTimestamp >= 17434 && (
          <button
            type="submit"
            value={dayFromTimestamp - 1}
            onClick={evt => props.onChange(evt.target.value)}>
            -1 day (timestamp {dayFromTimestamp - 1})
          </button>
        )}
        {dayFromTimestamp < 17533 && (
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
          <a>cdi initial data</a>
        </Link>
        <Link href="/spi3">
          <a>spi3</a>
        </Link>
        <Link href="/cdi">
          <a>cdi</a>
        </Link>
        <Link href="/vci">
          <a>vci</a>
        </Link>
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
