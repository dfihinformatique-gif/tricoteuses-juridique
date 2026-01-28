import { getLocale } from "$lib/paraglide/runtime.js"

/**
 * Create a localized href for use in links.
 * This ensures that links maintain the current locale prefix.
 *
 * @param href - The path to localize (e.g., "/services" or "/services/api-canutes-assemblee")
 * @returns The localized href (e.g., "/en/services" when locale is "en", or "/services" when locale is "fr")
 *
 * @example
 * ```svelte
 * <a href={localizedHref("/services")}>Services</a>
 * <!-- When on English page, renders: <a href="/en/services">Services</a> -->
 * <!-- When on French page, renders: <a href="/services">Services</a> -->
 * ```
 */
export function localizedHref(href: string): string {
  // Only localize internal paths that start with /
  if (!href.startsWith("/")) {
    return href
  }

  const locale = getLocale()

  // For French (base locale), don't add prefix
  if (locale === "fr") {
    return href
  }

  // For other locales, add the locale prefix
  return `/${locale}${href}`
}

/**
 * Create a localized path for programmatic navigation.
 * Alias for localizedHref for clarity in different contexts.
 */
export const localizedPath = localizedHref

/**
 * Safely localize an href, works on both server and client.
 * Uses languageTag() to get the current locale from Paraglide context.
 *
 * This should be used for breadcrumbs and other elements that need
 * to work in SSR context.
 *
 * @param href - The path to localize (e.g., "/services")
 * @returns The localized href based on current locale
 */
export function safeLocalizedHref(href: string): string {
  return localizedHref(href)
}
