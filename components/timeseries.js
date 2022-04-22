
import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
import ReactECharts from 'echarts-for-react'
import { check } from 'prettier'


function TimeSeries(props) {

  const { data, indices, index } = props
  const [chartData, setChartData] = useState(null)

  /*   console.log("chartData:", data);
   */

  const series = indices?.map((index) => {
    return {
      type: 'line'
    }
  })

  const dimensionsArray = indices?.map((index) => {
    return index.toUpperCase()
  })
  const dimensions = ['date'].concat(dimensionsArray)

  console.log("dimensionsArray", dimensionsArray)

  console.log("index", index)


  const checkActiveIndex = (element) => element === index
  const activeDimension = dimensionsArray.findIndex(checkActiveIndex)

  console.log("array key of acitve dimension aka index (ex SPI-3): ", activeDimension)

  /* 
    create object for chart options and assign values 
  */
  const legendObject = {}
  for (const item of indices) {
    if (index === item.toUpperCase()) {
      legendObject[item.toUpperCase()] = true
    } else {
      legendObject[item.toUpperCase()] = false
    }
  }





  const options = {
    title: {
      text: 'timeseries',
      padding: [
        5,  // up
        10, // right
        25,  // down
        10, // left
      ]
    },
    toolbox: {
      show: true,
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        dataView: { readOnly: false },
        magicType: { type: ['line', 'bar'] },
        restore: {},
        saveAsImage: {}
      }
    },
    grid: { top: 60, right: 8, bottom: 40, left: 36 },
    dataset: {
      dimensions: dimensions,
      source: data
    },
    xAxis: {
      type: 'category',
    },
    yAxis: {
    },
    series: series,
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      orient: 'horizontal',
      top: '40px',
      icon: 'pin',
      selected: legendObject
    },
    visualMap: {
      type: 'piecewise',
      show: false,
      dimension: 7,
      min: 0,
      max: 100,
      inRange: {
      },
      outOfRange: {
        color: ['red', 'black']
      },
    }
  }


  return (
    <>
      {data ?
        <>
          <ReactECharts
            option={options}
            style={{ height: "400px", marginTop: "40px" }}
          />
        </>
        : <>loading ...</>
      }
    </>
  )
}
export default TimeSeries
