/**
 * Filesystem-based cache module for storing temporary data
 *
 * This module provides a simple filesystem cache implementation that stores
 * data as JSON files with TTL (time-to-live) support. It's designed to work
 * with @sveltejs/adapter-node and reduces unnecessary API calls.
 *
 * Cache files are stored in the `.cache` directory at the project root.
 * Each cache entry includes the data, timestamp, and TTL information.
 *
 * @example
 * ```ts
 * import { getOrSet } from '$lib/server/cache.js'
 *
 * const data = await getOrSet(
 *   'my-cache-key',
 *   async () => await fetchDataFromAPI(),
 *   60 // TTL in minutes
 * )
 * ```
 */

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cache directory relative to the project root
const CACHE_DIR = path.resolve(__dirname, "../../../.cache")

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // TTL in milliseconds
}

/**
 * Ensures the cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (error) {
    console.error("Failed to create cache directory:", error)
  }
}

/**
 * Get cache file path for a given key
 */
function getCacheFilePath(key: string): string {
  // Sanitize the key to make it filesystem-safe
  const sanitizedKey = key.replace(/[^a-z0-9_-]/gi, "_")
  return path.join(CACHE_DIR, `${sanitizedKey}.json`)
}

/**
 * Get cached data if it exists and is not expired
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const filePath = getCacheFilePath(key)
    const fileContent = await fs.readFile(filePath, "utf-8")
    const entry: CacheEntry<T> = JSON.parse(fileContent)

    const now = Date.now()
    const age = now - entry.timestamp

    if (age < entry.ttl) {
      return entry.data
    }

    // Cache expired, delete the file
    await fs.unlink(filePath).catch(() => {
      /* ignore errors */
    })
    return null
  } catch {
    // File doesn't exist or is invalid
    return null
  }
}

/**
 * Set cached data with TTL
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMinutes - Time to live in minutes
 */
export async function setCached<T>(
  key: string,
  data: T,
  ttlMinutes: number,
): Promise<void> {
  try {
    await ensureCacheDir()

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
    }

    const filePath = getCacheFilePath(key)
    await fs.writeFile(filePath, JSON.stringify(entry), "utf-8")
  } catch (error) {
    console.error("Failed to write cache:", error)
  }
}

/**
 * Delete a cache entry
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    const filePath = getCacheFilePath(key)
    await fs.unlink(filePath)
  } catch {
    // File doesn't exist, ignore
  }
}

/**
 * Clear all cache entries
 */
export async function clearCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    await Promise.all(
      files.map((file) => fs.unlink(path.join(CACHE_DIR, file))),
    )
  } catch (error) {
    console.error("Failed to clear cache:", error)
  }
}

/**
 * Get or set cached data
 * If cache exists and is valid, return cached data
 * Otherwise, fetch new data, cache it, and return it
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number,
): Promise<T> {
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  const data = await fetcher()
  await setCached(key, data, ttlMinutes)
  return data
}
