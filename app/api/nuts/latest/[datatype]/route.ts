import { NextResponse } from 'next/server'
import { fetchDroughtIndexData } from '@/lib/data-fetcher'
import { CACHE_CONTROL } from '@/lib/http-cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ datatype: string }> }
) {
  try {
    const { datatype } = await params
    const geojson = await fetchDroughtIndexData(datatype)
    const format = new URL(request.url).searchParams.get('format')

    if (format === 'csv') {
      const rows = Array.isArray(geojson.features)
        ? geojson.features.map((feature: { properties?: Record<string, unknown> }) => feature.properties || {})
        : []
      const headers: string[] = Array.from(
        new Set(rows.flatMap((row: Record<string, unknown>) => Object.keys(row)))
      ) as string[]
      const escapeCsv = (value: unknown) => {
        const text = value == null ? '' : String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }
      const csv = [
        headers.join(','),
        ...rows.map((row: Record<string, unknown>) =>
          headers.map((header) => escapeCsv(row[header])).join(',')
        ),
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${datatype.toUpperCase()}-latest.csv"`,
          'Cache-Control': CACHE_CONTROL.DAILY_CHURN,
        },
      })
    }

    return new NextResponse(JSON.stringify(geojson), {
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Cache-Control': CACHE_CONTROL.DAILY_CHURN,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return NextResponse.json(
        { error: 'GeoJSON not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': CACHE_CONTROL.NO_STORE,
          },
        }
      )
    }

    console.error('Error fetching NUTS latest GeoJSON:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': CACHE_CONTROL.NO_STORE,
        },
      }
    )
  }
}
