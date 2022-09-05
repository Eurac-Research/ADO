import * as React from 'react'
import { format } from 'date-format-parse'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

function ControlPanelImpacts(props) {
  const { year, yearRange } = props

  console.log('yearRange', [...yearRange].pop())

  const selectedYear = year ? year : [...yearRange].pop()

  const router = useRouter()

  return (
    <div className="controlpanel">
      <h1>{selectedYear}</h1>

      <div className="impactsNutsSwitch">
        <Link href="/impacts">
          <a className={router.pathname === '/impacts' ? 'active' : ''}>
            Nuts 2
          </a>
        </Link>
        <Link href="/impacts-nuts3">
          <a className={router.pathname === '/impacts-nuts3' ? 'active' : ''}>
            Nuts 3
          </a>
        </Link>
      </div>

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
          list="tickmarks"
          value={selectedYear}
          step={1}
          min="1503"
          max="2020"
          onChange={(evt) => props.onChange(evt.target.value)}
        />

        <datalist id="tickmarks">
          {yearRange?.map((tick) => {
            return <option key={tick} value={tick}></option>
          })}
        </datalist>

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

export default React.memo(ControlPanelImpacts)
