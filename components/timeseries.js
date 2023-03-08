import { useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { registerTheme } from 'echarts'

function TimeSeries(props) {
  registerTheme('mytheme', {
    seriesCnt: '13',
    backgroundColor: 'rgba(0,0,0,0)',
    titleColor: '#27727b',
    subtitleColor: '#aaaaaa',
    textColorShow: false,
    textColor: '#333',
    markTextColor: '#eeeeee',
    color: [
      '#c1232b',
      '#27727b',
      '#fcce10',
      '#e87c25',
      '#b5c334',
      '#fe8463',
      '#9bca63',
      '#fad860',
      '#f3a43b',
      '#60c0dd',
      '#d7504b',
      '#c6e579',
      '#f4e001',
      '#f0805a',
      '#26c0c0',
    ],
    borderColor: '#ccc',
    borderWidth: 0,
    visualMapColor: ['#c1232b', '#fcce10'],
    legendTextColor: '#333333',
    kColor: '#c1232b',
    kColor0: '#b5c334',
    kBorderColor: '#c1232b',
    kBorderColor0: '#b5c334',
    kBorderWidth: 1,
    lineWidth: '3',
    symbolSize: '5',
    symbol: 'emptyCircle',
    symbolBorderWidth: 1,
    lineSmooth: false,
    graphLineWidth: 1,
    graphLineColor: '#aaaaaa',
    mapLabelColor: '#c1232b',
    mapLabelColorE: 'rgb(100,0,0)',
    mapBorderColor: '#eeeeee',
    mapBorderColorE: '#444',
    mapBorderWidth: 0.5,
    mapBorderWidthE: 1,
    mapAreaColor: '#dddddd',
    mapAreaColorE: '#fe994e',
    axes: [
      {
        type: 'all',
        name: '通用坐标轴',
        axisLineShow: true,
        axisLineColor: '#333',
        axisTickShow: true,
        axisTickColor: '#333',
        axisLabelShow: true,
        axisLabelColor: '#333',
        splitLineShow: true,
        splitLineColor: ['#ccc'],
        splitAreaShow: false,
        splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)'],
      },
      {
        type: 'category',
        name: '类目坐标轴',
        axisLineShow: true,
        axisLineColor: '#27727b',
        axisTickShow: true,
        axisTickColor: '#27727b',
        axisLabelShow: true,
        axisLabelColor: '#333',
        splitLineShow: false,
        splitLineColor: ['#ccc'],
        splitAreaShow: false,
        splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)'],
      },
      {
        type: 'value',
        name: '数值坐标轴',
        axisLineShow: false,
        axisLineColor: '#333',
        axisTickShow: false,
        axisTickColor: '#333',
        axisLabelShow: true,
        axisLabelColor: '#333',
        splitLineShow: true,
        splitLineColor: ['#ccc'],
        splitAreaShow: false,
        splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)'],
      },
      {
        type: 'log',
        name: '对数坐标轴',
        axisLineShow: true,
        axisLineColor: '#27727b',
        axisTickShow: true,
        axisTickColor: '#333',
        axisLabelShow: true,
        axisLabelColor: '#333',
        splitLineShow: true,
        splitLineColor: ['#ccc'],
        splitAreaShow: false,
        splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)'],
      },
      {
        type: 'time',
        name: '时间坐标轴',
        axisLineShow: true,
        axisLineColor: '#27727b',
        axisTickShow: true,
        axisTickColor: '#333',
        axisLabelShow: true,
        axisLabelColor: '#333',
        splitLineShow: true,
        splitLineColor: ['#ccc'],
        splitAreaShow: false,
        splitAreaColor: ['rgba(250,250,250,0.3)', 'rgba(200,200,200,0.3)'],
      },
    ],
    axisSeperateSetting: true,
    toolboxColor: '#c1232b',
    toolboxEmphasisColor: '#e87c25',
    tooltipAxisColor: '#27727b',
    tooltipAxisWidth: 1,
    timelineLineColor: '#293c55',
    timelineLineWidth: 1,
    timelineItemColor: '#27727b',
    timelineItemColorE: '#72d4e0',
    timelineCheckColor: '#c1232b',
    timelineCheckBorderColor: '#c23531',
    timelineItemBorderWidth: 1,
    timelineControlColor: '#27727b',
    timelineControlBorderColor: '#27727b',
    timelineControlBorderWidth: 0.5,
    timelineLabelColor: '#293c55',
    datazoomBackgroundColor: 'rgba(0,0,0,0)',
    datazoomDataColor: 'rgba(181,195,52,0.3)',
    datazoomFillColor: 'rgba(181,195,52,0.2)',
    datazoomHandleColor: '#27727b',
    datazoomHandleWidth: '100',
    datazoomLabelColor: '#999999',
  })

  const { data, indices, index, firstDate, lastDate } = props

  /* second y-axis for vci and vhi */
  const series = indices?.map((index) => {
    return {
      type: 'line',
      showSymbol: false,
      yAxisIndex: index === 'vci' ? 1 : index === 'vhi' ? 1 : 0,
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

  // const onChartLegendselectchanged = (params, echartInstance) => {
  //   console.log('params', params)
  // }
  // const onEvents = {
  //   legendselectchanged: onChartLegendselectchanged,
  // }

  const options = {
    toolbox: {
      show: true,
      feature: {
        dataView: { readOnly: false },
        magicType: { type: ['line', 'bar'] },
        restore: {},
        saveAsImage: {},
      },
      right: '50',
      top: '0',
    },
    grid: {
      top: 100,
      right: 80,
      bottom: 80,
      left: 80,
      containLabel: false,
    },
    dataset: {
      dimensions: dimensions,
      source: data,
    },
    xAxis: {
      type: 'category',
    },
    yAxis: [
      {
        type: 'value',
        min: '-4',
        max: '4',
        position: 'left',
        axisLine: {
          show: true,
        },
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          formatter: '{value}',
        },
      },
      {
        type: 'value',
        position: 'right',
        name: 'VCI / VHI',
        min: 0,
        max: 100,
        axisLine: {
          show: true,
        },
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          formatter: '{value}',
        },
      },
    ],
    series: series,
    tooltip: {
      trigger: 'axis',
    },
    dataZoom: {
      type: 'slider',
      show: true,
      startValue: firstDate,
      endValue: lastDate,
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: '40',
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
            theme={'mytheme'}
            // onEvents={onEvents}
          />
        </>
      ) : (
        <>loading ...</>
      )}
    </>
  )
}
export default TimeSeries
