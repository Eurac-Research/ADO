const BASE_URL = 'https://ado.eurac.edu'

const INDEX_DESCRIPTIONS: Record<string, string> = {
  spei: 'Standardized Precipitation Evapotranspiration Index for assessing meteorological drought across multiple accumulation periods.',
  spi: 'Standardized Precipitation Index for assessing precipitation-based drought across multiple accumulation periods.',
  sspi: 'Standardized Streamflow Precipitation Index for assessing hydrological drought.',
  sma: 'Soil moisture anomaly data for assessing agricultural and ecosystem drought conditions.',
  vci: 'Vegetation Condition Index derived from satellite observations to assess vegetation stress.',
  vhi: 'Vegetation Health Index derived from satellite observations to assess vegetation stress and drought conditions.',
}

export function getIndexDescription(
  index: string,
  metadata?: { abstract?: string } | null
): string {
  if (metadata?.abstract?.trim()) return metadata.abstract.trim()

  const normalizedIndex = index.toLowerCase()
  const [family, scale] = normalizedIndex.split('-')
  if (family === 'spei' && scale) {
    return `The Standardized Precipitation Evapotranspiration Index (${normalizedIndex.toUpperCase()}) monitors meteorological drought by integrating both precipitation and potential evapotranspiration across a ${scale}-month accumulation period.`
  }
  if (family === 'spi' && scale) {
    return `The Standardized Precipitation Index (${normalizedIndex.toUpperCase()}) monitors precipitation-based meteorological drought across a ${scale}-month accumulation period.`
  }
  return (
    INDEX_DESCRIPTIONS[family] ||
    `Drought indicator data for the Alpine region using the ${normalizedIndex.toUpperCase()} index.`
  )
}

export function getRegionDatasetJsonLd({
  regionId,
  regionName,
  index,
  timeCoverage,
  metadata,
}: {
  regionId: string
  regionName: string
  index: string
  timeCoverage?: { startDate?: string; endDate?: string }
  metadata?: {
    abstract?: string
    doi?: string
    factsheet?: string
    version?: string
  }
}) {
  const normalizedIndex = index.toLowerCase()
  const pageUrl = `${BASE_URL}/region/${encodeURIComponent(regionId)}/${encodeURIComponent(normalizedIndex)}`
  const description = `Regional ${normalizedIndex.toUpperCase()} drought time series for ${regionName} (${regionId}) in the Alpine region. ${getIndexDescription(normalizedIndex, metadata)}`

  const organizationId = 'https://www.eurac.edu/#organization'
  const dataset: Record<string, unknown> = {
    '@type': 'Dataset',
    '@id': pageUrl,
    name: `${normalizedIndex.toUpperCase()} drought data for ${regionName}`,
    description,
    url: pageUrl,
    identifier: `${regionId}-${normalizedIndex}`,
    keywords: [
      'Alpine drought',
      'drought monitoring',
      normalizedIndex.toUpperCase(),
      regionName,
      regionId,
    ],
    creator: {
      '@id': organizationId,
    },
    publisher: {
      '@id': organizationId,
    },
    spatialCoverage: {
      '@type': 'Place',
      name: regionName,
      identifier: regionId,
    },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    includedInDataCatalog: {
      '@type': 'DataCatalog',
      name: 'Alpine Drought Observatory datasets',
      description:
        'Open drought-monitoring datasets and regional time series for the Alpine region.',
      url: `${BASE_URL}/md/about-the-data`,
      creator: {
        '@id': organizationId,
      },
      license: 'https://creativecommons.org/licenses/by/4.0/',
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${BASE_URL}/api/nuts/timeseries/${encodeURIComponent(regionId)}?format=json`,
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/csv',
        contentUrl: `${BASE_URL}/api/nuts/timeseries/${encodeURIComponent(regionId)}?format=csv`,
      },
    ],
  }

  if (timeCoverage?.startDate && timeCoverage.endDate) {
    dataset.temporalCoverage = `${timeCoverage.startDate}/${timeCoverage.endDate}`
  }
  if (metadata?.doi) {
    dataset.identifier = [dataset.identifier, metadata.doi]
    dataset.sameAs = metadata.doi
  }
  if (metadata?.factsheet) {
    dataset.subjectOf = {
      '@type': 'CreativeWork',
      name: `${normalizedIndex.toUpperCase()} factsheet`,
      url: metadata.factsheet,
    }
  }
  if (metadata?.version) dataset.version = metadata.version

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Eurac Research',
        url: 'https://www.eurac.edu',
        sameAs: ['https://ror.org/01xt1w755'],
        publishingPrinciples: {
          '@type': 'DigitalDocumentPermission',
          name: 'Bozen-Bolzano Institutional Archive (BIA) - Eurac Research Outputs',
          url: 'https://bia.unibz.it/esploro/search/outputs?unit=39UBZ_INST___EURAC&institution=39UBZ_INST&sort=date_d',
        },
      },
      dataset,
    ],
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export function getIndexDatasetJsonLd({
  index,
  metadata,
  timeCoverage,
}: {
  index: string
  metadata?: {
    abstract?: string
    long_name?: string
    doi?: string
    factsheet?: string
    version?: string
  } | null
  timeCoverage?: { startDate?: string; endDate?: string }
}) {
  const normalizedIndex = index.toLowerCase()
  const indexUpper = normalizedIndex.toUpperCase()
  const pageUrl = `${BASE_URL}/?index=${encodeURIComponent(normalizedIndex)}`
  const organizationId = 'https://www.eurac.edu/#organization'
  const dataset: Record<string, unknown> = {
    '@type': 'Dataset',
    '@id': pageUrl,
    name: metadata?.long_name || `${indexUpper} drought data for the Alpine region`,
    description: getIndexDescription(normalizedIndex, metadata),
    url: pageUrl,
    identifier: `ADO-${indexUpper}`,
    keywords: [
      'Alpine drought',
      'drought monitoring',
      indexUpper,
      'Alpine region',
    ],
    creator: { '@id': organizationId },
    publisher: { '@id': organizationId },
    spatialCoverage: {
      '@type': 'Place',
      name: 'Alpine region',
    },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/geo+json',
        contentUrl: `${BASE_URL}/api/nuts/latest/${encodeURIComponent(normalizedIndex)}`,
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/csv',
        contentUrl: `${BASE_URL}/api/nuts/latest/${encodeURIComponent(normalizedIndex)}?format=csv`,
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `https://raw.githubusercontent.com/Eurac-Research/ado-data/main/json/nuts/${indexUpper}-latest-features.json`,
      },
    ],
  }

  if (timeCoverage?.startDate && timeCoverage.endDate) {
    dataset.temporalCoverage = `${timeCoverage.startDate}/${timeCoverage.endDate}`
  }
  if (metadata?.doi) {
    dataset.identifier = [dataset.identifier, metadata.doi]
    dataset.sameAs = metadata.doi
  }
  if (metadata?.factsheet) {
    dataset.subjectOf = {
      '@type': 'CreativeWork',
      name: `${indexUpper} factsheet`,
      url: metadata.factsheet,
    }
  }
  if (metadata?.version) dataset.version = metadata.version

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: 'Eurac Research',
        url: 'https://www.eurac.edu',
        sameAs: ['https://ror.org/01xt1w755'],
        publishingPrinciples: {
          '@type': 'DigitalDocumentPermission',
          name: 'Bozen-Bolzano Institutional Archive (BIA) - Eurac Research Outputs',
          url: 'https://bia.unibz.it/esploro/search/outputs?unit=39UBZ_INST___EURAC&institution=39UBZ_INST&sort=date_d',
        },
      },
      dataset,
    ],
  }
}
