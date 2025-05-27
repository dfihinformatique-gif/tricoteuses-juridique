import type { ArticleType, Sens } from "./shared.js"

/**
 * Represents a Journal Officiel (JO) publication.
 * Corresponds to the `JO` root element in `jorf_conteneur.dtd`.
 * DTD comment: "Décrit la structure d'un document de type conteneur JORF".
 */
export interface Jo {
  /**
   * Metadata for the JO publication.
   * Corresponds to `META` in `jorf_conteneur.dtd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to `META_COMMUN` (defined in `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Unique identifier of the JO publication. From `ID` in `meta_commun.dtd`. */
      ID: string
      /** European Legislation Identifier for the JO. From `ID_ELI` in `meta_commun.dtd`. */
      ID_ELI?: string
      /** Nature of the document, typically "JO". From `NATURE` in `meta_commun.dtd`. */
      NATURE: JoNature
      /** Origin of the document, typically "JORF". From `ORIGINE` in `meta_commun.dtd`. */
      ORIGINE: JoOrigine
      /** Relative URL of the JO publication. From `URL` in `meta_commun.dtd`. */
      URL: string
    }
    /**
     * Specific metadata for the JO container.
     * Corresponds to `META_SPEC` in `jorf_conteneur.dtd`.
     */
    META_SPEC: {
      /**
       * Container-specific metadata.
       * Corresponds to `META_CONTENEUR` in `jorf_conteneur.dtd`.
       */
      META_CONTENEUR: {
        /** Publication date of the JO. From `DATE_PUBLI` in `jorf_conteneur.dtd`. */
        DATE_PUBLI: string
        /** Number of the JO. From `NUM` in `jorf_conteneur.dtd`. */
        NUM?: string
        /** Title of the JO. From `TITRE` in `jorf_conteneur.dtd`. */
        TITRE: string
      }
    }
  }
  /**
   * Structure of the texts within the JO (table of contents).
   * Corresponds to `STRUCTURE_TXT` in `jorf_conteneur.dtd`.
   * DTD comment: "Sommaire du JO. Definit la liste ordonnée des têtiers et des textes composants le JO."
   */
  STRUCTURE_TXT?: {
    /** Array of links to texts published in this JO. */
    LIEN_TXT?: JoLienTxt[]
    /** Array of table of contents levels (têtiers). */
    TM?: JoTm[]
  }
}

/**
 * Represents a link to a text within a Journal Officiel.
 * Corresponds to `LIEN_TXT` element in `jorf_conteneur.dtd`.
 */
export interface JoLienTxt {
  /** Identifier of the linked text. From `idtxt` attribute. */
  "@idtxt": string
  /** Title of the linked text. From `titretxt` attribute. */
  "@titretxt"?: string
}

/** Nature of a `Jo` document, typically "JO". */
export type JoNature = (typeof allJoNatures)[number]

/** Origin of a `Jo` document, typically "JORF". */
export type JoOrigine = (typeof allJoOrigines)[number]

/**
 * Represents an article published in the Journal Officiel (JORF).
 * Corresponds to the `ARTICLE` root element in `jorf_article.dtd`.
 * DTD comment: "Décrit toutes les informations relatives à un article JORF".
 */
export interface JorfArticle {
  /**
   * Main textual content of the article.
   * Corresponds to `BLOC_TEXTUEL` in `jorf_article.dtd`, containing HTML `CONTENU`.
   */
  BLOC_TEXTUEL?: {
    /** HTML content of the article. */
    CONTENU: string // HTML
  }
  /**
   * Context of the article, referencing its parent legislative text.
   * Corresponds to `CONTEXTE` in `jorf_article.dtd`.
   */
  CONTEXTE: {
    /**
     * Information about the parent legislative text.
     * Corresponds to `TEXTE` element in `jorf_article.dtd`.
     */
    TEXTE: {
      /** Common identifier for all versions of the parent text. From `cid` attribute. */
      "@cid": string
      /** Publication date of the parent text. From `date_publi` attribute. */
      "@date_publi": string
      /** Signature date of the parent text. From `date_signature` attribute. */
      "@date_signature": string
      /** Nature of the parent text. From `nature` attribute. */
      "@nature"?: JorfArticleTexteNature
      /** NOR identifier of the parent text. From `nor` attribute. */
      "@nor"?: string
      /** Number of the parent text. From `num` attribute. */
      "@num"?: string
      /** Publication number in JO for the parent text. From `num_parution_jo` attribute. */
      "@num_parution_jo"?: string
      /**
       * Titles of the parent text versions.
       * Corresponds to `TITRE_TXT` elements in `jorf_article.dtd`.
       */
      TITRE_TXT?: Array<{
        /** Text content of the title. */
        "#text"?: string
        /** Short title of the text version. From `c_titre_court` attribute. */
        "@c_titre_court"?: string
        /** Start date of validity for this text version title. From `debut` attribute. */
        "@debut": string
        /** End date of validity for this text version title. From `fin` attribute. */
        "@fin": string
        /** Internal identifier of the text version. From `id_txt` attribute. */
        "@id_txt": string
      }>
      /**
       * Table of contents hierarchy for the parent text.
       * Corresponds to nested `TM` elements in `jorf_article.dtd`.
       */
      TM?: JorfArticleTm
    }
  }
  /**
   * Metadata for the article.
   * Corresponds to `META` in `jorf_article.dtd`.
   */
  META: {
    /**
     * Common metadata elements.
     * Corresponds to `META_COMMUN` (defined in `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Old identifier. From `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** European Legislation Identifier alias. From `ELI_ALIAS/ID_ELI_ALIAS`. */
      ELI_ALIAS?: {
        ID_ELI_ALIAS: string
      }
      /** Unique identifier of the article. From `ID`. */
      ID: string
      /** European Legislation Identifier. From `ID_ELI`. */
      ID_ELI?: string
      /** Nature of the document (e.g., "Article"). From `NATURE`. */
      NATURE?: JorfArticleNature
      /** Origin of the document (e.g., "JORF"). From `ORIGINE`. */
      ORIGINE: JorfArticleOrigine
      /** Relative URL of the document. From `URL`. */
      URL: string
    }
    /**
     * Specific metadata for the article.
     * Corresponds to `META_SPEC` in `jorf_article.dtd`.
     */
    META_SPEC: {
      /**
       * Article-specific metadata.
       * Corresponds to `META_ARTICLE` in `jorf_article.dtd`.
       */
      META_ARTICLE: JorfArticleMetaArticle
    }
  }
  /**
   * Versions of the article. JORF articles are typically versioned if modified by subsequent LEGI texts.
   * Corresponds to `VERSIONS` in `jorf_article.dtd`.
   * DTD comment: "Liste des versions de cet article. Les autres versions d'un texte JORF sont issu du fond LEGI".
   */
  VERSIONS: {
    /** Array of article version elements. */
    VERSION: JorfArticleVersion[]
  }
  // SM (Résumé LEX) is in jorf_article.dtd but not in this TS interface.
}

/**
 * Legal status of a JORF article version.
 * Values based on `ETAT` attribute of `VERSION` element in `jorf_article.dtd`.
 * DTD comment example: "@example ABROGE".
 */
export type JorfArticleEtat = (typeof allJorfArticleEtats)[number]

/** Origin of the article linked to by `JorfArticleVersion/LIEN_ART`. */
export type JorfArticleLienArticleOrigine =
  (typeof allJorfArticleLienArticleOrigines)[number]

/**
 * Represents article-specific metadata for a JORF article.
 * Corresponds to `META_ARTICLE` in `jorf_article.dtd`.
 */
export interface JorfArticleMetaArticle {
  /** Start date of validity for the article. From `DATE_DEBUT`. */
  DATE_DEBUT: string
  /** End date of validity for the article. From `DATE_FIN`. */
  DATE_FIN: string
  /**
   * Keywords for the article.
   * Corresponds to `MCS_ART` in `jorf_article.dtd`.
   */
  MCS_ART?: { MC: string[] }
  /** Number of the article (e.g., "2-4"). From `NUM`. */
  NUM?: string
  /** Type of the article. From `TYPE`. DTD comment: "@hidden liste de valeurs à préciser". */
  TYPE?: ArticleType
}

/** Nature of a `JorfArticle` document, typically "Article". */
export type JorfArticleNature = (typeof allJorfArticleNatures)[number]

/** Origin of a `JorfArticle` document, typically "JORF". */
export type JorfArticleOrigine = (typeof allJorfArticleOrigines)[number]

/** Nature of the parent text referenced in `JorfArticle/CONTEXTE/TEXTE`. */
export type JorfArticleTexteNature = (typeof allJorfArticleTexteNatures)[number]

/**
 * Represents a level in the table of contents (Table des Matières - TM) within a JORF article's context.
 * Corresponds to the recursive `TM` element structure in `jorf_article.dtd`.
 */
export interface JorfArticleTm {
  /**
   * Title of this table of contents level.
   * Corresponds to `TITRE_TM` element.
   */
  TITRE_TM: {
    /** Text content of the TM title. */
    "#text"?: string
    /** Start date of validity for this TM level. From `debut` attribute. */
    "@debut": string
    /** End date of validity for this TM level. From `fin` attribute. */
    "@fin": string
    /** Internal identifier of this TM level. From `id` attribute. */
    "@id": string
  }
  /** Nested table of contents level. */
  TM?: JorfArticleTm
}

/**
 * Represents a specific version of a JORF article.
 * Corresponds to `VERSION` element within `ARTICLE/VERSIONS` in `jorf_article.dtd`.
 */
export interface JorfArticleVersion {
  /** Legal status of the article in this version. From `etat` attribute. */
  "@etat"?: JorfArticleEtat
  /**
   * Link to the article content for this version.
   * Corresponds to `LIEN_ART` element (defined in `lien_art.dtd`).
   */
  LIEN_ART: {
    /** Start date of validity. From `debut` attribute. */
    "@debut": string
    /** Legal status of the linked article version. From `etat` attribute. */
    "@etat"?: JorfArticleEtat
    /** End date of validity. From `fin` attribute. */
    "@fin": string
    /** Identifier of the linked article content. From `id` attribute. */
    "@id": string
    /** Number of the linked article. From `num` attribute. */
    "@num"?: string
    /** Origin of the linked article. From `origine` attribute. */
    "@origine": JorfArticleLienArticleOrigine
  }
}

/** Tags representing different categories or types of JORF documents/structures. */
export type JorfCategorieTag = (typeof allJorfCategoriesTags)[number]

/**
 * Represents metadata specific to chronological aspects of a JORF text.
 * Corresponds to `META_TEXTE_CHRONICLE` root element in `meta_texte_chronicle.dtd`.
 * Note: `DERNIERE_MODIFICATION` and `VERSIONS_A_VENIR` from the generic DTD are not typically used for JORF texts.
 */
export interface JorfMetaTexteChronicle {
  /** Common identifier for all versions of the text. From `CID`. */
  CID: string
  /** Publication date of the text. From `DATE_PUBLI`. */
  DATE_PUBLI: string
  /** Signature date of the text. From `DATE_TEXTE`. */
  DATE_TEXTE: string
  /** NOR identifier of the text. From `NOR`. */
  NOR?: string
  /** Number of the text. From `NUM`. */
  NUM?: string
  /** Publication number in JO. From `NUM_PARUTION`. */
  NUM_PARUTION?: number
  /** Sequence number in JO. From `NUM_SEQUENCE`. */
  NUM_SEQUENCE?: number
  /** Origin of publication (e.g., title of JO). From `ORIGINE_PUBLI`. */
  ORIGINE_PUBLI?: string
  /** Start page of publication in JO. From `PAGE_DEB_PUBLI`. */
  PAGE_DEB_PUBLI?: number
  /** End page of publication in JO. From `PAGE_FIN_PUBLI`. */
  PAGE_FIN_PUBLI?: number
}

/**
 * Represents metadata specific to a version of a JORF text.
 * Corresponds to `META_TEXTE_VERSION` element in `jorf_texte_version.dtd`.
 */
export interface JorfMetaTexteVersion {
  /** Issuing authority. From `AUTORITE`. */
  AUTORITE?: string
  /** Start date of validity (not typically used for JORF). From `DATE_DEBUT`. */
  DATE_DEBUT?: string
  /** End date of validity (not typically used for JORF). From `DATE_FIN`. */
  DATE_FIN?: string
  /**
   * Links associated with this text version.
   * Corresponds to `LIENS` in `jorf_texte_version.dtd`.
   */
  LIENS?: {
    /** Array of link elements. */
    LIEN: Array<JorfTexteVersionLien>
  }
  /**
   * Keywords for the text.
   * Corresponds to `MCS_TXT` in `jorf_texte_version.dtd`.
   */
  MCS_TXT?: {
    /** Array of keywords (MC = Mot Clé). */
    MC: string[]
  }
  /** Issuing ministry. From `MINISTERE`. */
  MINISTERE?: string
  /** Short title of the text version. From `TITRE`. */
  TITRE?: string
  /** Full title of the text version. From `TITREFULL`. */
  TITREFULL?: string
}

/**
 * Represents a "Section TA" (Titre/Article) in a JORF text, a level in its table of contents.
 * Corresponds to the `SECTION_TA` root element in `jorf_section_ta.dtd`.
 */
export interface JorfSectionTa {
  /** Identifier of the section. From `ID`. */
  ID: string
  /** Commentary associated with the section. From `COMMENTAIRE`. */
  COMMENTAIRE?: string
  /**
   * Context of the section, referencing its parent JORF text.
   * Corresponds to `CONTEXTE` in `jorf_section_ta.dtd`.
   */
  CONTEXTE: {
    /** Information about the parent JORF text. */
    TEXTE: {
      "@autorite"?: string
      "@cid": string
      "@date_publi": string
      "@date_signature": string
      "@ministere"?: string
      "@nature"?: JorfSectionTaTexteNature
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
      TM?: JorfSectionTaTm
    }
  }
  /** Title of the section. From `TITRE_TA`. */
  TITRE_TA?: string
  /**
   * Structure of this section, linking to subsections or articles.
   * Corresponds to `STRUCTURE_TA` in `jorf_section_ta.dtd`.
   */
  STRUCTURE_TA?: JorfSectionTaStructure
}

/**
 * Represents a link from a `JorfSectionTa` to an article.
 * Attributes based on `lien_art.dtd` usage within `SECTION_TA/STRUCTURE_TA`.
 */
export interface JorfSectionTaLienArt {
  /** Start date of validity. From `debut` attribute. */
  "@debut": string
  /** Legal status. From `etat` attribute. */
  "@etat"?: JorfSectionTaLienArtEtat
  /** End date of validity. From `fin` attribute. */
  "@fin": string
  /** Identifier of the linked article. From `id` attribute. */
  "@id": string
  /** Number of the linked article. From `num` attribute. */
  "@num"?: string
  /** Origin of the linked article. From `origine` attribute. */
  "@origine"?: JorfSectionTaLienArtOrigine
}

/** Legal status for a `JorfSectionTaLienArt`. */
export type JorfSectionTaLienArtEtat =
  (typeof allJorfSectionTaLienArtEtats)[number]

/** Origin for a `JorfSectionTaLienArt`. */
export type JorfSectionTaLienArtOrigine =
  (typeof allJorfSectionTaLienArtOrigines)[number]

/**
 * Represents a link from a `JorfSectionTa` to another `JorfSectionTa` (subsection).
 * Attributes based on `lien_section_ta.dtd` usage within `SECTION_TA/STRUCTURE_TA`.
 */
export interface JorfSectionTaLienSectionTa {
  /** Text content/title of the linked section. */
  "#text"?: string
  /** CID of the linked section. From `cid` attribute. */
  "@cid": string
  /** Start date of validity. From `debut` attribute. */
  "@debut": string
  // "@etat"?: JorfSectionTaLienSectionTaEtat // Etat attribute is not usually present on LIEN_SECTION_TA in JORF DTDs for sections.
  /** End date of validity. From `fin` attribute. */
  "@fin": string
  /** Identifier of the linked section. From `id` attribute. */
  "@id": string
  /** Nesting level. From `niv` attribute. */
  "@niv": number
  /** URL/path to the XML file of the linked section. From `url` attribute. */
  "@url": string
}

/** Legal status for a `JorfSectionTaLienSectionTa`. (Usually not applicable for JORF sections). */
export type JorfSectionTaLienSectionTaEtat =
  (typeof allJorfSectionTaLienSectionTaEtats)[number]

/**
 * Structure of a `JorfSectionTa`, containing links to articles or subsections.
 * Corresponds to `STRUCTURE_TA` in `jorf_section_ta.dtd`.
 */
export interface JorfSectionTaStructure {
  /** Array of links to articles within this section. */
  LIEN_ART?: JorfSectionTaLienArt[]
  /** Array of links to subsections (other JorfSectionTa) within this section. */
  LIEN_SECTION_TA?: JorfSectionTaLienSectionTa[]
}

/** Nature of the parent text for a `JorfSectionTa`. */
export type JorfSectionTaTexteNature =
  (typeof allJorfSectionTaTexteNatures)[number]

/**
 * Represents a table of contents (TM) structure within a `JorfSectionTa`.
 * Similar to `JorfArticleTm`.
 */
export interface JorfSectionTaTm {
  /** Title of this table of contents level. */
  TITRE_TM: {
    /** Text content of the TM title. */
    "#text"?: string
    /** Start date of validity. */
    "@debut": string
    /** End date of validity. */
    "@fin": string
    /** Identifier of the TM level. */
    "@id": string
  }
  /** Nested table of contents level. */
  TM?: JorfSectionTaTm
}

/**
 * Represents a complete JORF text, combining its structural overview (`JorfTextelr`)
 * and the content of a specific version (`JorfTexteVersion`).
 * This is a conceptual merge, not a direct DTD root element.
 */
export type JorfTexte = JorfTexteVersion & {
  /**
   * Structural hierarchy of the text (table of contents).
   * From `STRUCT` element in `jorf_texte_struct.dtd`.
   */
  STRUCT?: JorfTextelrStructure
  /**
   * List of available versions of the text.
   * From `VERSIONS` element in `jorf_texte_struct.dtd`.
   */
  VERSIONS?: JorfTextelrVersions
}

/**
 * Represents the structural overview of a JORF text and its versions.
 * Corresponds to the `TEXTELR` root element in `jorf_texte_struct.dtd`.
 * DTD comment: "Décrit la structure d'un texte JORF et la liste des différentes versions de ce texte."
 */
export interface JorfTextelr {
  /** Metadata for the text structure. */
  META: {
    /** Common metadata, adapted for JORF texts. */
    META_COMMUN: JorfTexteMetaCommun
    /** Specific metadata for the text structure. */
    META_SPEC: {
      /** Chronological metadata for the text. */
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
    }
  }
  /**
   * The structural hierarchy (table of contents) of the JORF text.
   * Corresponds to `STRUCT` in `jorf_texte_struct.dtd`.
   */
  STRUCT?: JorfTextelrStructure
  /**
   * List of available versions of this JORF text.
   * Corresponds to `VERSIONS` in `jorf_texte_struct.dtd`.
   */
  VERSIONS: JorfTextelrVersions
}

/**
 * Legal status of a JORF text version, as listed in `JorfTextelrVersions`.
 * From `etat` attribute of `VERSION` element in `jorf_texte_struct.dtd`.
 * DTD comment: "Etat juridique de la version. Ce champ n'est pas renseigné pour JORF dont les textes sont toujours en version INITIALE".
 * Typically "INITIALE" or similar for JORF if not modified by LEGI.
 */
export type JorfTextelrEtat = (typeof allJorfTextelrEtats)[number]

/**
 * Represents a link from a `JorfTextelrStructure` to an article.
 * Attributes based on `lien_art.dtd` usage within `TEXTELR/STRUCT`.
 */
export interface JorfTextelrLienArt {
  /** Start date of validity. */
  "@debut": string
  /** Legal status. */
  "@etat"?: JorfTextelrLienArtEtat
  /** End date of validity. */
  "@fin": string
  /** Identifier of the linked article. */
  "@id": string
  // "@nature"?: undefined // Nature is implicitly Article here.
  /** Number of the linked article. */
  "@num"?: string
  /** Origin of the linked article. */
  "@origine"?: JorfTextelrLienArtOrigine
}

/** Legal status for a `JorfTextelrLienArt`. */
export type JorfTextelrLienArtEtat = (typeof allJorfTextelrLienArtEtats)[number]

/** Nature for a `JorfTextelrLienArt` (usually not specified, implicitly Article). */
export type JorfTextelrLienArtNature =
  (typeof allJorfTextelrLienArtNatures)[number]

/** Origin for a `JorfTextelrLienArt`. */
export type JorfTextelrLienArtOrigine =
  (typeof allJorfTextelrLienArtOrigines)[number]

/**
 * Represents a link from a `JorfTextelrStructure` to a `JorfSectionTa` (section).
 * Attributes based on `lien_section_ta.dtd` usage within `TEXTELR/STRUCT`.
 */
export interface JorfTextelrLienSectionTa {
  /** Title of the linked section. */
  "#text"?: string
  /** CID of the linked section. */
  "@cid": string
  /** Start date of validity. */
  "@debut": string
  // "@etat"?: undefined // Etat not typically on JORF section links.
  /** End date of validity. */
  "@fin": string
  /** Identifier of the linked section. */
  "@id": string
  /** Nesting level of the section. */
  "@niv": number
  /** URL/path to the XML file of the linked section. */
  "@url": string
}

/**
 * Represents the top-level structure (table of contents) of a `JorfTextelr` document.
 * Corresponds to the `STRUCT` element in `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrStructure {
  /** Array of links to articles at this level. */
  LIEN_ART?: JorfTextelrLienArt[]
  /** Array of links to sections (JorfSectionTa) at this level. */
  LIEN_SECTION_TA?: JorfTextelrLienSectionTa[]
}

/**
 * Represents a specific version of a JORF text, as listed in `JorfTextelrVersions`.
 * Corresponds to `VERSION` element within `TEXTELR/VERSIONS` in `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrVersion {
  /** Legal status of this text version. From `etat` attribute. */
  "@etat"?: JorfTextelrEtat
  /**
   * Link to the actual text content of this version.
   * Corresponds to `LIEN_TXT` element (defined in `lien_txt.dtd`).
   */
  LIEN_TXT: {
    /** Start date of validity. */
    "@debut": string
    /** End date of validity. */
    "@fin": string
    /** Identifier of the linked text version document (e.g., a `JorfTexteVersion` ID). */
    "@id": string
    /** Number of the text version. */
    "@num"?: string
  }
}

/**
 * Container for the list of versions of a JORF text in a `JorfTextelr` document.
 * Corresponds to `VERSIONS` element in `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrVersions {
  /** Array of text version elements. */
  VERSION: JorfTextelrVersion[]
}

/**
 * Represents common metadata for JORF texts, a specific profile of `meta_commun.dtd`.
 */
export interface JorfTexteMetaCommun {
  /** Old identifier. From `ANCIEN_ID`. */
  ANCIEN_ID?: string
  /** European Legislation Identifier alias. From `ELI_ALIAS/ID_ELI_ALIAS`. */
  ELI_ALIAS?: {
    ID_ELI_ALIAS: string
  }
  /** Unique identifier of the JORF text document. From `ID`. */
  ID: string
  /** European Legislation Identifier. From `ID_ELI`. */
  ID_ELI?: string
  /** Nature of the JORF text document. From `NATURE`. */
  NATURE?: JorfTexteNature
  /** Origin of the document (typically "JORF"). From `ORIGINE`. */
  ORIGINE: JorfTexteOrigine
  /** Relative URL of the JORF text document. From `URL`. */
  URL: string
}

/** Nature of a `JorfTexteVersion` or `JorfTextelr` document. */
export type JorfTexteNature = (typeof allJorfTexteNatures)[number]

/** Origin of a `JorfTexteVersion` or `JorfTextelr` document, typically "JORF". */
export type JorfTexteOrigine = (typeof allJorfTexteOrigines)[number]

/**
 * Represents a specific version of a JORF text with its full content.
 * Corresponds to the `TEXTE_VERSION` root element in `jorf_texte_version.dtd`.
 * DTD comment: "Décrit les informations spécifiques à une version de texte JORF".
 */
export interface JorfTexteVersion {
  /**
   * Abrogations affecting this text version (HTML content).
   * Corresponds to `ABRO/CONTENU` in `jorf_texte_version.dtd`.
   */
  ABRO?: {
    CONTENU: string // HTML
  }
  /**
   * Information related to enterprises, if applicable.
   * Corresponds to `ENTREPRISE` element in `jorf_texte_version.dtd`.
   */
  ENTREPRISE?: {
    /** Indicates if the text is related to "entreprise". From `texte_entreprise` attribute. */
    "@texte_entreprise": "non" | "oui"
    /**
     * Effective dates for enterprise-related aspects.
     * Corresponds to `DATES_EFFET/DATE_EFFET` in `jorf_texte_version.dtd`.
     */
    DATES_EFFET?: {
      DATE_EFFET: string[]
    }
    /**
     * Relevant domains for enterprise-related aspects.
     * Corresponds to `DOMAINES/DOMAINE` in `jorf_texte_version.dtd`.
     */
    DOMAINES?: {
      DOMAINE: string[]
    }
  }
  /** Metadata for this JORF text version. */
  META: {
    /** Common metadata. */
    META_COMMUN: JorfTexteMetaCommun
    /** Specific metadata. */
    META_SPEC: {
      /** Chronological metadata. */
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
      /** Version-specific metadata. */
      META_TEXTE_VERSION: JorfMetaTexteVersion
    }
  }
  /**
   * Notice associated with this text version (HTML content).
   * Corresponds to `NOTICE/CONTENU` in `jorf_texte_version.dtd`.
   */
  NOTICE?: {
    CONTENU: string // HTML
  }
  /**
   * Rectifications to this text version (HTML content).
   * Corresponds to `RECT/CONTENU` in `jorf_texte_version.dtd`.
   */
  RECT?: {
    CONTENU: string // HTML
  }
  /**
   * Signatories of this text version (HTML content).
   * Corresponds to `SIGNATAIRES/CONTENU` in `jorf_texte_version.dtd`.
   */
  SIGNATAIRES?: {
    CONTENU: string // HTML
  }
  /**
   * Summary (Résumé LEX) of the text (HTML content).
   * Corresponds to `SM/CONTENU` in `jorf_texte_version.dtd`.
   */
  SM?: {
    CONTENU: string // HTML
  }
  /**
   * Preparatory works (Travaux Préparatoires) for this text version (HTML content).
   * Corresponds to `TP/CONTENU` in `jorf_texte_version.dtd`.
   */
  TP?: {
    CONTENU: string // HTML
  }
  /**
   * Visas (preamble references) for this text version (HTML content).
   * Corresponds to `VISAS/CONTENU` in `jorf_texte_version.dtd`.
   */
  VISAS?: {
    CONTENU: string // HTML
  }
}

/**
 * Represents a link from a `JorfTexteVersion` (via `JorfMetaTexteVersion/LIENS`) to another document.
 * Attributes are based on `lien.dtd` usage within `TEXTE_VERSION`.
 */
export interface JorfTexteVersionLien {
  /** Text content of the link, if any. */
  "#text"?: string
  /** Identifier of the target text if internal. From `cidtexte` attribute. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Signature date of the target text. From `datesignatexte` attribute. */
  "@datesignatexte"?: string
  /** Identifier of the target element. From `id` attribute. */
  "@id"?: string
  /** Nature of the target text. From `naturetexte` attribute. */
  "@naturetexte"?: JorfTexteVersionLienNature
  /** NOR identifier of the target text. From `nortexte` attribute. */
  "@nortexte"?: string
  /** Number of the target text or element. From `num` attribute. */
  "@num"?: string
  /** (Deprecated?) Number of the target text. From `numtexte` attribute. */
  "@numtexte"?: string
  /** Direction of the link. From `sens` attribute. */
  "@sens": Sens
  /** Type of the link. From `typelien` attribute. */
  "@typelien": JorfTexteVersionLienType
}

/** Nature of the text linked to by a `JorfTexteVersionLien`. */
export type JorfTexteVersionLienNature =
  (typeof allJorfTexteVersionLienNatures)[number]

/** Type of link in `JorfTexteVersionLien`. */
export type JorfTexteVersionLienType =
  (typeof allJorfTexteVersionLienTypes)[number]

/**
 * Represents a table of contents (TM - Têtier) level within a Journal Officiel (`Jo` document).
 * Corresponds to `TM` element in `jorf_conteneur.dtd`.
 */
export interface JoTm {
  /** Nesting level of this TM item. From `niv` attribute. */
  "@niv": number
  /** Links to texts at this TM level. */
  LIEN_TXT?: JoLienTxt[]
  /** Title of this TM level. From `TITRE_TM` element. */
  TITRE_TM: string
  /** Nested TM levels. */
  TM?: JoTm[]
}

/** Possible nature values for a `Jo` document. */
export const allJoNatures = ["JO"] as const

export const allJoOrigines = ["JORF"] as const

export const allJorfArticleEtats = [
  "ABROGE_DIFF",
  "ABROGE",
  "ANNULE",
  "MODIFIE_MORT_NE",
  "MODIFIE",
  "PERIME",
  "TRANSFERE",
  "VIGUEUR",
  "VIGUEUR_DIFF",
] as const

export const allJorfArticleLienArticleOrigines = ["JORF", "LEGI"] as const

export const allJorfArticleNatures = ["Article"] as const

export const allJorfArticleOrigines = ["JORF"] as const

export const allJorfArticleTexteNatures = [
  "ABROGATION", // 10
  "ACCORD", // 153
  "ACCORD_FONCTION_PUBLIQUE", //
  "ADDITIF", // 139
  "ANNEXE", // 2
  "ANNONCES", // 755
  "ARRANGEMENT", // 1
  "ARRET", // 23
  "ARRETE", // 1228598
  "ATTESTATION", // 1
  "AVENANT", // 533
  "AVIS", // 101688
  "Accord multilatéral", // 3
  "CANDIDAT", // 2
  "CHARTE", // 1
  "CIRCULAIRE", // 3933
  "CITATION", // 423
  "CODE", // 14737
  "COMMUNIQUE", // 3
  "COMPLEMENT", // 2
  "COMPOSITION", // 19
  "CONSTITUTION", // 41
  "CONTRAT", // 32
  "CONVENTION", // 972
  "DATE", // 1
  "DECISION", // 244100
  "DECISION_CC", // 51
  "DECISION_EURO", // 15
  "DECLARATION", // 77
  "DECRET", // 555543
  "DECRET_LOI", // 85
  "DELEGATION", // 1
  "DELIBERATION", // 11012
  "DEUXIEME", // 5
  "DIRECTIVE", // 11
  "ELECTION", // 1
  "ELECTIONDUPRESIDENTDELAREPUBLIQU", // 16
  "EXEQUATUR", // 173
  "INFORMATION", // 143
  "INFORMATIONS_CESE", // 285
  "INFORMATIONS_DIVERSES", // 524
  "INFORMATIONS_PARLEMENTAIRES", // 6335
  "INSTRUCTION", // 1207
  "LETTRE", // 10
  "LISTE", // 24279
  "LOI", // 64957
  "LOI_CONSTIT", // 76
  "LOI_ORGANIQUE", // 1144
  "LOI_PROGRAMME", // 10
  "MEMOIRE", // 72
  "MODIFICATION", // 724
  "OBSERVATION", // 623
  "ORDONNANCE", // 33582
  "PREMIER", // 1
  "PROCLAMATION", // 17
  "PROJET", // 6
  "PROPOSITION", // 11
  "PROTOCOLE", // 25
  "PUBLICATION", // 2
  "RAPPORT", // 2491
  "RECOMMANDATION", // 204
  "RECTIFICATIF", // 3
  "REGLEMENT", // 1930
  "RELEVE", // 2
  "REMISE", // 119
  "RESULTATS", // 14954
  "SAISINE", // 1075
  "SUSPENSION", // 2
  "TABLEAU", // 1063
  "TROISIEME", // 2
  "VOCABULAIRE", // 170
] as const

export const allJorfCategoriesTags = [
  "ARTICLE",
  "ID",
  "JO",
  "SECTION_TA",
  "TEXTE_VERSION",
  "TEXTELR",
  "VERSIONS",
] as const

export const allJorfSectionTaLienArtEtats = ["VIGUEUR"] as const

export const allJorfSectionTaLienArtOrigines = ["JORF"] as const

export const allJorfSectionTaLienSectionTaEtats = [] as const

export const allJorfSectionTaTexteNatures = [
  "ACCORD", // 3
  "ACCORD_FONCTION_PUBLIQUE", // 2
  "ADDITIF", // 3
  "ARRETE", // 53716
  "AVENANT", // 89
  "AVIS", // 3212
  "Accord multilatéral", // 2
  "CIRCULAIRE", // 168
  "CONVENTION", // 38
  "DECISION", // 16923
  "DECLARATION", // 4
  "DECRET", // 44405
  "DELIBERATION", // 2476
  "DIRECTIVE", // 2
  "INFORMATIONS_PARLEMENTAIRES", // 28
  "INSTRUCTION", // 39
  "LISTE", // 394
  "LOI", // 5161
  "LOI_ORGANIQUE", // 71
  "MODIFICATION", // 6
  "ORDONNANCE", // 9566
  "PROPOSITION", // 3
  "PROTOCOLE", // 1
  "RAPPORT", // 390
  "RECOMMANDATION", // 5
  "REGLEMENT", // 40
  "RESULTATS", // 324
  "SAISINE", // 3
  "TABLEAU", // 100
] as const

export const allJorfTextelrEtats = [
  "ABROGE", // 21890
  "ABROGE_DIFF", // 129
  "ANNULE", // 199
  "MODIFIE", // 3008
  "MODIFIE_MORT_NE", // 24
  "PERIME", // 3127
  "VIGUEUR", // 98711
  "VIGUEUR_DIFF", // 103
] as const

export const allJorfTextelrLienArtEtats = ["VIGUEUR"] as const

export const allJorfTextelrLienArtNatures = [] as const

export const allJorfTextelrLienArtOrigines = ["JORF"] as const

export const allJorfTexteNatures = [
  "ABROGATION", // 8
  "ACCORD", // 46
  "ACCORD_FONCTION_PUBLIQUE", // 4
  "ACTE", // 3
  "ADDITIF", // 131
  "ANNEXE", // 1
  "ANNONCES", // 756
  "ARRANGEMENT", // 1
  "ARRET", // 65
  "ARRETE", // 615239
  "ARRETEAVIS", // 1
  "ARRETEEURO", // 14
  "ARRETEURO", // 556
  "ATTESTATION", // 1
  "AVENANT", // 186
  "AVIS", // 97999
  "AVISEURO", // 4618
  "Accord multilatéral", // 1
  "CANDIDAT", // 2
  "CHARTE", // 1
  "CIRCULAIRE", // 3532
  "CITATION", // 494
  "CODE", // 58
  "COMMUNIQUE", // 17
  "COMPLEMENT", // 2
  "COMPOSITION", // 9
  "CONSTITUTION", // 4
  "CONTRAT", // 2
  "CONVENTION", // 151
  "DATE", // 1
  "DECISION", // 67164
  "DECISION_CC", // 96
  "DECISION_EURO", // 550
  "DECLARATION", // 20
  "DECLARATIONEURO", // 18
  "DECRET", // 209363
  "DECRET_LOI", // 660
  "DELEGATION", // 1
  "DELIBERATION", // 3993
  "DELIBERATIONEURO", // 36
  "DEUXIEME", // 5
  "DIRECTIVE", // 13
  "DIRECTIVE_EURO", // 4249
  "DISPOSITIONS", // 1
  "ELECTION", // 1
  "ELECTIONDUPRESIDENTDELAREPUBLIQU", // 2
  "EXEQUATUR", // 174
  "INFORMATION", // 106
  "INFORMATIONEURO", // 1
  "INFORMATIONS_CESE", // 285
  "INFORMATIONS_DIVERSES", // 524
  "INFORMATIONS_PARLEMENTAIRES", // 6042
  "INSTRUCTION", // 158
  "INSTRUCTIONEURO", // 524
  "LETTRE", // 13
  "LETTREEURO", // 15
  "LISTE", // 5552
  "LOI", // 12859
  "LOI_CONSTIT", // 12
  "LOI_ORGANIQUE", // 105
  "LOI_PROGRAMME", // 2
  "MEMOIRE", // 63
  "MESSAGE", // 2
  "MODIFICATION", // 497
  "NOTE", // 3
  "OBSERVATION", // 288
  "ORDONNANCE", // 3282
  "PREMIER", // 1
  "PROCLAMATION", // 3
  "PROJET", // 3
  "PROPOSITION", // 6
  "PROTOCOLE", // 16
  "PUBLICATION", // 2
  "RAPPORT", // 1968
  "RECOMMANDATION", // 126
  "RECTIFICATIF", // 3
  "REGLEMENT", // 902
  "REGLEMENTEUROPEEN", // 571
  "RELEVE", // 3
  "REMISE", // 121
  "RESULTATS", // 14479
  "SAISINE", // 392
  "SENATUS", // 2
  "SUSPENSION", // 1
  "TABLEAU", // 1092
  "TRAITE", // 5
  "TROISIEME", // 2
  "VOCABULAIRE", // 169
] as const

export const allJorfTexteOrigines = ["JORF"] as const

export const allJorfTexteVersionLienNatures = [
  "ABROGATION", // 5
  "Accord autonome", // 3
  "ACCORD CADRE INTERSECTEURS",
  "ACCORD CADRE NATIONAL",
  "ACCORD CADRE", // 1
  "Accord collectif interbranche",
  "Accord collectif national sectoriel", // 7
  "Accord collectif national", // 50
  "ACCORD COLLECTIF NATIONAL", // 57
  "ACCORD COLLECTIF",
  "Accord collectif", // 6
  "ACCORD DE BRANCHE", // 1
  "Accord de branche", // 24
  "Accord de champ", // 1
  "Accord de convergence", // 3
  "Accord de méthode", // 23
  "Accord de rattachement", // 1
  "Accord de substitution", // 12
  "Accord du", // 1
  "Accord interbranches", // 5
  "Accord interprofessionnel départemental", // 1
  "Accord interprofessionnel", // 8
  "Accord interprétatif", // 3
  "Accord national de branche", // 45
  "Accord national interprofessionnel", // 6
  "ACCORD NATIONAL PARITAIRE", // 16
  "Accord national professionnel", // 1
  "ACCORD NATIONAL PROFESSIONNEL", // 11
  "ACCORD NATIONAL", // 101
  "Accord national", // 20
  "Accord paritaire national", // 4
  "ACCORD PARITAIRE", // 5
  "Accord paritaire", // 8
  "ACCORD PROFESSIONNEL", // 4
  "Accord professionnel", // 56
  "Accord régional", // 2
  "Accord territorial",
  "Accord tripartite",
  "ACCORD", // 1048
  "accord", // 130
  "Accord", // 22442
  "Accord-cadre interbranches", // 2
  "ACCORD-CADRE", // 20
  "Accord-cadre", // 7
  "Accord-type", // 1
  "ACCORD_FONCTION_PUBLIQUE", // 12
  "ACTE", // 5
  "Additif", // 24
  "ADDITIF", // 39
  "Adhésion par lettre", // 8
  "Adhésion", // 1
  "Annexe spécifique", // 2
  "ANNEXE", // 149
  "Annexe", // 367
  "ANNEXES", // 3
  "ANNONCES", // 4
  "ARRET", // 48
  "ARRETE", // 547820
  "ARRETEEURO", // 15
  "ARRETEURO", // 599
  "ATTESTATION", // 2
  "Avenant de révision", // 36
  "Avenant rectificatif", // 1
  "Avenant", // 18057
  "avenant", // 185
  "AVENANT", // 858
  "AVIS D'INTERPRETATION", // 2
  "Avis d'interprétation", // 8
  "Avis interprétatif", // 4
  "AVIS", // 30500
  "AVISEURO", // 3645
  "CIRCULAIRE", // 4362
  "CODE", // 535600
  "COMMUNIQUE", // 4
  "COMPOSITION", // 7
  "CONSTITUTION", // 13896
  "Convention collective de travail", // 4
  "Convention collective départementale", // 36
  "CONVENTION COLLECTIVE INTERREGIONALE", // 217
  "Convention collective interrégionale", // 7
  "Convention collective nationale de travail", // 1
  "CONVENTION COLLECTIVE NATIONALE", // 6
  "Convention collective nationale", // 6077
  "Convention collective régionale", // 148
  "convention collective", // 106
  "CONVENTION COLLECTIVE", // 148
  "Convention collective", // 666
  "Convention de référencement", // 1
  "Convention", // 1
  "convention", // 1
  "CONVENTION", // 329
  "DECISION", // 109937
  "DECISION_CC", // 116
  "DECISION_EURO", // 243
  "DECLARATION GENERALE",
  "DECLARATION", // 8
  "DECRET", // 747993
  "DECRET_LOI", // 2061
  "DELIBERATION", // 10824
  "DELIBERATIONEURO", // 26
  "DIRECTIVE", // 43
  "DIRECTIVE_EURO", // 22593
  "Décision", // 1
  "Délibération", // 1
  "Dénonciation par lettre", // 3
  "Dénonciation", // 2
  "ELECTIONDUPRESIDENTDELAREPUBLIQU", // 6
  "INFORMATION", // 26
  "INFORMATIONS_DIVERSES", // 16
  "INFORMATIONS_PARLEMENTAIRES", // 2576
  "INSTRUCTION", // 218
  "INSTRUCTIONEURO", // 700
  "Lettre de dénonciation", // 1
  "LETTREEURO", // 5
  "LISTE", // 262
  "LOI", // 216342
  "LOI_CONSTIT", // 30
  "LOI_ORGANIQUE", // 2899
  "LOI_PROGRAMME", // 55
  "MEMOIRE", // 21
  "MODIFICATION", // 125
  "NOTE", // 3
  "OBSERVATION", // 256
  "ORDONNANCE", // 35340
  "Procès-verbal de désaccord", // 4
  "PROJET", // 93
  "PROJET D'AVENANT",
  "PROTOCOLE D'ACCORD COLLECTIF", // 7
  "Protocole d'accord de méthode", // 1
  "PROTOCOLE D'ACCORD INTERBRANCHE", // 3
  "Protocole D'accord", // 1
  "PROTOCOLE D'ACCORD", // 33
  "Protocole d'accord", // 62
  "Protocole", // 55
  "PROTOCOLE", // 7
  "PUBLICATION", // 1
  "RAPPORT", // 1756
  "Recommandation patronale", // 2
  "RECOMMANDATION", // 243
  "RECOMMANDATION_EURO", // 1
  "Rectificatif au Bulletin officiel n°", // 4
  "REGLEMENT", // 800
  "REGLEMENTEUROPEEN", // 1897
  "RESULTATS", // 3901
  "SAISINE", // 352
  "SALAIRES", // 4
  "SENATUS", // 4
  "SUSPENSION", // 1
  "TABLEAU", // 12
] as const

export const allJorfTexteVersionLienTypes = [
  "ABROGATION", // 34942
  "ABROGE", // 72512
  "ANNULATION", // 381
  "ANNULE", // 32
  "APPLICATION", // 294702
  "CITATION", // 1220159
  "CODIFICATION", // 249655
  "CONCORDANCE", // 27893
  "CONCORDE", // 328
  "CREATION", // 44426
  "CREE", // 1
  "DENONCE", // 1
  "DISJOINT", // 2
  "DISJONCTION", // 1
  "ELARGISSEMENT", // 10
  "ETEND", // 40707
  "EXTENSION", // 1002
  "HISTO", // 2
  "MODIFICATION", // 39581
  "MODIFIE", // 277772
  "PEREMPTION", // 1559
  "PERIME", // 2
  "PILOTE_SUIVEUR", // Added 2023-09
  "RATIFICATION", // 3
  "RATIFIE", // 342
  "RATTACHEMENT", // 1
  "RECTIFICATION", // 762
  "RECTIFIE",
  "RENVOI", // 1
  "RENVOIT", // 811
  "SPEC_APPLI", // 29805
  "TEXTE_SUITE", // 74
  "TRANSFERT", // 981
  "TRANSPOSITION", // 6513
  "TXT_ASSOCIE", // 11821
  "TXT_SOURCE", // 81350
] as const

export function* walkJoTm(tmArray: JoTm[]): Generator<JoTm, void> {
  for (const tm of tmArray) {
    yield tm
    if (tm.TM !== undefined) {
      yield* walkJoTm(tm.TM)
    }
  }
}
