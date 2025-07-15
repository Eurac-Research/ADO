"use client"
import * as React from 'react'

interface ControlPanelImpactsProbsProps {
  spei: string
  type: string
  onChange: (value: string) => void
}

function ControlPanelImpactsProbsTs({ spei, type, onChange }: ControlPanelImpactsProbsProps) {
  const selectedSpei = spei || '-4'
  const indexType = type === 'sma' ? 'SMA-1' : 'SPEI-3'

  return (
    <div className="controlpanel probabilities">
      <h2>
        {type === 'sma'
          ? 'Soil-moisture drought impact (DSM) probability'
          : 'Hydrological drought impact (DH) probability'}
      </h2>
      <h1>
        {selectedSpei === '-4' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {indexType}{' '}
            </span>
            -4 <span style={{ fontStyle: 'italic' }}>extremely dry</span>
          </>
        ) : selectedSpei === '-3' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {indexType}{' '}
            </span>
            -3 <span style={{ fontStyle: 'italic' }}>extremely dry</span>
          </>
        ) : selectedSpei === '-2' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {indexType}{' '}
            </span>
            -2 <span style={{ fontStyle: 'italic' }}>very dry</span>
          </>
        ) : selectedSpei === '-1' ? (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {indexType}{' '}
            </span>
            -1 <span style={{ fontStyle: 'italic' }}>moderately dry</span>
          </>
        ) : (
          <>
            <span style={{ color: '#333', fontWeight: '400' }}>
              Scenario {indexType}{' '}
            </span>
            0 <span style={{ fontStyle: 'italic' }}>normal</span>
          </>
        )}
      </h1>

      <div className="timerangeSlider">
        <input
          type="range"
          value={selectedSpei}
          step={1}
          min="-4"
          max="0"
          onChange={(evt) => onChange(evt.target.value)}
        />
      </div>
    </div>
  )
}

export default React.memo(ControlPanelImpactsProbsTs)