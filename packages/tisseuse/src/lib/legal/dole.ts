/**
 * Represents a link within the legislative dossier's hierarchical structure (arborescence).
 * Corresponds to the `LIEN` element in `dole_dossier.xsd`.
 */
export interface ArborescenceLien {
  /** Text content of the link. */
  "#text"?: string
  /** Identifier for the link. From `@id` attribute in XSD. */
  "@id": string
  /** Label for the link. From `@libelle` attribute in XSD. */
  "@libelle"?: string
  /** URL of the link. From `@lien` attribute in XSD. */
  "@lien"?: string
}

/**
 * Represents a level (node) in the legislative dossier's hierarchical structure (arborescence).
 * Corresponds to the `NIVEAU` element in `dole_dossier.xsd`.
 */
export interface ArborescenceNiveau {
  /** Identifier for the level. From `@id` attribute in XSD. */
  "@id": string
  /** Label for the level. From `@libelle` attribute in XSD. */
  "@libelle": string
  /** Array of links within this level. */
  LIEN?: ArborescenceLien[]
  /** Nested level. Note: XSD allows multiple nested NIVEAU, TS interface currently models one. */
  NIVEAU?: ArborescenceNiveau
}

/**
 * Represents a legislative dossier (Dossier Législatif).
 * This is the root structure, corresponding to the `DOSSIER_LEGISLATIF` element in `dole_dossier.xsd`.
 * The XSD describes it as: "Décrit un dossier legislatif".
 */
export interface DossierLegislatif {
  /**
   * Main content of the legislative dossier.
   * Corresponds to the `CONTENU` element in `dole_dossier.xsd`.
   */
  CONTENU: {
    /**
     * Hierarchical structure (tree) of the dossier, often for navigation.
     * Corresponds to the `ARBORESCENCE` element in `dole_dossier.xsd`.
     */
    ARBORESCENCE: {
      /** Links at the root of the arborescence. */
      LIEN?: ArborescenceLien[]
      /** Levels at the root of the arborescence. */
      NIVEAU?: ArborescenceNiveau
    }
    /** Content related to the dossier (field 1). Corresponds to `CONTENU_DOSSIER_1` (xs:anyType) in XSD. */
    CONTENU_DOSSIER_1?: string
    /** Content related to the dossier (field 2). Corresponds to `CONTENU_DOSSIER_2` (xs:anyType) in XSD. */
    CONTENU_DOSSIER_2?: string
    /** Content related to the dossier (field 3). Corresponds to `CONTENU_DOSSIER_3` (xs:anyType) in XSD. */
    CONTENU_DOSSIER_3?: string
    /** Content related to the dossier (field 4). Corresponds to `CONTENU_DOSSIER_4` (xs:anyType) in XSD. */
    CONTENU_DOSSIER_4?: string
    /** Content related to the dossier (field 5). Corresponds to `CONTENU_DOSSIER_5` (xs:anyType) in XSD. */
    CONTENU_DOSSIER_5?: string
    /**
     * Schedule or timeline associated with the legislative dossier.
     * Corresponds to the `ECHEANCIER` element in `dole_dossier.xsd`.
     */
    ECHEANCIER?: Echeancier
    /** Explanatory statement or summary. Corresponds to `EXPOSE_MOTIF` (xs:anyType) in XSD. */
    EXPOSE_MOTIF?: string
    /** Label for related text 1. Corresponds to `LIBELLE_TEXTE_1` in XSD. */
    LIBELLE_TEXTE_1?: string
    /** Label for related text 2. Corresponds to `LIBELLE_TEXTE_2` in XSD. */
    LIBELLE_TEXTE_2?: string
    /** Label for related text 3. Corresponds to `LIBELLE_TEXTE_3` in XSD. */
    LIBELLE_TEXTE_3?: string
    /** Label for related text 4. Corresponds to `LIBELLE_TEXTE_4` in XSD. */
    LIBELLE_TEXTE_4?: string
    /** Label for related text 5. Corresponds to `LIBELLE_TEXTE_5` in XSD. */
    LIBELLE_TEXTE_5?: string
  }
  /**
   * Metadata associated with the legislative dossier.
   * Corresponds to the `META` element in `dole_dossier.xsd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to the `META_COMMUN` element in `dole_d dossier.xsd`.
     */
    META_COMMUN: {
      // MetaCommun
      /** Old identifier, if any. Corresponds to `ANCIEN_ID` in XSD. */
      ANCIEN_ID?: string
      /** Unique identifier for the dossier. Corresponds to `ID` in XSD. */
      ID: string
      /** URL of the legislative dossier. Corresponds to `URL` in XSD. */
      URL: string
      // NATURE?: Nature // Never used. XSD defines `NATURE` as nature of the document.
      /**
       * Origin of the data (e.g., "JORF" for Journal Officiel).
       * Corresponds to `ORIGINE` in XSD.
       */
      ORIGINE: "JORF" // Origine
    }
    /**
     * Specific metadata for the legislative dossier.
     * Corresponds to the `META_DOSSIER_LEGISLATIF` element in `dole_dossier.xsd`.
     */
    META_DOSSIER_LEGISLATIF: {
      /** Creation date of the dossier (YYYY-MM-DD). Corresponds to `DATE_CREATION` in XSD. */
      DATE_CREATION: string
      /** Last modification date of the dossier (YYYY-MM-DD). Corresponds to `DATE_DERNIERE_MODIFICATION` in XSD. */
      DATE_DERNIERE_MODIFICATION: string
      /** Identifier for related text 1. Corresponds to `ID_TEXTE_1` in XSD. Always starts with JORFTEXT when present. */
      ID_TEXTE_1?: string // Always starts with JORFTEXT when present
      /** Identifier for related text 2. Corresponds to `ID_TEXTE_2` in XSD. Always starts with JORFTEXT when present. */
      ID_TEXTE_2?: string // Always starts with JORFTEXT when present
      /** Identifier for related text 3. Corresponds to `ID_TEXTE_3` in XSD. Always starts with JORFTEXT when present. */
      ID_TEXTE_3?: string // Always starts with JORFTEXT when present
      /** Identifier for related text 4. Corresponds to `ID_TEXTE_4` in XSD. Always starts with JORFTEXT when present. */
      ID_TEXTE_4?: string // Always starts with JORFTEXT when present
      /** Identifier for related text 5. Corresponds to `ID_TEXTE_5` in XSD. Always starts with JORFTEXT when present. */
      ID_TEXTE_5?: string // Always starts with JORFTEXT when present
      /**
       * Information about the legislature.
       * Corresponds to the `LEGISLATURE` element in `dole_dossier.xsd`.
       */
      LEGISLATURE?: {
        /** Start date of the legislature (YYYY-MM-DD). Corresponds to `DATE_DEBUT` in XSD. */
        DATE_DEBUT: string
        /** End date of the legislature (YYYY-MM-DD). Corresponds to `DATE_FIN` in XSD. */
        DATE_FIN: string
        /** Label or name of the legislature. Corresponds to `LIBELLE` in XSD. */
        LIBELLE: string
        /** Number of the legislature. Corresponds to `NUMERO` (xs:string) in XSD. */
        NUMERO: number
      }
      /** Title of the legislative dossier. Corresponds to `TITRE` in XSD. */
      TITRE: string
      /** Type of the legislative dossier. Corresponds to `TYPE` (xs:string) in XSD. */
      TYPE?: DossierLegislatifType
    }
  }
}

/**
 * Defines the possible types for a legislative dossier.
 * These values are based on observed data and provide type safety.
 * The XSD defines the `TYPE` field in `META_DOSSIER_LEGISLATIF` as `xs:string`.
 */
export type DossierLegislatifType = (typeof allDossierLegislatifTypes)[number]

/**
 * Represents a schedule or timeline (échéancier) within a legislative dossier.
 * Corresponds to the `ECHEANCIER` element in `dole_dossier.xsd`.
 */
export interface Echeancier {
  /**
   * Last update date of the schedule (YYYY-MM-DD).
   * From `@derniere_maj` attribute in XSD.
   */
  "@derniere_maj"?: string
  /**
   * Array of lines or items in the schedule.
   * Corresponds to one or more `LIGNE` elements in XSD.
   */
  LIGNE: EcheancierLigne[]
}

/**
 * Represents a single line or item within the schedule (échéancier).
 * Corresponds to the `LIGNE` element in `dole_dossier.xsd`.
 */
export interface EcheancierLigne {
  /** Article reference. Corresponds to `ARTICLE` in XSD. */
  ARTICLE?: string
  /** Legal basis. Corresponds to `BASE_LEGALE` in XSD. */
  BASE_LEGALE?: string
  /** Identifier of the target law. Corresponds to `CID_LOI_CIBLE` in XSD. Always a JORFTEXT ID. */
  CID_LOI_CIBLE?: string // Always a JORFTEXT ID
  /** Planned date (YYYY-MM-DD). Corresponds to `DATE_PREVUE` in XSD. */
  DATE_PREVUE?: string
  /** Decree reference. Corresponds to `DECRET` in XSD. */
  DECRET?: string
  /**
   * Link(s) to the article.
   * Corresponds to `LIEN_ARTICLE` element in XSD.
   */
  LIEN_ARTICLE?: Array<{
    /** Identifier of the linked article. From `@id` attribute in XSD. Always a JORFARTI ID. */
    "@id": string // Always a JORFARTI ID
    /** Text content of the link. */
    "#text": string
  }>
  /** Order number of the schedule item. Corresponds to `NUMERO_ORDRE` in XSD. */
  NUMERO_ORDRE?: string
  /** Object or subject of the schedule item. Corresponds to `OBJET` in XSD. */
  OBJET?: string
}

/**
 * Defines the known types of legislative dossiers.
 * This list is used to create the `DossierLegislatifType`.
 */
export const allDossierLegislatifTypes = [
  "LOI_PUBLIEE",
  "PROJET_LOI",
  "PROJET_ORDONNANCE",
  "PROPOSITION_LOI",
  "ORDONNANCE_PUBLIEE",
] as const
