/**
 * Données centralisées de l'écosystème Tricoteuses
 * Source unique de vérité pour tous les services, données, APIs et réutilisations
 */

export interface Entity {
  email?: string
  id: string
  name: string
  url?: string
}

export interface DataService {
  author?: string
  description: string
  directCopyrightHolderIds: string[]
  featured: boolean
  icon?: string
  id: string
  license: {
    name: string
    url: string
  }
  name: string
  provider?: {
    name: string
    url: string
  }
  serviceIds?: string[]
  technicalDocUrl?: string
  type: "api" | "git" | "mcp" | "consolidation" | "database"
  url?: string
}

export interface Reuse {
  author: string
  demoRoute?: string
  description: string
  featured: boolean
  id: string
  name: string
  screenshot?: string
  serviceIds: string[]
  type: "external" | "demo"
  url?: string
}

// ============================================================================
// ENTITIES
// ============================================================================

export const entities: Entity[] = [
  {
    email: "emmanuel@raviart.com",
    id: "emmanuel-raviart",
    name: "Emmanuel Raviart",
  },
  {
    email: "contact@logora.fr",
    id: "logora",
    name: "Logora",
    url: "https://www.logora.com",
  },
]

// ============================================================================
// SERVICES DE DONNÉES
// ============================================================================

export const dataServices: DataService[] = [
  // APIs REST
  {
    description:
      "API REST pour accéder aux données de l'Assemblée Nationale (acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins) via PostgREST avec spécification OpenAPI 2.0.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: true,
    id: "api-canutes-assemblee",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "API Canutes Assemblée",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["database-canutes-assemblee"],
    technicalDocUrl: "/services/api-canutes-assemblee/documentation",
    type: "api",
    url: "https://db.code4code.eu/canutes_assemblee/",
  },
  {
    description:
      "API REST pour accéder aux données législatives françaises de Légifrance (articles de loi, textes légaux, sections, dossiers législatifs, journaux officiels) via PostgREST avec spécification OpenAPI 2.0.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: true,
    id: "api-canutes-legifrance",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "API Canutes Légifrance",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["database-canutes-legifrance"],
    technicalDocUrl: "/services/api-canutes-legifrance/documentation",
    type: "api",
    url: "https://db.code4code.eu/canutes_legifrance/",
  },
  {
    description:
      "API REST pour accéder aux données unifiées du Parlement français (Assemblée Nationale et Sénat) : acteurs, amendements, dossiers, documents, débats, scrutins, questions et bien plus. Utilise Express avec spécification OpenAPI 3.0.",
    directCopyrightHolderIds: ["logora"],
    featured: true,
    id: "api-parlement",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "API Parlement",
    provider: {
      name: "Legiwatch",
      url: "https://www.legiwatch.fr/",
    },
    serviceIds: ["database-canutes-parlement"],
    technicalDocUrl: "/services/api-parlement/documentation",
    type: "api",
    url: "https://parlement.tricoteuses.fr/api/v1",
  },

  // Bases de données
  {
    description:
      "Base de données PostgreSQL contenant les données structurées de l'Assemblée Nationale : acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins. Construite quotidiennement à partir des dépôts Git de l'Assemblée.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "database-canutes-assemblee",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Base de données Canutes Assemblée",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["depots-assemblee"],
    type: "database",
  },
  {
    description:
      "Base de données PostgreSQL contenant les données structurées de Légifrance : articles de loi, textes légaux, sections, dossiers législatifs, journaux officiels. Construite quotidiennement à partir des dépôts Git DILA.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "database-canutes-legifrance",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Base de données Canutes Légifrance",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["depots-dila"],
    type: "database",
  },
  {
    description:
      "Base de données PostgreSQL contenant les données unifiées du Parlement français (Assemblée Nationale et Sénat) : acteurs, amendements, dossiers, documents, débats, scrutins, questions. Construite quotidiennement à partir des dépôts Git de l'Assemblée et du Sénat.",
    directCopyrightHolderIds: ["logora"],
    featured: false,
    id: "database-canutes-parlement",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Base de données Canutes Parlement",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["depots-assemblee", "depots-senat"],
    type: "database",
  },

  // Dépôts Git
  {
    description:
      "Dépôts Git contenant les données brutes de Légifrance publiées par la DILA, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "depots-dila",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Dépôts de données DILA",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    type: "git",
    url: "https://git.tricoteuses.fr/dila",
  },
  {
    description:
      "Dépôts Git contenant les données brutes de l'Assemblée nationale, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "depots-assemblee",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Dépôts de données Assemblée",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    type: "git",
    url: "https://git.tricoteuses.fr/assemblee",
  },
  {
    description:
      "Dépôts Git contenant les données brutes du Sénat, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "depots-senat",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Dépôts de données Sénat",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    type: "git",
    url: "https://git.tricoteuses.fr/senat",
  },

  // Codes juridiques
  {
    description:
      "Dépôts Git contenant l'ensemble des codes juridiques français (Code civil, Code général des impôts, etc.) avec leur historique complet des modifications, versionnés sous Git.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "codes-juridiques",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Codes juridiques",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    type: "consolidation",
    url: "https://git.tricoteuses.fr/codes",
  },
  {
    description:
      "Texte intégral de la Constitution du 4 octobre 1958 avec son historique complet des modifications, versionné sous Git.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: false,
    id: "constitution",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Constitution de 1958",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    type: "consolidation",
    url: "https://git.tricoteuses.fr/constitution/constitution_du_4_octobre_1958",
  },

  // Serveurs MCP
  {
    author: "Code4code.eu",
    description:
      "Serveur MCP (Model Context Protocol) permettant d'interroger directement les bases de données juridiques de Tricoteuses. Parfait pour permettre aux chats IA d'avoir une connaissance approfondie, exacte et à jour de la loi et de sa fabrique.",
    directCopyrightHolderIds: ["emmanuel-raviart"],
    featured: true,
    id: "mcp-moulineuse",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Serveur MCP Moulineuse",
    provider: {
      name: "Code4code.eu",
      url: "https://code4code.eu",
    },
    serviceIds: ["database-canutes-assemblee", "database-canutes-legifrance"],
    technicalDocUrl:
      "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/moulineuse/USAGE.md",
    type: "mcp",
    url: "https://mcp.code4code.eu/mcp",
  },
  {
    author: "Legiwatch",
    description:
      "Serveur MCP dédié spécifiquement aux données du Parlement français (Assemblée Nationale et Sénat). Permet aux chats IA d'accéder directement aux acteurs, amendements, dossiers législatifs, débats, scrutins et questions parlementaires.",
    directCopyrightHolderIds: ["logora"],
    featured: false,
    id: "mcp-parlement",
    license: {
      name: "Open Database License (ODbL)",
      url: "https://opendatacommons.org/licenses/odbl/",
    },
    name: "Serveur MCP Parlement",
    provider: {
      name: "Legiwatch",
      url: "https://www.legiwatch.fr/",
    },
    serviceIds: ["database-canutes-parlement"],
    type: "mcp",
    url: "https://parlement.tricoteuses.fr/mcp",
  },
]

// ============================================================================
// RÉUTILISATIONS
// ============================================================================

export const reuses: Reuse[] = [
  // Réutilisations externes
  {
    author: "Assemblée Nationale",
    description:
      "Simulateur fiscal et social permettant de simuler l'impact budgétaire d'un amendement. Utilise Tricoteuses pour afficher les articles de lois correspondant à un paramètre de la législation sociale et fiscale.",
    featured: true,
    id: "leximpact-socio-fiscal",
    name: "Simulateur socio-fiscal LexImpact",
    screenshot: "/images/screenshots/simulateur-socio-fiscal-leximpact.png",
    serviceIds: ["api-canutes-legifrance", "codes-juridiques"],
    type: "external",
    url: "https://socio-fiscal.leximpact.an.fr/",
  },
  {
    author: "Assemblée Nationale",
    description:
      "Plateforme de suivi des décrets d'application des lois promulguées. Utilise exclusivement les données Tricoteuses pour suivre l'avancement de l'application des lois votées.",
    featured: true,
    id: "barometre-assemblee",
    name: "Baromètre Assemblée Nationale",
    screenshot: "/images/screenshots/barometre-assemblee.png",
    serviceIds: ["api-canutes-assemblee", "api-canutes-legifrance"],
    type: "external",
    url: "https://barometre.assemblee-nationale.fr",
  },
  {
    author: "Assemblée Nationale",
    description:
      "Application permettant de naviguer dans les projets et propositions de lois. Utilise les liens mis par Tricoteuses pour créer des liens des projets de lois vers les articles de lois qu'ils citent ou modifient, ainsi que des liens entre les articles de lois. L'ensemble des données du Légiscope est fourni par Tricoteuses.",
    featured: true,
    id: "legiscope",
    name: "Legiscope Assemblée Nationale",
    screenshot: "/images/screenshots/legiscope-assemblee.png",
    serviceIds: [
      "api-canutes-assemblee",
      "api-canutes-legifrance",
      "depots-assemblee",
    ],
    type: "external",
    url: "https://legiscope.leximpact.dev",
  },
  {
    author: "Legiwatch",
    description:
      "Application principalement destinée aux défenseurs d'intérêts permettant de suivre l'activité parlementaire. Intégralement basée sur des données et services de Tricoteuses.",
    featured: true,
    id: "legiwatch",
    name: "Legiwatch",
    screenshot: "/images/screenshots/legiwatch.png",
    serviceIds: ["api-parlement", "mcp-parlement"],
    type: "external",
    url: "https://app.legiwatch.fr",
  },
  {
    author: "Regards Citoyens",
    description:
      "Site web en construction pour 'Tout comprendre au travail de nos représentants à l'Assemblée Nationale'. Intégralement basé sur des données et services de Tricoteuses.",
    featured: false,
    id: "nos-deputes",
    name: "Nos Députés",
    screenshot: "/images/screenshots/nos-deputes.png",
    serviceIds: ["api-canutes-assemblee", "depots-assemblee"],
    type: "external",
    url: "https://nosdeputesx49wzdoj-nos-deputes-front.functions.fnc.fr-par.scw.cloud/",
  },
  {
    author: "Belrhomari",
    description:
      "Application développée par un data scientist permettant de visualiser les modifications des codes juridiques français au fil du temps.",
    featured: false,
    id: "evolution-du-droit",
    name: "Évolution du droit",
    screenshot: "/images/screenshots/evolution-du-droit.png",
    serviceIds: ["codes-juridiques", "depots-dila"],
    type: "external",
    url: "https://belrhomari.fr/evolution_du_droit/",
  },

  // Démonstrations Tricoteuses
  {
    author: "Tricoteuses",
    demoRoute: "/legifrance/journaux_officiels",
    description:
      "Démonstration de la visualisation des Journaux Officiels de la République Française avec navigation temporelle et recherche.",
    featured: true,
    id: "visualisation-jo",
    name: "Visualisation des JO",
    screenshot: "/images/screenshots/visualisation-jo.png",
    serviceIds: ["api-canutes-legifrance"],
    type: "demo",
  },
  {
    author: "Tricoteuses",
    demoRoute: "/legifrance/textes",
    description:
      "Démonstration de la navigation dans les lois et textes législatifs français avec visualisation des articles, sections et liens entre textes.",
    featured: true,
    id: "navigation-lois",
    name: "Navigation dans les lois",
    screenshot: "/images/screenshots/navigation-lois.png",
    serviceIds: ["api-canutes-legifrance", "codes-juridiques"],
    type: "demo",
  },
  {
    author: "Tricoteuses",
    demoRoute: "/assemblee/dossiers_legislatifs",
    description:
      "Démonstration de l'exploration des dossiers législatifs de l'Assemblée Nationale avec suivi du processus législatif et visualisation des documents associés.",
    featured: true,
    id: "dossiers-legislatifs",
    name: "Dossiers législatifs",
    screenshot: "/images/screenshots/dossiers-legislatifs.png",
    serviceIds: ["api-canutes-assemblee", "api-parlement"],
    type: "demo",
  },
  {
    author: "Tricoteuses",
    demoRoute: "/recherche",
    description:
      "Moteur de recherche dans les documents législatifs français permettant de rechercher par mots-clés dans les lois, JO, dossiers parlementaires et documents de l'Assemblée.",
    featured: false,
    id: "recherche-legislative",
    name: "Recherche législative",
    screenshot: "/images/screenshots/recherche-legislative.png",
    serviceIds: ["api-canutes-assemblee", "api-canutes-legifrance"],
    type: "demo",
  },
]

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère une entity par son ID
 */
export function getEntityById(id: string): Entity | undefined {
  return entities.find((e) => e.id === id)
}

/**
 * Récupère un service de données par son ID
 */
export function getDataServiceById(id: string): DataService | undefined {
  return dataServices.find((s) => s.id === id)
}

/**
 * Récupère une réutilisation par son ID
 */
export function getReuseById(id: string): Reuse | undefined {
  return reuses.find((r) => r.id === id)
}

/**
 * Récupère toutes les réutilisations qui utilisent un service donné
 */
export function getReusesByServiceId(serviceId: string): Reuse[] {
  return reuses.filter((r) => r.serviceIds.includes(serviceId))
}

/**
 * Récupère tous les services dont dépend un service donné
 */
export function getDataServiceDependencies(serviceId: string): DataService[] {
  const service = getDataServiceById(serviceId)
  if (service == null || service.serviceIds == null) return []

  return service.serviceIds.map(getDataServiceById).filter((s) => s !== undefined)
}

/**
 * Récupère tous les services qui dépendent d'un service donné
 */
export function getDependentDataServices(serviceId: string): DataService[] {
  return dataServices.filter((s) => s.serviceIds?.includes(serviceId))
}

/**
 * Récupère tous les services utilisés par une réutilisation donnée
 */
export function getDataServicesByReuseId(reuseId: string): DataService[] {
  const reuse = getReuseById(reuseId)
  if (reuse == null) return []

  return reuse.serviceIds.map(getDataServiceById).filter((s) => s !== undefined)
}

/**
 * Récupère tous les copyright holders (directs + transitifs via dépendances) d'un service
 */
export function getCopyrightHolders(serviceId: string): Entity[] {
  const service = getDataServiceById(serviceId)
  if (service == null) return []

  // Set pour éviter les doublons
  const copyrightHolderIds = new Set<string>()

  // Ajouter les copyright holders directs
  service.directCopyrightHolderIds.forEach((id) => copyrightHolderIds.add(id))

  // Récupérer récursivement les copyright holders des dépendances
  const dependencies = getDataServiceDependencies(serviceId)
  dependencies.forEach((dep) => {
    const depHolders = getCopyrightHolders(dep.id)
    depHolders.forEach((holder) => copyrightHolderIds.add(holder.id))
  })

  // Convertir les IDs en entities
  return Array.from(copyrightHolderIds)
    .map(getEntityById)
    .filter((e) => e !== undefined)
}

/**
 * Récupère tous les services featured (pour la page d'accueil)
 */
export function getFeaturedDataServices(): DataService[] {
  return dataServices.filter((s) => s.featured)
}

/**
 * Récupère toutes les réutilisations featured (pour la page d'accueil)
 */
export function getFeaturedReuses(): Reuse[] {
  return reuses.filter((r) => r.featured)
}

/**
 * Récupère tous les services d'un type donné
 */
export function getDataServicesByType(type: DataService["type"]): DataService[] {
  return dataServices.filter((s) => s.type === type)
}

/**
 * Récupère toutes les réutilisations d'un type donné
 */
export function getReusesByType(type: Reuse["type"]): Reuse[] {
  return reuses.filter((r) => r.type === type)
}

/**
 * Récupère tous les services
 */
export function getAllDataServices(): DataService[] {
  return dataServices
}

/**
 * Récupère toutes les réutilisations
 */
export function getAllReuses(): Reuse[] {
  return reuses
}
