import { NextRequest, NextResponse } from 'next/server'
import { fetchStationHtmlReport } from '@/lib/data-fetcher'

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
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'HTML report not found' },
        { status: 404 }
      )
    }

    console.error('Error fetching HTML data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
