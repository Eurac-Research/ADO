import * as React from 'react';
import { format } from 'date-format-parse';
import Link from 'next/link'

function ControlPanel(props) {

  const {day, title, firstDay, lastDay} = props;
  const timestamp = format(day, 'X');
  const dayFromTimestamp = timestamp / 60 / 60 / 24
  const firstDayTimestamp = format(firstDay, 'X') / 60 / 60 / 24
  const lastDayTimestamp = format(lastDay, 'X') / 60 / 60 / 24

  return (
    <div className="controlpanel">
      <h3>{title} prototype</h3>
      <hr />
      <div key={'day'} className="input">
        <label>Day: {day}</label>
        <input
          type="range"
          value={dayFromTimestamp}
          min={firstDayTimestamp}
          max={lastDayTimestamp}
          step={1}
          onChange={evt => props.onChange(evt.target.value)}
        />
        {dayFromTimestamp > firstDayTimestamp && (
          <button
            type="submit"
            value={dayFromTimestamp - 1}
            onClick={evt => props.onChange(evt.target.value)}>
            -1 day (timestamp {dayFromTimestamp - 1})
          </button>
        )}
        {dayFromTimestamp < lastDayTimestamp && (
          <button
            type="submit"
            value={dayFromTimestamp + 1}
            onClick={evt => props.onChange(evt.target.value)}>
            +1 day (timestamp {dayFromTimestamp + 1})
          </button>
        )}
      </div>
      <div className="navigation">
        <Link prefetch={false} href="/cdi">
          <a>cdi</a>
        </Link>
        <Link prefetch={false} href="/vci">
          <a>vci</a>
        </Link>
        <Link prefetch={false} href="/vhi">
          <a>vhi</a>
        </Link>
        <Link prefetch={false} href="/sma">
          <a>sma</a>
        </Link>
        <Link prefetch={false} href="/spei-1">
          <a>spei-1</a>
        </Link>
        <Link prefetch={false} href="/spei-3">
          <a>spei-3</a>
        </Link>
        <Link prefetch={false} href="/spei-6">
          <a>spei-6</a>
        </Link>
        <Link prefetch={false} href="/spei-12">
          <a>spei-12</a>
        </Link>
        <Link prefetch={false} href="/spi-1">
          <a>spi-1</a>
        </Link>
        <Link prefetch={false} href="/spi-3">
          <a>spi-3</a>
        </Link>
        <Link prefetch={false} href="/spi-6">
          <a>spi-6</a>
        </Link>
        <Link prefetch={false} href="/spi-12">
          <a>spei-12</a>
        </Link>
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
