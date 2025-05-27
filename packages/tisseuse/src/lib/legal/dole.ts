/**
 * Représente un lien au sein de la structure hiérarchique (arborescence) d'un dossier législatif.
 * Correspond à l'élément `LIEN` dans `dole_dossier.xsd`.
 */
export interface ArborescenceLien {
  /** Contenu textuel du lien. */
  "#text"?: string
  /** Identifiant du lien. Provient de l'attribut `@id` dans le XSD. */
  "@id": string
  /** Libellé du lien. Provient de l'attribut `@libelle` dans le XSD. */
  "@libelle"?: string
  /** URL du lien. Provient de l'attribut `@lien` dans le XSD. */
  "@lien"?: string
}

/**
 * Représente un niveau (nœud) dans la structure hiérarchique (arborescence) d'un dossier législatif.
 * Correspond à l'élément `NIVEAU` dans `dole_dossier.xsd`.
 */
export interface ArborescenceNiveau {
  /** Identifiant du niveau. Provient de l'attribut `@id` dans le XSD. */
  "@id": string
  /** Libellé du niveau. Provient de l'attribut `@libelle` dans le XSD. */
  "@libelle": string
  /** Tableau de liens (`ArborescenceLien`) présents dans ce niveau. */
  LIEN?: ArborescenceLien[]
  /** Niveau imbriqué. Note : Le XSD autorise plusieurs `NIVEAU` imbriqués, l'interface TS n'en modélise actuellement qu'un. */
  NIVEAU?: ArborescenceNiveau
}

/**
 * Représente un dossier législatif.
 * Ceci est la structure racine, correspondant à l'élément `DOSSIER_LEGISLATIF` dans `dole_dossier.xsd`.
 * Le XSD le décrit comme : "Décrit un dossier legislatif".
 */
export interface DossierLegislatif {
  /**
   * Contenu principal du dossier législatif.
   * Correspond à l'élément `CONTENU` dans `dole_dossier.xsd`.
   */
  CONTENU: {
    /**
     * Structure hiérarchique (arborescence) du dossier, souvent utilisée pour la navigation.
     * Correspond à l'élément `ARBORESCENCE` dans `dole_dossier.xsd`.
     */
    ARBORESCENCE: {
      /** Liens (`ArborescenceLien`) à la racine de l'arborescence. */
      LIEN?: ArborescenceLien[]
      /** Niveaux (`ArborescenceNiveau`) à la racine de l'arborescence. */
      NIVEAU?: ArborescenceNiveau
    }
    /** Contenu relatif au dossier (champ 1). Correspond à `CONTENU_DOSSIER_1` (xs:anyType) dans le XSD. */
    CONTENU_DOSSIER_1?: string
    /** Contenu relatif au dossier (champ 2). Correspond à `CONTENU_DOSSIER_2` (xs:anyType) dans le XSD. */
    CONTENU_DOSSIER_2?: string
    /** Contenu relatif au dossier (champ 3). Correspond à `CONTENU_DOSSIER_3` (xs:anyType) dans le XSD. */
    CONTENU_DOSSIER_3?: string
    /** Contenu relatif au dossier (champ 4). Correspond à `CONTENU_DOSSIER_4` (xs:anyType) dans le XSD. */
    CONTENU_DOSSIER_4?: string
    /** Contenu relatif au dossier (champ 5). Correspond à `CONTENU_DOSSIER_5` (xs:anyType) dans le XSD. */
    CONTENU_DOSSIER_5?: string
    /**
     * Échéancier associé au dossier législatif.
     * Correspond à l'élément `ECHEANCIER` dans `dole_dossier.xsd`.
     */
    ECHEANCIER?: Echeancier
    /** Exposé des motifs ou résumé. Correspond à `EXPOSE_MOTIF` (xs:anyType) dans le XSD. */
    EXPOSE_MOTIF?: string
    /** Libellé du texte lié 1. Correspond à `LIBELLE_TEXTE_1` dans le XSD. */
    LIBELLE_TEXTE_1?: string
    /** Libellé du texte lié 2. Correspond à `LIBELLE_TEXTE_2` dans le XSD. */
    LIBELLE_TEXTE_2?: string
    /** Libellé du texte lié 3. Correspond à `LIBELLE_TEXTE_3` dans le XSD. */
    LIBELLE_TEXTE_3?: string
    /** Libellé du texte lié 4. Correspond à `LIBELLE_TEXTE_4` dans le XSD. */
    LIBELLE_TEXTE_4?: string
    /** Libellé du texte lié 5. Correspond à `LIBELLE_TEXTE_5` dans le XSD. */
    LIBELLE_TEXTE_5?: string
  }
  /**
   * Métadonnées associées au dossier législatif.
   * Correspond à l'élément `META` dans `dole_dossier.xsd`.
   */
  META: {
    /**
     * Éléments de métadonnées communs.
     * Correspond à l'élément `META_COMMUN` dans `dole_dossier.xsd`.
     */
    META_COMMUN: {
      // MetaCommun
      /** Ancien identifiant, s'il existe. Correspond à `ANCIEN_ID` dans le XSD. */
      ANCIEN_ID?: string
      /** Identifiant unique du dossier. Correspond à `ID` dans le XSD. */
      ID: string
      /** URL du dossier législatif. Correspond à `URL` dans le XSD. */
      URL: string
      // NATURE?: Nature // Jamais utilisé. Le XSD définit `NATURE` comme la nature du document.
      /**
       * Origine des données (ex: "JORF" pour Journal Officiel).
       * Correspond à `ORIGINE` dans le XSD.
       */
      ORIGINE: "JORF" // Origine
    }
    /**
     * Métadonnées spécifiques au dossier législatif.
     * Correspond à l'élément `META_DOSSIER_LEGISLATIF` dans `dole_dossier.xsd`.
     */
    META_DOSSIER_LEGISLATIF: {
      /** Date de création du dossier (YYYY-MM-DD). Correspond à `DATE_CREATION` dans le XSD. */
      DATE_CREATION: string
      /** Date de dernière modification du dossier (YYYY-MM-DD). Correspond à `DATE_DERNIERE_MODIFICATION` dans le XSD. */
      DATE_DERNIERE_MODIFICATION: string
      /** Identifiant du texte lié 1. Correspond à `ID_TEXTE_1` dans le XSD. Commence toujours par JORFTEXT si présent. */
      ID_TEXTE_1?: string // Always starts with JORFTEXT when present
      /** Identifiant du texte lié 2. Correspond à `ID_TEXTE_2` dans le XSD. Commence toujours par JORFTEXT si présent. */
      ID_TEXTE_2?: string // Always starts with JORFTEXT when present
      /** Identifiant du texte lié 3. Correspond à `ID_TEXTE_3` dans le XSD. Commence toujours par JORFTEXT si présent. */
      ID_TEXTE_3?: string // Always starts with JORFTEXT when present
      /** Identifiant du texte lié 4. Correspond à `ID_TEXTE_4` dans le XSD. Commence toujours par JORFTEXT si présent. */
      ID_TEXTE_4?: string // Always starts with JORFTEXT when present
      /** Identifiant du texte lié 5. Correspond à `ID_TEXTE_5` dans le XSD. Commence toujours par JORFTEXT si présent. */
      ID_TEXTE_5?: string // Always starts with JORFTEXT when present
      /**
       * Informations sur la législature.
       * Correspond à l'élément `LEGISLATURE` dans `dole_dossier.xsd`.
       */
      LEGISLATURE?: {
        /** Date de début de la législature (YYYY-MM-DD). Correspond à `DATE_DEBUT` dans le XSD. */
        DATE_DEBUT: string
        /** Date de fin de la législature (YYYY-MM-DD). Correspond à `DATE_FIN` dans le XSD. */
        DATE_FIN: string
        /** Libellé ou nom de la législature. Correspond à `LIBELLE` dans le XSD. */
        LIBELLE: string
        /** Numéro de la législature. Correspond à `NUMERO` (xs:string) dans le XSD. */
        NUMERO: number
      }
      /** Titre du dossier législatif. Correspond à `TITRE` dans le XSD. */
      TITRE: string
      /** Type du dossier législatif. Correspond à `TYPE` (xs:string) dans le XSD. */
      TYPE?: DossierLegislatifType
    }
  }
}

/**
 * Définit les types possibles pour un dossier législatif.
 * Ces valeurs sont basées sur les données observées et assurent la sécurité des types.
 * Le XSD définit le champ `TYPE` dans `META_DOSSIER_LEGISLATIF` comme `xs:string`.
 */
export type DossierLegislatifType = (typeof allDossierLegislatifTypes)[number]

/**
 * Représente un échéancier au sein d'un dossier législatif.
 * Correspond à l'élément `ECHEANCIER` dans `dole_dossier.xsd`.
 */
export interface Echeancier {
  /**
   * Date de dernière mise à jour de l'échéancier (YYYY-MM-DD).
   * Provient de l'attribut `@derniere_maj` dans le XSD.
   */
  "@derniere_maj"?: string
  /**
   * Tableau de lignes ou d'éléments de l'échéancier.
   * Correspond à un ou plusieurs éléments `LIGNE` dans le XSD.
   */
  LIGNE: EcheancierLigne[]
}

/**
 * Représente une seule ligne ou un élément au sein de l'échéancier.
 * Correspond à l'élément `LIGNE` dans `dole_dossier.xsd`.
 */
export interface EcheancierLigne {
  /** Référence de l'article. Correspond à `ARTICLE` dans le XSD. */
  ARTICLE?: string
  /** Base légale. Correspond à `BASE_LEGALE` dans le XSD. */
  BASE_LEGALE?: string
  /** Identifiant de la loi cible. Correspond à `CID_LOI_CIBLE` dans le XSD. Toujours un ID JORFTEXT. */
  CID_LOI_CIBLE?: string // Always a JORFTEXT ID
  /** Date prévue (YYYY-MM-DD). Correspond à `DATE_PREVUE` dans le XSD. */
  DATE_PREVUE?: string
  /** Référence au décret. Correspond à `DECRET` dans le XSD. */
  DECRET?: string
  /**
   * Lien(s) vers l'article.
   * Correspond à l'élément `LIEN_ARTICLE` dans le XSD.
   */
  LIEN_ARTICLE?: Array<{
    /** Identifiant de l'article lié. Provient de l'attribut `@id` dans le XSD. Toujours un ID JORFARTI. */
    "@id": string // Always a JORFARTI ID
    /** Contenu textuel du lien. */
    "#text": string
  }>
  /** Numéro d'ordre de l'élément de l'échéancier. Correspond à `NUMERO_ORDRE` dans le XSD. */
  NUMERO_ORDRE?: string
  /** Objet ou sujet de l'élément de l'échéancier. Correspond à `OBJET` dans le XSD. */
  OBJET?: string
}

/**
 * Définit les types connus de dossiers législatifs.
 * Cette liste est utilisée pour créer le type `DossierLegislatifType`.
 */
export const allDossierLegislatifTypes = [
  "LOI_PUBLIEE",
  "PROJET_LOI",
  "PROJET_ORDONNANCE",
  "PROPOSITION_LOI",
  "ORDONNANCE_PUBLIEE",
] as const
