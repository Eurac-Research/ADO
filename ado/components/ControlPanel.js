import * as React from 'react';
import { format } from 'date-format-parse';

function ControlPanel(props) {
  const {day} = props;

  const str = day ? day.toString() : "20180101"
  const formattedDate = str.substr(0,4)+"-"+str.substr(4,2)+"-"+str.substr(6,2);
  const timestamp = format(formattedDate, 'X');

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
          max={17896}
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
        {dayFromTimestamp <= 17895 && (
          <button
            type="submit"
            value={dayFromTimestamp + 1}
            onClick={evt => props.onChange(evt.target.value)}>
              +1 day (timestamp {dayFromTimestamp + 1})
          </button>
        )}
      </div>
    </div>
  );
}

export default React.memo(ControlPanel);
