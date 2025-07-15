import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Drought Monitor - Alpine Drought Observatory | Eurac Research',
  description: 'Interactive drought monitoring across the Alpine region with multiple drought indices',
}

interface DroughtMonitorPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DroughtMonitorPage({ searchParams }: DroughtMonitorPageProps) {
  // Await the search params
  const params = await searchParams

  // Redirect to main page with search params preserved
  const urlParams = new URLSearchParams()

  // Preserve any search parameters
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlParams.set(key, value)
    } else if (Array.isArray(value)) {
      urlParams.set(key, value[0]) // Take first value if array
    }
  })

  const queryString = urlParams.toString()
  const redirectUrl = queryString ? `/?${queryString}` : '/'

  redirect(redirectUrl)
}
