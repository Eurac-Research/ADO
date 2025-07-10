'use client'
import * as React from 'react'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ControlPanelImpactsProps } from '@/types'

function ControlPanelImpacts({
  year,
  yearRange,
  onChange
}: ControlPanelImpactsProps) {
  const selectedYear = year || yearRange[yearRange.length - 1]?.toString()
  const router = useRouter()

  return (
    <div className="controlpanel">
      <h1>{selectedYear}</h1>

      <div className="impactsNutsSwitch">
        <Link
          href="/impacts"
          className="active"
        >
          Nuts 2
        </Link>
        <Link
          href="/impacts-nuts3"
        >
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
          onChange={(evt) => onChange(evt.target.value)}
        />
        <datalist id="tickmarks">
          {yearRange?.map((tick) => (
            <option key={tick} value={tick}></option>
          ))}
        </datalist>
      </div>
    </div>
  )
}
export default React.memo(ControlPanelImpacts)