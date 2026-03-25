import { NextResponse } from 'next/server'
import { fetchDroughtIndexData } from '@/lib/data-fetcher'
import { CACHE_CONTROL } from '@/lib/http-cache'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ datatype: string }> }
) {
  try {
    const { datatype } = await params
    const geojson = await fetchDroughtIndexData(datatype)
    return NextResponse.json(geojson, {
      headers: {
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
