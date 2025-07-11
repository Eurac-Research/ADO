import React, { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { registerTheme } from 'echarts'
import type { TimeSeriesProps } from '@/types'

function TimeSeries(props: TimeSeriesProps) {
  registerTheme('mytheme', {
    seriesCnt: '13',
    backgroundColor: 'rgba(0,0,0,0)',
    titleColor: '#27727b',
    subtitleColor: '#aaaaaa',
    textColorShow: false,
    textColor: '#333',
    markTextColor: '#eeeeee',
    color: [
      '#607cba',
      '#b34190',
      '#5bcbc1',
      '#d3742f',
      '#7651be',
      '#dab073',
      '#ce8dc7',
      '#81742d',
      '#92493a',
      '#c7c842',
      '#d44952',
      '#43783c',
      '#6bcc5e',
      '#95ce8b',
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

  // console.log("index", index)

  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  const series = indices?.map((indexName) => {
    return {
      type: 'line',
      showSymbol: false,
      yAxisIndex: indexName === 'vci' ? 1 : indexName === 'vhi' ? 1 : 0,
      connectNulls: false, // This ensures gaps are shown for null/undefined values
    }
  })

  const dimensionsArray = indices?.map((indexName) => {
    return indexName.toUpperCase()
  })
  const dimensions = ['date'].concat(dimensionsArray || [])

  const legendObject: Record<string, boolean> = {}
  for (const item of indices) {
    if (index === item.toUpperCase()) {
      legendObject[item.toUpperCase()] = true
    } else {
      legendObject[item.toUpperCase()] = false
    }
  }

  const [selectedDimensions, setSelectedDimensions] = useState<Record<string, boolean>>(legendObject)

  // Show tooltip after chart loads
  useEffect(() => {
    if (data) {
      // Check if user has seen the tooltip before
      const hasSeenTooltip = localStorage.getItem('hasSeenDataZoomTooltip')

      if (!hasSeenTooltip) {
        // Small delay to ensure chart is rendered
        const timer = setTimeout(() => {
          setShowTooltip(true)
        }, 1000)

        return () => clearTimeout(timer)
      }
    }
  }, [data])

  // Hide tooltip and save in localStorage
  const dismissTooltip = (): void => {
    setShowTooltip(false)
    localStorage.setItem('hasSeenDataZoomTooltip', 'true')
  }

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
      showDetail: true,
      handleLabel: {
        show: true,
      },
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      top: '40',
      icon: 'roundRect',
      selected: selectedDimensions,
    },
  }

  return (
    <div className="relative">
      {data ? (
        <>
          <ReactECharts
            option={options}
            style={{ height: '400px', marginTop: '10px' }}
            theme={'mytheme'}
          />

          {showTooltip && (
            <>
              <div
                className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white py-2 px-4 rounded shadow-lg max-w-xs text-center"
                style={{
                  zIndex: 1000,
                  animation: 'fadeIn 0.5s'
                }}
              >
                <p>Try using this slider to zoom in on specific time periods or expand the timespan back to 1979!</p>
                <button
                  onClick={dismissTooltip}
                  className="mt-2 bg-white text-blue-500 px-2 py-1 rounded text-xs font-bold"
                >
                  Got it
                </button>
              </div>

              <div
                className="absolute bottom-7 left-[88%] transform -translate-x-1/2"
                style={{
                  zIndex: 999,
                  animation: 'bounce 1.5s infinite'
                }}
              >
                <svg className='w-14 h-14 rotate-[5deg] fill-blue-500' xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 302.816 302.816">
                  <path d="M298.423 152.996c-5.857-5.858-15.354-5.858-21.213 0l-35.137 35.136c-5.871-59.78-50.15-111.403-112.001-123.706-45.526-9.055-92.479 5.005-125.596 37.612-5.903 5.813-5.977 15.31-.165 21.213 5.813 5.903 15.31 5.977 21.212.164 26.029-25.628 62.923-36.679 98.695-29.565 48.865 9.72 83.772 50.677 88.07 97.978l-38.835-38.835c-5.857-5.857-15.355-5.858-21.213.001-5.858 5.858-5.858 15.355 0 21.213l62.485 62.485c2.929 2.929 6.768 4.393 10.606 4.393s7.678-1.464 10.607-4.393l62.483-62.482c5.86-5.858 5.86-15.356.002-21.214z" />
                </svg>
              </div>
            </>
          )}
        </>
      ) : (
        <>loading ...</>
      )}
    </div>
  )
}

export default TimeSeries