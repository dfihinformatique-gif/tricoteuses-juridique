import { documentUidRegex, dossierUidRegex } from "@tricoteuses/assemblee"

import type { Pathname } from "$app/types"
import { getLocale } from "$lib/paraglide/runtime.js"

export const urlPathFromId = (id: string): Pathname | null => {
  const basePath = documentUidRegex.test(id)
    ? `/assemblee/documents/${id}`
    : dossierUidRegex.test(id)
      ? `/assemblee/dossiers_legislatifs/${id}`
      : /^(JORF|LEGI)ARTI\d{12}$/.test(id)
        ? `/legifrance/articles/${id}`
        : /^JORFCONT\d{12}$/.test(id)
          ? `/legifrance/journaux_officiels/${id}`
          : // : /^JORFDOLE\d{12}$/.test(id)
            //   ? `/legifrance/dossiers_legislatifs/${id}`
            /^(JORF|LEGI)SCTA\d{12}$/.test(id)
            ? `/legifrance/sections/${id}`
            : /^(JORF|LEGI)TEXT\d{12}$/.test(id)
              ? `/legifrance/textes/${id}`
              : null

  if (!basePath) return null

  // Get the current locale (works both on server and client)
  const locale = getLocale()

  // For French (base locale), don't add prefix
  if (locale === "fr") {
    return basePath as Pathname
  }

  // For other locales, add the locale prefix
  return `/${locale}${basePath}` as Pathname
}
