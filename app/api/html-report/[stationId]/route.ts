import { NextRequest, NextResponse } from 'next/server'
import { fetchStationHtmlReport } from '@/lib/data-fetcher'
import { CACHE_CONTROL } from '@/lib/http-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params

    const html = await fetchStationHtmlReport(stationId)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': CACHE_CONTROL.INTERACTIVE,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'HTML report not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': CACHE_CONTROL.NO_STORE,
          },
        }
      )
    }

    console.error('Error fetching HTML data:', error)
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
