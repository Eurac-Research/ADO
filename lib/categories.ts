import { CloudRain, Droplets, Leaf, Snowflake } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

export interface DroughtCategory {
  id: string
  name: string
  shortName: string
  description: string
  icon: LucideIcon
  gradient: {
    from: string
    to: string
    darkFrom: string
    darkTo: string
  }
  indices: string[]
}

export const DROUGHT_CATEGORIES: Record<string, DroughtCategory> = {
  precipitation: {
    id: 'precipitation',
    name: 'Precipitation & Evaporation',
    shortName: 'Precipitation',
    description: 'Monitor drought through standardized precipitation and evapotranspiration measures.',
    icon: CloudRain,
    gradient: {
      from: 'from-blue-50',
      to: 'to-blue-100',
      darkFrom: 'dark:from-blue-900/50',
      darkTo: 'dark:to-blue-900'
    },
    indices: ['spi-1', 'spi-3', 'spi-6', 'spi-12', 'spei-1', 'spei-3', 'spei-6', 'spei-12', 'precipitation']
  },
  soil: {
    id: 'soil',
    name: 'Soil Moisture',
    shortName: 'Soil Moisture',
    description: 'Monitor drought through soil water content and moisture anomalies.',
    icon: Droplets,
    gradient: {
      from: 'from-blue-50',
      to: 'to-blue-100',
      darkFrom: 'dark:from-blue-900/50',
      darkTo: 'dark:to-blue-900'
    },
    indices: ['smi', 'soil_moisture', 'swi', 'sma']
  },
  vegetation: {
    id: 'vegetation',
    name: 'Vegetation',
    shortName: 'Vegetation',
    description: 'Monitor vegetation health and condition through satellite-derived measurements.',
    icon: Leaf,
    gradient: {
      from: 'from-blue-50',
      to: 'to-blue-100',
      darkFrom: 'dark:from-blue-900/50',
      darkTo: 'dark:to-blue-900'
    },
    indices: ['vci', 'vhi', 'ndvi', 'evi', 'vegetation', 'fapar', 'lai']
  },
  snow: {
    id: 'snow',
    name: 'Snow',
    shortName: 'Snow',
    description: 'Monitor snow cover, depth, and water equivalent for drought assessment.',
    icon: Snowflake,
    gradient: {
      from: 'from-blue-50',
      to: 'to-blue-100',
      darkFrom: 'dark:from-blue-900/50',
      darkTo: 'dark:to-blue-900'
    },
    indices: ['sspi-1', 'sspi-3', 'sspi-6', 'sspi-12', 'snow', 'swe', 'snow_depth', 'snow_cover', 'snowpack']
  }
}

/**
 * Determines the category for a given drought index
 */
export function getCategoryForIndex(index: string): DroughtCategory | null {
  const indexLower = index.toLowerCase()

  if (indexLower.startsWith('spi') || indexLower.startsWith('spei') || indexLower === 'precipitation') {
    return DROUGHT_CATEGORIES.precipitation
  }
  if (['smi', 'soil_moisture', 'swi', 'sma'].includes(indexLower)) {
    return DROUGHT_CATEGORIES.soil
  }
  if (['vci', 'vhi', 'ndvi', 'evi', 'vegetation', 'fapar', 'lai'].includes(indexLower)) {
    return DROUGHT_CATEGORIES.vegetation
  }
  if (indexLower.startsWith('sspi') || ['snow', 'swe', 'snow_depth', 'snow_cover', 'snowpack'].includes(indexLower)) {
    return DROUGHT_CATEGORIES.snow
  }

  return null
}