import React from 'react'

function TimeSeriesLegend() {
  return (
    <div className="timeSeriesLegend">
      <div style={{ marginTop: '18px', width: '140px', flexShrink: '0' }}>
        <h4>How to read the values </h4>
        <p>Did you know? You can select and compare several indices.</p>
      </div>
      <div className="legendItem">
        <h3>SPEI / SPI / SMA</h3>
        <div className="timeSeriesLegendBox">
          <span className="value">&nbsp;2</span>
          <span>Extremely wet</span>
          <span className="value">&nbsp;1.5</span>
          <span>Very wet</span>
          <span className="value">&nbsp;1</span>
          <span>Moderately wet</span>
          <span className="zero value">&nbsp;0</span>
          <span className="zero">Normal</span>
          <span className="value">-1</span>
          <span>Moderately dry</span>
          <span className="value">-1.5</span>
          <span>Very dry</span>
          <span className="value">-2</span>
          <span>Extremely dry</span>
        </div>
      </div>
      <div className="legendItem">
        <h3>SSPI</h3>
        <div className="timeSeriesLegendBox">
          <span className="value">&nbsp;2</span>
          <span>Highly more than normal</span>
          <span className="value">&nbsp;1.5</span>
          <span>Much more than normal</span>
          <span className="value">&nbsp;1</span>
          <span>More than normal</span>
          <span className="zero value">&nbsp;0</span>
          <span className="zero">Near normal conditions</span>
          <span className="value">-1</span>
          <span>Less than normal</span>
          <span className="value">-1.5</span>
          <span>Much less than normal</span>
          <span className="value">-2</span>
          <span>Highly less than normal</span>
        </div>
      </div>
      <div className="legendItem">
        <h3>VCI / VHI</h3>
        <div className="timeSeriesLegendBox">
          <span className="value">100</span>
          <span>Extremely high vitality</span>
          <span className="value">&nbsp;75</span>
          <span>High vitality</span>
          <span className="zero value">&nbsp;50</span>
          <span className="zero">Average vitality</span>
          <span className="value">&nbsp;25</span>
          <span>Low vitality</span>
          <span className="value">&nbsp;&nbsp;0</span>
          <span>Extremely low vitality</span>
        </div>
      </div>
    </div>
  )
}

export default TimeSeriesLegend
