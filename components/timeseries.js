
import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'
import ReactECharts from 'echarts-for-react'
import { check } from 'prettier'


function TimeSeries(props) {

  const { data, indices, index } = props
  const [chartData, setChartData] = useState(null)
  const [activeLegend, setActiveLegend] = useState(index)


  const series = indices?.map((index) => {
    return {
      type: 'line'
    }
  })


  const dimensionsArray = indices?.map((index) => {
    return index.toUpperCase()
  })
  const dimensions = ['date'].concat(dimensionsArray)

  /*   console.log("dimensions", dimensions)
  
    console.log("index", index)
  
  
    console.log("data", data)
   */
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


  function onChartLegendselectchanged(param, echarts) {
    // console.log("legendclick: ", param, echarts);
/*     setActiveLegend(param?.name)
    setSelecedDimensions(param?.selected)
 */  };

  // console.log("selecedDimensions", selecedDimensions);

  const options = {
    /*     title: {
          text: 'timeseries',
          padding: [
            5,  // up
            10, // right
            25,  // down
            10, // left
          ]
        }, */
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
    grid: {
      top: 80,
      right: 8,
      bottom: 40,
      left: 36,
      containLabel: false
    },
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
      type: "scroll",
      orient: 'horizontal',
      top: '40px',
      icon: 'roundRect',
      selected: selecedDimensions
    },
/*     visualMap: {
      type: 'piecewise',
      show: false,
      dimension: activeLegend,
      min: 0,
      max: 100,
      inRange: {
      },
      outOfRange: {
        color: ['red', 'black']
      },
    }
 */  }


  return (
    <>
      {data ?
        <>
          <ReactECharts
            option={options}
            style={{ height: "400px", marginTop: "40px" }}
            onEvents={{
              'legendselectchanged': onChartLegendselectchanged
            }}
          />
        </>
        : <>loading ...</>
      }
    </>
  )
}
export default TimeSeries
