import * as React from 'react'
import { useRouter } from 'next/router'

function ControlPanelImpactsProbs(props) {
  const { spei } = props
  const selectedSpei = spei ? spei : '-4'
  const router = useRouter()
  const type = router.query.type === 'sma' ? 'SMA-1' : 'SPEI-3'

  return (
    <div className="controlpanel probabilities">
      <h2>
        {router.query.type === 'sma'
          ? 'Soil-moisture drought impact (DSM)  probability'
          : 'Hydrological drought impact (DH) probability'}
      </h2>
      <h1>
        {selectedSpei === '-4' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {type}{' '}
            </span>
            <span style={{ color: '' }}>-4 </span>
            <span style={{ fontStyle: 'italic' }}>extremely dry</span>
          </>
        ) : selectedSpei === '-3' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {type}{' '}
            </span>
            <span style={{ color: '' }}>-3 </span>
            <span style={{ fontStyle: 'italic' }}>extremely dry</span>
          </>
        ) : selectedSpei === '-2' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {type}{' '}
            </span>
            <span style={{ color: '' }}>-2 </span>
            <span style={{ fontStyle: 'italic' }}>very dry</span>
          </>
        ) : selectedSpei === '-1' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {type}{' '}
            </span>
            <span style={{ color: '' }}>-1 </span>
            <span style={{ fontStyle: 'italic' }}>moderately dry</span>
          </>
        ) : (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {type}{' '}
            </span>
            <span style={{ color: '' }}>0 </span>
            <span style={{ fontStyle: 'italic' }}>normal</span>
          </>
        )}
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
    </div>
  )
}

export default React.memo(ControlPanelImpactsProbs)
