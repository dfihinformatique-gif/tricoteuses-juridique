/**
 * Données centralisées de l'écosystème Tricoteuses
 * Source unique de vérité pour tous les services, données, APIs et réutilisations
 */

export interface DataSource {
  description: string
  id: string
  license?: {
    name: string
    spdxId?: string
    url?: string
  }
  name: string
  provider: string
  url: string
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
    spdxId?: string
    url: string
  }
  name: string
  provider?: {
    name: string
    url: string
  }
  serviceDependencies?: DataService[]
  softwareDependencies?: Software[]
  technicalDocUrl?: string
  type: "api" | "git" | "mcp" | "consolidation" | "database"
  url?: string
}

export interface Entity {
  email?: string
  id: string
  name: string
  url?: string
}

export interface ExternalProject {
  author: string
  description: string
  featured: boolean
  id: string
  license?: {
    name: string
    spdxId?: string
    url?: string
  }
  name: string
  repositoryUrl?: string
  screenshot?: string
  url?: string
}

export interface Software {
  authors: Array<{
    email?: string
    name: string
  }>
  description: string
  id: string
  license: {
    name: string
    spdxId?: string
    url: string
  }
  licenseFileUrl: string
  name: string
  repositoryUrl: string
  servicesDependencies?: DataService[]
  softwareDependencies?: Software[]
  sourceDataDependencies?: DataSource[]
}

export interface Reuse {
  author: string
  pathname?: string
  description: string
  featured: boolean
  id: string
  name: string
  screenshot?: string
  servicesDependencies: DataService[]
  softwareDependencies?: Software[]
  type: "external" | "demo"
  url?: string
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations: Entity[] = [
  {
    email: "contact@logora.fr",
    id: "logora",
    name: "Logora",
    url: "https://www.logora.com",
  },
]

// ============================================================================
// SOURCES DE DONNÉES
// ============================================================================

export const assembleeNationaleOpendata: DataSource = {
  description:
    "Données ouvertes de l'Assemblée Nationale (amendements, dossiers législatifs, documents, scrutins, etc.)",
  id: "assemblee-nationale-opendata",
  license: {
    name: "Licence Ouverte / Open License",
    spdxId: "etalab-2.0",
    url: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
  },
  name: "Open Data Assemblée Nationale",
  provider: "Assemblée Nationale",
  url: "https://data.assemblee-nationale.fr/",
}

export const senatOpendata: DataSource = {
  description:
    "Données ouvertes du Sénat (amendements, dossiers législatifs, scrutins, etc.)",
  id: "senat-opendata",
  license: {
    name: "Licence Ouverte / Open License",
    spdxId: "etalab-2.0",
    url: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
  },
  name: "Open Data Sénat",
  provider: "Sénat",
  url: "https://data.senat.fr/",
}

export const dilaLegifranceOpendata: DataSource = {
  description:
    "Données juridiques françaises de Légifrance (codes, lois, décrets, journaux officiels, etc.) publiées par la DILA",
  id: "dila-legifrance-opendata",
  license: {
    name: "Licence Ouverte / Open License",
    spdxId: "etalab-2.0",
    url: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
  },
  name: "Légifrance (DILA)",
  provider: "Direction de l'information légale et administrative (DILA)",
  url: "https://www.legifrance.gouv.fr/",
}

export const dataSources: Record<string, DataSource> = {
  [assembleeNationaleOpendata.id]: assembleeNationaleOpendata,
  [senatOpendata.id]: senatOpendata,
  [dilaLegifranceOpendata.id]: dilaLegifranceOpendata,
}

// ============================================================================
// LOGICIELS
// ============================================================================

export const tricoteusesAssemblee: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description:
    "Bibliothèque et outils pour parcourir, nettoyer et mettre sous Git les données ouvertes de l'Assemblée Nationale française",
  id: "tricoteuses-assemblee",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-assemblee/src/branch/main/LICENSE.md",
  name: "@tricoteuses/assemblee",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-assemblee",
  sourceDataDependencies: [assembleeNationaleOpendata],
}

export const tricoteusesLegifrance: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description:
    "Bibliothèque et outils pour parcourir, mettre sous Git et mettre en base les données juridiques ouvertes de la Direction de l'information légale et administrative (DILA)",
  id: "tricoteuses-legifrance",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/src/branch/main/LICENSE.md",
  name: "@tricoteuses/legifrance",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance",
  sourceDataDependencies: [dilaLegifranceOpendata],
}

export const tricoteusesSenat: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description: "Gestion des données ouvertes du Sénat français",
  id: "tricoteuses-senat",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-senat/src/branch/main/LICENSE.md",
  name: "@tricoteuses/senat",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-senat",
  sourceDataDependencies: [senatOpendata],
}

export const legiFlatDb: Software = {
  authors: [],
  description:
    "Script de migration de la base tricoteuses canutes_legifrance dans une structure à plat",
  id: "legi-flat-db",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/legi-flat-db/src/branch/main/LICENSE.md",
  name: "legi-flat-db",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/legi-flat-db",
  servicesDependencies: undefined,
}

export const tricoteusesApiParlement: Software = {
  authors: [
    {
      email: "h.boisgibault@gmail.com",
      name: "Henry Boisgibault",
    },
  ],
  description:
    "API REST et chargeur de base de données SQL basés sur les données ouvertes du Parlement français (Assemblée Nationale et Sénat)",
  id: "tricoteuses-api-parlement",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-api-parlement/src/branch/main/LICENSE.md",
  name: "@tricoteuses/api-parlement",
  repositoryUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-api-parlement",
  servicesDependencies: undefined,
  softwareDependencies: [tricoteusesAssemblee, tricoteusesSenat],
}

export const tricoteusesTranscriptionVideos: Software = {
  authors: [
    {
      email: "dregop@proton.me",
      name: "Dregop",
    },
    {
      email: "h.boisgibault@gmail.com",
      name: "Henry Boisgibault",
    },
  ],
  description:
    "Permet d'obtenir la transcription des vidéos de l'assemblée/sénat en fournissant un lien vidéo m3u8 en entrée",
  id: "tricoteuses-transcription-videos",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-transcription-videos/src/branch/main/LICENSE.md",
  name: "@tricoteuses/transcription-videos",
  repositoryUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-transcription-videos",
  servicesDependencies: undefined,
  softwareDependencies: [tricoteusesAssemblee, tricoteusesSenat],
}

export const tricoteusesExploratrice: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description:
    "Interface web pour explorer les données législatives françaises (Assemblée, Sénat, Légifrance)",
  id: "tricoteuses-juridique-packages-exploratrice",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/exploratrice/LICENSE.md",
  name: "@tricoteuses/exploratrice",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique",
  servicesDependencies: undefined,
  softwareDependencies: [tricoteusesAssemblee, tricoteusesSenat],
}

export const tricoteusesMoulineuse: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description:
    "Serveur MCP pour interroger les bases de données législatives françaises (Assemblée, Légifrance)",
  id: "tricoteuses-juridique-packages-moulineuse",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/moulineuse/LICENSE.md",
  name: "@tricoteuses/moulineuse",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique",
  servicesDependencies: undefined,
  softwareDependencies: [tricoteusesAssemblee, tricoteusesSenat],
}

export const tricoteusesTisseuse: Software = {
  authors: [
    {
      email: "emmanuel@raviart.com",
      name: "Emmanuel Raviart",
    },
  ],
  description:
    "Trouver les liens dans et vers les documents législatifs français",
  id: "tricoteuses-juridique-packages-tisseuse",
  license: {
    name: "GNU Affero General Public License v3.0",
    spdxId: "AGPL-3.0",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/tisseuse/LICENSE.md",
  name: "@tricoteuses/tisseuse",
  repositoryUrl: "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique",
  servicesDependencies: undefined,
  softwareDependencies: [tricoteusesLegifrance],
}

export const tricoteusesComposantsReact: Software = {
  authors: [],
  description:
    "Composants React pour afficher les données de l'Assemblée et du Sénat",
  id: "tricoteuses-composants-react",
  license: {
    name: "MIT",
    spdxId: "MIT",
    url: "https://opensource.org/licenses/MIT",
  },
  licenseFileUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-composants-react/src/branch/main/LICENSE.md",
  name: "tricoteuses-composants-react",
  repositoryUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-composants-react",
}

export const software: Software[] = [
  tricoteusesLegifrance,
  tricoteusesSenat,
  legiFlatDb,
  tricoteusesAssemblee,
  tricoteusesApiParlement,
  tricoteusesTranscriptionVideos,
  tricoteusesExploratrice,
  tricoteusesMoulineuse,
  tricoteusesTisseuse,
  tricoteusesComposantsReact,
]

// ============================================================================
// SERVICES DE DONNÉES
// ============================================================================

export const databaseCanutesAssemblee: DataService = {
  description:
    "Base de données PostgreSQL contenant les données structurées de l'Assemblée Nationale : acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins. Construite quotidiennement à partir des dépôts Git de l'Assemblée.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "database-canutes-assemblee",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Base de données Canutes Assemblée",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesAssemblee],
  type: "database",
}

export const databaseCanutesLegifrance: DataService = {
  description:
    "Base de données PostgreSQL contenant les données structurées de Légifrance : articles de loi, textes légaux, sections, dossiers législatifs, journaux officiels. Construite quotidiennement à partir des dépôts Git DILA.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "database-canutes-legifrance",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Base de données Canutes Légifrance",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesLegifrance],
  type: "database",
}

export const databaseCanutesParlement: DataService = {
  description:
    "Base de données PostgreSQL contenant les données unifiées du Parlement français (Assemblée Nationale et Sénat) : acteurs, amendements, dossiers, documents, débats, scrutins, questions. Construite quotidiennement à partir des dépôts Git de l'Assemblée et du Sénat.",
  directCopyrightHolderIds: ["logora"],
  featured: false,
  id: "database-canutes-parlement",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Base de données Canutes Parlement",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesApiParlement],
  type: "database",
}

export const apiCanutesAssemblee: DataService = {
  description:
    "API REST pour accéder aux données de l'Assemblée Nationale (acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins) via PostgREST avec spécification OpenAPI 2.0.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: true,
  id: "api-canutes-assemblee",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "API Canutes Assemblée",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [databaseCanutesAssemblee],
  technicalDocUrl: "/services/api-canutes-assemblee/documentation",
  type: "api",
  url: "https://db.code4code.eu/canutes_assemblee/",
}

export const apiCanutesLegifrance: DataService = {
  description:
    "API REST pour accéder aux données législatives françaises de Légifrance (articles de loi, textes légaux, sections, dossiers législatifs, journaux officiels) via PostgREST avec spécification OpenAPI 2.0.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: true,
  id: "api-canutes-legifrance",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "API Canutes Légifrance",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [databaseCanutesLegifrance],
  technicalDocUrl: "/services/api-canutes-legifrance/documentation",
  type: "api",
  url: "https://db.code4code.eu/canutes_legifrance/",
}

export const apiParlement: DataService = {
  description:
    "API REST pour accéder aux données unifiées du Parlement français (Assemblée Nationale et Sénat) : acteurs, amendements, dossiers, documents, débats, scrutins, questions et bien plus. Utilise Express avec spécification OpenAPI 3.0.",
  directCopyrightHolderIds: ["logora"],
  featured: true,
  id: "api-parlement",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "API Parlement",
  provider: {
    name: "Legiwatch",
    url: "https://www.legiwatch.fr/",
  },
  serviceDependencies: [databaseCanutesParlement],
  softwareDependencies: [tricoteusesApiParlement],
  technicalDocUrl: "/services/api-parlement/documentation",
  type: "api",
  url: "https://parlement.tricoteuses.fr/api/v1",
}

export const depotsDila: DataService = {
  description:
    "Dépôts Git contenant les données brutes de Légifrance publiées par la DILA, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "depots-dila",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Dépôts de données DILA",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesLegifrance],
  type: "git",
  url: "https://git.tricoteuses.fr/dila",
}

export const depotsAssemblee: DataService = {
  description:
    "Dépôts Git contenant les données publiques de l'Assemblée nationale, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "depots-assemblee",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Dépôts de données Assemblée",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesAssemblee],
  type: "git",
  url: "https://git.en-root.org/tricoteuses/data/assemblee-nettoye",
}

export const documentsAssemblee: DataService = {
  description:
    "Dépôt Git contenant les documents (projets de lois, rapports, etc) de l'Assemblée nationale, auxquels s'ajoute un segmentation en articles incluant (en option) les liens vers les articles de lois",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "documents-assemblee",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Documents de l'Assemblée, segmentés",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesAssemblee, tricoteusesTisseuse],
  type: "git",
  url: "https://git.tricoteuses.fr/assemblee/Documents",
}

export const documentsEnrichisAssemblee: DataService = {
  description:
    "Dépôt Git contenant les documents (projets de lois, rapports, etc) de l'Assemblée nationale, enrichis de liens vers les articles de lois et d'une table des matières",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: true,
  id: "documents-enrichis-assemblee",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Documents de l'Assemblée, enrichis",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesAssemblee, tricoteusesTisseuse],
  type: "git",
  url: "https://git.tricoteuses.fr/assemblee/Documents_enrichis",
}

export const depotsSenat: DataService = {
  description:
    "Dépôts Git contenant les données brutes du Sénat, récupérées plusieurs fois par jour, converties en JSON, nettoyées et versionnées sous Git par Tricoteuses. Mises à jour quotidiennes.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "depots-senat",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Dépôts de données Sénat",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesSenat],
  type: "git",
  url: "https://git.tricoteuses.fr/senat",
}

export const databaseCanutesSenat: DataService = {
  description:
    "Base de données PostgreSQL contenant les données structurées du Sénat : acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins. Construite quotidiennement à partir des dépôts Git du Sénat.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "database-canutes-senat",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Base de données Canutes Sénat",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [depotsSenat],
  softwareDependencies: [tricoteusesSenat],
  type: "database",
}

export const databaseCanutesTisseuse: DataService = {
  description:
    "Base de données PostgreSQL permettant de rechercher des informations provenant de l'Assemblée, du Sénat ou de Légifrance.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "database-canutes-tisseuse",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Base de données Canutes Tisseuse",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [
    databaseCanutesAssemblee,
    databaseCanutesSenat,
    databaseCanutesLegifrance,
  ],
  softwareDependencies: [tricoteusesTisseuse],
  type: "database",
}

export const apiCanutesSenat: DataService = {
  description:
    "API REST pour accéder aux données du Sénat (acteurs, amendements, dossiers législatifs, documents, organes, réunions, scrutins) via PostgREST avec spécification OpenAPI 2.0.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: true,
  id: "api-canutes-senat",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "API Canutes Sénat",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [databaseCanutesSenat],
  technicalDocUrl: "/services/api-canutes-senat/documentation",
  type: "api",
  url: "https://db.code4code.eu/canutes_senat/",
}

export const codesJuridiques: DataService = {
  description:
    "Dépôts Git contenant l'ensemble des codes juridiques français (Code civil, Code général des impôts, etc.) avec leur historique complet des modifications, versionnés sous Git.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "codes-juridiques",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Codes juridiques",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesLegifrance, tricoteusesTisseuse],
  type: "consolidation",
  url: "https://git.tricoteuses.fr/codes",
}

export const constitution: DataService = {
  description:
    "Texte intégral de la Constitution du 4 octobre 1958 avec son historique complet des modifications, versionné sous Git.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "constitution",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Constitution de 1958",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  softwareDependencies: [tricoteusesLegifrance, tricoteusesTisseuse],
  type: "consolidation",
  url: "https://git.tricoteuses.fr/constitution/constitution_du_4_octobre_1958",
}

export const mcpMoulineuse: DataService = {
  author: "Code4code.eu",
  description:
    "Serveur MCP (Model Context Protocol) permettant d'interroger directement les bases de données juridiques de Tricoteuses. Parfait pour permettre aux chats IA d'avoir une connaissance approfondie, exacte et à jour de la loi et de sa fabrique.",
  directCopyrightHolderIds: ["emmanuel-raviart"],
  featured: false,
  id: "mcp-moulineuse",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Serveur MCP Moulineuse",
  provider: {
    name: "Code4code.eu",
    url: "https://code4code.eu",
  },
  serviceDependencies: [
    databaseCanutesAssemblee,
    databaseCanutesLegifrance,
    databaseCanutesSenat,
  ],
  softwareDependencies: [tricoteusesMoulineuse],
  technicalDocUrl:
    "https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/moulineuse/USAGE.md",
  type: "mcp",
  url: "https://mcp.code4code.eu/mcp",
}

export const mcpParlement: DataService = {
  author: "Legiwatch",
  description:
    "Serveur MCP dédié spécifiquement aux données du Parlement français (Assemblée Nationale et Sénat). Permet aux chats IA d'accéder directement aux acteurs, amendements, dossiers législatifs, débats, scrutins et questions parlementaires.",
  directCopyrightHolderIds: ["logora"],
  featured: true,
  id: "mcp-parlement",
  license: {
    name: "Open Database License (ODbL)",
    spdxId: "ODbL-1.0",
    url: "https://opendatacommons.org/licenses/odbl/",
  },
  name: "Serveur MCP Parlement",
  provider: {
    name: "Legiwatch",
    url: "https://www.legiwatch.fr/",
  },
  serviceDependencies: [databaseCanutesParlement],
  softwareDependencies: [tricoteusesApiParlement],
  type: "mcp",
  url: "https://parlement.tricoteuses.fr/mcp",
}

export const dataServices: Record<string, DataService> = {
  [apiCanutesAssemblee.id]: apiCanutesAssemblee,
  [apiCanutesLegifrance.id]: apiCanutesLegifrance,
  [apiCanutesSenat.id]: apiCanutesSenat,
  [apiParlement.id]: apiParlement,
  [databaseCanutesAssemblee.id]: databaseCanutesAssemblee,
  [databaseCanutesLegifrance.id]: databaseCanutesLegifrance,
  [databaseCanutesParlement.id]: databaseCanutesParlement,
  [databaseCanutesSenat.id]: databaseCanutesSenat,
  [databaseCanutesTisseuse.id]: databaseCanutesTisseuse,
  [depotsDila.id]: depotsDila,
  [depotsAssemblee.id]: depotsAssemblee,
  [documentsAssemblee.id]: documentsAssemblee,
  [documentsEnrichisAssemblee.id]: documentsEnrichisAssemblee,
  [depotsSenat.id]: depotsSenat,
  [codesJuridiques.id]: codesJuridiques,
  [constitution.id]: constitution,
  [mcpMoulineuse.id]: mcpMoulineuse,
  [mcpParlement.id]: mcpParlement,
}

// Initialisation des servicesDependencies après que tous les services ont été déclarés
legiFlatDb.servicesDependencies = [databaseCanutesLegifrance]
tricoteusesApiParlement.servicesDependencies = [depotsAssemblee, depotsSenat]
tricoteusesTranscriptionVideos.servicesDependencies = [
  depotsAssemblee,
  depotsSenat,
]
tricoteusesExploratrice.servicesDependencies = [
  databaseCanutesAssemblee,
  databaseCanutesSenat,
  databaseCanutesLegifrance,
  documentsAssemblee,
  documentsEnrichisAssemblee,
]
tricoteusesMoulineuse.servicesDependencies = [
  databaseCanutesAssemblee,
  databaseCanutesSenat,
  databaseCanutesLegifrance,
]
tricoteusesTisseuse.servicesDependencies = [
  databaseCanutesAssemblee,
  databaseCanutesSenat,
  databaseCanutesLegifrance,
  documentsAssemblee,
]

// ============================================================================
// RÉUTILISATIONS
// ============================================================================

export const reuses: Record<string, Reuse> = {
  "leximpact-socio-fiscal": {
    author: "Assemblée Nationale (cellule LexImpact)",
    description:
      "Simulateur fiscal et social permettant de simuler l'impact budgétaire d'un amendement. Utilise Tricoteuses pour afficher les articles de lois correspondant à un paramètre de la législation sociale et fiscale.",
    featured: true,
    id: "leximpact-socio-fiscal",
    name: "Simulateur socio-fiscal LexImpact",
    screenshot: "/images/screenshots/simulateur-socio-fiscal-leximpact.png",
    servicesDependencies: [apiCanutesLegifrance],
    softwareDependencies: [tricoteusesLegifrance],
    type: "external",
    url: "https://socio-fiscal.leximpact.an.fr/",
  },
  "barometre-assemblee": {
    author: "Assemblée Nationale (cellule LexImpact)",
    description:
      "Plateforme de suivi des décrets d'application des lois promulguées. Utilise exclusivement les données Tricoteuses pour suivre l'avancement de l'application des lois votées.",
    featured: true,
    id: "barometre-assemblee",
    name: "Baromètre de l'application des lois",
    screenshot: "/images/screenshots/barometre-assemblee.png",
    servicesDependencies: [databaseCanutesAssemblee, databaseCanutesLegifrance],
    softwareDependencies: [tricoteusesAssemblee, tricoteusesLegifrance],
    type: "external",
    url: "https://barometre.assemblee-nationale.fr",
  },
  // "legiscope": {
  //   author: "Assemblée Nationale (cellule LexImpact)",
  //   description:
  //     "Application permettant de naviguer dans les projets et propositions de lois. Utilise les liens mis par Tricoteuses pour créer des liens des projets de lois vers les articles de lois qu'ils citent ou modifient, ainsi que des liens entre les articles de lois. L'ensemble des données du Légiscope est fourni par Tricoteuses.",
  //   featured: true,
  //   id: "legiscope",
  //   name: "Legiscope de l'Assemblée Nationale",
  //   screenshot: "/images/screenshots/legiscope-assemblee.png",
  //   services: [
  //     apiCanutesAssemblee,
  //     apiCanutesLegifrance,
  //     depotsAssemblee,
  //   ],
  //   type: "external",
  //   url: "https://legiscope.leximpact.dev",
  // },
  legiwatch: {
    author: "Legiwatch",
    description:
      "Application principalement destinée aux défenseurs d'intérêts permettant de suivre l'activité parlementaire. Intégralement basée sur des données et services de Tricoteuses.",
    featured: true,
    id: "legiwatch",
    name: "Legiwatch",
    screenshot: "/images/screenshots/legiwatch.png",
    servicesDependencies: [apiParlement, mcpParlement, documentsAssemblee],
    type: "external",
    url: "https://app.legiwatch.fr",
  },
  "nos-deputes": {
    author: "Regards Citoyens",
    description:
      "Site web en construction pour 'Tout comprendre au travail de nos représentants à l'Assemblée Nationale'. Intégralement basé sur des données et services de Tricoteuses.",
    featured: false,
    id: "nos-deputes",
    name: "Nos Députés",
    screenshot: "/images/screenshots/nos-deputes.png",
    servicesDependencies: [apiParlement],
    type: "external",
    url: "https://nosdeputesx49wzdoj-nos-deputes-front.functions.fnc.fr-par.scw.cloud/",
  },
  "evolution-du-droit": {
    author: "Benjamin Belrhomari",
    description:
      "Visualisation sous forme de diffs des modifications des codes juridiques français au fil du temps",
    featured: false,
    id: "evolution-du-droit",
    name: "Évolution du droit",
    screenshot: "/images/screenshots/evolution-du-droit.png",
    servicesDependencies: [codesJuridiques],
    type: "external",
    url: "https://belrhomari.fr/evolution_du_droit/",
  },
  lexflation: {
    author: "Benjamin Belrhomari",
    description:
      "Visualisation graphique des modifications des codes juridiques français au fil du temps",
    featured: false,
    id: "lexflation",
    name: "Lexflation",
    screenshot: "/images/screenshots/lexflation.png",
    servicesDependencies: [codesJuridiques],
    type: "external",
    url: "https://belrhomari.fr/lexflation/",
  },
  "derniers-jo": {
    author: "Tricoteuses",
    pathname: "/legifrance/journaux_officiels",
    description:
      "Les derniers Journaux officiels de la République Française avec navigation temporelle et recherche",
    featured: true,
    id: "derniers-jo",
    name: "Journaux officiels",
    screenshot: "/images/screenshots/jo.png",
    servicesDependencies: [databaseCanutesLegifrance],
    softwareDependencies: [tricoteusesLegifrance, tricoteusesTisseuse],
    type: "demo",
  },
  "derniers-textes-legifrance": {
    author: "Tricoteuses",
    pathname: "/legifrance/textes",
    description: "Les derniers textes législatifs promulgués.",
    featured: true,
    id: "derniers-textes-legifrance",
    name: "Textes promulgués",
    screenshot: "/images/screenshots/textes-legifrance.png",
    servicesDependencies: [databaseCanutesLegifrance],
    softwareDependencies: [tricoteusesLegifrance, tricoteusesTisseuse],
    type: "demo",
  },
  "dossiers-legislatifs": {
    author: "Tricoteuses",
    pathname: "/assemblee/dossiers_legislatifs",
    description:
      "Démonstration de l'exploration des dossiers législatifs de l'Assemblée Nationale avec suivi du processus législatif et visualisation des documents associés.",
    featured: false,
    id: "dossiers-legislatifs",
    name: "Dossiers législatifs",
    screenshot: "/images/screenshots/dossiers-legislatifs.png",
    servicesDependencies: [databaseCanutesAssemblee, databaseCanutesTisseuse],
    softwareDependencies: [tricoteusesAssemblee, tricoteusesTisseuse],
    type: "demo",
  },
  "documents-assemblee": {
    author: "Tricoteuses",
    pathname: "/assemblee/documents",
    description:
      "Exploration des documents parlementaires de l'Assemblée Nationale (projets de lois, rapports, etc.), enrichis de liens vers les articles de lois.",
    featured: true,
    id: "documents-assemblee",
    name: "Documents de l'Assemblée",
    screenshot: "/images/screenshots/documents-assemblee.png",
    servicesDependencies: [
      databaseCanutesAssemblee,
      databaseCanutesTisseuse,
      documentsAssemblee,
      documentsEnrichisAssemblee,
    ],
    softwareDependencies: [tricoteusesAssemblee, tricoteusesTisseuse],
    type: "demo",
  },
  "recherche-legislative": {
    author: "Tricoteuses",
    pathname: "/recherche",
    description:
      "Moteur de recherche dans les documents législatifs français permettant de rechercher par mots-clés dans les lois, JO, dossiers parlementaires et documents de l'Assemblée.",
    featured: false,
    id: "recherche-legislative",
    name: "Recherche législative",
    screenshot: "/images/screenshots/recherche-legislative.png",
    servicesDependencies: [databaseCanutesTisseuse],
    softwareDependencies: [tricoteusesTisseuse],
    type: "demo",
  },
}

// ============================================================================
// PROJETS EXTERNES COMPLÉMENTAIRES
// ============================================================================

export const externalProjects: ExternalProject[] = [
  {
    author:
      "Assemblée Nationale (cellule LexImpact) et Direction Interministérielle du Numérique (DINUM)",
    description:
      "Plateforme permettant de rechercher une circonscription législative par son nom, ses communes, son député. Développé par la cellule LexImpact de l'Assemblée nationale.",
    featured: true,
    id: "leximpact-territoires",
    license: {
      name: "GNU Affero General Public License v3.0",
      spdxId: "AGPL-3.0",
      url: "https://git.leximpact.dev/leximpact/territoires/territoires/-/blob/main/LICENSE.md",
    },
    name: "LexImpact Territoires",
    repositoryUrl:
      "https://git.leximpact.dev/leximpact/territoires/territoires",
    screenshot: "/images/screenshots/territoires.png",
    url: "https://territoires.code4code.eu/circonscriptions_legislatives/autocomplete",
  },
]

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Récupère une entity par son ID
 */
export function getEntityById(id: string): Entity | undefined {
  // First, check organizations
  const org = organizations.find((o) => o.id === id)
  if (org) return org

  // Then, check authors in software
  for (const soft of software) {
    const author = soft.authors.find((a) => {
      const authorId = a.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      return authorId === id
    })
    if (author) {
      return {
        id,
        name: author.name,
        email: author.email,
      }
    }
  }

  return undefined
}

/**
 * Récupère tous les copyright holders (directs + transitifs via dépendances) d'un service
 */
export function getCopyrightHolders(service: DataService): Entity[] {
  // Set pour éviter les doublons
  const copyrightHolderIds = new Set<string>()

  // Ajouter les copyright holders directs
  service.directCopyrightHolderIds.forEach((id) => copyrightHolderIds.add(id))

  // Récupérer récursivement les copyright holders des dépendances
  const dependencies = service.serviceDependencies ?? []
  dependencies.forEach((dep) => {
    const depHolders = getCopyrightHolders(dep)
    depHolders.forEach((holder) => copyrightHolderIds.add(holder.id))
  })

  // Convertir les IDs en entities
  return Array.from(copyrightHolderIds)
    .map(getEntityById)
    .filter((e) => e !== undefined)
}

/**
 * Récupère les réutilisations qui utilisent un service donné
 */
export function getReusesByService(service: DataService): Reuse[] {
  return Object.values(reuses).filter((reuse) =>
    reuse.servicesDependencies.some((s) => s.id === service.id),
  )
}
