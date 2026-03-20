'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Layout from '@/components/layout'
import type { PostData } from '@/types'

interface RegionEntry {
  id: string
  name: string
  value: number | null
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria',
  CH: 'Switzerland',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  LI: 'Liechtenstein',
  SI: 'Slovenia',
}

const COUNTRY_ORDER = ['AT', 'CH', 'DE', 'FR', 'IT', 'LI', 'SI']

function getColorForSPEI(value: number | null): string {
  if (value === null) return '#e5e7eb'
  if (value >= 2) return '#450099'
  if (value >= 1.5) return '#b467dd'
  if (value >= 1) return '#f599f6'
  if (value >= 0) return '#ffffff'
  if (value >= -1) return '#ffffbf'
  if (value >= -1.5) return '#fdae61'
  return '#d7191c'
}

function getCategoryForSPEI(value: number | null): string {
  if (value === null) return 'No data'
  if (value >= 2) return 'Extremely wet'
  if (value >= 1.5) return 'Very wet'
  if (value >= 1) return 'Moderately wet'
  if (value >= 0) return 'Normal'
  if (value >= -1) return 'Moderately dry'
  if (value >= -1.5) return 'Very dry'
  return 'Extremely dry'
}

export default function RegionsClient({
  regions,
  allPosts,
  lastDate,
}: {
  regions: RegionEntry[]
  allPosts: PostData[]
  lastDate: string | null
}) {
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')

  const grouped = useMemo(() => {
    const map = new Map<string, RegionEntry[]>()
    for (const r of regions) {
      const cc = r.id.slice(0, 2)
      if (!map.has(cc)) map.set(cc, [])
      map.get(cc)!.push(r)
    }
    // Sort regions within each country
    for (const [, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [regions])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const result = new Map<string, RegionEntry[]>()
    for (const cc of COUNTRY_ORDER) {
      const list = grouped.get(cc)
      if (!list) continue
      if (countryFilter !== 'all' && cc !== countryFilter) continue
      const matches = q
        ? list.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
        )
        : list
      if (matches.length > 0) result.set(cc, matches)
    }
    return result
  }, [grouped, search, countryFilter])

  const totalShown = useMemo(
    () => Array.from(filtered.values()).reduce((s, l) => s + l.length, 0),
    [filtered]
  )

  return (
    <Layout posts={allPosts} headerMode={1}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-8 sm:pb-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Alpine Regions Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          {regions.length} NUTS-3 regions across {COUNTRY_ORDER.length} countries.
        </p>
        {lastDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Data: SPEI-3 as of {lastDate}
          </p>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name or NUTS ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="all">All countries</option>
            {COUNTRY_ORDER.map((cc) => (
              <option key={cc} value={cc}>
                {COUNTRY_NAMES[cc]} ({grouped.get(cc)?.length ?? 0})
              </option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Showing {totalShown} region{totalShown !== 1 ? 's' : ''}
        </p>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          {[
            { color: '#d7191c', label: 'Extremely dry' },
            { color: '#fdae61', label: 'Very dry' },
            { color: '#ffffbf', label: 'Moderately dry' },
            { color: '#ffffff', label: 'Normal' },
            { color: '#f599f6', label: 'Moderately wet' },
            { color: '#b467dd', label: 'Very wet' },
            { color: '#450099', label: 'Extremely wet' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>

        {/* Region groups */}
        {COUNTRY_ORDER.map((cc) => {
          const list = filtered.get(cc)
          if (!list) return null
          return (
            <section key={cc} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10 border-b border-gray-200 dark:border-gray-700">
                {COUNTRY_NAMES[cc]}{' '}
                <span className="text-sm font-normal text-gray-500">
                  ({list.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {list.map((r) => (
                  <Link
                    key={r.id}
                    href={`/region/${r.id}/spei-3`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border border-gray-100 dark:border-gray-700
                      hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300"
                      style={{ backgroundColor: getColorForSPEI(r.value) }}
                      title={getCategoryForSPEI(r.value)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 truncate block">
                        {r.name}
                      </span>
                      <span className="text-xs text-gray-400">{r.id}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-right tabular-nums whitespace-nowrap">
                      {r.value !== null ? r.value.toFixed(2) : '–'}
                      <span className="hidden group-hover:inline"> · {getCategoryForSPEI(r.value)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )
        })}

        {totalShown === 0 && (
          <p className="text-center text-gray-500 py-12">
            No regions match your search.
          </p>
        )}
      </div>
    </Layout>
  )
}
