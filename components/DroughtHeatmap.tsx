'use client'

import { useMemo, useState, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import type { TimeSeriesData } from '@/types'

const MIN_DAYS_THRESHOLD = 20

type IndexFamily = 'drought' | 'vegetation'
type ColorScale = 'drought' | 'snowpack' | 'vegetation'

const HEATMAP_INDICES: { key: string; label: string; fullName: string; family: IndexFamily; colorScale: ColorScale }[] = [
  { key: 'SPEI-1', label: 'SPEI-1', fullName: 'Standardized Precipitation Evapotranspiration Index - 1', family: 'drought', colorScale: 'drought' },
  { key: 'SPEI-3', label: 'SPEI-3', fullName: 'Standardized Precipitation Evapotranspiration Index - 3', family: 'drought', colorScale: 'drought' },
  { key: 'SPI-1', label: 'SPI-1', fullName: 'Standardized Precipitation Index - 1', family: 'drought', colorScale: 'drought' },
  { key: 'SSPI-10', label: 'SSPI-10', fullName: 'Standardized Snowpack Index - 10', family: 'drought', colorScale: 'snowpack' },
  { key: 'SMA', label: 'SMA', fullName: 'Soil Moisture Anomaly', family: 'drought', colorScale: 'drought' },
  { key: 'VCI', label: 'VCI', fullName: 'Vegetation Condition Index', family: 'vegetation', colorScale: 'vegetation' },
  { key: 'VHI', label: 'VHI', fullName: 'Vegetation Health Index', family: 'vegetation', colorScale: 'vegetation' },
]

function getThreshold(family: IndexFamily): { value: number; label: string; shortLabel: string } {
  if (family === 'vegetation') {
    return { value: 25, label: 'Days < 25', shortLabel: '% < 25' }
  }
  return { value: -1, label: 'Days < −1', shortLabel: '% < −1' }
}

type MetricKey = 'mean' | 'median' | 'min' | 'ratioBelow'

const BASE_METRICS: { key: MetricKey; label: string; shortLabel: string }[] = [
  { key: 'median', label: 'Median', shortLabel: 'Median' },
  { key: 'mean', label: 'Mean', shortLabel: 'Mean' },
  { key: 'min', label: 'Minimum', shortLabel: 'Min' },
]

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface Agg {
  mean: number
  median: number
  min: number
  ratioBelow: number
  count: number
  dailyValues: number[]
}

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function buildBuckets(
  data: TimeSeriesData[],
  indexKey: string,
  keyFn: (d: Date) => string
): Map<string, number[]> {
  const buckets = new Map<string, number[]>()
  for (const row of data) {
    const val = row[indexKey]
    if (val === null || val === undefined || val === '' || typeof val === 'string') continue
    const num = Number(val)
    if (!Number.isFinite(num)) continue
    const d = new Date(row.date)
    const key = keyFn(d)
    let arr = buckets.get(key)
    if (!arr) {
      arr = []
      buckets.set(key, arr)
    }
    arr.push(num)
  }
  return buckets
}

function bucketsToAgg(
  buckets: Map<string, number[]>,
  threshold: number,
  minDays: number
): Map<string, Agg> {
  const result = new Map<string, Agg>()
  for (const [key, values] of buckets) {
    if (values.length < minDays) continue
    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((acc, v) => acc + v, 0)
    const belowCount = values.filter((v) => v < threshold).length
    result.set(key, {
      mean: sum / values.length,
      median: computeMedian(sorted),
      min: sorted[0],
      ratioBelow: (belowCount / values.length) * 100,
      count: values.length,
      dailyValues: values,
    })
  }
  return result
}

function aggregate(
  data: TimeSeriesData[],
  indexKey: string,
  threshold: number
): Map<string, Agg> {
  const buckets = buildBuckets(data, indexKey, (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`)
  return bucketsToAgg(buckets, threshold, MIN_DAYS_THRESHOLD)
}

function aggregateWeekly(
  data: TimeSeriesData[],
  indexKey: string,
  threshold: number,
  year: number
): Map<number, Agg> {
  const filtered = data.filter((row) => {
    const d = new Date(row.date)
    return d.getUTCFullYear() === year
  })
  const buckets = buildBuckets(filtered, indexKey, (d) => `${getISOWeek(d)}`)
  const raw = bucketsToAgg(buckets, threshold, 3)
  const result = new Map<number, Agg>()
  for (const [key, val] of raw) {
    result.set(Number(key), val)
  }
  return result
}

function getReadableTextColor(color: string): string {
  let r = 0, g = 0, b = 0
  if (color.startsWith('#')) {
    r = parseInt(color.slice(1, 3), 16)
    g = parseInt(color.slice(3, 5), 16)
    b = parseInt(color.slice(5, 7), 16)
  } else {
    const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (m) { r = +m[1]; g = +m[2]; b = +m[3] }
  }
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#57534e' : color
}

function getColorForValue(
  value: number,
  colorScale: ColorScale,
  metric: MetricKey
): string {
  if (metric === 'ratioBelow') {
    // Use the dry/low side of the active scale — higher % = more drought
    if (colorScale === 'vegetation') {
      if (value >= 80) return '#844c14'
      if (value >= 50) return '#c47a2a'
      if (value >= 20) return '#fdae61'
      return '#ffffbf'
    }
    if (colorScale === 'snowpack') {
      if (value >= 80) return '#ec0b00'
      if (value >= 50) return '#ed453d'
      if (value >= 20) return '#ee7f7a'
      return '#efefef'
    }
    // drought
    if (value >= 80) return '#d7191c'
    if (value >= 50) return '#fdae61'
    if (value >= 20) return '#ffffbf'
    return '#ffffff'
  }

  if (colorScale === 'vegetation') {
    if (value >= 100) return '#33a02c'
    if (value >= 75) return '#abd97e'
    if (value >= 50) return '#ffffbf'
    if (value >= 25) return '#fdae61'
    return '#844c14'
  }

  if (colorScale === 'snowpack') {
    if (value >= 2) return '#bbe2ea'
    if (value >= 1.5) return '#c8e5ec'
    if (value >= 1) return '#d5e9ed'
    if (value >= 0) return '#efefef'
    if (value >= -1) return '#ee7f7a'
    if (value >= -1.5) return '#ed453d'
    return '#ec0b00'
  }

  if (value >= 2) return '#450099'
  if (value >= 1.5) return '#b467dd'
  if (value >= 1) return '#f599f6'
  if (value >= 0) return '#ffffff'
  if (value >= -1) return '#ffffbf'
  if (value >= -1.5) return '#fdae61'
  return '#d7191c'
}

function getCategoryLabel(
  value: number,
  colorScale: ColorScale,
  metric: MetricKey
): string {
  if (metric === 'ratioBelow') {
    if (value >= 80) return 'Very high'
    if (value >= 50) return 'High'
    if (value >= 20) return 'Moderate'
    return 'Low'
  }

  if (colorScale === 'vegetation') {
    if (value >= 75) return 'Extremely high vitality'
    if (value >= 50) return 'High vitality'
    if (value >= 25) return 'Average vitality'
    if (value > 0) return 'Low vitality'
    return 'Extremely low vitality'
  }

  if (colorScale === 'snowpack') {
    if (value >= 2) return 'Highly more than normal'
    if (value >= 1.5) return 'Much more than normal'
    if (value >= 1) return 'More than normal'
    if (value >= 0) return 'Near normal conditions'
    if (value >= -1) return 'Less than normal'
    if (value >= -1.5) return 'Much less than normal'
    return 'Highly less than normal'
  }

  if (value >= 2) return 'Extremely wet'
  if (value >= 1.5) return 'Very wet'
  if (value >= 1) return 'Moderately wet'
  if (value >= 0) return 'Normal'
  if (value >= -1) return 'Moderately dry'
  if (value >= -1.5) return 'Very dry'
  return 'Extremely dry'
}

function renderSparkline(values: number[], family: IndexFamily): string {
  const w = 160
  const h = 36
  const n = values.length
  if (n < 2) return ''

  let yMin: number, yMax: number
  if (family === 'vegetation') {
    yMin = 0
    yMax = 100
  } else {
    yMin = -3
    yMax = 3
  }

  const toY = (v: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, v))
    return h - ((clamped - yMin) / (yMax - yMin)) * h
  }

  const zeroY = toY(0)

  const coords = values.map((v, i) => ({
    x: (i / (n - 1)) * w,
    y: toY(v),
  }))

  const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  // Area fill: line path closed down to zero line (drought) or bottom (vegetation)
  const baseY = family === 'drought' ? zeroY : h
  const areaPath = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ${coords
    .slice(1)
    .map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')} L${w},${baseY.toFixed(1)} L0,${baseY.toFixed(1)} Z`

  const zeroLine =
    family === 'drought'
      ? `<line x1="0" y1="${zeroY.toFixed(1)}" x2="${w}" y2="${zeroY.toFixed(1)}" stroke="#d6d3d1" stroke-width="0.5" stroke-dasharray="3,2"/>`
      : ''

  // Gradient fill for visual depth
  const gradId = `sg${Math.random().toString(36).slice(2, 7)}`
  const lineColor = family === 'drought' ? '#78716c' : '#57534e'
  const fillTop = family === 'drought' ? 'rgba(168,162,158,0.25)' : 'rgba(134,239,172,0.25)'
  const fillBot = family === 'drought' ? 'rgba(168,162,158,0.03)' : 'rgba(134,239,172,0.03)'

  return `<svg width="${w}" height="${h}" style="display:block;margin:6px 0" viewBox="0 0 ${w} ${h}">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${fillTop}"/><stop offset="100%" stop-color="${fillBot}"/></linearGradient></defs>
    ${zeroLine}
    <path d="${areaPath}" fill="url(#${gradId})"/>
    <polyline points="${linePoints}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`
}

function buildVisualMapConfig(
  metric: MetricKey,
  colorScale: ColorScale
): Record<string, unknown> {
  const baseLayout = {
    calculable: false,
    orient: 'horizontal' as const,
    left: 'center',
    bottom: 0,
    textStyle: { fontSize: 9, color: '#78716c' },
  }

  if (metric === 'ratioBelow') {
    // Use dry/low side of the active index's official scale
    const ratioColors: Record<ColorScale, string[]> = {
      drought: ['#ffffff', '#ffffbf', '#fdae61', '#d7191c'],
      snowpack: ['#efefef', '#ee7f7a', '#ed453d', '#ec0b00'],
      vegetation: ['#ffffbf', '#fdae61', '#c47a2a', '#844c14'],
    }
    return {
      ...baseLayout,
      type: 'continuous',
      min: 0,
      max: 100,
      inRange: {
        color: ratioColors[colorScale],
      },
      text: ['100%', '0%'],
      itemWidth: 14,
      itemHeight: 200,
    }
  }

  if (colorScale === 'vegetation') {
    // Official stops at 0, 25, 50, 75, 100 — evenly spaced, 5 colors work directly
    return {
      ...baseLayout,
      type: 'continuous',
      min: 0,
      max: 100,
      inRange: {
        color: ['#844c14', '#fdae61', '#ffffbf', '#abd97e', '#33a02c'],
        colorAlpha: [0.8, 0.7],
      },
      text: ['100', '0'],
      itemWidth: 14,
      itemHeight: 200,
    }
  }

  if (colorScale === 'snowpack') {
    // Official stops at -2, -1.5, -1, 0, 1, 1.5, 2 (non-uniform: wider gap around 0)
    // 9 evenly-spaced stops at -2, -1.5, -1, -0.5, 0, +0.5, +1, +1.5, +2
    // with interpolated midpoints at -0.5 and +0.5
    return {
      ...baseLayout,
      type: 'continuous',
      min: -2,
      max: 2,
      inRange: {
        color: [
          '#ec0b00',  // -2.0  Highly less than normal
          '#ed453d',  // -1.5  Much less than normal
          '#ee7f7a',  // -1.0  Less than normal
          '#efb7b5',  // -0.5  (interpolated)
          '#efefef',  //  0.0  Near normal
          '#e2ecee',  // +0.5  (interpolated)
          '#d5e9ed',  // +1.0  More than normal
          '#c8e5ec',  // +1.5  Much more than normal
          '#bbe2ea',  // +2.0  Highly more than normal
        ],
      },
      text: ['More (+2)', 'Less (-2)'],
      itemWidth: 14,
      itemHeight: 200,
    }
  }

  // drought (SPEI-1, SPEI-3, SPI-1, SMA)
  // Official stops at -2, -1.5, -1, 0, 1, 1.5, 2 (non-uniform: wider gap around 0)
  // 9 evenly-spaced stops at -2, -1.5, -1, -0.5, 0, +0.5, +1, +1.5, +2
  // with interpolated midpoints at -0.5 and +0.5
  return {
    ...baseLayout,
    type: 'continuous',
    min: -2,
    max: 2,
    inRange: {
      color: [
        '#d7191c',  // -2.0  Extremely dry
        '#fdae61',  // -1.5  Very dry
        '#ffffbf',  // -1.0  Moderately dry
        '#ffffdf',  // -0.5  (interpolated)
        '#ffffff',  //  0.0  Normal
        '#faccfb',  // +0.5  (interpolated)
        '#f599f6',  // +1.0  Moderately wet
        '#b467dd',  // +1.5  Very wet
        '#450099',  // +2.0  Extremely wet
      ],
      colorSaturation: [0.7, 0.5],
      //colorLightness: [1, 0],
      colorAlpha: [0.9, 0.6],

    },
    text: ['Wet (+2)', 'Dry (-2)'],
    itemWidth: 14,
    itemHeight: 200,
  }
}

interface DroughtHeatmapProps {
  data: TimeSeriesData[]
  regionName?: string
}

export default function DroughtHeatmap({ data, regionName }: DroughtHeatmapProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('median')
  const [zoomedYear, setZoomedYear] = useState<number | null>(null)
  const [isInDailyZoom, setIsInDailyZoom] = useState(false)

  const availableIndices = useMemo(
    () =>
      HEATMAP_INDICES.filter((idx) =>
        data.some((row) => {
          const val = row[idx.key]
          return val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val))
        })
      ),
    [data]
  )

  const currentIndex = availableIndices[selectedIndex] || availableIndices[0]

  const family = currentIndex?.family ?? 'drought'
  const thresholdConfig = getThreshold(family)

  const metrics = useMemo(
    () => [
      ...BASE_METRICS,
      { key: 'ratioBelow' as MetricKey, label: thresholdConfig.label, shortLabel: thresholdConfig.shortLabel },
    ],
    [thresholdConfig]
  )

  const aggregated = useMemo(
    () => currentIndex ? aggregate(data, currentIndex.key, thresholdConfig.value) : new Map<string, Agg>(),
    [data, currentIndex, thresholdConfig.value]
  )

  // Ascending sort: ECharts Y-axis renders bottom-up, so oldest at bottom, newest at top
  const years = useMemo(() => {
    const yearSet = new Set<number>()
    for (const key of aggregated.keys()) {
      yearSet.add(Number(key.split('-')[0]))
    }
    return [...yearSet].sort((a, b) => a - b)
  }, [aggregated])

  const heatmapData = useMemo(() => {
    const items: [number, number, number | null][] = []

    years.forEach((year, yIdx) => {
      for (let month = 0; month < 12; month++) {
        const agg = aggregated.get(`${year}-${month}`)
        if (!agg) {
          items.push([month, yIdx, null])
        } else {
          items.push([month, yIdx, Number(agg[selectedMetric].toFixed(2))])
        }
      }
    })

    return items
  }, [aggregated, years, selectedMetric])

  const visualMapConfig = useMemo(
    () => buildVisualMapConfig(selectedMetric, currentIndex?.colorScale ?? 'drought'),
    [selectedMetric, currentIndex?.colorScale]
  )

  const tooltipFormatter = useCallback(
    (params: any) => {
      const [monthIdx, yearIdx] = params.data
      const year = years[yearIdx]
      const monthLabel = MONTH_LABELS[monthIdx]
      const agg = aggregated.get(`${year}-${monthIdx}`)

      if (!agg) return `<strong>${monthLabel} ${year}</strong><br/><span style="color:#a8a29e">No data</span>`

      const currentVal = agg[selectedMetric]
      const cs = currentIndex?.colorScale ?? 'drought'
      const color = params.color || getColorForValue(currentVal, cs, selectedMetric)
      const category = getCategoryLabel(currentVal, cs, selectedMetric)
      const fmt = (v: number) => v.toFixed(2)
      const sparkline = renderSparkline(agg.dailyValues, family)

      const activeMetric = metrics.find((m) => m.key === selectedMetric)
      const activeLabel = activeMetric?.label || selectedMetric

      const metricRows = [
        { label: 'Mean', value: fmt(agg.mean), active: selectedMetric === 'mean' },
        { label: 'Median', value: fmt(agg.median), active: selectedMetric === 'median' },
        { label: 'Min', value: fmt(agg.min), active: selectedMetric === 'min' },
        { label: thresholdConfig.label, value: `${agg.ratioBelow.toFixed(1)}%`, active: selectedMetric === 'ratioBelow' },
      ]

      const rows = metricRows
        .map(
          (r) =>
            `<div style="display:flex;justify-content:space-between;gap:12px;${r.active ? 'font-weight:600' : 'opacity:0.7'}"><span>${r.label}</span><span>${r.value}</span></div>`
        )
        .join('')

      return `<div style="min-width:170px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color}"></span>
          <strong>${monthLabel} ${year}</strong>
          <span style="color:#a8a29e;font-size:11px">${agg.count}d</span>
        </div>
        <div style="font-size:11px;color:${getReadableTextColor(color)};margin-bottom:6px">${category} &middot; ${activeLabel}: ${selectedMetric === 'ratioBelow' ? currentVal.toFixed(1) + '%' : fmt(currentVal)}</div>
        ${sparkline}
        <div style="font-size:11px;margin-top:4px">${rows}</div>
        <div style="font-size:10px;color:#a8a29e;margin-top:6px;text-align:center">Click to zoom into weeks</div>
      </div>`
    },
    [aggregated, family, currentIndex?.colorScale, metrics, selectedMetric, thresholdConfig.label, years]
  )

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: tooltipFormatter,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e7e5e4',
        textStyle: { color: '#1c1917', fontSize: 12 },
        padding: [8, 10],
        extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.10);border-radius:6px;',
      },
      grid: {
        top: 8,
        right: 4,
        bottom: 48,
        left: 36,
      },
      xAxis: {
        type: 'category',
        data: MONTH_LABELS,
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 10, color: '#78716c' },
        position: 'top',
      },
      yAxis: {
        type: 'category',
        data: years.map(String),
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 10, color: '#78716c' },
      },
      visualMap: visualMapConfig,
      series: [
        {
          type: 'heatmap',
          data: heatmapData.filter(
            (item): item is [number, number, number] => item[2] !== null
          ),
          emphasis: {
            itemStyle: {
              shadowBlur: 4,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: '#1c1917',
              borderWidth: 1.5,
            },
          },
          itemStyle: {
            borderColor: 'transparent',
            borderWidth: 0,
          },
        },
      ],
    }),
    [heatmapData, tooltipFormatter, visualMapConfig, years]
  )

  const chartHeight = Math.max(220, years.length * 22 + 64)

  if (!currentIndex) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2 py-3 sm:px-4 sm:py-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isInDailyZoom ? `${zoomedYear} – Daily detail` : zoomedYear ? `${zoomedYear} – Weekly detail` : 'Monthly drought matrix'}{regionName ? ` – ${regionName}` : ''}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">
            {isInDailyZoom ? 'Raw daily values' : metrics.find((m) => m.key === selectedMetric)?.shortLabel} {currentIndex.fullName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex rounded-md border border-gray-300 bg-gray-100 p-0.5 dark:border-gray-600 dark:bg-gray-900">
            {availableIndices.map((idx, i) => (
              <button
                key={idx.key}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`rounded px-2 py-1 text-xs font-medium transition ${i === selectedIndex
                  ? 'bg-gray-800 text-white shadow-sm dark:bg-gray-200 dark:text-gray-900'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
              >
                {idx.label}
              </button>
            ))}
          </div>

          {!isInDailyZoom && (
            <div className="flex rounded-md border border-gray-300 bg-gray-100 p-0.5 dark:border-gray-600 dark:bg-gray-900">
              {metrics.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMetric(m.key)}
                  className={`rounded px-2 py-1 text-xs font-medium transition ${selectedMetric === m.key
                    ? 'bg-gray-800 text-white shadow-sm dark:bg-gray-200 dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                >
                  {m.shortLabel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!zoomedYear && (
        <ReactECharts
          option={option}
          style={{ width: '100%', height: `${chartHeight}px` }}
          notMerge
          onEvents={{
            click: (params: any) => {
              if (params.componentType === 'series') {
                const yearIdx = params.data[1]
                setZoomedYear(years[yearIdx])
              }
            },
          }}
        />
      )}

      {zoomedYear && (
        <WeeklyZoom
          data={data}
          year={zoomedYear}
          indexKey={currentIndex.key}
          family={currentIndex.family}
          colorScale={currentIndex.colorScale}
          threshold={thresholdConfig.value}
          selectedMetric={selectedMetric}
          thresholdLabel={thresholdConfig.label}
          metrics={metrics}
          onBack={() => { setZoomedYear(null); setIsInDailyZoom(false) }}
          onDailyZoomChange={setIsInDailyZoom}
        />
      )}
    </div>
  )
}

function WeeklyZoom({
  data,
  year,
  indexKey,
  family,
  colorScale,
  threshold,
  selectedMetric,
  thresholdLabel,
  metrics,
  onBack,
  onDailyZoomChange,
}: {
  data: TimeSeriesData[]
  year: number
  indexKey: string
  family: IndexFamily
  colorScale: ColorScale
  threshold: number
  selectedMetric: MetricKey
  thresholdLabel: string
  metrics: { key: MetricKey; label: string; shortLabel: string }[]
  onBack: () => void
  onDailyZoomChange: (inDaily: boolean) => void
}) {
  const [zoomedWeek, setZoomedWeek] = useState<number | null>(null)
  const weeklyAgg = useMemo(
    () => aggregateWeekly(data, indexKey, threshold, year),
    [data, indexKey, threshold, year]
  )

  const weeks = useMemo(() => {
    const all: number[] = []
    for (let w = 1; w <= 53; w++) {
      if (weeklyAgg.has(w)) all.push(w)
    }
    if (all.length === 0) {
      for (let w = 1; w <= 52; w++) all.push(w)
    }
    return all
  }, [weeklyAgg])

  const maxWeek = weeks[weeks.length - 1] || 52
  const weekLabels = Array.from({ length: maxWeek }, (_, i) => `W${i + 1}`)

  const heatmapData = useMemo(() => {
    const items: [number, number, number | null][] = []
    for (let w = 1; w <= maxWeek; w++) {
      const agg = weeklyAgg.get(w)
      items.push([w - 1, 0, agg ? Number(agg[selectedMetric].toFixed(2)) : null])
    }
    return items
  }, [weeklyAgg, maxWeek, selectedMetric])

  const visualMapConfig = useMemo(
    () => buildVisualMapConfig(selectedMetric, colorScale),
    [selectedMetric, colorScale]
  )

  const tooltipFormatter = useCallback(
    (params: any) => {
      const weekIdx = params.data[0]
      const weekNum = weekIdx + 1
      const agg = weeklyAgg.get(weekNum)
      if (!agg) return `<strong>W${weekNum}</strong><br/><span style="color:#a8a29e">No data</span>`

      const currentVal = agg[selectedMetric]
      const color = params.color || getColorForValue(currentVal, colorScale, selectedMetric)
      const category = getCategoryLabel(currentVal, colorScale, selectedMetric)
      const fmt = (v: number) => v.toFixed(2)
      const sparkline = renderSparkline(agg.dailyValues, family)
      const activeMetric = metrics.find((m) => m.key === selectedMetric)

      const metricRows = [
        { label: 'Median', value: fmt(agg.median), active: selectedMetric === 'median' },
        { label: 'Mean', value: fmt(agg.mean), active: selectedMetric === 'mean' },
        { label: 'Min', value: fmt(agg.min), active: selectedMetric === 'min' },
        { label: thresholdLabel, value: `${agg.ratioBelow.toFixed(1)}%`, active: selectedMetric === 'ratioBelow' },
      ]

      const rows = metricRows
        .map(
          (r) =>
            `<div style="display:flex;justify-content:space-between;gap:12px;${r.active ? 'font-weight:600' : 'opacity:0.7'}"><span>${r.label}</span><span>${r.value}</span></div>`
        )
        .join('')

      return `<div style="min-width:170px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color}"></span>
          <strong>W${weekNum} ${year}</strong>
          <span style="color:#a8a29e;font-size:11px">${agg.count}d</span>
        </div>
        <div style="font-size:11px;color:${getReadableTextColor(color)};margin-bottom:6px">${category} &middot; ${activeMetric?.label || selectedMetric}: ${selectedMetric === 'ratioBelow' ? currentVal.toFixed(1) + '%' : fmt(currentVal)}</div>
        ${sparkline}
        <div style="font-size:11px;margin-top:4px">${rows}</div>
        <div style="font-size:10px;color:#a8a29e;margin-top:6px;text-align:center">Click to zoom into days</div>
      </div>`
    },
    [weeklyAgg, colorScale, family, selectedMetric, metrics, thresholdLabel, year]
  )

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: tooltipFormatter,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e7e5e4',
        textStyle: { color: '#1c1917', fontSize: 12 },
        padding: [8, 10],
        extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.10);border-radius:6px;',
        appendToBody: true,
      },
      grid: { top: 8, right: 4, bottom: 48, left: 4 },
      xAxis: {
        type: 'category',
        data: weekLabels,
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          fontSize: 9,
          color: '#78716c',
          interval: 3,
        },
        position: 'top',
      },
      yAxis: {
        type: 'category',
        data: [String(year)],
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
      visualMap: visualMapConfig,
      series: [
        {
          type: 'heatmap',
          data: heatmapData.filter(
            (item): item is [number, number, number] => item[2] !== null
          ),
          emphasis: {
            itemStyle: {
              shadowBlur: 4,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: '#1c1917',
              borderWidth: 1.5,
            },
          },
          itemStyle: {
            borderColor: 'transparent',
            borderWidth: 0,
          },
        },
      ],
    }),
    [heatmapData, tooltipFormatter, visualMapConfig, weekLabels, year]
  )

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          ← Back to overview
        </button>
        {zoomedWeek && (
          <button
            type="button"
            onClick={() => { setZoomedWeek(null); onDailyZoomChange(false) }}
            className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            ← Back to weekly
          </button>
        )}
      </div>

      {!zoomedWeek && (
        <div>
          <ReactECharts
            option={option}
            style={{ width: '100%', minWidth: '400px', height: '100px' }}
            notMerge
            onEvents={{
              click: (params: any) => {
                if (params.componentType === 'series') {
                  const weekNum = params.data[0] + 1
                  if (weeklyAgg.has(weekNum)) {
                    setZoomedWeek(weekNum)
                    onDailyZoomChange(true)
                  }
                }
              },
            }}
          />
        </div>
      )}

      {zoomedWeek && (
        <DailyZoom
          data={data}
          year={year}
          week={zoomedWeek}
          indexKey={indexKey}
          family={family}
          colorScale={colorScale}
          selectedMetric={selectedMetric}
        />
      )}
    </div>
  )
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function DailyZoom({
  data,
  year,
  week,
  indexKey,
  family,
  colorScale,
  selectedMetric,
}: {
  data: TimeSeriesData[]
  year: number
  week: number
  indexKey: string
  family: IndexFamily
  colorScale: ColorScale
  selectedMetric: MetricKey
}) {
  const dailyData = useMemo(() => {
    const days: { date: string; label: string; value: number }[] = []
    for (const row of data) {
      const val = row[indexKey]
      if (val === null || val === undefined || val === '' || typeof val === 'string') continue
      const num = Number(val)
      if (!Number.isFinite(num)) continue
      const d = new Date(row.date)
      if (d.getUTCFullYear() !== year) continue
      if (getISOWeek(d) !== week) continue
      const dayOfWeek = (d.getUTCDay() + 6) % 7 // 0=Mon, 6=Sun
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      days.push({
        date: dateStr,
        label: `${DAY_NAMES[dayOfWeek]} ${d.getUTCDate()}.${d.getUTCMonth() + 1}`,
        value: num,
      })
    }
    days.sort((a, b) => a.date.localeCompare(b.date))
    return days
  }, [data, indexKey, year, week])

  const heatmapData = useMemo(() => {
    return dailyData.map((d, i) => [i, 0, Number(d.value.toFixed(2))] as [number, number, number])
  }, [dailyData])

  const dayLabels = useMemo(() => dailyData.map((d) => d.label), [dailyData])

  // Daily values are raw index values, never ratioBelow — always use 'median' scale
  const dailyMetric: MetricKey = selectedMetric === 'ratioBelow' ? 'median' : selectedMetric

  const visualMapConfig = useMemo(
    () => buildVisualMapConfig(dailyMetric, colorScale),
    [dailyMetric, colorScale]
  )

  const tooltipFormatter = useCallback(
    (params: any) => {
      const dayIdx = params.data[0]
      const day = dailyData[dayIdx]
      if (!day) return ''

      const color = params.color || getColorForValue(day.value, colorScale, dailyMetric)
      const category = getCategoryLabel(day.value, colorScale, dailyMetric)
      const fmt = (v: number) => v.toFixed(2)

      return `<div style="min-width:140px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color}"></span>
          <strong>${day.date}</strong>
        </div>
        <div style="font-size:11px;color:${getReadableTextColor(color)};margin-bottom:2px">${category}</div>
        <div style="font-size:12px">${fmt(day.value)}</div>
      </div>`
    },
    [dailyData, colorScale, dailyMetric]
  )

  const option = useMemo(
    () => ({
      tooltip: {
        formatter: tooltipFormatter,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e7e5e4',
        textStyle: { color: '#1c1917', fontSize: 12 },
        padding: [8, 10],
        extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.10);border-radius:6px;',
        appendToBody: true,
      },
      grid: { top: 8, right: 4, bottom: 48, left: 4 },
      xAxis: {
        type: 'category',
        data: dayLabels,
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 10, color: '#78716c' },
        position: 'top',
      },
      yAxis: {
        type: 'category',
        data: [`W${week}`],
        splitArea: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { show: false },
      },
      visualMap: visualMapConfig,
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          emphasis: {
            itemStyle: {
              shadowBlur: 4,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              borderColor: '#1c1917',
              borderWidth: 1.5,
            },
          },
          itemStyle: {
            borderColor: 'transparent',
            borderWidth: 0,
          },
        },
      ],
    }),
    [heatmapData, tooltipFormatter, visualMapConfig, dayLabels, week]
  )

  if (dailyData.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-gray-400">
        No data for W{week} {year}
      </div>
    )
  }

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100px' }}
        notMerge
      />
    </div>
  )
}
