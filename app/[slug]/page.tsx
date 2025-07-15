import { redirect } from 'next/navigation'

// Force static generation
export const dynamic = 'force-static'

interface IndexPageProps {
  params: Promise<{
    slug: string
  }>
}

// Available indices for validation
const indices = [
  'spei-1', 'spei-2', 'spei-3', 'spei-6', 'spei-12',
  'spi-1', 'spi-2', 'spi-3', 'spi-6', 'spi-12',
  'sspi-10', 'sma', 'vci', 'vhi',
]

export async function generateStaticParams() {
  return indices.map((index) => ({
    slug: index,
  }))
}

export default async function IndexPage({ params }: IndexPageProps) {
  const { slug } = await params

  // Validate the slug
  if (!indices.includes(slug)) {
    redirect('/?index=spei-1')
  }

  // Redirect to main page with index query param
  redirect(`/?index=${slug}`)
}
