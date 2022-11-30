import * as React from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

function ControlPanelImpacts(props) {
  const { year, yearRange } = props

  const selectedYear = year ? year : [...yearRange].pop()

  const router = useRouter()

  return (
    <div className="controlpanel">
      <h1>{selectedYear}</h1>

      <div className="impactsNutsSwitch">
        <Link
          href="/impacts"
          className={router.pathname === '/impacts' ? 'active' : ''}>
          
            Nuts 2
          
        </Link>
        <Link
          href="/impacts-nuts3"
          className={router.pathname === '/impacts-nuts3' ? 'active' : ''}>
          
            Nuts 3
          
        </Link>
      </div>

      <div className="timerangeSlider">
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
      </div>
    </div>
  );
}

export default React.memo(ControlPanelImpacts)
