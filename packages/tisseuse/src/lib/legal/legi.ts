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
      "@sens": LegiArticleLienSens
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

export type LegiArticleLienSens = (typeof allLegiArticleLienSens)[number]

export type LegiArticleLienType = (typeof allLegiArticleLienTypes)[number]

export type LegiArticleNature = (typeof allLegiArticleNatures)[number]

export type LegiArticleOrigine = (typeof allLegiArticleOrigines)[number]

export type LegiArticleTexteNature = (typeof allLegiArticleTexteNatures)[number]

export type LegiArticleType = (typeof allLegiArticleTypes)[number]

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

export const allLegiArticleEtats = [
  "ABROGE_DIFF", // 16233
  "ABROGE", // 341353
  "ANNULE", // 1955
  "DISJOINT", // 87
  "MODIFIE_MORT_NE", // 6929
  "MODIFIE", // 429664
  "PERIME", // 19628
  "TRANSFERE", // 14757
  "VIGUEUR_DIFF", // 14629
  "VIGUEUR", // 619477
] as const
export const allLegiArticleEtatsMutable = [...allLegiArticleEtats]

export const allLegiArticleLienArticleOrigines = ["JORF", "LEGI"] as const
export const allLegiArticleLienArticleOriginesMutable = [
  ...allLegiArticleLienArticleOrigines,
]

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
export const allLegiArticleLienNaturesMutable = [...allLegiArticleLienNatures]

export const allLegiArticleLienSens = ["cible", "source"] as const
export const allLegiArticleLienSensMutable = [...allLegiArticleLienSens]

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
export const allLegiArticleLienTypesMutable = [...allLegiArticleLienTypes]

export const allLegiArticleNatures = ["Article"] as const
export const allLegiArticleNaturesMutable = [...allLegiArticleNatures]

export const allLegiArticleOrigines = ["LEGI"] as const
export const allLegiArticleOriginesMutable = [...allLegiArticleOrigines]

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
export const allLegiArticleTexteNaturesMutable = [...allLegiArticleTexteNatures]

export const allLegiArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
] as const
export const allLegiArticleTypesMutable = [...allLegiArticleTypes]
