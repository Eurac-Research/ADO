import { NextResponse } from 'next/server'
import { defaultCacheOptions } from '@/lib/data-fetcher'
import { CACHE_CONTROL } from '@/lib/http-cache'

const ADO_DATA_URL =
  process.env.NEXT_PUBLIC_ADO_DATA_URL ||
  'raw.githubusercontent.com/Eurac-Research/ado-data/main'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ regionId: string }> }
) {
  try {
    const { regionId } = await params
    const normalizedRegionId = regionId.toUpperCase()
    const format = new URL(request.url).searchParams.get('format')

    const response = await fetch(
      `https://${ADO_DATA_URL}/json/nuts/timeseries/NUTS3_${normalizedRegionId}.json`,
      defaultCacheOptions
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Timeseries data not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': CACHE_CONTROL.NO_STORE,
          },
        }
      )
    }

    const rawPayload = await response.text()

    if (format === 'csv') {
      const rows = JSON.parse(rawPayload) as Array<Record<string, unknown>>
      const headers = Array.from(
        new Set(rows.flatMap((row) => Object.keys(row)))
      )
      const escapeCsv = (value: unknown) => {
        const text = value == null ? '' : String(value)
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
      }
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${normalizedRegionId}_timeseries.csv"`,
          'Cache-Control': CACHE_CONTROL.INTERACTIVE,
        },
      })
    }

    return new NextResponse(rawPayload, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': CACHE_CONTROL.INTERACTIVE,
      },
    })
  } catch (error) {
    console.error('Error fetching NUTS timeseries:', error)
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
