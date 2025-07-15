import { NextRequest, NextResponse } from 'next/server'
import { fetchStationTimeseries } from '@/lib/data-fetcher'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params

    const data = await fetchStationTimeseries(stationId)
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Timeseries data not found' },
        { status: 404 }
      )
    }

    console.error('Error fetching timeseries data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
