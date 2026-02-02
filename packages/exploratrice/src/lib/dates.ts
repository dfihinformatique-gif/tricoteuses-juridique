import { getLocale } from "$lib/paraglide/runtime.js"

export const fullDateFormatter = (date: Date | string): string => {
  // Convert Paraglide locale ("fr", "en") to BCP 47 locale tag ("fr-FR", "en-US")
  const locale = getLocale()
  const localeTag = locale === "fr" ? "fr-FR" : "en-US"
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "full",
  }).format(typeof date === "string" ? new Date(date) : date)
}

export const shortDateFormatter = (date: Date | string): string => {
  // Convert Paraglide locale ("fr", "en") to BCP 47 locale tag ("fr-FR", "en-US")
  const locale = getLocale()
  const localeTag = locale === "fr" ? "fr-FR" : "en-US"
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "short",
  }).format(typeof date === "string" ? new Date(date) : date)
}
