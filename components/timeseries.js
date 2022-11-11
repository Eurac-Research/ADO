import { useState } from 'react'
import ReactECharts from 'echarts-for-react'

function TimeSeries(props) {
  const { data, indices, index, metadata } = props

  const series = indices?.map((index) => {
    return {
      type: 'line',
      showSymbol: false,
    }
  })

  const dimensionsArray = indices?.map((index) => {
    return index.toUpperCase()
  })
  const dimensions = ['date'].concat(dimensionsArray)

  /* 
    create object for chart options and assign values 
  */
  const legendObject = {}
  for (const item of indices) {
    if (index === item.toUpperCase()) {
      legendObject[item.toUpperCase()] = true // index active
    } else {
      legendObject[item.toUpperCase()] = false // other indices inactive
    }
  }

  const [selecedDimensions, setSelecedDimensions] = useState(legendObject)

  const options = {
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
        },
        dataView: { readOnly: false },
        magicType: { type: ['line', 'bar'] },
        restore: {},
        saveAsImage: {},
      },
    },
    grid: {
      top: 80,
      right: 8,
      bottom: 40,
      left: 36,
      containLabel: false,
    },
    dataset: {
      dimensions: dimensions,
      source: data,
    },
    xAxis: {
      type: 'category',
    },
    yAxis: {},
    series: series,
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: '40px',
      icon: 'roundRect',
      selected: selecedDimensions,
    },
  }

  return (
    <>
      {data ? (
        <>
          <ReactECharts
            option={options}
            style={{ height: '400px', marginTop: '10px' }}
            onEvents={{
              legendselectchanged: onChartLegendselectchanged,
            }}
          />
        </>
      ) : (
        <>loading ...</>
      )}
    </>
  )
}
export default TimeSeries
