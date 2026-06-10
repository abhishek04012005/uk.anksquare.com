import { MetadataRoute } from 'next'
import { marketplaceServices, websiteTypes, mainServices } from '@/data/service'
import { cities, createCitySlug } from '@/seo/uk'
import { blogPosts } from '@/data/blog'
import { SERVICE_MODIFIERS } from '@/seo/serviceModifiers'

export interface SitemapUrl {
  url: string
  lastModified: Date
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

/**
 * Priority modifiers for sitemap optimization
 * Only these modifiers are included in the full sitemap
 */
const PRIORITY_MODIFIERS = [
  'best',
  'no-1',
  'top',
  'toprated',
  'leading',
  'trusted',
  'verified',
  'recommended',
  'expert',
  'certified',
  'professional',
  'premium',
  'awardwinning',
  'popular',
  'fast-growing',
  'experienced',
  'advanced',
  'innovative',
  'reliable',
  'guaranteed',
  'exclusive',
  'dedicated',
  'customized',
  'secure',
  'luxury',
  'nationwide',
  'local',
  'near-me',
  'nearby',
  'online',
  'instant',
  'same-day',
  'emergency',
  '24x7',
  'trending',
  'starter',
  'affordable',
  'budget',
  'cheap',
];
/**
 * uk-only services (cannot be used with non-uk cities)
 * Only generate URLs for these services when city.country === 'uk'
 */
const INDIA_ONLY_SERVICE_SLUGS = new Set([
  'flipkart-account-management',
  'blinkit-account-management',
  'myntra-account-management',
  'ajio-account-management',
  'jiomart-account-management',
  'meesho-account-management',
  'nykaa-account-management'
])

/**
 * Generator for sitemap URLs - yields URLs one at a time to reduce memory usage
 */
export function* generateSitemapUrlsGenerator(): Generator<SitemapUrl> {
  const baseUrl = 'https://uk.anksquare.com'

  // Static pages
  const staticPages: SitemapUrl[] = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/service`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/testimonial`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms-and-conditions`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
  ]

  for (const page of staticPages) {
    yield page
  }

  // All services
  const allServices = [
    ...marketplaceServices,
    ...websiteTypes,
    // ...digitalMarketingTypes,
    ...mainServices.map(service => ({
      ...service,
      slug: service.path.replace('/service/', ''),
    }))
  ]

  // Service pages
  for (const service of allServices) {
    // Base service page (no modifier)
    yield {
      url: `${baseUrl}/service/${service.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }

    // Only include priority modifiers for services
    for (const modifierKey of PRIORITY_MODIFIERS) {
      yield {
        url: `${baseUrl}/service/${modifierKey}-${service.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.75,
      }
    }
  }

  // Services that have city pages: all services now included
  const servicesWithCityPages = allServices

  // Generate city pages with modifiers
  for (const service of servicesWithCityPages) {
    const isIndiaOnlyService = INDIA_ONLY_SERVICE_SLUGS.has(service.slug)

    // Process cities in batches to reduce memory usage
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i]

      // Skip uk-only services for non-uk cities
      if (isIndiaOnlyService && city.country.toLowerCase() !== 'uk') {
        continue
      }

      const citySlug = createCitySlug(city.city, city.state, city.country).substring(1)

      // Base service + city
      yield {
        url: `${baseUrl}/service/${service.slug}/${citySlug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }

      // Service + modifier + city (only priority modifiers)
      for (const modifierKey of PRIORITY_MODIFIERS) {
        yield {
          url: `${baseUrl}/service/${modifierKey}-${service.slug}/${citySlug}`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.55,
        }
      }
    }
  }

  // Client project pages
  const clientPages = [
    'sharma-interiors',
    'sah-constructions',
    'achintya-enterprises',
    'sl-engineerings'
  ]

  for (const client of clientPages) {
    yield {
      url: `${baseUrl}/client/${client}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  }

  // Blog pages
  for (const post of blogPosts) {
    yield {
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }
  }
}

/**
 * Generate all sitemap URLs - collects from generator
 * WARNING: This loads all URLs into memory. Use generator for streaming.
 */
export function generateAllSitemapUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = []
  for (const url of generateSitemapUrlsGenerator()) {
    urls.push(url)
  }
  return urls
}

/**
 * Split URLs into chunks for multiple sitemaps
 * Each sitemap can have up to 50,000 URLs
 */
export function chunkSitemapUrls(urls: SitemapUrl[], chunkSize: number = 50000): SitemapUrl[][] {
  const chunks: SitemapUrl[][] = []
  for (let i = 0; i < urls.length; i += chunkSize) {
    chunks.push(urls.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Get a specific chunk of URLs by index (1-based)
 * Uses generator to avoid loading all URLs into memory
 */
export function getSitemapChunk(chunkIndex: number, chunkSize: number = 50000): SitemapUrl[] {
  const chunk: SitemapUrl[] = []
  let currentIndex = 0
  let targetStartIndex = (chunkIndex - 1) * chunkSize
  let targetEndIndex = targetStartIndex + chunkSize

  for (const url of generateSitemapUrlsGenerator()) {
    if (currentIndex >= targetEndIndex) {
      break
    }
    if (currentIndex >= targetStartIndex) {
      chunk.push(url)
    }
    currentIndex++
  }

  return chunk
}

/**
 * Get the number of sitemap chunks needed
 * WARNING: This loads all URLs to count. For large sitemaps, consider caching.
 */
export function getNumberOfSitemapChunks(chunkSize: number = 50000): number {
  let count = 0
  for (const _ of generateSitemapUrlsGenerator()) {
    count++
  }
  return Math.ceil(count / chunkSize)
}

/**
 * Convert SitemapUrl to MetadataRoute.Sitemap format
 */
export function convertToMetadataRoute(urls: SitemapUrl[]): MetadataRoute.Sitemap {
  return urls.map(url => ({
    url: url.url,
    lastModified: url.lastModified,
    changeFrequency: url.changeFrequency,
    priority: url.priority,
  }))
}

/**
 * Get sitemap statistics
 * WARNING: This loads all URLs into memory. For large sitemaps, consider caching.
 */
export function getSitemapStats(chunkSize: number = 50000): {
  totalUrls: number
  chunkCount: number
  urlsPerChunk: number
  maxUrlsPerChunk: number
} {
  let totalUrls = 0
  for (const _ of generateSitemapUrlsGenerator()) {
    totalUrls++
  }
  const chunkCount = Math.ceil(totalUrls / chunkSize)

  return {
    totalUrls,
    chunkCount,
    urlsPerChunk: chunkCount > 0 ? Math.ceil(totalUrls / chunkCount) : 0,
    maxUrlsPerChunk: chunkSize,
  }
}
