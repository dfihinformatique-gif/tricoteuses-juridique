import type { ArticleType, Sens } from "./shared.js"

/**
 * Represents a legislative article (Article LEGI).
 * Corresponds to the `ARTICLE` root element in `legi_article.dtd`.
 * DTD comment: "Décrit toutes les informations relatives à un article LEGI".
 */
export interface LegiArticle {
  /**
   * Main textual content of the article.
   * Corresponds to `BLOC_TEXTUEL` in `legi_article.dtd`, which contains a `CONTENU` element (HTML).
   */
  BLOC_TEXTUEL?: {
    /** HTML content of the article block. */
    CONTENU: string // HTML
  }
  /**
   * Context of the article, referencing its parent legislative text.
   * Corresponds to `CONTEXTE` in `legi_article.dtd`.
   */
  CONTEXTE: {
    /**
     * Information about the parent legislative text.
     * Corresponds to `TEXTE` element in `legi_article.dtd`.
     */
    TEXTE: {
      /** Issuing authority. From `autorite` attribute of `TEXTE`. */
      "@autorite"?: string
      /** Internal common identifier for all versions of the parent text. From `cid` attribute of `TEXTE`. */
      "@cid"?: string
      /** Publication date of the parent text. From `date_publi` attribute of `TEXTE`. */
      "@date_publi"?: string
      /** Signature date of the parent text. From `date_signature` attribute of `TEXTE`. */
      "@date_signature"?: string
      /** Issuing ministry. From `ministere` attribute of `TEXTE`. */
      "@ministere"?: string
      /** Nature of the parent text. From `nature` attribute of `TEXTE`. */
      "@nature"?: LegiArticleTexteNature
      /** NOR identifier of the parent text. From `nor` attribute of `TEXTE`. */
      "@nor"?: string
      /** Number of the parent text. From `num` attribute of `TEXTE`. */
      "@num"?: string
      /** Publication number in Journal Officiel for the parent text. From `num_parution_jo` attribute of `TEXTE`. */
      "@num_parution_jo"?: string
      /**
       * Titles of the parent text versions.
       * Corresponds to `TITRE_TXT` elements in `legi_article.dtd`.
       */
      TITRE_TXT: Array<{
        /** Text content of the title. */
        "#text": string
        /** Short title of the text version. From `c_titre_court` attribute of `TITRE_TXT`. */
        "@c_titre_court": string
        /** Start date of validity for this text version title. From `debut` attribute of `TITRE_TXT`. */
        "@debut": string
        /** End date of validity for this text version title. From `fin` attribute of `TITRE_TXT`. */
        "@fin": string
        /** Internal identifier of the text version. From `id_txt` attribute of `TITRE_TXT`. */
        "@id_txt": string
      }>
      /**
       * Table of contents hierarchy for the parent text.
       * Corresponds to nested `TM` elements in `legi_article.dtd`.
       */
      TM?: LegiArticleTm
    }
  }
  /**
   * Links from this article to other documents.
   * Corresponds to `LIENS` in `legi_article.dtd`, containing `LIEN` elements.
   */
  LIENS?: {
    /** Array of link elements. */
    LIEN: Array<LegiArticleLien>
  }
  /**
   * Metadata for the article.
   * Corresponds to `META` in `legi_article.dtd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to `META_COMMUN` (defined in `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Old identifier (from previous Legifrance version). From `ANCIEN_ID` in `meta_commun.dtd`. */
      ANCIEN_ID?: string
      /** Internal identifier of the article. From `ID` in `meta_commun.dtd`. */
      ID: string
      /** Nature of the document (e.g., "ARTICLE"). From `NATURE` in `meta_commun.dtd`. */
      NATURE: LegiArticleNature
      /** Origin of the document (e.g., "LEGI"). From `ORIGINE` in `meta_commun.dtd`. */
      ORIGINE: LegiArticleOrigine
      /** Relative URL of the document. From `URL` in `meta_commun.dtd`. */
      URL: string
    }
    /**
     * Specific metadata for the article.
     * Corresponds to `META_SPEC` in `legi_article.dtd`.
     */
    META_SPEC: {
      /**
       * Article-specific metadata.
       * Corresponds to `META_ARTICLE` in `legi_article.dtd`.
       */
      META_ARTICLE: LegiArticleMetaArticle
    }
  }
  /**
   * Notes associated with the article.
   * Corresponds to `NOTA` in `legi_article.dtd`, which contains a `CONTENU` element (HTML).
   */
  NOTA?: {
    /** HTML content of the note. */
    CONTENU: string // HTML
  }
  /**
   * Versions of the article.
   * Corresponds to `VERSIONS` in `legi_article.dtd`, containing `VERSION` elements.
   */
  VERSIONS: {
    /** Array of article version elements. */
    VERSION: LegiArticleVersion[]
  }
}

/**
 * Legal status of a legislative article.
 * Values are based on `ETAT` element in `legi_article.dtd`.
 * DTD comment: "Etat juridique de l'article. Les valeurs possibles sont : ABROGE , ABROGE_DIFF, ANNULE, DISJOINT, MODIFIE, MODIFIE_MORT_NE, PERIME, TRANSFERE, VIGUEUR, VIGUEUR_DIFF".
 */
export type LegiArticleEtat = (typeof allLegiArticleEtats)[number]

/**
 * Represents a link from a legislative article to another document or part of a document.
 * Corresponds to attributes of the `LIEN` element, typically defined in `lien.dtd` and used within `ARTICLE/LIENS`.
 */
export interface LegiArticleLien {
  /** Text content of the link, if any. */
  "#text"?: string
  /** Identifier of the target text if the link is internal. From `cidtexte` attribute. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Signature date of the target text. From `datesignatexte` attribute. */
  "@datesignatexte"?: string
  /** Identifier of the target element (article, section, etc.). From `id` attribute. */
  "@id"?: string
  /** Nature of the target text. From `naturetexte` attribute. */
  "@naturetexte"?: LegiArticleLienNature
  /** NOR identifier of the target text. From `nortexte` attribute. */
  "@nortexte"?: string
  /** Number of the target text or element. From `num` attribute. */
  "@num"?: string
  /** Direction of the link (e.g., "SOURCE", "CIBLE"). From `sens` attribute. */
  "@sens": Sens
  /** Type of the link (e.g., "ABROGATION", "CITATION"). From `typelien` attribute. */
  "@typelien": LegiArticleLienType
}

/**
 * Origin of the article linked to (e.g., JORF, LEGI).
 * Used in `LegiArticleVersion/LIEN_ART/@origine`.
 */
export type LegiArticleLienArticleOrigine =
  (typeof allLegiArticleLienArticleOrigines)[number]

/** Nature of the text linked to by a `LegiArticleLien`. */
export type LegiArticleLienNature = (typeof allLegiArticleLienNatures)[number]

/** Type of link in `LegiArticleLien`. */
export type LegiArticleLienType = (typeof allLegiArticleLienTypes)[number]

/**
 * Represents article-specific metadata.
 * Corresponds to `META_ARTICLE` in `legi_article.dtd`.
 */
export interface LegiArticleMetaArticle {
  /** Start date of validity for the article. From `DATE_DEBUT` in `legi_article.dtd`. */
  DATE_DEBUT: string
  /** End date of validity for the article. From `DATE_FIN` in `legi_article.dtd`. */
  DATE_FIN: string
  /** Legal status of the article. From `ETAT` in `legi_article.dtd`. */
  ETAT?: LegiArticleEtat
  /** Number of the article. From `NUM` in `legi_article.dtd`. */
  NUM?: string
  /** Type of the article. From `TYPE` in `legi_article.dtd`. DTD comment: "@hidden liste de valeurs à préciser". */
  TYPE?: ArticleType
}

/** Nature of a `LegiArticle` document, typically "Article". From `NATURE` in `META_COMMUN`. */
export type LegiArticleNature = (typeof allLegiArticleNatures)[number]

/** Origin of a `LegiArticle` document, typically "LEGI" or "JORF". From `ORIGINE` in `META_COMMUN`. */
export type LegiArticleOrigine = (typeof allLegiArticleOrigines)[number]

/** Nature of the parent text referenced in `LegiArticle/CONTEXTE/TEXTE`. From `nature` attribute of `TEXTE`. */
export type LegiArticleTexteNature = (typeof allLegiArticleTexteNatures)[number]

/**
 * Represents a level in the table of contents (Table des Matières - TM) within an article's context.
 * Corresponds to the recursive `TM` element structure in `legi_article.dtd`.
 */
export interface LegiArticleTm {
  /**
   * Title of this table of contents level.
   * Corresponds to `TITRE_TM` element in `legi_article.dtd`.
   */
  TITRE_TM: Array<{
    /** Text content of the TM title. */
    "#text": string
    /** Start date of validity for this TM level. From `debut` attribute of `TITRE_TM`. */
    "@debut": string
    /** End date of validity for this TM level. From `fin` attribute of `TITRE_TM`. */
    "@fin": string
    /** Internal identifier of this TM level. From `id` attribute of `TITRE_TM`. */
    "@id": string
  }>
  /** Nested table of contents level. */
  TM?: LegiArticleTm
}

/**
 * Represents a specific version of a legislative article.
 * Corresponds to `VERSION` element within `ARTICLE/VERSIONS` in `legi_article.dtd`.
 */
export interface LegiArticleVersion {
  /** Legal status of the article in this version. From `etat` attribute of `VERSION`. */
  "@etat"?: LegiArticleEtat
  /**
   * Link to the article content for this version.
   * Corresponds to `LIEN_ART` element (defined in `lien_art.dtd`).
   */
  LIEN_ART: {
    /** Start date of validity for this article version link. From `debut` attribute. */
    "@debut": string
    /** Legal status of the linked article version. From `etat` attribute. */
    "@etat"?: LegiArticleEtat
    /** End date of validity for this article version link. From `fin` attribute. */
    "@fin": string
    /** Identifier of the linked article content. From `id` attribute. */
    "@id": string
    /** Number of the linked article. From `num` attribute. */
    "@num"?: string
    /** Origin of the linked article (e.g., "LEGI"). From `origine` attribute. */
    "@origine": LegiArticleOrigine
  }
}

/** Tags representing different categories or types of LEGI documents/structures. */
export type LegiCategorieTag = (typeof allLegiCategoriesTags)[number]

/**
 * Represents metadata specific to chronological aspects of a legislative text.
 * Corresponds to `META_TEXTE_CHRONICLE` root element in `meta_texte_chronicle.dtd`.
 */
export interface LegiMetaTexteChronicle {
  /** Internal common identifier for all versions of the text. From `CID`. */
  CID: string
  /** Publication date of the text. From `DATE_PUBLI`. */
  DATE_PUBLI: string
  /** Signature date of the text. From `DATE_TEXTE`. */
  DATE_TEXTE: string
  /** Last modification date of the text. From `DERNIERE_MODIFICATION`. */
  DERNIERE_MODIFICATION: string
  /** NOR identifier of the text. From `NOR`. */
  NOR?: string
  /** Number of the text. From `NUM`. */
  NUM?: string
  /** Publication number in Journal Officiel. From `NUM_PARUTION`. */
  NUM_PARUTION?: number
  /** Sequence number in Journal Officiel. From `NUM_SEQUENCE`. */
  NUM_SEQUENCE?: number
  /** Origin of publication (e.g., title of JO). From `ORIGINE_PUBLI`. */
  ORIGINE_PUBLI?: string
  /** Start page of publication in JO. From `PAGE_DEB_PUBLI`. */
  PAGE_DEB_PUBLI?: number
  /** End page of publication in JO. From `PAGE_FIN_PUBLI`. */
  PAGE_FIN_PUBLI?: number
  /**
   * Information about future versions of the text.
   * Corresponds to `VERSIONS_A_VENIR` in `meta_texte_chronicle.dtd`.
   */
  VERSIONS_A_VENIR?: {
    /** Array of future version dates or identifiers. From `VERSION_A_VENIR`. */
    VERSION_A_VENIR: string[]
  }
}

/**
 * Represents metadata specific to a version of a legislative text.
 * Corresponds to `META_TEXTE_VERSION` element in `legi_texte_version.dtd`.
 */
export interface LegiMetaTexteVersion {
  /** Issuing authority. From `AUTORITE` in `legi_texte_version.dtd`. */
  AUTORITE?: string
  /** Start date of validity for this text version. From `DATE_DEBUT` in `legi_texte_version.dtd`. */
  DATE_DEBUT?: string
  /** End date of validity for this text version. From `DATE_FIN` in `legi_texte_version.dtd`. */
  DATE_FIN?: string
  /** Legal status of this text version. From `ETAT` in `legi_texte_version.dtd`. */
  ETAT?: LegiTexteEtat
  /**
   * Links associated with this text version.
   * Corresponds to `LIENS` in `legi_texte_version.dtd`.
   */
  LIENS?: {
    /** Array of link elements. */
    LIEN: Array<LegiTexteVersionLien>
  }
  /**
   * Keywords or classification terms for the text.
   * Note: `MCS_TXT` (Mots Clefs Texte?) is not directly found in the provided DTD excerpts,
   * may be a custom addition or from a DTD not analyzed.
   */
  MCS_TXT?: {
    /** Array of keywords. */
    MC: string[]
  }
  /** Issuing ministry. From `MINISTERE` in `legi_texte_version.dtd`. */
  MINISTERE?: string
  /** Short title of the text version. From `TITRE` in `legi_texte_version.dtd`. */
  TITRE?: string
  /** Full title of the text version. From `TITREFULL` in `legi_texte_version.dtd`. */
  TITREFULL?: string
}

/**
 * Represents a "Section TA" (Titre/Article), a level in a table of contents of a legislative text.
 * This structure is referenced by `LIEN_SECTION_TA` in `legi_texte_struct.dtd` and `legi_article.dtd`.
 * The specific DTD for `SECTION_TA` itself (likely `legi_section_ta.dtd`) was not fully analyzed for its root structure,
 * but its linking attributes are known from `lien_section_ta.dtd`.
 */
export interface LegiSectionTa {
  /** Commentary associated with the section. (Not found in analyzed DTDs, may be application specific) */
  COMMENTAIRE?: string
  /**
   * Context of the section, referencing its parent legislative text.
   * Similar to `CONTEXTE` in `LegiArticle`.
   */
  CONTEXTE: {
    /** Information about the parent legislative text. */
    TEXTE: {
      "@autorite"?: string
      "@cid": string
      "@date_publi": string
      "@date_signature": string
      "@ministere"?: string
      "@nature"?: LegiSectionTaTexteNature
      "@nor"?: string
      "@num"?: string
      "@num_parution_jo"?: string
      /** Titles of the parent text versions. */
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court"?: string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      /** Table of contents hierarchy for the parent text. */
      TM?: LegiSectionTaTm
    }
  }
  /** Identifier of the section. */
  ID: string
  /**
   * Structure of this section, linking to subsections or articles.
   * Corresponds to elements like `LIEN_ART` or `LIEN_SECTION_TA` that can be nested.
   */
  STRUCTURE_TA?: LegiSectionTaStructure
  /** Title of the section. (May contain newlines) */
  TITRE_TA?: string // Titre de la section (peut contenir des sauts de lignes à remplacer par des espaces)
}

/**
 * Represents a link from a `LegiSectionTa` to an article.
 * Attributes are based on `lien_art.dtd` usage within a section context.
 */
export interface LegiSectionTaLienArt {
  /** Start date of validity. From `debut` attribute. */
  "@debut": string
  /** Legal status. From `etat` attribute. */
  "@etat"?: LegiSectionTaLienArtEtat
  /** End date of validity. From `fin` attribute. */
  "@fin": string
  /** Identifier of the linked article. From `id` attribute. */
  "@id": string
  /** Number of the linked article. From `num` attribute. */
  "@num"?: string
  /** Origin of the linked article (e.g., "LEGI"). From `origine` attribute. */
  "@origine": LegiSectionTaLienArtOrigine
}

/** Legal status for a `LegiSectionTaLienArt`. */
export type LegiSectionTaLienArtEtat =
  (typeof allLegiSectionTaLienArtEtats)[number]

/** Origin for a `LegiSectionTaLienArt`. */
export type LegiSectionTaLienArtOrigine =
  (typeof allLegiSectionTaLienArtOrigines)[number]

/**
 * Represents a link from a `LegiSectionTa` to another `LegiSectionTa` (subsection).
 * Attributes are based on `lien_section_ta.dtd`.
 */
export interface LegiSectionTaLienSectionTa {
  /** Text content/title of the linked section. */
  "#text"?: string
  /** CID of the linked section. From `cid` attribute. */
  "@cid": string
  /** Start date of validity. From `debut` attribute. */
  "@debut": string
  /** Legal status. From `etat` attribute. */
  "@etat"?: LegiSectionTaLienSectionTaEtat
  /** End date of validity. From `fin` attribute. */
  "@fin": string
  /** Identifier of the linked section. From `id` attribute. */
  "@id": string
  /** Nesting level. From `niv` attribute. */
  "@niv": number
  /** URL/path to the XML file of the linked section. From `url` attribute. */
  "@url": string
}

/** Legal status for a `LegiSectionTaLienSectionTa`. */
export type LegiSectionTaLienSectionTaEtat =
  (typeof allLegiSectionTaLienSectionTaEtats)[number]

/**
 * Structure of a `LegiSectionTa`, containing links to articles or subsections.
 * This reflects the content model of elements that group `LIEN_ART` and `LIEN_SECTION_TA`.
 */
export interface LegiSectionTaStructure {
  /** Array of links to articles within this section. */
  LIEN_ART?: LegiSectionTaLienArt[]
  /** Array of links to subsections (other SectionTA) within this section. */
  LIEN_SECTION_TA?: LegiSectionTaLienSectionTa[]
}

/** Nature of the parent text for a `LegiSectionTa`. */
export type LegiSectionTaTexteNature =
  (typeof allLegiSectionTaTexteNatures)[number]

/**
 * Represents a table of contents (TM) structure within a `LegiSectionTa`.
 * Similar to `LegiArticleTm`.
 */
export interface LegiSectionTaTm {
  /** Title of this table of contents level. */
  TITRE_TM: Array<{
    /** Text content of the TM title. */
    "#text"?: string
    /** Start date of validity for this TM level. */
    "@debut": string
    /** End date of validity for this TM level. */
    "@fin": string
    /** Internal identifier of this TM level. */
    "@id": string
  }>
  /** Nested table of contents level. */
  TM?: LegiSectionTaTm
}

/**
 * Represents a complete legislative text, combining its structural overview (`LegiTextelr`)
 * and the content of a specific version (`LegiTexteVersion`).
 * This is a conceptual merge, not a direct DTD root element.
 */
export type LegiTexte = LegiTexteVersion & {
  /**
   * Structural hierarchy of the text (table of contents).
   * From `STRUCT` element in `legi_texte_struct.dtd` (`TEXTELR` root).
   */
  STRUCT?: LegiTextelrStructure
  /**
   * List of available versions of the text.
   * From `VERSIONS` element in `legi_texte_struct.dtd` (`TEXTELR` root).
   */
  VERSIONS?: LegiTextelrVersions
}

/**
 * Represents the structural overview of a legislative text and its versions.
 * Corresponds to the `TEXTELR` root element in `legi_texte_struct.dtd`.
 * DTD comment: "Décrit la structure d'un texte LEGI et la liste des différentes versions de ce texte."
 */
export interface LegiTextelr {
  /**
   * Metadata for the text structure.
   * Corresponds to `META` in `legi_texte_struct.dtd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to `META_COMMUN` (defined in `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Old identifier. From `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** Unique identifier of the text structure document. From `ID`. */
      ID: string
      /** Nature of the document (e.g., "TEXTELR"). From `NATURE`. */
      NATURE?: LegiTexteNature
      /** Origin of the document (e.g., "LEGI"). From `ORIGINE`. */
      ORIGINE: LegiTexteOrigine
      /** Relative URL of the document. From `URL`. */
      URL: string
    }
    /**
     * Specific metadata for the text structure.
     * Corresponds to `META_SPEC` in `legi_texte_struct.dtd`.
     */
    META_SPEC: {
      /**
       * Chronological metadata for the text.
       * Corresponds to `META_TEXTE_CHRONICLE` (defined in `meta_texte_chronicle.dtd`).
       */
      META_TEXTE_CHRONICLE: LegiMetaTexteChronicle
    }
  }
  /**
   * The structural hierarchy (table of contents) of the legislative text.
   * Corresponds to `STRUCT` in `legi_texte_struct.dtd`.
   */
  STRUCT?: LegiTextelrStructure
  /**
   * List of available versions of this legislative text.
   * Corresponds to `VERSIONS` in `legi_texte_struct.dtd`.
   */
  VERSIONS: LegiTextelrVersions
}

/**
 * Legal status of a legislative text version (used in `LegiTextelrVersion` and `LegiMetaTexteVersion`).
 * Values based on `ETAT` element in `legi_texte_version.dtd`.
 * DTD comment: "Etat juridique du texte. Les valeurs possibles sont : ABROGE, ABROGE_DIFF, ANNULE, MODIFIE, MODIFIE_MORT_NE, PERIME, TRANSFERE, VIGUEUR, VIGUEUR_DIFF".
 */
export type LegiTexteEtat = (typeof allLegiTexteEtats)[number]

/**
 * Represents a link from a `LegiTextelrStructure` to an article.
 * Attributes based on `lien_art.dtd` usage within `TEXTELR/STRUCT`.
 */
export interface LegiTextelrLienArt {
  /** Start date of validity. From `debut` attribute. */
  "@debut": string
  /** Legal status. From `etat` attribute. */
  "@etat"?: LegiTextelrLienArtEtat
  /** End date of validity. From `fin` attribute. */
  "@fin": string
  /** Identifier of the linked article. From `id` attribute. */
  "@id": string
  // "@nature"?: undefined // DTDs for LIEN_ART don't typically specify nature, it's an Article.
  /** Number of the linked article. From `num` attribute. */
  "@num"?: string
  /** Origin of the linked article (e.g., "LEGI"). From `origine` attribute. */
  "@origine": LegiTextelrLienArtOrigine
}

/** Legal status for a `LegiTextelrLienArt`. */
export type LegiTextelrLienArtEtat = (typeof allLegiTextelrLienArtEtats)[number]

/** Origin for a `LegiTextelrLienArt`. */
export type LegiTextelrLienArtOrigine =
  (typeof allLegiTextelrLienArtOrigines)[number]

/**
 * Represents a link from a `LegiTextelrStructure` to a `LegiSectionTa` (section).
 * Attributes based on `lien_section_ta.dtd` usage within `TEXTELR/STRUCT`.
 */
export interface LegiTextelrLienSectionTa {
  /** Title of the linked section. Text content of `LIEN_SECTION_TA`. */
  "#text": string // Titre de la section
  /** CID of the linked section. From `cid` attribute. */
  "@cid": string // ID de la Section Texte Article que la Section Texte Article a modifée ou égal à @id si pas de modification
  /** Start date of validity. From `debut` attribute. */
  "@debut": string // Date de début
  /** Legal status. From `etat` attribute. */
  "@etat"?: LegiTextelrLienSectionTaEtat
  /** End date of validity. From `fin` attribute. */
  "@fin": string // Date de fin
  /** Identifier of the linked section. From `id` attribute. */
  "@id": string // ID de la Section Texte Article
  /** Nesting level of the section. From `niv` attribute. */
  "@niv": number // Niveau de profondeur de la section dans l'arborescence
  /** URL/path to the XML file of the linked section. From `url` attribute. */
  "@url": string // Chemin du fichier XML de la Section Texte Article dans l'archive
}

/** Legal status for a `LegiTextelrLienSectionTa`. */
export type LegiTextelrLienSectionTaEtat =
  (typeof allLegiTextelrLienSectionTaEtats)[number]

/** Nature of a `LegiTextelr` or `LegiTexteVersion` document. From `NATURE` in `META_COMMUN`. */
export type LegiTexteNature = (typeof allLegiTexteNatures)[number]

/** Origin of a `LegiTextelr` or `LegiTexteVersion` document. From `ORIGINE` in `META_COMMUN`. */
export type LegiTexteOrigine = (typeof allLegiTexteOrigines)[number]

/**
 * Represents the top-level structure (table of contents) of a `LegiTextelr` document.
 * Corresponds to the `STRUCT` element in `legi_texte_struct.dtd`.
 * DTD comment for `TEXTELR`: "Historique de la structure".
 */
export interface LegiTextelrStructure {
  /** Array of links to articles at this level of the structure. */
  LIEN_ART?: LegiTextelrLienArt[]
  /** Array of links to sections (SectionTA) at this level of the structure. */
  LIEN_SECTION_TA?: LegiTextelrLienSectionTa[]
}

/**
 * Represents a specific version of a legislative text, as listed in `LegiTextelrVersions`.
 * Corresponds to `VERSION` element within `TEXTELR/VERSIONS` in `legi_texte_struct.dtd`.
 */
export interface LegiTextelrVersion {
  /** Legal status of this text version. From `etat` attribute of `VERSION`. */
  "@etat"?: LegiTexteEtat
  /**
   * Link to the actual text content of this version.
   * Corresponds to `LIEN_TXT` element (defined in `lien_txt.dtd`).
   */
  LIEN_TXT: {
    /** Start date of validity for this text version link. From `debut` attribute. */
    "@debut": string
    /** End date of validity for this text version link. From `fin` attribute. */
    "@fin": string
    /** Identifier of the linked text version document (e.g., a `LegiTexteVersion` ID). From `id` attribute. */
    "@id": string
    /** Number of the text version. From `num` attribute. */
    "@num"?: string
  }
}

/**
 * Container for the list of versions of a legislative text in a `LegiTextelr` document.
 * Corresponds to `VERSIONS` element in `legi_texte_struct.dtd`.
 * DTD comment: "Liste des versions du texte".
 */
export interface LegiTextelrVersions {
  /** Array of text version elements. */
  VERSION: LegiTextelrVersion[]
}

/**
 * Represents a specific version of a legislative text with its full content.
 * Corresponds to the `TEXTE_VERSION` root element in `legi_texte_version.dtd`.
 * DTD comment: "Décrit les informations spécifiques à une version de texte LEGI".
 */
export interface LegiTexteVersion {
  /**
   * Abrogations affecting this text version.
   * Corresponds to `ABRO` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  ABRO?: {
    /** HTML content detailing abrogations. */
    CONTENU: string // HTML
  }
  /**
   * Metadata for this text version.
   * Corresponds to `META` in `legi_texte_version.dtd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to `META_COMMUN` (defined in `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Old identifier. From `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** European Legislation Identifier alias. (Not found in analyzed DTDs, may be application specific) */
      ELI_ALIAS?: {
        /** ELI Alias ID */
        ID_ELI_ALIAS: string
      }
      /** Unique identifier of this text version document. From `ID`. */
      ID: string
      /** European Legislation Identifier. (Not found in analyzed DTDs, may be application specific) */
      ID_ELI?: string
      /** Nature of the document (e.g., "TEXTE_VERSION"). From `NATURE`. */
      NATURE?: LegiTexteNature
      /** Origin of the document (e.g., "LEGI"). From `ORIGINE`. */
      ORIGINE: LegiTexteOrigine
      /** Relative URL of the document. From `URL`. */
      URL: string
    }
    /**
     * Specific metadata for this text version.
     * Corresponds to `META_SPEC` in `legi_texte_version.dtd`.
     */
    META_SPEC: {
      /**
       * Chronological metadata for the text.
       * Corresponds to `META_TEXTE_CHRONICLE` (defined in `meta_texte_chronicle.dtd`).
       */
      META_TEXTE_CHRONICLE: LegiMetaTexteChronicle
      /**
       * Version-specific metadata for the text.
       * Corresponds to `META_TEXTE_VERSION` (defined in `legi_texte_version.dtd`).
       */
      META_TEXTE_VERSION: LegiMetaTexteVersion
    }
  }
  /**
   * Notes associated with this text version.
   * Corresponds to `NOTA` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  NOTA?: {
    /** HTML content of the note. */
    CONTENU: string // HTML
  }
  /**
   * Rectifications to this text version.
   * Corresponds to `RECT` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  RECT?: {
    /** HTML content of rectifications. */
    CONTENU: string // HTML
  }
  /**
   * Signatories of this text version.
   * Corresponds to `SIGNATAIRES` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  SIGNATAIRES?: {
    /** HTML content listing signatories. */
    CONTENU: string // HTML
  }
  /**
   * Preparatory works (Travaux Préparatoires) for this text version.
   * Corresponds to `TP` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  TP?: {
    /** HTML content of preparatory works. */
    CONTENU: string // HTML
  }
  /**
   * Visas (preamble references) for this text version.
   * Corresponds to `VISAS` in `legi_texte_version.dtd`, contains HTML `CONTENU`.
   */
  VISAS?: {
    /** HTML content of visas. */
    CONTENU: string // HTML
  }
}

/**
 * Represents a link from a `LegiTexteVersion` (via `LegiMetaTexteVersion/LIENS`) to another document.
 * Attributes are based on `lien.dtd` usage within `TEXTE_VERSION`.
 */
export interface LegiTexteVersionLien {
  /** Text content of the link, if any. */
  "#text"?: string
  /** Identifier of the target text if the link is internal. From `cidtexte` attribute. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Signature date of the target text. From `datesignatexte` attribute. */
  "@datesignatexte"?: string
  /** Identifier of the target element. From `id` attribute. */
  "@id"?: string
  /** Nature of the target text. From `naturetexte` attribute. */
  "@naturetexte"?: LegiTexteVersionLienNature
  /** Number of the target text or element. From `num` attribute. */
  "@num"?: string
  /** NOR identifier of the target text. From `nortexte` attribute. */
  "@nortexte"?: string
  /** (Deprecated?) Number of the target text. Often similar to @num. */
  "@numtexte"?: string
  /** Direction of the link. From `sens` attribute. */
  "@sens": Sens
  /** Type of the link. From `typelien` attribute. */
  "@typelien": LegiTexteVersionLienType
}

/** Nature of the text linked to by a `LegiTexteVersionLien`. */
export type LegiTexteVersionLienNature =
  (typeof allLegiTexteVersionLienNatures)[number]

/** Type of link in `LegiTexteVersionLien`. */
export type LegiTexteVersionLienType =
  (typeof allLegiTexteVersionLienTypes)[number]

/**
 * Possible legal states for a legislative article (`LegiArticle`, `LegiArticleVersion`, `LegiSectionTaLienArt`, `LegiTextelrLienArt`).
 * Based on DTD comments for `ETAT` elements (e.g., in `legi_article.dtd`).
 */
export const allLegiArticleEtats = [
  "ABROGE_DIFF", // 16233
  "ABROGE", // 341353
  "ANNULE", // 1955
  "DEPLACE", // 1
  "DISJOINT", // 87
  "MODIFIE", // 429664
  "MODIFIE_MORT_NE", // 6929
  "PERIME", // 19628
  "TRANSFERE", // 14757
  "VIGUEUR", // 619477
  "VIGUEUR_DIFF", // 14629
] as const

export const allLegiArticleLienArticleOrigines = ["JORF", "LEGI"] as const

export const allLegiArticleLienNatures = [
  "Accord de branche", // 10
  "ACCORD_FONCTION_PUBLIQUE", // 68
  "Accord", // 9
  "ARRETE", // 878512
  "Avenant", // 24
  "AVENANT", // 7
  "AVIS", // 139
  "CIRCULAIRE", // 73
  "CODE", // 3276729
  "CONSTITUTION", // 1086
  "Convention collective nationale", // 7
  "Convention collective", // 1
  "CONVENTION", // 3
  "DECISION_EURO", // 1
  "DECISION", // 1735
  "DECRET_LOI", // 1184
  "DECRET", // 2037090
  "DELIBERATION", // 4172
  "DIRECTIVE_EURO", // 180
  "DIRECTIVE", // 64
  "INSTRUCTION", // 4
  "LOI_CONSTIT", // 111
  "LOI_ORGANIQUE", // 5681
  "LOI_PROGRAMME", // 335
  "LOI", // 645965
  "ORDONNANCE", // 225464
  "RAPPORT", // 15802
  "RECOMMANDATION", // 6
  "REGLEMENTEUROPEEN", // 3
] as const

export const allLegiArticleLienTypes = [
  "ABROGATION", // 237556
  "ABROGE", // 480524
  "ANNULATION", // 1801
  "ANNULE", // 13
  "APPLICATION", // 398
  "CITATION", // 4028139
  "CODIFICATION", // 380434
  "CODIFIE", // 29
  "CONCORDANCE", // 315976
  "CONCORDE", // 192980
  "CREATION", // 174907
  "CREE", // 265183
  "DEPLACE", // 12605
  "DEPLACEMENT", // 307
  "DISJOINT", // 46
  "DISJONCTION", // 77
  "ETEND", // 43
  "HISTO", // 14499
  "MODIFICATION", // 390927
  "MODIFIE", // 570147
  "PEREMPTION", // 7001
  "PERIME", // 1024
  "PILOTE_SUIVEUR", // 4734
  "RATIFICATION", // 259
  "RATIFIE", // 56
  "RECTIFICATION", // 1439
  "SPEC_APPLI", // 87345
  "TRANSFERE", // 16828
  "TRANSFERT", // 10641
  "TXT_ASSOCIE", // 47348
  "TXT_SOURCE", // 263557
] as const

export const allLegiArticleNatures = ["Article"] as const

export const allLegiArticleOrigines = ["JORF", "LEGI"] as const

export const allLegiArticleTexteNatures = [
  "ACCORD_FONCTION_PUBLIQUE", // 9,
  "ARRETE", // 566126,
  "AVIS", // 12,
  "CIRCULAIRE", // 8,
  "CODE", // 475255,
  "CONSTITUTION", // 255,
  "CONVENTION", // 1,
  "DECISION", // 44,
  "DECRET_LOI", // 905,
  "DECRET", // 513465,
  "DELIBERATION", // 1467,
  "DIRECTIVE", // 57,
  "LOI_CONSTIT", // 103,
  "LOI_ORGANIQUE", // 1468,
  "LOI_PROGRAMME", // 65,
  "LOI", // 94775,
  "ORDONNANCE", // 26800,
  "RAPPORT", // 22,
] as const

export const allLegiCategoriesTags = [
  "ARTICLE",
  "ID",
  "SECTION_TA",
  "TEXTE_VERSION",
  "TEXTELR",
  "VERSIONS",
] as const

export const allLegiSectionTaLienArtEtats = [
  "ABROGE_DIFF", // 7802
  "ABROGE", // 226461
  "ANNULE", // 1163
  "DEPLACE", // 1
  "DISJOINT", // 92
  "MODIFIE_MORT_NE", // 7125
  "MODIFIE", // 399735
  "PERIME", // 4899
  "TRANSFERE", // 17504
  "VIGUEUR_DIFF", // 8862
  "VIGUEUR", // 346656
] as const

export const allLegiSectionTaLienArtOrigines = ["LEGI"] as const

export const allLegiSectionTaLienSectionTaEtats = [
  "ABROGE_DIFF", // 1193
  "ABROGE", // 58938
  "ANNULE", // 165
  "MODIFIE_MORT_NE", // 276
  "MODIFIE", // 14034
  "PERIME", // 1051
  "TRANSFERE", // 169
  "VIGUEUR_DIFF", // 1840
  "VIGUEUR", // 95108
] as const

export const allLegiSectionTaTexteNatures = [
  "ACCORD_FONCTION_PUBLIQUE", // 2
  "ARRETE", // 56659
  "CODE", // 102450
  "CONSTITUTION", // 34
  "DECISION", // 5
  "DECRET_LOI", // 74
  "DECRET", // 51211
  "DELIBERATION", // 587
  "DIRECTIVE", // 18
  "LOI_CONSTIT", // 4
  "LOI_ORGANIQUE", // 154
  "LOI_PROGRAMME", // 9
  "LOI", // 12005
  "ORDONNANCE", // 4639
] as const

export const allLegiTexteEtats = [
  "ABROGE_DIFF", // 1897
  "ABROGE", // 24375
  "ANNULE", // 210
  "MODIFIE_MORT_NE", // 65
  "MODIFIE", // 9270
  "PERIME", // 3629
  "VIGUEUR_DIFF", // 2086
  "VIGUEUR", // 103917
] as const

export const allLegiTextelrLienArtEtats = [
  "ABROGE_DIFF", // 9742
  "ABROGE", // 134670
  "ANNULE", // 878
  "MODIFIE_MORT_NE", // 795
  "MODIFIE", // 90079
  "PERIME", // 15026
  "TRANSFERE", // 943
  "VIGUEUR_DIFF", // 6195
  "VIGUEUR", // 311266
] as const

export const allLegiTextelrLienArtOrigines = ["LEGI"] as const

export const allLegiTextelrLienSectionTaEtats = [
  "ABROGE_DIFF", // 1395
  "ABROGE", // 24538
  "ANNULE", // 148
  "MODIFIE_MORT_NE", // 38
  "MODIFIE", // 1388
  "PERIME", // 572
  "TRANSFERE", // 6
  "VIGUEUR_DIFF", // 1816
  "VIGUEUR", // 48481
] as const

export const allLegiTexteNatures = [
  "ACCORD_FONCTION_PUBLIQUE", // 4
  "ARRETE", // 77686
  "AVIS", // 12
  "CODE", // 114
  "CIRCULAIRE",
  "CONSTITUTION", // 3
  "CONVENTION", // 1
  "DECISION", // 12
  "DECLARATION", // 1
  "DECRET_LOI", // 35
  "DECRET", // 53031
  "DELIBERATION", // 11
  "LOI_CONSTIT", // 19
  "LOI_ORGANIQUE", // 111
  "LOI", // 3457
  "ORDONNANCE", // 1520
] as const

export const allLegiTexteOrigines = ["LEGI"] as const

export const allLegiTexteVersionLienNatures = [
  "ACCORD_FONCTION_PUBLIQUE",
  "ARRETE", // 24259
  "ARRETEEURO", // 4
  "AVENANT", // 3
  "AVIS", // 25
  "CIRCULAIRE", // 5
  "CODE", // 94380
  "CONSTITUTION", // 194
  "DECISION_EURO", // 1
  "DECISION", // 167
  "DECRET_LOI", // 14
  "DECRET", // 125804
  "DELIBERATION", // 152
  "DIRECTIVE_EURO", // 317
  "INSTRUCTION", // 4
  "INSTRUCTIONEURO", // 3
  "LOI_CONSTIT", // 3
  "LOI_ORGANIQUE", // 775
  "LOI_PROGRAMME", // 18
  "LOI", // 59181
  "ORDONNANCE", // 7496
  "RAPPORT", // 39
  "REGLEMENT", // 1
  "REGLEMENTEUROPEEN", // 2
] as const

export const allLegiTexteVersionLienTypes = [
  "ABROGATION", // 8409
  "ABROGE", // 19027
  "ANNULATION", // 246
  "ANNULE", // 2
  "APPLICATION", // 9114
  "CITATION", // 271999
  "CODIFIE",
  "CODIFICATION", // 10433
  "CONCORDANCE", // 79
  "CONCORDE", // 9
  "CREATION", // 1711
  "CREE",
  "HISTO", // 22
  "PILOTE_SUIVEUR", // Added 2023-09
  "MODIFICATION", // 2116
  "MODIFIE", // 3557
  "PEREMPTION", // 5628
  "PERIME", // 4
  "RATIFICATION", // 261
  "RATIFIE", // 53
  "RECTIFICATION", // 90
  "SPEC_APPLI", // 1766
  "TRANSPOSITION", // 74
  "TXT_ASSOCIE", // 4469
  "TXT_SOURCE", // 19858
] as const
