import type { ArticleType, Sens } from "./shared.js"

/**
 * Représente une publication au Journal Officiel (JO).
 * Correspond à l'élément racine `JO` dans `jorf_conteneur.dtd`.
 * Commentaire DTD : "Décrit la structure d'un document de type conteneur JORF".
 */
export interface Jo {
  /**
   * Métadonnées de la publication JO.
   * Correspond à `META` dans `jorf_conteneur.dtd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à `META_COMMUN` (défini dans `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Identifiant unique de la publication JO. Provient de `ID` dans `meta_commun.dtd`. */
      ID: string
      /** Identifiant Européen de la Législation (ELI) pour le JO. Provient de `ID_ELI` dans `meta_commun.dtd`. */
      ID_ELI?: string
      /** Nature du document, typiquement "JO". Provient de `NATURE` dans `meta_commun.dtd`. */
      NATURE: JoNature
      /** Origine du document, typiquement "JORF". Provient de `ORIGINE` dans `meta_commun.dtd`. */
      ORIGINE: JoOrigine
      /** URL relative de la publication JO. Provient de `URL` dans `meta_commun.dtd`. */
      URL: string
    }
    /**
     * Métadonnées spécifiques au conteneur JO.
     * Correspond à `META_SPEC` dans `jorf_conteneur.dtd`.
     */
    META_SPEC: {
      /**
       * Métadonnées spécifiques au conteneur.
       * Correspond à `META_CONTENEUR` dans `jorf_conteneur.dtd`.
       * Commentaire DTD : "Métadonnées du conteneur JORF".
       */
      META_CONTENEUR: {
        /** Date de publication du JO. Provient de `DATE_PUBLI` dans `jorf_conteneur.dtd`. */
        DATE_PUBLI: string
        /** Numéro du JO. Provient de `NUM` dans `jorf_conteneur.dtd`. */
        NUM?: string
        /** Titre du JO. Provient de `TITRE` dans `jorf_conteneur.dtd`. */
        TITRE: string
      }
    }
  }
  /**
   * Structure des textes au sein du JO (table des matières).
   * Correspond à `STRUCTURE_TXT` dans `jorf_conteneur.dtd`.
   * Commentaire DTD : "Sommaire du JO. Definit la liste ordonnée des têtiers et des textes composants le JO."
   */
  STRUCTURE_TXT?: {
    /** Tableau de liens vers les textes publiés dans ce JO. */
    LIEN_TXT?: JoLienTxt[]
    /** Tableau des niveaux de la table des matières (têtiers). */
    TM?: JoTm[]
  }
}

/**
 * Représente un lien vers un texte au sein d'un Journal Officiel.
 * Correspond à l'élément `LIEN_TXT` dans `jorf_conteneur.dtd`.
 * Commentaire DTD : "Lien vers le texte du JO".
 */
export interface JoLienTxt {
  /** Identifiant du texte lié. Provient de l'attribut `idtxt`. */
  "@idtxt": string
  /** Titre du texte lié. Provient de l'attribut `titretxt`. */
  "@titretxt"?: string
}

/** Nature d'un document `Jo`, typiquement "JO". */
export type JoNature = (typeof allJoNatures)[number]

/** Origine d'un document `Jo`, typiquement "JORF". */
export type JoOrigine = (typeof allJoOrigines)[number]

/**
 * Représente un article publié au Journal Officiel (JORF).
 * Correspond à l'élément racine `ARTICLE` dans `jorf_article.dtd`.
 * Commentaire DTD : "Décrit toutes les informations relatives à un article JORF".
 */
export interface JorfArticle {
  /**
   * Contenu textuel principal de l'article.
   * Correspond à `BLOC_TEXTUEL` dans `jorf_article.dtd`, contenant un `CONTENU` HTML.
   * Commentaire DTD : "Contenu textuel".
   */
  BLOC_TEXTUEL?: {
    /** Contenu HTML de l'article. */
    CONTENU: string // HTML
  }
  /**
   * Contexte de l'article, référençant son texte parent.
   * Correspond à `CONTEXTE` dans `jorf_article.dtd`.
   * Commentaire DTD : "Rappel du contexte de l'article courant. Cite le texte parent et ses différentes versions."
   */
  CONTEXTE: {
    /**
     * Informations sur le texte parent.
     * Correspond à l'élément `TEXTE` dans `jorf_article.dtd`.
     * Commentaire DTD : "Rappel du texte parent et de ses différentes versions".
     */
    TEXTE: {
      /** Identifiant commun à toutes les versions du texte parent. Provient de l'attribut `cid`. */
      "@cid": string
      /** Date de publication du texte parent. Provient de l'attribut `date_publi`. */
      "@date_publi": string
      /** Date de signature du texte parent. Provient de l'attribut `date_signature`. */
      "@date_signature": string
      /** Nature du texte parent. Provient de l'attribut `nature`. */
      "@nature"?: JorfArticleTexteNature
      /** Identifiant NOR du texte parent. Provient de l'attribut `nor`. */
      "@nor"?: string
      /** Numéro du texte parent. Provient de l'attribut `num`. */
      "@num"?: string
      /** Numéro de parution au JO pour le texte parent. Provient de l'attribut `num_parution_jo`. */
      "@num_parution_jo"?: string
      /**
       * Titres des versions du texte parent.
       * Correspond aux éléments `TITRE_TXT` dans `jorf_article.dtd`.
       * Commentaire DTD : "Titre long du texte parent".
       */
      TITRE_TXT?: Array<{
        /** Contenu textuel du titre. */
        "#text"?: string
        /** Titre court de la version du texte. Provient de l'attribut `c_titre_court`. */
        "@c_titre_court"?: string
        /** Date de début de validité pour ce titre. Provient de l'attribut `debut`. */
        "@debut": string
        /** Date de fin de validité pour ce titre. Provient de l'attribut `fin`. */
        "@fin": string
        /** Identifiant interne de la version du texte. Provient de l'attribut `id_txt`. */
        "@id_txt": string
      }>
      /**
       * Hiérarchie de la table des matières pour le texte parent.
       * Correspond aux éléments `TM` imbriqués dans `jorf_article.dtd`.
       * Commentaire DTD : "Têtier parent".
       */
      TM?: JorfArticleTm
    }
  }
  /**
   * Métadonnées de l'article.
   * Correspond à `META` dans `jorf_article.dtd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à `META_COMMUN` (défini dans `meta_commun.dtd`).
     */
    META_COMMUN: {
      /** Ancien identifiant. Provient de `ANCIEN_ID`. */
      ANCIEN_ID?: string
      /** Alias de l'Identifiant Européen de la Législation (ELI). Provient de `ELI_ALIAS/ID_ELI_ALIAS`. */
      ELI_ALIAS?: {
        ID_ELI_ALIAS: string
      }
      /** Identifiant unique de l'article. Provient de `ID`. */
      ID: string
      /** Identifiant Européen de la Législation (ELI). Provient de `ID_ELI`. */
      ID_ELI?: string
      /** Nature du document (ex: "Article"). Provient de `NATURE`. */
      NATURE?: JorfArticleNature
      /** Origine du document (ex: "JORF"). Provient de `ORIGINE`. */
      ORIGINE: JorfArticleOrigine
      /** URL relative du document. Provient de `URL`. */
      URL: string
    }
    /**
     * Métadonnées spécifiques à l'article.
     * Correspond à `META_SPEC` dans `jorf_article.dtd`.
     */
    META_SPEC: {
      /**
       * Métadonnées spécifiques à l'article.
       * Correspond à `META_ARTICLE` dans `jorf_article.dtd`.
       * Commentaire DTD : "Metadonnees specifiques aux articles".
       */
      META_ARTICLE: JorfArticleMetaArticle
    }
  }
  /**
   * Versions de l'article. Les articles JORF sont typiquement versionnés s'ils sont modifiés par des textes LEGI ultérieurs.
   * Correspond à `VERSIONS` dans `jorf_article.dtd`.
   * Commentaire DTD : "Liste des versions de cet article. Les autres versions d'un texte JORF sont issu du fond LEGI".
   */
  VERSIONS: {
    /** Tableau d'éléments de version d'article. */
    VERSION: JorfArticleVersion[]
  }
  // L'élément SM (Résumé LEX) est présent dans jorf_article.dtd mais pas dans cette interface TS.
}

/**
 * Statut juridique d'une version d'article JORF.
 * Valeurs basées sur l'attribut `etat` de l'élément `VERSION` dans `jorf_article.dtd`.
 * Exemple de commentaire DTD : "@example ABROGE".
 */
export type JorfArticleEtat = (typeof allJorfArticleEtats)[number]

/** Origine de l'article lié par `JorfArticleVersion/LIEN_ART`. */
export type JorfArticleLienArticleOrigine =
  (typeof allJorfArticleLienArticleOrigines)[number]

/**
 * Représente les métadonnées spécifiques à un article JORF.
 * Correspond à `META_ARTICLE` dans `jorf_article.dtd`.
 */
export interface JorfArticleMetaArticle {
  /** Date d'entrée en vigueur de l'article. Provient de `DATE_DEBUT`. */
  DATE_DEBUT: string
  /** Date de fin de vigueur de l'article. Provient de `DATE_FIN`. */
  DATE_FIN: string
  /**
   * Mots-clés de l'article.
   * Correspond à `MCS_ART` et ses éléments `MC` ("Libellé du mot clé") dans `jorf_article.dtd`.
   */
  MCS_ART?: { MC: string[] }
  /** Numéro de l'article (ex: "2-4"). Provient de `NUM`. */
  NUM?: string
  /** Type de l'article. Provient de `TYPE`. Commentaire DTD : "@hidden liste de valeurs à préciser". */
  TYPE?: ArticleType
}

/** Nature d'un document `JorfArticle`, typiquement "Article". */
export type JorfArticleNature = (typeof allJorfArticleNatures)[number]

/** Origine d'un document `JorfArticle`, typiquement "JORF". */
export type JorfArticleOrigine = (typeof allJorfArticleOrigines)[number]

/** Nature du texte parent référencé dans `JorfArticle/CONTEXTE/TEXTE`. */
export type JorfArticleTexteNature = (typeof allJorfArticleTexteNatures)[number]

/**
 * Représente un niveau dans la table des matières (TM) contextuelle d'un article JORF.
 * Correspond à la structure récursive de l'élément `TM` dans `jorf_article.dtd`.
 */
export interface JorfArticleTm {
  /**
   * Titre de ce niveau de table des matières.
   * Correspond à l'élément `TITRE_TM`.
   * Commentaire DTD : "Libellé du têtier."
   */
  TITRE_TM: {
    /** Contenu textuel du titre de la TM. */
    "#text"?: string
    /** Date de début de validité pour ce niveau de TM. Provient de l'attribut `debut`. */
    "@debut": string
    /** Date de fin de validité pour ce niveau de TM. Provient de l'attribut `fin`. */
    "@fin": string
    /** Identifiant interne de ce niveau de TM. Provient de l'attribut `id`. */
    "@id": string
  }
  /** Niveau de table des matières imbriqué. */
  TM?: JorfArticleTm
}

/**
 * Représente une version spécifique d'un article JORF.
 * Correspond à l'élément `VERSION` au sein de `ARTICLE/VERSIONS` dans `jorf_article.dtd`.
 * Commentaire DTD : "Version de l'article."
 */
export interface JorfArticleVersion {
  /** Statut juridique de l'article dans cette version. Provient de l'attribut `etat`. */
  "@etat"?: JorfArticleEtat
  /**
   * Lien vers le contenu de l'article pour cette version.
   * Correspond à l'élément `LIEN_ART` (défini dans `lien_art.dtd`).
   */
  LIEN_ART: {
    /** Date de début de validité. Provient de l'attribut `debut`. */
    "@debut": string
    /** Statut juridique de la version d'article liée. Provient de l'attribut `etat`. */
    "@etat"?: JorfArticleEtat
    /** Date de fin de validité. Provient de l'attribut `fin`. */
    "@fin": string
    /** Identifiant du contenu de l'article lié. Provient de l'attribut `id`. */
    "@id": string
    /** Numéro de l'article lié. Provient de l'attribut `num`. */
    "@num"?: string
    /** Origine de l'article lié. Provient de l'attribut `origine`. */
    "@origine": JorfArticleLienArticleOrigine
  }
}

/** Balises représentant différentes catégories ou types de documents/structures JORF. */
export type JorfCategorieTag = (typeof allJorfCategoriesTags)[number]

/**
 * Représente les métadonnées spécifiques aux aspects chronologiques d'un texte JORF.
 * Correspond à l'élément racine `META_TEXTE_CHRONICLE` dans `meta_texte_chronicle.dtd`.
 * Note : `DERNIERE_MODIFICATION` et `VERSIONS_A_VENIR` du DTD générique ne sont typiquement pas utilisés pour les textes JORF.
 */
export interface JorfMetaTexteChronicle {
  /** Identifiant commun à toutes les versions du texte. Provient de `CID`. */
  CID: string
  /** Date de publication du texte. Provient de `DATE_PUBLI`. */
  DATE_PUBLI: string
  /** Date de signature du texte. Provient de `DATE_TEXTE`. */
  DATE_TEXTE: string
  /** Identifiant NOR du texte. Provient de `NOR`. */
  NOR?: string
  /** Numéro du texte. Provient de `NUM`. */
  NUM?: string
  /** Numéro de parution au JO. Provient de `NUM_PARUTION`. */
  NUM_PARUTION?: number
  /** Numéro de séquence dans le JO. Provient de `NUM_SEQUENCE`. */
  NUM_SEQUENCE?: number
  /** Origine de la publication (ex: titre du JO). Provient de `ORIGINE_PUBLI`. */
  ORIGINE_PUBLI?: string
  /** Page de début de la publication dans le JO. Provient de `PAGE_DEB_PUBLI`. */
  PAGE_DEB_PUBLI?: number
  /** Page de fin de la publication dans le JO. Provient de `PAGE_FIN_PUBLI`. */
  PAGE_FIN_PUBLI?: number
}

/**
 * Représente les métadonnées spécifiques à une version d'un texte JORF.
 * Correspond à l'élément `META_TEXTE_VERSION` dans `jorf_texte_version.dtd`.
 */
export interface JorfMetaTexteVersion {
  /** Autorité émettrice. Provient de `AUTORITE`. */
  AUTORITE?: string
  /** Date d'entrée en vigueur (non typiquement utilisé pour JORF). Provient de `DATE_DEBUT`. */
  DATE_DEBUT?: string
  /** Date de fin de vigueur (non typiquement utilisé pour JORF). Provient de `DATE_FIN`. */
  DATE_FIN?: string
  /**
   * Liens associés à cette version du texte.
   * Correspond à `LIENS` dans `jorf_texte_version.dtd`.
   */
  LIENS?: {
    /** Tableau d'éléments de lien. */
    LIEN: Array<JorfTexteVersionLien>
  }
  /**
   * Mots-clés du texte.
   * Correspond à `MCS_TXT` et ses éléments `MC` ("Mot clé du texte") dans `jorf_texte_version.dtd`.
   */
  MCS_TXT?: {
    /** Tableau de mots-clés (MC = Mot Clé). */
    MC: string[]
  }
  /** Ministère émetteur. Provient de `MINISTERE`. */
  MINISTERE?: string
  /** Titre court de la version du texte. Provient de `TITRE`. */
  TITRE?: string
  /** Titre complet de la version du texte. Provient de `TITREFULL`. */
  TITREFULL?: string
}

/**
 * Représente une "Section TA" (Titre/Article) dans un texte JORF, un niveau de sa table des matières.
 * Correspond à l'élément racine `SECTION_TA` dans `jorf_section_ta.dtd`.
 * Commentaire DTD : "Decrit le sommaire d'un texte en terme de têtier et d'article".
 */
export interface JorfSectionTa {
  /** Identifiant de la section. Provient de `ID`. */
  ID: string
  /** Commentaire associé à la section. Provient de `COMMENTAIRE`. */
  COMMENTAIRE?: string
  /**
   * Contexte de la section, référençant son texte JORF parent.
   * Correspond à `CONTEXTE` dans `jorf_section_ta.dtd`.
   * Commentaire DTD : "Contexte de la section. Rappelle la succession des sections parentes pour arriver à l'élément courant".
   */
  CONTEXTE: {
    /** Informations sur le texte JORF parent. */
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
      /** Titres des versions du texte parent. */
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court"?: string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      /** Hiérarchie de la table des matières pour le texte parent. */
      TM?: JorfSectionTaTm
    }
  }
  /** Titre de la section. Provient de `TITRE_TA`. */
  TITRE_TA?: string
  /**
   * Structure de cette section, liant vers des sous-sections ou des articles.
   * Correspond à `STRUCTURE_TA` dans `jorf_section_ta.dtd`.
   * Commentaire DTD : "Structure de la section. Présente la succession des sections filles et des articles de la section courante".
   */
  STRUCTURE_TA?: JorfSectionTaStructure
}

/**
 * Représente un lien d'une `JorfSectionTa` vers un article.
 * Les attributs sont basés sur `lien_art.dtd` utilisés dans `SECTION_TA/STRUCTURE_TA`.
 */
export interface JorfSectionTaLienArt {
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string
  /** Statut juridique. Provient de l'attribut `etat`. */
  "@etat"?: JorfSectionTaLienArtEtat
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string
  /** Identifiant de l'article lié. Provient de l'attribut `id`. */
  "@id": string
  /** Numéro de l'article lié. Provient de l'attribut `num`. */
  "@num"?: string
  /** Origine de l'article lié. Provient de l'attribut `origine`. */
  "@origine"?: JorfSectionTaLienArtOrigine
}

/** Statut juridique pour un `JorfSectionTaLienArt`. */
export type JorfSectionTaLienArtEtat =
  (typeof allJorfSectionTaLienArtEtats)[number]

/** Origine pour un `JorfSectionTaLienArt`. */
export type JorfSectionTaLienArtOrigine =
  (typeof allJorfSectionTaLienArtOrigines)[number]

/**
 * Représente un lien d'une `JorfSectionTa` vers une autre `JorfSectionTa` (sous-section).
 * Les attributs sont basés sur `lien_section_ta.dtd` utilisés dans `SECTION_TA/STRUCTURE_TA`.
 */
export interface JorfSectionTaLienSectionTa {
  /** Contenu textuel/titre de la section liée. */
  "#text"?: string
  /** CID de la section liée. Provient de l'attribut `cid`. */
  "@cid": string
  /** Date de début de validité. Provient de l'attribut `debut`. */
  "@debut": string
  // "@etat"?: JorfSectionTaLienSectionTaEtat // L'attribut Etat n'est généralement pas présent sur les LIEN_SECTION_TA dans les DTD JORF pour les sections.
  /** Date de fin de validité. Provient de l'attribut `fin`. */
  "@fin": string
  /** Identifiant de la section liée. Provient de l'attribut `id`. */
  "@id": string
  /** Niveau d'imbrication. Provient de l'attribut `niv`. */
  "@niv": number
  /** URL/chemin vers le fichier XML de la section liée. Provient de l'attribut `url`. */
  "@url": string
}

/** Statut juridique pour un `JorfSectionTaLienSectionTa`. (Généralement non applicable pour les sections JORF). */
export type JorfSectionTaLienSectionTaEtat =
  (typeof allJorfSectionTaLienSectionTaEtats)[number]

/**
 * Structure d'une `JorfSectionTa`, contenant des liens vers des articles ou des sous-sections.
 * Correspond à `STRUCTURE_TA` dans `jorf_section_ta.dtd`.
 */
export interface JorfSectionTaStructure {
  /** Tableau de liens vers des articles au sein de cette section. */
  LIEN_ART?: JorfSectionTaLienArt[]
  /** Tableau de liens vers des sous-sections (autres JorfSectionTa) au sein de cette section. */
  LIEN_SECTION_TA?: JorfSectionTaLienSectionTa[]
}

/** Nature du texte parent pour une `JorfSectionTa`. */
export type JorfSectionTaTexteNature =
  (typeof allJorfSectionTaTexteNatures)[number]

/**
 * Représente une structure de table des matières (TM) au sein d'une `JorfSectionTa`.
 * Similaire à `JorfArticleTm`.
 */
export interface JorfSectionTaTm {
  /** Titre de ce niveau de table des matières. */
  TITRE_TM: {
    /** Contenu textuel du titre de la TM. */
    "#text"?: string
    /** Date de début de validité. */
    "@debut": string
    /** Date de fin de validité. */
    "@fin": string
    /** Identifiant du niveau de TM. */
    "@id": string
  }
  /** Niveau de table des matières imbriqué. */
  TM?: JorfSectionTaTm
}

/**
 * Représente un texte JORF complet, combinant son aperçu structurel (`JorfTextelr`)
 * et le contenu d'une version spécifique (`JorfTexteVersion`).
 * Ceci est une fusion conceptuelle, pas un élément racine DTD direct.
 */
export type JorfTexte = JorfTexteVersion & {
  /**
   * Hiérarchie structurelle du texte (table des matières).
   * Provient de l'élément `STRUCT` dans `jorf_texte_struct.dtd`.
   */
  STRUCT?: JorfTextelrStructure
  /**
   * Liste des versions disponibles du texte.
   * Provient de l'élément `VERSIONS` dans `jorf_texte_struct.dtd`.
   */
  VERSIONS?: JorfTextelrVersions
}

/**
 * Représente l'aperçu structurel d'un texte JORF et de ses versions.
 * Correspond à l'élément racine `TEXTELR` dans `jorf_texte_struct.dtd`.
 * Commentaire DTD : "Décrit la structure d'un texte JORF et la liste des différentes versions de ce texte."
 */
export interface JorfTextelr {
  /** Métadonnées pour la structure du texte. */
  META: {
    /** Métadonnées communes, adaptées pour les textes JORF. */
    META_COMMUN: JorfTexteMetaCommun
    /** Métadonnées spécifiques pour la structure du texte. */
    META_SPEC: {
      /** Métadonnées chronologiques pour le texte. */
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
    }
  }
  /**
   * La hiérarchie structurelle (table des matières) du texte JORF.
   * Correspond à `STRUCT` dans `jorf_texte_struct.dtd`.
   * Commentaire DTD pour `STRUCT` dans `TEXTELR` : "Historique de la structure".
   */
  STRUCT?: JorfTextelrStructure
  /**
   * Liste des versions disponibles de ce texte JORF.
   * Correspond à `VERSIONS` dans `jorf_texte_struct.dtd`.
   * Commentaire DTD pour `VERSIONS` dans `TEXTELR` : "Liste des versions du texte".
   */
  VERSIONS: JorfTextelrVersions
}

/**
 * Statut juridique d'une version de texte JORF, telle que listée dans `JorfTextelrVersions`.
 * Provient de l'attribut `etat` de l'élément `VERSION` dans `jorf_texte_struct.dtd`.
 * Commentaire DTD : "Etat juridique de la version. Ce champ n'est pas renseigné pour JORF dont les textes sont toujours en version INITIALE".
 * Typiquement "INITIALE" ou similaire pour JORF si non modifié par LEGI.
 */
export type JorfTextelrEtat = (typeof allJorfTextelrEtats)[number]

/**
 * Représente un lien d'une `JorfTextelrStructure` vers un article.
 * Les attributs sont basés sur `lien_art.dtd` utilisés dans `TEXTELR/STRUCT`.
 */
export interface JorfTextelrLienArt {
  /** Date de début de validité. */
  "@debut": string
  /** Statut juridique. */
  "@etat"?: JorfTextelrLienArtEtat
  /** Date de fin de validité. */
  "@fin": string
  /** Identifiant de l'article lié. */
  "@id": string
  // "@nature"?: undefined // La nature est implicitement Article ici.
  /** Numéro de l'article lié. */
  "@num"?: string
  /** Origine de l'article lié. */
  "@origine"?: JorfTextelrLienArtOrigine
}

/** Statut juridique pour un `JorfTextelrLienArt`. */
export type JorfTextelrLienArtEtat = (typeof allJorfTextelrLienArtEtats)[number]

/** Nature pour un `JorfTextelrLienArt` (généralement non spécifiée, implicitement Article). */
export type JorfTextelrLienArtNature =
  (typeof allJorfTextelrLienArtNatures)[number]

/** Origine pour un `JorfTextelrLienArt`. */
export type JorfTextelrLienArtOrigine =
  (typeof allJorfTextelrLienArtOrigines)[number]

/**
 * Représente un lien d'une `JorfTextelrStructure` vers une `JorfSectionTa` (section).
 * Les attributs sont basés sur `lien_section_ta.dtd` utilisés dans `TEXTELR/STRUCT`.
 */
export interface JorfTextelrLienSectionTa {
  /** Titre de la section liée. */
  "#text"?: string
  /** CID de la section liée. */
  "@cid": string
  /** Date de début de validité. */
  "@debut": string
  // "@etat"?: undefined // L'état n'est typiquement pas présent sur les liens de section JORF.
  /** Date de fin de validité. */
  "@fin": string
  /** Identifiant de la section liée. */
  "@id": string
  /** Niveau d'imbrication de la section. */
  "@niv": number
  /** URL/chemin vers le fichier XML de la section liée. */
  "@url": string
}

/**
 * Représente la structure de premier niveau (table des matières) d'un document `JorfTextelr`.
 * Correspond à l'élément `STRUCT` dans `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrStructure {
  /** Tableau de liens vers des articles à ce niveau. */
  LIEN_ART?: JorfTextelrLienArt[]
  /** Tableau de liens vers des sections (JorfSectionTa) à ce niveau. */
  LIEN_SECTION_TA?: JorfTextelrLienSectionTa[]
}

/**
 * Représente une version spécifique d'un texte JORF, telle que listée dans `JorfTextelrVersions`.
 * Correspond à l'élément `VERSION` au sein de `TEXTELR/VERSIONS` dans `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrVersion {
  /** Statut juridique de cette version de texte. Provient de l'attribut `etat`. */
  "@etat"?: JorfTextelrEtat
  /**
   * Lien vers le contenu textuel réel de cette version.
   * Correspond à l'élément `LIEN_TXT` (défini dans `lien_txt.dtd`).
   */
  LIEN_TXT: {
    /** Date de début de validité. */
    "@debut": string
    /** Date de fin de validité. */
    "@fin": string
    /** Identifiant du document de version de texte lié (ex: un ID `JorfTexteVersion`). */
    "@id": string
    /** Numéro de la version du texte. */
    "@num"?: string
  }
}

/**
 * Conteneur pour la liste des versions d'un texte JORF dans un document `JorfTextelr`.
 * Correspond à l'élément `VERSIONS` dans `jorf_texte_struct.dtd`.
 */
export interface JorfTextelrVersions {
  /** Tableau d'éléments de version de texte. */
  VERSION: JorfTextelrVersion[]
}

/**
 * Représente les métadonnées communes pour les textes JORF, un profil spécifique de `meta_commun.dtd`.
 */
export interface JorfTexteMetaCommun {
  /** Ancien identifiant. Provient de `ANCIEN_ID`. */
  ANCIEN_ID?: string
  /** Alias de l'Identifiant Européen de la Législation (ELI). Provient de `ELI_ALIAS/ID_ELI_ALIAS`. */
  ELI_ALIAS?: {
    ID_ELI_ALIAS: string
  }
  /** Identifiant unique du document texte JORF. Provient de `ID`. */
  ID: string
  /** Identifiant Européen de la Législation (ELI). Provient de `ID_ELI`. */
  ID_ELI?: string
  /** Nature du document texte JORF. Provient de `NATURE`. */
  NATURE?: JorfTexteNature
  /** Origine du document (typiquement "JORF"). Provient de `ORIGINE`. */
  ORIGINE: JorfTexteOrigine
  /** URL relative du document texte JORF. Provient de `URL`. */
  URL: string
}

/** Nature d'un document `JorfTexteVersion` ou `JorfTextelr`. */
export type JorfTexteNature = (typeof allJorfTexteNatures)[number]

/** Origine d'un document `JorfTexteVersion` ou `JorfTextelr`, typiquement "JORF". */
export type JorfTexteOrigine = (typeof allJorfTexteOrigines)[number]

/**
 * Représente une version spécifique d'un texte JORF avec son contenu complet.
 * Correspond à l'élément racine `TEXTE_VERSION` dans `jorf_texte_version.dtd`.
 * Commentaire DTD : "Décrit les informations spécifiques à une version de texte JORF".
 */
export interface JorfTexteVersion {
  /**
   * Abrogations affectant cette version du texte (contenu HTML).
   * Correspond à `ABRO/CONTENU` dans `jorf_texte_version.dtd`.
   */
  ABRO?: {
    CONTENU: string // HTML
  }
  /**
   * Informations relatives aux entreprises, le cas échéant.
   * Correspond à l'élément `ENTREPRISE` dans `jorf_texte_version.dtd`.
   * Commentaire DTD : "Rubrique entreprise".
   */
  ENTREPRISE?: {
    /** Indique si le texte est relatif à une "entreprise". Provient de l'attribut `texte_entreprise`. */
    "@texte_entreprise": "non" | "oui"
    /**
     * Dates d'effet pour les aspects relatifs aux entreprises.
     * Correspond à `DATES_EFFET/DATE_EFFET` dans `jorf_texte_version.dtd`.
     */
    DATES_EFFET?: {
      DATE_EFFET: string[]
    }
    /**
     * Domaines pertinents pour les aspects relatifs aux entreprises.
     * Correspond à `DOMAINES/DOMAINE` dans `jorf_texte_version.dtd`.
     */
    DOMAINES?: {
      DOMAINE: string[]
    }
  }
  /** Métadonnées pour cette version de texte JORF. */
  META: {
    /** Métadonnées communes. */
    META_COMMUN: JorfTexteMetaCommun
    /** Métadonnées spécifiques. */
    META_SPEC: {
      /** Métadonnées chronologiques. */
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
      /** Métadonnées spécifiques à la version. */
      META_TEXTE_VERSION: JorfMetaTexteVersion
    }
  }
  /**
   * Notice associée à cette version du texte (contenu HTML).
   * Correspond à `NOTICE/CONTENU` dans `jorf_texte_version.dtd`.
   */
  NOTICE?: {
    CONTENU: string // HTML
  }
  /**
   * Rectifications à cette version du texte (contenu HTML).
   * Correspond à `RECT/CONTENU` dans `jorf_texte_version.dtd`.
   */
  RECT?: {
    CONTENU: string // HTML
  }
  /**
   * Signataires de cette version du texte (contenu HTML).
   * Correspond à `SIGNATAIRES/CONTENU` dans `jorf_texte_version.dtd`.
   */
  SIGNATAIRES?: {
    CONTENU: string // HTML
  }
  /**
   * Résumé (Résumé LEX) du texte (contenu HTML).
   * Correspond à `SM/CONTENU` dans `jorf_texte_version.dtd`.
   * Commentaire DTD : "Résumé LEX".
   */
  SM?: {
    CONTENU: string // HTML
  }
  /**
   * Travaux préparatoires pour cette version du texte (contenu HTML).
   * Correspond à `TP/CONTENU` dans `jorf_texte_version.dtd`.
   */
  TP?: {
    CONTENU: string // HTML
  }
  /**
   * Visas (références au préambule) pour cette version du texte (contenu HTML).
   * Correspond à `VISAS/CONTENU` dans `jorf_texte_version.dtd`.
   */
  VISAS?: {
    CONTENU: string // HTML
  }
}

/**
 * Représente un lien d'une `JorfTexteVersion` (via `JorfMetaTexteVersion/LIENS`) vers un autre document.
 * Les attributs sont basés sur `lien.dtd` utilisés dans `TEXTE_VERSION`.
 */
export interface JorfTexteVersionLien {
  /** Contenu textuel du lien, s'il existe. */
  "#text"?: string
  /** Identifiant interne du texte cible si interne. Provient de l'attribut `cidtexte`. */
  "@cidtexte"?: string // Present if and only if @id is present
  /** Date de signature du texte cible. Provient de l'attribut `datesignatexte`. */
  "@datesignatexte"?: string
  /** Identifiant de l'élément cible. Provient de l'attribut `id`. */
  "@id"?: string
  /** Nature du texte cible. Provient de l'attribut `naturetexte`. */
  "@naturetexte"?: JorfTexteVersionLienNature
  /** Identifiant NOR du texte cible. Provient de l'attribut `nortexte`. */
  "@nortexte"?: string
  /** Numéro du texte ou de l'élément cible. Provient de l'attribut `num`. */
  "@num"?: string
  /** (Obsolète?) Numéro du texte cible. Provient de l'attribut `numtexte`. */
  "@numtexte"?: string
  /** Sens du lien. Provient de l'attribut `sens`. */
  "@sens": Sens
  /** Type du lien. Provient de l'attribut `typelien`. */
  "@typelien": JorfTexteVersionLienType
}

/** Nature du texte lié par un `JorfTexteVersionLien`. */
export type JorfTexteVersionLienNature =
  (typeof allJorfTexteVersionLienNatures)[number]

/** Type de lien dans `JorfTexteVersionLien`. */
export type JorfTexteVersionLienType =
  (typeof allJorfTexteVersionLienTypes)[number]

/**
 * Représente un niveau de table des matières (TM - Têtier) au sein d'un Journal Officiel (`Jo` document).
 * Correspond à l'élément `TM` dans `jorf_conteneur.dtd`.
 * Commentaire DTD : "Têtier du sommaire. Peut contenir une liste de textes et d'autres têtiers".
 */
export interface JoTm {
  /** Niveau d'imbrication de cet élément TM. Provient de l'attribut `niv`. */
  "@niv": number
  /** Liens vers des textes à ce niveau de TM. */
  LIEN_TXT?: JoLienTxt[]
  /** Titre de ce niveau de TM. Provient de l'élément `TITRE_TM`. */
  TITRE_TM: string
  /** Niveaux de TM imbriqués. */
  TM?: JoTm[]
}

/** Valeurs possibles pour la nature d'un document `Jo`. */
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
  "ANNONCES",
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
  "Révision",
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
