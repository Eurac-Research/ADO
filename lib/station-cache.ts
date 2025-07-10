// Simple in-memory cache for station data
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class StationDataCache {
  private timeseriesCache = new Map<string, CacheEntry<any>>()
  private htmlCache = new Map<string, CacheEntry<string>>()

  // Cache for 10 minutes
  private defaultTTL = 10 * 60 * 1000

  set<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T, ttl = this.defaultTTL) {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key)
      return null
    }

    return entry.data
  }

  setTimeseries(stationId: string, data: any) {
    this.set(this.timeseriesCache, stationId, data)
  }

  getTimeseries(stationId: string) {
    return this.get(this.timeseriesCache, stationId)
  }

  setHtml(stationId: string, data: string) {
    this.set(this.htmlCache, stationId, data)
  }

  getHtml(stationId: string) {
    return this.get(this.htmlCache, stationId)
  }

  clear() {
    this.timeseriesCache.clear()
    this.htmlCache.clear()
  }

  getStats() {
    return {
      timeseriesEntries: this.timeseriesCache.size,
      htmlEntries: this.htmlCache.size
    }
  }
}

export const stationCache = new StationDataCache()
