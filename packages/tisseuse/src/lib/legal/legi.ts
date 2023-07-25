import type { Sens } from "./shared"

export interface LegiArticle {
  BLOC_TEXTUEL?: {
    CONTENU: string // HTML
  }
  CONTEXTE: {
    TEXTE: {
      "@autorite"?: string
      "@cid": string
      "@date_publi": string
      "@date_signature": string
      "@ministere"?: string
      "@nature"?: LegiArticleTexteNature
      "@nor"?: string
      "@num"?: string
      "@num_parution_jo"?: string
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court": string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      TM?: LegiArticleTm
    }
  }
  LIENS?: {
    LIEN: Array<{
      "#text"?: string
      "@cidtexte"?: string
      "@datesignatexte"?: string
      "@id"?: string
      "@naturetexte"?: LegiArticleLienNature
      "@nortexte"?: string
      "@num"?: string
      "@sens": Sens
      "@typelien": LegiArticleLienType
    }>
  }
  META: {
    META_COMMUN: {
      ANCIEN_ID?: string
      ID: string
      NATURE: LegiArticleNature
      ORIGINE: LegiArticleOrigine
      URL: string
    }
    META_SPEC: {
      META_ARTICLE: {
        DATE_DEBUT: string
        DATE_FIN: string
        ETAT?: LegiArticleEtat
        NUM?: string
        TYPE?: LegiArticleType
      }
    }
  }
  NOTA?: {
    CONTENU: string // HTML
  }
  VERSIONS: {
    VERSION: Array<{
      "@etat"?: LegiArticleEtat
      LIEN_ART: {
        "@debut": string
        "@etat"?: LegiArticleEtat
        "@fin": string
        "@id": string
        "@num"?: string
        "@origine": LegiArticleOrigine
      }
    }>
  }
}

export type LegiArticleEtat = (typeof allLegiArticleEtats)[number]

export type LegiArticleLienArticleOrigine =
  (typeof allLegiArticleLienArticleOrigines)[number]

export type LegiArticleLienNature = (typeof allLegiArticleLienNatures)[number]

export type LegiArticleLienType = (typeof allLegiArticleLienTypes)[number]

export type LegiArticleNature = (typeof allLegiArticleNatures)[number]

export type LegiArticleOrigine = (typeof allLegiArticleOrigines)[number]

export type LegiArticleTexteNature = (typeof allLegiArticleTexteNatures)[number]

/// Table des matières (TM)
export interface LegiArticleTm {
  TITRE_TM: {
    "#text": string
    "@debut": string
    "@fin": string
    "@id": string
  }
  TM?: LegiArticleTm
}

export type LegiArticleType = (typeof allLegiArticleTypes)[number]

export interface LegiSectionTa {
  COMMENTAIRE?: string
  CONTEXTE: {
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
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court"?: string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      TM?: LegiSectionTaTm[]
    }
  }
  ID: string
  STRUCTURE_TA?: Array<{
    LIEN_ART?: Array<{
      "@debut": string
      "@etat"?: LegiSectionTaLienArtEtat
      "@fin": string
      "@id": string
      "@num"?: string
      "@origine": LegiSectionTaLienArtOrigine
    }>
    LIEN_SECTION_TA?: Array<{
      "#text"?: string
      "@cid": string
      "@debut": string
      "@etat"?: LegiSectionTaLienSectionTaEtat
      "@fin": string
      "@id": string
      "@niv": number
      "@url": string
    }>
  }>
  TITRE_TA?: string
}

export type LegiSectionTaLienArtEtat =
  (typeof allLegiSectionTaLienArtEtats)[number]

export type LegiSectionTaLienArtOrigine =
  (typeof allLegiSectionTaLienArtOrigines)[number]

export type LegiSectionTaLienSectionTaEtat =
  (typeof allLegiSectionTaLienSectionTaEtats)[number]

export type LegiSectionTaTexteNature =
  (typeof allLegiSectionTaTexteNatures)[number]

interface LegiSectionTaTm {
  TITRE_TM: {
    "#text"?: string
    "@debut": string
    "@fin": string
    "@id": string
  }
  TM?: LegiSectionTaTm
}

export interface LegiTextelr {
  META: {
    META_COMMUN: {
      ANCIEN_ID?: string
      ID: string
      NATURE?: LegiTextelrNature
      ORIGINE: LegiTextelrOrigine
      URL: string
    }
    META_SPEC: {
      META_TEXTE_CHRONICLE: {
        CID: string
        DATE_PUBLI: string
        DATE_TEXTE: string
        DERNIERE_MODIFICATION: string
        NOR?: string
        NUM?: string
        NUM_PARUTION?: number
        NUM_SEQUENCE?: number
        ORIGINE_PUBLI?: string
        PAGE_DEB_PUBLI?: number
        PAGE_FIN_PUBLI?: number
        VERSIONS_A_VENIR?: {
          VERSION_A_VENIR: string[]
        }
      }
    }
  }
  STRUCT?: {
    LIEN_ART?: Array<{
      "@debut": string
      "@etat"?: LegiTextelrLienArtEtat
      "@fin": string
      "@id": string
      // "@nature"?: undefined
      "@num"?: string
      "@origine": LegiTextelrLienArtOrigine
    }>
    LIEN_SECTION_TA?: Array<{
      "#text": string
      "@cid": string
      "@debut": string
      "@etat"?: LegiTextelrLienSectionTaEtat
      "@fin": string
      "@id": string
      "@niv": number
      "@url": string
    }>
  }
  VERSIONS: {
    VERSION: Array<{
      "@etat"?: LegiTextelrEtat
      LIEN_TXT: {
        "@debut": string
        "@fin": string
        "@id": string
        "@num"?: string
      }
    }>
  }
}

export type LegiTextelrEtat = (typeof allLegiTextelrEtats)[number]

export type LegiTextelrLienArtEtat = (typeof allLegiTextelrLienArtEtats)[number]

export type LegiTextelrLienArtOrigine =
  (typeof allLegiTextelrLienArtOrigines)[number]

export type LegiTextelrLienSectionTaEtat =
  (typeof allLegiTextelrLienSectionTaEtats)[number]

export type LegiTextelrNature = (typeof allLegiTextelrNatures)[number]

export type LegiTextelrOrigine = (typeof allLegiTextelrOrigines)[number]

export interface LegiTexteVersion {
  ABRO?: {
    CONTENU: string // HTML
  }
  META: {
    META_COMMUN: {
      ANCIEN_ID?: string
      ELI_ALIAS?: {
        ID_ELI_ALIAS: string
      }
      ID: string
      ID_ELI?: string
      NATURE?: LegiTexteVersionNature
      ORIGINE: LegiTexteVersionOrigine
      URL: string
    }
    META_SPEC: {
      META_TEXTE_CHRONICLE: {
        CID: string
        DATE_PUBLI: string
        DATE_TEXTE: string
        DERNIERE_MODIFICATION: string
        NOR?: string
        NUM?: string
        NUM_PARUTION?: number
        NUM_SEQUENCE?: number
        ORIGINE_PUBLI?: string
        PAGE_DEB_PUBLI?: number
        PAGE_FIN_PUBLI?: number
        VERSIONS_A_VENIR?: {
          VERSION_A_VENIR: string[]
        }
      }
      META_TEXTE_VERSION: {
        AUTORITE?: string
        DATE_DEBUT?: string
        DATE_FIN?: string
        ETAT?: LegiTexteVersionEtat
        LIENS?: {
          LIEN: Array<{
            "#text"?: string
            "@cidtexte"?: string
            "@datesignatexte"?: string
            "@id"?: string
            "@naturetexte"?: LegiTexteVersionLienNature
            "@num"?: string
            "@nortexte"?: string
            "@numtexte"?: string
            "@sens": Sens
            "@typelien": LegiTexteVersionLienType
          }>
        }
        MCS_TXT?: {
          MC: string[]
        }
        MINISTERE?: string
        TITRE?: string
        TITREFULL: string
      }
    }
  }
  NOTA?: {
    CONTENU: string // HTML
  }
  RECT?: {
    CONTENU: string // HTML
  }
  SIGNATAIRES?: {
    CONTENU: string // HTML
  }
  TP?: {
    CONTENU: string // HTML
  }
  VISAS?: {
    CONTENU: string // HTML
  }
}

export type LegiTexteVersionEtat = (typeof allLegiTexteVersionEtats)[number]

export type LegiTexteVersionLienNature =
  (typeof allLegiTexteVersionLienNatures)[number]

export type LegiTexteVersionLienType =
  (typeof allLegiTexteVersionLienTypes)[number]

export type LegiTexteVersionNature = (typeof allLegiTexteVersionNatures)[number]

export type LegiTexteVersionOrigine =
  (typeof allLegiTexteVersionOrigines)[number]

export const allLegiArticleEtats = [
  "ABROGE_DIFF", // 16233
  "ABROGE", // 341353
  "ANNULE", // 1955
  "DEPLACE", // 1
  "DISJOINT", // 87
  "MODIFIE_MORT_NE", // 6929
  "MODIFIE", // 429664
  "PERIME", // 19628
  "TRANSFERE", // 14757
  "VIGUEUR_DIFF", // 14629
  "VIGUEUR", // 619477
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

export const allLegiArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
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

export const allLegiTextelrEtats = [
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

export const allLegiTextelrNatures = [
  "ACCORD_FONCTION_PUBLIQUE", // 4
  "ARRETE", // 77686
  "AVIS", // 12
  "CODE", // 114
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

export const allLegiTextelrOrigines = ["LEGI"] as const

export const allLegiTexteVersionEtats = [
  "ABROGE_DIFF", // 1712
  "ABROGE", // 23360
  "ANNULE", // 205
  "MODIFIE_MORT_NE", // 36
  "MODIFIE", // 3833
  "PERIME", // 3601
  "VIGUEUR_DIFF", // 2073
  "VIGUEUR", // 101189
] as const

export const allLegiTexteVersionLienNatures = [
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
  "CODIFICATION", // 10433
  "CONCORDANCE", // 79
  "CONCORDE", // 9
  "CREATION", // 1711
  "HISTO", // 22
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

export const allLegiTexteVersionNatures = [
  "ACCORD_FONCTION_PUBLIQUE", // 4
  "ARRETE", // 77680
  "AVIS", // 12
  "CODE", // 114
  "CONSTITUTION", // 3
  "CONVENTION", // 1
  "DECISION", // 12
  "DECLARATION", // 1
  "DECRET_LOI", // 35
  "DECRET", // 53030
  "DELIBERATION", // 11
  "LOI_CONSTIT", // 19
  "LOI_ORGANIQUE", // 111
  "LOI", // 3457
  "ORDONNANCE", // 1520
] as const

export const allLegiTexteVersionOrigines = ["LEGI"] as const
