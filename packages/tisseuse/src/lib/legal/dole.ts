export interface ArborescenceLien {
  "#text"?: string
  "@id": string
  "@libelle"?: string
  "@lien"?: string
}

export interface ArborescenceNiveau {
  "@id": string
  "@libelle": string
  LIEN?: ArborescenceLien[]
  NIVEAU?: ArborescenceNiveau
}

export interface DossierLegislatif {
  CONTENU: {
    ARBORESCENCE: {
      LIEN?: ArborescenceLien[]
      NIVEAU?: ArborescenceNiveau
    }
    CONTENU_DOSSIER_1?: string
    CONTENU_DOSSIER_2?: string
    CONTENU_DOSSIER_3?: string
    CONTENU_DOSSIER_4?: string
    CONTENU_DOSSIER_5?: string
    ECHEANCIER?: Echeancier
    EXPOSE_MOTIF?: string
    LIBELLE_TEXTE_1?: string
    LIBELLE_TEXTE_2?: string
    LIBELLE_TEXTE_3?: string
    LIBELLE_TEXTE_4?: string
    LIBELLE_TEXTE_5?: string
  }
  META: {
    META_COMMUN: {
      // MetaCommun
      ANCIEN_ID?: string
      ID: string
      URL: string
      // NATURE?: Nature // Never used
      ORIGINE: "JORF" // Origine
    }
    META_DOSSIER_LEGISLATIF: {
      DATE_CREATION: string
      DATE_DERNIERE_MODIFICATION: string
      ID_TEXTE_1?: string // Always starts with JORFTEXT when present
      ID_TEXTE_2?: string // Always starts with JORFTEXT when present
      ID_TEXTE_3?: string // Always starts with JORFTEXT when present
      ID_TEXTE_4?: string // Always starts with JORFTEXT when present
      ID_TEXTE_5?: string // Always starts with JORFTEXT when present
      LEGISLATURE?: {
        DATE_DEBUT: string
        DATE_FIN: string
        LIBELLE: string
        NUMERO: number
      }
      TITRE: string
      TYPE?: DossierLegislatifType
    }
  }
}

export type DossierLegislatifType = (typeof allDossierLegislatifTypes)[number]

export interface Echeancier {
  "@derniere_maj"?: string
  LIGNE: EcheancierLigne[]
}

export interface EcheancierLigne {
  ARTICLE?: string
  BASE_LEGALE?: string
  CID_LOI_CIBLE?: string // Always a JORFTEXT ID
  DATE_PREVUE?: string
  DECRET?: string
  LIEN_ARTICLE?: Array<{
    "@id": string // Always a JORFARTI ID
    "#text": string
  }>
  NUMERO_ORDRE?: string
  OBJET?: string
}

export const allDossierLegislatifTypes = [
  "LOI_PUBLIEE",
  "PROJET_LOI",
  "PROJET_ORDONNANCE",
  "PROPOSITION_LOI",
  "ORDONNANCE_PUBLIEE",
] as const
