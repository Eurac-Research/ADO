import type { MetadataRoute } from 'next'

const ADO_DATA_URL = 'raw.githubusercontent.com/Eurac-Research/ado-data/main'
const BASE = 'https://ado.eurac.edu'
const INDEX_SLUGS = [
  'spei-1',
  'spei-2',
  'spei-3',
  'spei-6',
  'spei-12',
  'spi-1',
  'spi-2',
  'spi-3',
  'spi-6',
  'spi-12',
  'sspi-10',
  'sma',
  'vci',
  'vhi',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const indexPages: MetadataRoute.Sitemap = INDEX_SLUGS.map((slug) => ({
    url: `${BASE}/${slug}`,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'daily', priority: 1.0 },
    ...indexPages,
    { url: `${BASE}/regions`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/impacts`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/impacts-nuts3`, changeFrequency: 'weekly', priority: 0.7 },
    {
      url: `${BASE}/impact-probabilities`,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE}/vulnerabilities`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    { url: `${BASE}/drought-monitor`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/hydro/spei-1`, changeFrequency: 'daily', priority: 0.7 },
    {
      url: `${BASE}/md/about-the-data`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE}/md/about-the-project`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE}/md/terms-and-conditions`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic region pages
  let regionPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(
      `https://${ADO_DATA_URL}/json/nuts/SPEI-1-latest.geojson`,
      { next: { revalidate: false } }
    )
    if (res.ok) {
      const data = await res.json()
      const regionIds: string[] = data.features.map(
        (f: { properties: { NUTS_ID: string } }) => f.properties.NUTS_ID
      )
      regionPages = regionIds.map((id) => ({
        url: `${BASE}/region/${id}/spei-3`,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      }))
    }
  } catch {
    // If fetch fails, sitemap will just contain static pages
  }

  return [...staticPages, ...regionPages]
}
