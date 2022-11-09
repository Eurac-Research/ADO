import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

function ControlPanelImpactsProbs(props) {
  const { spei } = props
  const selectedSpei = spei ? spei : '-4'

  const router = useRouter()
  return (
    <div className="controlpanel">
      <h2>
        {router.query.type === 'sma'
          ? 'SMA-1 - Soil Moisture Anomalies'
          : 'SPEI-3 - Standardized Precipitation and Evapotranspiration Index'}
      </h2>
      <h1>
        {selectedSpei === '-4'
          ? 'Extremely dry'
          : selectedSpei === '-3'
          ? 'Very dry'
          : selectedSpei === '-2'
          ? 'Moderately dry'
          : selectedSpei === '-1'
          ? 'Moderately dry to normal ??'
          : 'Normal'}
      </h1>

      <div className="timerangeSlider">
        {/*selectedYear > yearRange[0]
          ? (
            <button
              title="prev"
              type="submit"
              value={selectedYear - 1} // WRONG - our range has holes
              onClick={evt => props.onChange(evt.target.value)}>
              &lt;
            </button>
          )
          : <button disabled={true}>&lt;</button>
          */}

        <input
          type="range"
          value={selectedSpei}
          step={1}
          min="-4"
          max="0"
          onChange={(evt) => props.onChange(evt.target.value)}
        />

        {/* <datalist id="tickmarks">
          {yearRange?.map((tick) => {
            return <option key={tick} value={tick}></option>
          })}
        </datalist> */}

        {/* selectedYear < yearRange[yearRange.length - 1]
          ? (
            <button
              title="next"
              type="submit"
              value={selectedYear + 1}
              onClick={evt => props.onChange(evt.target.value)}>
              &gt;
            </button>
          )
          : <button disabled={true}>&gt;</button>
          */}
      </div>
      <div className="switchImpactMap">
        {router.query.type === 'sma' ? (
          <Link href="?type=spei">show SPEI-3 map</Link>
        ) : (
          <Link href="?type=sma">show SMA-1 map</Link>
        )}
      </div>
    </div>
  )
}

export default React.memo(ControlPanelImpactsProbs)
