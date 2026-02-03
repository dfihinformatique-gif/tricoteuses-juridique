import { getLocale } from "$lib/paraglide/runtime"
import * as m from "$lib/paraglide/messages"
import type { TricoteusesMeeting } from "$lib/grist"
import type { Reuse } from "$lib/data/tricoteuses-ecosystem"
import publicConfig from "$lib/public_config"

export interface OpenGraphMetadata {
  title: string
  description: string
  type: "website" | "article"
  url?: string
  image?: string
  imageAlt?: string
  siteName?: string
  locale?: string
  article?: {
    publishedTime?: string
    modifiedTime?: string
    author?: string
    section?: string
    tag?: string[]
  }
}

/**
 * Génère les métadonnées OpenGraph pour la page d'accueil
 */
export function generateHomeOpenGraph(baseUrl?: string): OpenGraphMetadata {
  return {
    title: publicConfig.title,
    description: m.og_home_description(),
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}

/**
 * Génère les métadonnées OpenGraph pour la liste des réunions
 */
export function generateMeetingsListOpenGraph(
  nextMeeting?: TricoteusesMeeting,
  baseUrl?: string,
): OpenGraphMetadata {
  const description = nextMeeting
    ? m.og_meetings_next({
        title: nextMeeting.Description || "Réunion Tricoteuses",
        date: new Date(nextMeeting.Date).toLocaleDateString(getLocale(), {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      })
    : m.og_meetings_description()

  return {
    title: `${m.og_meetings_title()} - ${publicConfig.title}`,
    description,
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}

/**
 * Génère les métadonnées OpenGraph pour une réutilisation
 */
export function generateReuseOpenGraph(
  reuse: Reuse,
  baseUrl?: string,
): OpenGraphMetadata {
  const typeLabel =
    reuse.type === "external"
      ? m.og_reuse_type_external()
      : m.og_reuse_type_demo()

  return {
    title: `${reuse.name} - ${typeLabel}`,
    description: reuse.description,
    type: "article",
    url: baseUrl,
    image: reuse.screenshot,
    imageAlt: m.og_reuse_screenshot_alt({ name: reuse.name }),
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: typeLabel,
      author: reuse.author,
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour la liste des réutilisations
 */
export function generateReusesListOpenGraph(
  baseUrl?: string,
): OpenGraphMetadata {
  return {
    title: `${m.og_reuses_list_title()} - ${publicConfig.title}`,
    description: m.og_reuses_list_description(),
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}

/**
 * Génère les métadonnées OpenGraph pour un article Légifrance
 */
export function generateLegifranceArticleOpenGraph(
  articleId: string,
  articleNum?: string,
  articleTitle?: string,
  texteTitle?: string,
  baseUrl?: string,
): OpenGraphMetadata {
  const title = articleNum
    ? `${m.og_legifrance_article_title({ num: articleNum })}${texteTitle ? ` - ${texteTitle}` : ""}`
    : `${m.og_legifrance_article_title({ num: articleId })}`

  const description = articleTitle
    ? articleTitle
    : m.og_legifrance_article_description({
        id: articleNum || articleId,
      })

  return {
    title: `${title} - Légifrance`,
    description,
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: m.og_legifrance_article_section(),
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour une section Légifrance
 */
export function generateLegifranceSectionOpenGraph(
  sectionId: string,
  sectionTitle?: string,
  texteTitle?: string,
  baseUrl?: string,
): OpenGraphMetadata {
  const title = sectionTitle || m.og_legifrance_section_title({ id: sectionId })
  const fullTitle = texteTitle ? `${title} - ${texteTitle}` : title

  return {
    title: `${fullTitle} - Légifrance`,
    description: m.og_legifrance_section_description({ title }),
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: m.og_legifrance_article_section(),
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour un texte Légifrance
 */
export function generateLegifranceTexteOpenGraph(
  texteId: string,
  texteTitle?: string,
  texteNature?: string,
  baseUrl?: string,
): OpenGraphMetadata {
  const title = texteTitle || `Texte ${texteId}`
  const description = texteNature
    ? m.og_legifrance_texte_description_with_nature({
        nature: texteNature,
        title,
      })
    : m.og_legifrance_texte_description({ title })

  return {
    title: `${title} - Légifrance`,
    description,
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: m.og_legifrance_article_section(),
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour un document de l'Assemblée nationale
 */
export function generateAssembleeDocumentOpenGraph(
  uid: string,
  documentTitle?: string,
  documentType?: string,
  legislature?: string,
  baseUrl?: string,
): OpenGraphMetadata {
  const title = documentTitle || `Document ${uid}`

  let description: string
  if (documentType && legislature) {
    description = m.og_assemblee_document_description_with_legislature({
      type: documentType,
      legislature,
      title,
    })
  } else if (documentType) {
    description = m.og_assemblee_document_description_with_type({
      type: documentType,
      title,
    })
  } else {
    description = m.og_assemblee_document_description({ uid })
  }

  return {
    title: `${title} - ${m.og_assemblee_document_title()}`,
    description,
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: m.og_assemblee_document_title(),
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour un dossier législatif de l'Assemblée
 */
export function generateAssembleeDossierOpenGraph(
  dossierId: string,
  dossierTitle?: string,
  legislature?: string,
  baseUrl?: string,
): OpenGraphMetadata {
  const title = dossierTitle || `Dossier législatif ${dossierId}`
  const description = legislature
    ? m.og_assemblee_dossier_description_with_legislature({
        legislature,
        title,
      })
    : m.og_assemblee_dossier_description({ id: dossierId })

  return {
    title: `${title} - ${m.og_assemblee_document_title()}`,
    description,
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section: m.og_assemblee_document_title(),
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour la liste des documents de l'Assemblée
 */
export function generateAssembleeDocumentsListOpenGraph(
  baseUrl?: string,
): OpenGraphMetadata {
  return {
    title: m.og_assemblee_documents_list_title(),
    description: m.og_assemblee_documents_list_description(),
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}

/**
 * Génère les métadonnées OpenGraph pour la liste des textes Légifrance
 */
export function generateLegifranceTextesListOpenGraph(
  baseUrl?: string,
): OpenGraphMetadata {
  return {
    title: m.og_legifrance_textes_list_title(),
    description: m.og_legifrance_textes_list_description(),
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}

/**
 * Génère les métadonnées OpenGraph pour un service
 */
export function generateServiceOpenGraph(
  serviceId: string,
  serviceName: string,
  serviceDescription: string,
  serviceType: string,
  baseUrl?: string,
): OpenGraphMetadata {
  let section: string
  if (serviceType === "api") {
    section = m.og_service_section_api()
  } else if (serviceType === "database") {
    section = m.og_service_section_database()
  } else {
    section = m.og_service_section_default()
  }

  return {
    title: `${serviceName} - ${m.og_services_title()}`,
    description: serviceDescription,
    type: "article",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
    article: {
      section,
    },
  }
}

/**
 * Génère les métadonnées OpenGraph pour la liste des services
 */
export function generateServicesListOpenGraph(
  baseUrl?: string,
): OpenGraphMetadata {
  return {
    title: `${m.og_services_title()} - ${publicConfig.title}`,
    description: m.og_services_description(),
    type: "website",
    url: baseUrl,
    siteName: publicConfig.title,
    locale: getLocale(),
  }
}
