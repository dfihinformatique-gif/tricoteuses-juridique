import type { ArticleType, Sens } from "./shared.js"

/**
 * Représente un article législatif (Article LEGI).
 * Correspond à l'élément racine `ARTICLE` dans `legi_article.dtd`.
 * Commentaire DTD : "Décrit toutes les informations relatives à un article LEGI".
 */
export interface LegiArticle {
  /**
   * Contenu textuel principal de l'article.
   * Correspond à `BLOC_TEXTUEL` dans `legi_article.dtd`, qui contient un élément `CONTENU` (HTML).
   */
  BLOC_TEXTUEL?: {
    /** Contenu HTML du bloc textuel de l'article. */
    CONTENU: string // HTML
  }
  /**
   * Contexte de l'article, référençant son texte législatif parent.
   * Correspond à `CONTEXTE` dans `legi_article.dtd`.
   * Commentaire DTD : "Rappel du contexte de l'article courant. Cite le texte parent et ses différentes versions."
   */
  CONTEXTE: {
    /**
     * Informations sur le texte législatif parent.
     * Correspond à l'élément `TEXTE` dans `legi_article.dtd`.
     * Commentaire DTD : "Rappel du texte parent et de ses différentes versions".
     */
    TEXTE: {
      /** Autorité émettrice. Provient de l'attribut `autorite` de `TEXTE`. */
      "@autorite"?: string
      /** Identifiant interne commun à toutes les versions du texte parent. Provient de l'attribut `cid` de `TEXTE`. */
      "@cid"?: string
      /** Date de publication du texte parent. Provient de l'attribut `date_publi` de `TEXTE`. */
      "@date_publi"?: string
      /** Date de signature du texte parent. Provient de l'attribut `date_signature` de `TEXTE`. */
      "@date_signature"?: string
      /** Ministère émetteur. Provient de l'attribut `ministere` de `TEXTE`. */
      "@ministere"?: string
      /** Nature du texte parent. Provient de l'attribut `nature` de `TEXTE`. */
      "@nature"?: LegiArticleTexteNature
      /** Identifiant NOR du texte parent. Provient de l'attribut `nor` de `TEXTE`. */
      "@nor"?: string
      /** Numéro du texte parent. Provient de l'attribut `num` de `TEXTE`. */
      "@num"?: string
      /** Numéro de parution au Journal Officiel pour le texte parent. Provient de l'attribut `num_parution_jo` de `TEXTE`. */
      "@num_parution_jo"?: string
      /**
       * Titres des versions du texte parent.
       * Correspond aux éléments `TITRE_TXT` dans `legi_article.dtd`.
       * Commentaire DTD : "Titre du texte parent".
       */
      TITRE_TXT: Array<{
        /** Contenu textuel du titre. */
        "#text": string
        /** Titre court de la version du texte. Provient de l'attribut `c_titre_court` de `TITRE_TXT`. */
        "@c_titre_court": string
        /** Date de début de validité pour ce titre de version de texte. Provient de l'attribut `debut` de `TITRE_TXT`. */
        "@debut": string
        /** Date de fin de validité pour ce titre de version de texte. Provient de l'attribut `fin` de `TITRE_TXT`. */
        "@fin": string
        /** Identifiant interne de la version du texte. Provient de l'attribut `id_txt` de `TITRE_TXT`. */
        "@id_txt": string
      }>
      /**
       * Hiérarchie de la table des matières pour le texte parent.
       * Correspond aux éléments `TM` imbriqués dans `legi_article.dtd`.
       * Commentaire DTD : "Têtier parent".
       */
      TM?: LegiArticleTm
    }
  }
  /**
   * Liens de cet article vers d'autres documents.
   * Correspond à `LIENS` dans `legi_article.dtd`, contenant des éléments `LIEN`.
   * Commentaire DTD : "Liens vers d'autres textes".
   */
  LIENS?: {
    /** Tableau d'éléments de lien. */
    LIEN: Array<LegiArticleLien>
  }
  /**
   * Métadonnées de l'article.
   * Correspond à `META` dans `legi_article.dtd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à `META_COMMUN` (défini dans `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Ancien identifiant (de la version précédente de Légifrance). Provient de `ANCIEN_ID` dans `meta_commun.dtd`. */
      ANCIEN_ID?: string
      /** Identifiant interne de l'article. Provient de `ID` dans `meta_commun.dtd`. */
      ID: string
      /** Nature du document (ex: "ARTICLE"). Provient de `NATURE` dans `meta_commun.dtd`. */
      NATURE: LegiArticleNature
      /** Origine du document (ex: "LEGI"). Provient de `ORIGINE` dans `meta_commun.dtd`. */
      ORIGINE: LegiArticleOrigine
      /** URL relative du document. Provient de `URL` dans `meta_commun.dtd`. */
      URL: string
    }
    /**
     * Métadonnées spécifiques à l'article.
     * Correspond à `META_SPEC` et `META_ARTICLE` dans `legi_article.dtd`.
     */
    META_SPEC: {
      /** Métadonnées spécifiques à l'article. */
      META_ARTICLE: LegiArticleMetaArticle
    }
  }
  /**
   * Notes associées à l'article.
   * Correspond à `NOTA` dans `legi_article.dtd`, qui contient un élément `CONTENU` (HTML).
   * Commentaire DTD : "Nota de l'article".
   */
  NOTA?: {
    /** Contenu HTML de la note. */
    CONTENU: string // HTML
  }
  /**
   * Versions de l'article.
   * Correspond à `VERSIONS` dans `legi_article.dtd`, contenant des éléments `VERSION`.
   * Commentaire DTD : "Versions de l'article courant".
   */
  VERSIONS: {
    /** Tableau d'éléments de version d'article. */
    VERSION: LegiArticleVersion[]
  }
}

/**
 * Statut juridique d'un article législatif.
 * Valeurs basées sur l'élément `ETAT` dans `legi_article.dtd`.
 * Commentaire DTD : "Etat juridique de l'article. Les valeurs possibles sont : ABROGE , ABROGE_DIFF, ANNULE, DISJOINT, MODIFIE, MODIFIE_MORT_NE, PERIME, TRANSFERE, VIGUEUR, VIGUEUR_DIFF".
 */
export type LegiArticleEtat = (typeof allLegiArticleEtats)[number]

/**
 * Représente un lien d'un article législatif vers un autre document ou une partie de document.
 * Correspond aux attributs de l'élément `LIEN`, typiquement défini dans `lien.dtd` et utilisé dans `ARTICLE/LIENS`.
 * Commentaire DTD : "Definie un lien entrant ou sortant vers un texte ou un article Legifrance".
 */
export interface LegiArticleLien {
  /** Contenu textuel du lien, s'il existe. */
  "#text"?: string
  /** Identifiant interne du texte cible si le lien est interne. Provient de l'attribut `cidtexte`. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Date de signature du texte cible. Provient de l'attribut `datesignatexte`. */
  "@datesignatexte"?: string
  /** Identifiant de l'élément cible (article, section, etc.). Provient de l'attribut `id`. */
  "@id"?: string
  /** Nature du texte cible. Provient de l'attribut `naturetexte`. */
  "@naturetexte"?: LegiArticleLienNature
  /** Identifiant NOR du texte cible. Provient de l'attribut `nortexte`. */
  "@nortexte"?: string
  /** Numéro du texte ou de l'élément cible. Provient de l'attribut `num`. */
  "@num"?: string
  /** Sens du lien (ex: "SOURCE", "CIBLE"). Provient de l'attribut `sens`. */
  "@sens": Sens
  /** Type du lien (ex: "ABROGATION", "CITATION"). Provient de l'attribut `typelien`. */
  "@typelien": LegiArticleLienType
}

/**
 * Origine de l'article lié (ex: JORF, LEGI).
 * Utilisé dans `LegiArticleVersion/LIEN_ART/@origine`.
 */
export type LegiArticleLienArticleOrigine =
  (typeof allLegiArticleLienArticleOrigines)[number]

/** Nature du texte lié par un `LegiArticleLien`. */
export type LegiArticleLienNature = (typeof allLegiArticleLienNatures)[number]

/** Type de lien dans `LegiArticleLien`. */
export type LegiArticleLienType = (typeof allLegiArticleLienTypes)[number]

/**
 * Représente les métadonnées spécifiques à un article.
 * Correspond à `META_ARTICLE` dans `legi_article.dtd`.
 * Commentaire DTD : "Metadonnees specifique aux articles".
 */
export interface LegiArticleMetaArticle {
  /** Date d'entrée en vigueur de l'article. Provient de `DATE_DEBUT` dans `legi_article.dtd`. */
  DATE_DEBUT: string
  /** Date de fin de vigueur de l'article. Provient de `DATE_FIN` dans `legi_article.dtd`. */
  DATE_FIN: string
  /** Statut juridique de l'article. Provient de `ETAT` dans `legi_article.dtd`. */
  ETAT?: LegiArticleEtat
  /** Numéro de l'article. Provient de `NUM` dans `legi_article.dtd`. */
  NUM?: string
  /** Type de l'article. Provient de `TYPE` dans `legi_article.dtd`. Commentaire DTD : "@hidden liste de valeurs à préciser". */
  TYPE?: ArticleType
}

/** Nature d'un document `LegiArticle`, typiquement "Article". Provient de `NATURE` dans `META_COMMUN`. */
export type LegiArticleNature = (typeof allLegiArticleNatures)[number]

/** Origine d'un document `LegiArticle`, typiquement "LEGI" ou "JORF". Provient de `ORIGINE` dans `META_COMMUN`. */
export type LegiArticleOrigine = (typeof allLegiArticleOrigines)[number]

/** Nature du texte parent référencé dans `LegiArticle/CONTEXTE/TEXTE`. Provient de l'attribut `nature` de `TEXTE`. */
export type LegiArticleTexteNature = (typeof allLegiArticleTexteNatures)[number]

/**
 * Représente un niveau dans la table des matières (TM) contextuelle d'un article.
 * Correspond à la structure récursive de l'élément `TM` dans `legi_article.dtd`.
 */
export interface LegiArticleTm {
  /**
   * Titre de ce niveau de table des matières.
   * Correspond à l'élément `TITRE_TM` dans `legi_article.dtd`.
   * Commentaire DTD : "Libellé du têtier."
   */
  TITRE_TM: Array<{
    /** Contenu textuel du titre de la TM. */
    "#text": string
    /** Date de début de validité pour ce niveau de TM. Provient de l'attribut `debut` de `TITRE_TM`. */
    "@debut": string
    /** Date de fin de validité pour ce niveau de TM. Provient de l'attribut `fin` de `TITRE_TM`. */
    "@fin": string
    /** Identifiant interne de ce niveau de TM. Provient de l'attribut `id` de `TITRE_TM`. */
    "@id": string
  }>
  /** Niveau de table des matières imbriqué. */
  TM?: LegiArticleTm
}

/**
 * Représente une version spécifique d'un article législatif.
 * Correspond à l'élément `VERSION` au sein de `ARTICLE/VERSIONS` dans `legi_article.dtd`.
 * Commentaire DTD : "Version de l'article".
 */
export interface LegiArticleVersion {
  /** Statut juridique de l'article dans cette version. Provient de l'attribut `etat` de `VERSION`. */
  "@etat"?: LegiArticleEtat
  /**
   * Lien vers le contenu de l'article pour cette version.
   * Correspond à l'élément `LIEN_ART` (défini dans `lien_art.dtd`).
   */
  LIEN_ART: {
    /** Date de début de validité pour ce lien de version d'article. Provient de l'attribut `debut`. */
    "@debut": string
    /** Statut juridique de la version d'article liée. Provient de l'attribut `etat`. */
    "@etat"?: LegiArticleEtat
    /** Date de fin de validité pour ce lien de version d'article. Provient de l'attribut `fin`. */
    "@fin": string
    /** Identifiant du contenu de l'article lié. Provient de l'attribut `id`. */
    "@id": string
    /** Numéro de l'article lié. Provient de l'attribut `num`. */
    "@num"?: string
    /** Origine de l'article lié (ex: "LEGI"). Provient de l'attribut `origine`. */
    "@origine": LegiArticleOrigine
  }
}

/** Balises représentant différentes catégories ou types de documents/structures LEGI. */
export type LegiCategorieTag = (typeof allLegiCategoriesTags)[number]

/**
 * Représente les métadonnées spécifiques aux aspects chronologiques d'un texte législatif.
 * Correspond à l'élément racine `META_TEXTE_CHRONICLE` dans `meta_texte_chronicle.dtd`.
 * Commentaire DTD : "Métadonnées spécifiques aux textes".
 */
export interface LegiMetaTexteChronicle {
  /** Identifiant interne commun à toutes les versions du texte. Provient de `CID`. */
  CID: string
  /** Date de publication du texte. Provient de `DATE_PUBLI`. */
  DATE_PUBLI: string
  /** Date de signature du texte. Provient de `DATE_TEXTE`. */
  DATE_TEXTE: string
  /** Date de dernière modification du texte. Provient de `DERNIERE_MODIFICATION`. */
  DERNIERE_MODIFICATION: string
  /** Identifiant NOR du texte. Provient de `NOR`. */
  NOR?: string
  /** Numéro du texte. Provient de `NUM`. */
  NUM?: string
  /** Numéro de parution au Journal Officiel. Provient de `NUM_PARUTION`. */
  NUM_PARUTION?: number
  /** Numéro de séquence dans le Journal Officiel. Provient de `NUM_SEQUENCE`. */
  NUM_SEQUENCE?: number
  /** Origine de la publication (ex: titre du JO). Provient de `ORIGINE_PUBLI`. */
  ORIGINE_PUBLI?: string
  /** Page de début de la publication dans le JO. Provient de `PAGE_DEB_PUBLI`. */
  PAGE_DEB_PUBLI?: number
  /** Page de fin de la publication dans le JO. Provient de `PAGE_FIN_PUBLI`. */
  PAGE_FIN_PUBLI?: number
  /**
   * Informations sur les versions futures du texte.
   * Correspond à `VERSIONS_A_VENIR` dans `meta_texte_chronicle.dtd`.
   * Commentaire DTD : "Liste des versions futures".
   */
  VERSIONS_A_VENIR?: {
    /** Tableau de dates ou identifiants de versions futures. Provient de `VERSION_A_VENIR`. */
    VERSION_A_VENIR: string[]
  }
}

/**
 * Représente les métadonnées spécifiques à une version d'un texte législatif.
 * Correspond à l'élément `META_TEXTE_VERSION` dans `legi_texte_version.dtd`.
 */
export interface LegiMetaTexteVersion {
  /** Autorité émettrice. Provient de `AUTORITE` dans `legi_texte_version.dtd`. */
  AUTORITE?: string
  /** Date d'entrée en vigueur de cette version du texte. Provient de `DATE_DEBUT` dans `legi_texte_version.dtd`. */
  DATE_DEBUT?: string
  /** Date de fin de vigueur de cette version du texte. Provient de `DATE_FIN` dans `legi_texte_version.dtd`. */
  DATE_FIN?: string
  /** Statut juridique de cette version du texte. Provient de `ETAT` dans `legi_texte_version.dtd`. */
  ETAT?: LegiTexteEtat
  /**
   * Liens associés à cette version du texte.
   * Correspond à `LIENS` dans `legi_texte_version.dtd`.
   * Commentaire DTD : "Liste des liens entrant ou sortant vers d'autres textes ou articles".
   */
  LIENS?: {
    /** Tableau d'éléments de lien. */
    LIEN: Array<LegiTexteVersionLien>
  }
  /**
   * Mots-clés ou termes de classification pour le texte.
   * Note : `MCS_TXT` (Mots Clefs Texte?) n'est pas directement trouvé dans les extraits DTD fournis,
   * peut être un ajout personnalisé ou provenir d'une DTD non analysée.
   */
  MCS_TXT?: {
    /** Tableau de mots-clés. */
    MC: string[]
  }
  /** Ministère émetteur. Provient de `MINISTERE` dans `legi_texte_version.dtd`. */
  MINISTERE?: string
  /** Titre court de la version du texte. Provient de `TITRE` dans `legi_texte_version.dtd`. */
  TITRE?: string
  /** Titre complet de la version du texte. Provient de `TITREFULL` dans `legi_texte_version.dtd`. */
  TITREFULL?: string
}

/**
 * Représente une "Section TA" (Titre/Article), un niveau dans la table des matières d'un texte législatif.
 * Correspond à l'élément racine `SECTION_TA` dans `legi_section_ta.dtd`.
 * Commentaire DTD : "Decrit le sommaire d'un texte en terme de têtier et d'article".
 */
export interface LegiSectionTa {
  /** Commentaire associé à la section. Provient de `COMMENTAIRE` dans `legi_section_ta.dtd`. (Peut être spécifique à l'application si non trouvé dans DTD standard) */
  COMMENTAIRE?: string
  /**
   * Contexte de la section, référençant son texte législatif parent.
   * Similaire à `CONTEXTE` dans `LegiArticle`. Correspond à `CONTEXTE` dans `legi_section_ta.dtd`.
   * Commentaire DTD : "Contexte de la section. Rappelle la succession des sections parentes pour arriver à l'élément courant".
   */
  CONTEXTE: {
    /** Informations sur le texte législatif parent. */
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
      /** Titres des versions du texte parent. */
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court"?: string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      /** Hiérarchie de la table des matières pour le texte parent. */
      TM?: LegiSectionTaTm
    }
  }
  /** Identifiant de la section. Provient de `ID` dans `legi_section_ta.dtd`. */
  ID: string
  /**
   * Structure de cette section, liant vers des sous-sections ou des articles.
   * Correspond à `STRUCTURE_TA` dans `legi_section_ta.dtd`.
   * Commentaire DTD : "Structure de la section. Présente la succession des sections filles et des articles de la section courante".
   */
  STRUCTURE_TA?: LegiSectionTaStructure
  /** Titre de la section. Provient de `TITRE_TA` dans `legi_section_ta.dtd`. (Peut contenir des sauts de ligne) */
  TITRE_TA?: string // Titre de la section (peut contenir des sauts de lignes à remplacer par des espaces)
}

/**
 * Représente un lien d'une `LegiSectionTa` vers un article.
 * Les attributs sont basés sur `lien_art.dtd` utilisés dans un contexte de section.
 */
export interface LegiSectionTaLienArt {
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string
  /** Statut juridique. Provient de l'attribut `etat`. */
  "@etat"?: LegiSectionTaLienArtEtat
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string
  /** Identifiant de l'article lié. Provient de l'attribut `id`. */
  "@id": string
  /** Numéro de l'article lié. Provient de l'attribut `num`. */
  "@num"?: string
  /** Origine de l'article lié (ex: "LEGI"). Provient de l'attribut `origine`. */
  "@origine": LegiSectionTaLienArtOrigine
}

/** Statut juridique pour un `LegiSectionTaLienArt`. */
export type LegiSectionTaLienArtEtat =
  (typeof allLegiSectionTaLienArtEtats)[number]

/** Origine pour un `LegiSectionTaLienArt`. */
export type LegiSectionTaLienArtOrigine =
  (typeof allLegiSectionTaLienArtOrigines)[number]

/**
 * Représente un lien d'une `LegiSectionTa` vers une autre `LegiSectionTa` (sous-section).
 * Les attributs sont basés sur `lien_section_ta.dtd`.
 */
export interface LegiSectionTaLienSectionTa {
  /** Contenu textuel/titre de la section liée. */
  "#text"?: string
  /** CID de la section liée. Provient de l'attribut `cid`. */
  "@cid": string
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string
  /** Statut juridique. Provient de l'attribut `etat`. */
  "@etat"?: LegiSectionTaLienSectionTaEtat
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string
  /** Identifiant de la section liée. Provient de l'attribut `id`. */
  "@id": string
  /** Niveau d'imbrication. Provient de l'attribut `niv`. */
  "@niv": number
  /** URL/chemin vers le fichier XML de la section liée. Provient de l'attribut `url`. */
  "@url": string
}

/** Statut juridique pour un `LegiSectionTaLienSectionTa`. */
export type LegiSectionTaLienSectionTaEtat =
  (typeof allLegiSectionTaLienSectionTaEtats)[number]

/**
 * Structure d'une `LegiSectionTa`, contenant des liens vers des articles ou des sous-sections.
 * Ceci reflète le modèle de contenu des éléments regroupant `LIEN_ART` et `LIEN_SECTION_TA`.
 */
export interface LegiSectionTaStructure {
  /** Tableau de liens vers des articles au sein de cette section. */
  LIEN_ART?: LegiSectionTaLienArt[]
  /** Tableau de liens vers des sous-sections (autres SectionTA) au sein de cette section. */
  LIEN_SECTION_TA?: LegiSectionTaLienSectionTa[]
}

/** Nature du texte parent pour une `LegiSectionTa`. */
export type LegiSectionTaTexteNature =
  (typeof allLegiSectionTaTexteNatures)[number]

/**
 * Représente une structure de table des matières (TM) au sein d'une `LegiSectionTa`.
 * Similaire à `LegiArticleTm`.
 */
export interface LegiSectionTaTm {
  /** Titre de ce niveau de table des matières. */
  TITRE_TM: Array<{
    /** Contenu textuel du titre de la TM. */
    "#text"?: string
    /** Date de début de validité pour ce niveau de TM. */
    "@debut": string
    /** Date de fin de validité pour ce niveau de TM. */
    "@fin": string
    /** Identifiant interne de ce niveau de TM. */
    "@id": string
  }>
  /** Niveau de table des matières imbriqué. */
  TM?: LegiSectionTaTm
}

/**
 * Représente un texte législatif complet, combinant son aperçu structurel (`LegiTextelr`)
 * et le contenu d'une version spécifique (`LegiTexteVersion`).
 * Ceci est une fusion conceptuelle, pas un élément racine DTD direct.
 */
export type LegiTexte = LegiTexteVersion & {
  /**
   * Hiérarchie structurelle du texte (table des matières).
   * Provient de l'élément `STRUCT` dans `legi_texte_struct.dtd` (racine `TEXTELR`).
   */
  STRUCT?: LegiTextelrStructure
  /**
   * Liste des versions disponibles du texte.
   * Provient de l'élément `VERSIONS` dans `legi_texte_struct.dtd` (racine `TEXTELR`).
   */
  VERSIONS?: LegiTextelrVersions
}

/**
 * Représente l'aperçu structurel d'un texte législatif et de ses versions.
 * Correspond à l'élément racine `TEXTELR` dans `legi_texte_struct.dtd`.
 * Commentaire DTD : "Décrit la structure d'un texte LEGI et la liste des différentes versions de ce texte."
 */
export interface LegiTextelr {
  /**
   * Métadonnées pour la structure du texte.
   * Correspond à `META` dans `legi_texte_struct.dtd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à `META_COMMUN` (défini dans `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Ancien identifiant. Provient de `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** Identifiant unique du document de structure du texte. Provient de `ID`. */
      ID: string
      /** Nature du document (ex: "TEXTELR"). Provient de `NATURE`. */
      NATURE?: LegiTexteNature
      /** Origine du document (ex: "LEGI"). Provient de `ORIGINE`. */
      ORIGINE: LegiTexteOrigine
      /** URL relative du document. Provient de `URL`. */
      URL: string
    }
    /**
     * Métadonnées spécifiques à la structure du texte.
     * Correspond à `META_SPEC` dans `legi_texte_struct.dtd`.
     */
    META_SPEC: {
      /**
       * Métadonnées chronologiques pour le texte.
       * Correspond à `META_TEXTE_CHRONICLE` (défini dans `meta_texte_chronicle.dtd`).
       */
      META_TEXTE_CHRONICLE: LegiMetaTexteChronicle
    }
  }
  /**
   * La hiérarchie structurelle (table des matières) du texte législatif.
   * Correspond à `STRUCT` dans `legi_texte_struct.dtd`.
   * Commentaire DTD pour `STRUCT` dans `TEXTELR` : "Historique de la structure".
   */
  STRUCT?: LegiTextelrStructure
  /**
   * Liste des versions disponibles de ce texte législatif.
   * Correspond à `VERSIONS` dans `legi_texte_struct.dtd`.
   * Commentaire DTD pour `VERSIONS` dans `TEXTELR` : "Liste des versions du texte".
   */
  VERSIONS: LegiTextelrVersions
}

/**
 * Statut juridique d'une version de texte législatif (utilisé dans `LegiTextelrVersion` et `LegiMetaTexteVersion`).
 * Valeurs basées sur l'élément `ETAT` dans `legi_texte_version.dtd`.
 * Commentaire DTD : "Etat juridique du texte. Les valeurs possibles sont : ABROGE, ABROGE_DIFF, ANNULE, MODIFIE, MODIFIE_MORT_NE, PERIME, TRANSFERE, VIGUEUR, VIGUEUR_DIFF".
 */
export type LegiTexteEtat = (typeof allLegiTexteEtats)[number]

/**
 * Représente un lien d'une `LegiTextelrStructure` vers un article.
 * Les attributs sont basés sur `lien_art.dtd` utilisés dans `TEXTELR/STRUCT`.
 */
export interface LegiTextelrLienArt {
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string
  /** Statut juridique. Provient de l'attribut `etat`. */
  "@etat"?: LegiTextelrLienArtEtat
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string
  /** Identifiant de l'article lié. Provient de l'attribut `id`. */
  "@id": string
  // "@nature"?: undefined // Les DTD pour LIEN_ART ne spécifient généralement pas la nature, c'est un Article.
  /** Numéro de l'article lié. Provient de l'attribut `num`. */
  "@num"?: string
  /** Origine de l'article lié (ex: "LEGI"). Provient de l'attribut `origine`. */
  "@origine": LegiTextelrLienArtOrigine
}

/** Statut juridique pour un `LegiTextelrLienArt`. */
export type LegiTextelrLienArtEtat = (typeof allLegiTextelrLienArtEtats)[number]

/** Origine pour un `LegiTextelrLienArt`. */
export type LegiTextelrLienArtOrigine =
  (typeof allLegiTextelrLienArtOrigines)[number]

/**
 * Représente un lien d'une `LegiTextelrStructure` vers une `LegiSectionTa` (section).
 * Les attributs sont basés sur `lien_section_ta.dtd` utilisés dans `TEXTELR/STRUCT`.
 */
export interface LegiTextelrLienSectionTa {
  /** Titre de la section liée. Contenu textuel de `LIEN_SECTION_TA`. */
  "#text": string // Titre de la section
  /** CID de la section liée. Provient de l'attribut `cid`. */
  "@cid": string // ID de la Section Texte Article que la Section Texte Article a modifée ou égal à @id si pas de modification
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string // Date de début
  /** Statut juridique. Provient de l'attribut `etat`. */
  "@etat"?: LegiTextelrLienSectionTaEtat
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string // Date de fin
  /** Identifiant de la section liée. Provient de l'attribut `id`. */
  "@id": string // ID de la Section Texte Article
  /** Niveau d'imbrication de la section. Provient de l'attribut `niv`. */
  "@niv": number // Niveau de profondeur de la section dans l'arborescence
  /** URL/chemin vers le fichier XML de la section liée. Provient de l'attribut `url`. */
  "@url": string // Chemin du fichier XML de la Section Texte Article dans l'archive
}

/** Statut juridique pour un `LegiTextelrLienSectionTa`. */
export type LegiTextelrLienSectionTaEtat =
  (typeof allLegiTextelrLienSectionTaEtats)[number]

/** Nature d'un document `LegiTextelr` ou `LegiTexteVersion`. Provient de `NATURE` dans `META_COMMUN`. */
export type LegiTexteNature = (typeof allLegiTexteNatures)[number]

/** Origine d'un document `LegiTextelr` ou `LegiTexteVersion`. Provient de `ORIGINE` dans `META_COMMUN`. */
export type LegiTexteOrigine = (typeof allLegiTexteOrigines)[number]

/**
 * Représente la structure de premier niveau (table des matières) d'un document `LegiTextelr`.
 * Correspond à l'élément `STRUCT` dans `legi_texte_struct.dtd`.
 */
export interface LegiTextelrStructure {
  /** Tableau de liens vers des articles à ce niveau de la structure. */
  LIEN_ART?: LegiTextelrLienArt[]
  /** Tableau de liens vers des sections (SectionTA) à ce niveau de la structure. */
  LIEN_SECTION_TA?: LegiTextelrLienSectionTa[]
}

/**
 * Représente une version spécifique d'un texte législatif, telle que listée dans `LegiTextelrVersions`.
 * Correspond à l'élément `VERSION` au sein de `TEXTELR/VERSIONS` dans `legi_texte_struct.dtd`.
 * Commentaire DTD : "Version du texte."
 */
export interface LegiTextelrVersion {
  /** Statut juridique de cette version de texte. Provient de l'attribut `etat` de `VERSION`. */
  "@etat"?: LegiTexteEtat
  /**
   * Lien vers le contenu textuel réel de cette version.
   * Correspond à l'élément `LIEN_TXT` (défini dans `lien_txt.dtd`).
   */
  LIEN_TXT: {
    /** Date de début de validité pour ce lien de version de texte. Provient de l'attribut `debut`. */
    "@debut": string
    /** Date de fin de validité pour ce lien de version de texte. Provient de l'attribut `fin`. */
    "@fin": string
    /** Identifiant du document de version de texte lié (ex: un ID `LegiTexteVersion`). Provient de l'attribut `id`. */
    "@id": string
    /** Numéro de la version du texte. Provient de l'attribut `num`. */
    "@num"?: string
  }
}

/**
 * Conteneur pour la liste des versions d'un texte législatif dans un document `LegiTextelr`.
 * Correspond à l'élément `VERSIONS` dans `legi_texte_struct.dtd`.
 */
export interface LegiTextelrVersions {
  /** Tableau d'éléments de version de texte. */
  VERSION: LegiTextelrVersion[]
}

/**
 * Représente une version spécifique d'un texte législatif avec son contenu complet.
 * Correspond à l'élément racine `TEXTE_VERSION` dans `legi_texte_version.dtd`.
 * Commentaire DTD : "Décrit les informations spécifiques à une version de texte LEGI".
 */
export interface LegiTexteVersion {
  /**
   * Abrogations affectant cette version du texte.
   * Correspond à `ABRO` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Abrogations du texte".
   */
  ABRO?: {
    /** Contenu HTML détaillant les abrogations. */
    CONTENU: string // HTML
  }
  /**
   * Métadonnées pour cette version du texte.
   * Correspond à `META` dans `legi_texte_version.dtd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à `META_COMMUN` (défini dans `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Ancien identifiant. Provient de `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** Alias de l'Identifiant Européen de la Législation (ELI). (Non trouvé dans les DTD LEGI analysées, peut être spécifique à l'application ou plus récent) */
      ELI_ALIAS?: {
        /** ID de l'alias ELI */
        ID_ELI_ALIAS: string
      }
      /** Identifiant unique de ce document de version de texte. Provient de `ID`. */
      ID: string
      /** Identifiant Européen de la Législation (ELI). (Non trouvé dans les DTD LEGI analysées) */
      ID_ELI?: string
      /** Nature du document (ex: "TEXTE_VERSION"). Provient de `NATURE`. */
      NATURE?: LegiTexteNature
      /** Origine du document (ex: "LEGI"). Provient de `ORIGINE`. */
      ORIGINE: LegiTexteOrigine
      /** URL relative du document. Provient de `URL`. */
      URL: string
    }
    /**
     * Métadonnées spécifiques à cette version du texte.
     * Correspond à `META_SPEC` dans `legi_texte_version.dtd`.
     */
    META_SPEC: {
      /**
       * Métadonnées chronologiques pour le texte.
       * Correspond à `META_TEXTE_CHRONICLE` (défini dans `meta_texte_chronicle.dtd`).
       */
      META_TEXTE_CHRONICLE: LegiMetaTexteChronicle
      /**
       * Métadonnées spécifiques à la version pour le texte.
       * Correspond à `META_TEXTE_VERSION` (défini dans `legi_texte_version.dtd`).
       */
      META_TEXTE_VERSION: LegiMetaTexteVersion
    }
  }
  /**
   * Notes associées à cette version du texte.
   * Correspond à `NOTA` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Nota sur le texte".
   */
  NOTA?: {
    /** Contenu HTML de la note. */
    CONTENU: string // HTML
  }
  /**
   * Rectifications à cette version du texte.
   * Correspond à `RECT` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Rectifications du texte".
   */
  RECT?: {
    /** Contenu HTML des rectifications. */
    CONTENU: string // HTML
  }
  /**
   * Signataires de cette version du texte.
   * Correspond à `SIGNATAIRES` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Signataires du texte".
   */
  SIGNATAIRES?: {
    /** Contenu HTML listant les signataires. */
    CONTENU: string // HTML
  }
  /**
   * Travaux préparatoires pour cette version du texte.
   * Correspond à `TP` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Travaux préparatoires du texte".
   */
  TP?: {
    /** Contenu HTML des travaux préparatoires. */
    CONTENU: string // HTML
  }
  /**
   * Visas (références au préambule) pour cette version du texte.
   * Correspond à `VISAS` dans `legi_texte_version.dtd`, contient du `CONTENU` HTML.
   * Commentaire DTD : "Visas du texte".
   */
  VISAS?: {
    /** Contenu HTML des visas. */
    CONTENU: string // HTML
  }
}

/**
 * Représente un lien d'une `LegiTexteVersion` (via `LegiMetaTexteVersion/LIENS`) vers un autre document.
 * Les attributs sont basés sur `lien.dtd` utilisés dans `TEXTE_VERSION`.
 */
export interface LegiTexteVersionLien {
  /** Contenu textuel du lien, s'il existe. */
  "#text"?: string
  /** Identifiant interne du texte cible si le lien est interne. Provient de l'attribut `cidtexte`. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Date de signature du texte cible. Provient de l'attribut `datesignatexte`. */
  "@datesignatexte"?: string
  /** Identifiant de l'élément cible. Provient de l'attribut `id`. */
  "@id"?: string
  /** Nature du texte cible. Provient de l'attribut `naturetexte`. */
  "@naturetexte"?: LegiTexteVersionLienNature
  /** Numéro du texte ou de l'élément cible. Provient de l'attribut `num`. */
  "@num"?: string
  /** Identifiant NOR du texte cible. Provient de l'attribut `nortexte`. */
  "@nortexte"?: string
  /** (Obsolète?) Numéro du texte cible. Souvent similaire à @num. */
  "@numtexte"?: string
  /** Sens du lien. Provient de l'attribut `sens`. */
  "@sens": Sens
  /** Type du lien. Provient de l'attribut `typelien`. */
  "@typelien": LegiTexteVersionLienType
}

/** Nature du texte lié par un `LegiTexteVersionLien`. */
export type LegiTexteVersionLienNature =
  (typeof allLegiTexteVersionLienNatures)[number]

/** Type de lien dans `LegiTexteVersionLien`. */
export type LegiTexteVersionLienType =
  (typeof allLegiTexteVersionLienTypes)[number]

/**
 * Statuts juridiques possibles pour un article législatif (`LegiArticle`, `LegiArticleVersion`, `LegiSectionTaLienArt`, `LegiTextelrLienArt`).
 * Basé sur les commentaires DTD pour les éléments `ETAT` (ex: dans `legi_article.dtd`).
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
