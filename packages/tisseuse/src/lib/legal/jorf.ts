export interface Jo {
  META: {
    META_COMMUN: {
      ID: string
      ID_ELI?: string
      NATURE: JoNature
      ORIGINE: JoOrigine
      URL: string
    }
    META_SPEC: {
      META_CONTENEUR: {
        DATE_PUBLI: string
        NUM?: string
        TITRE: string
      }
    }
  }
  STRUCTURE_TXT?: {
    LIEN_TXT?: JoLienTxt[]
    TM?: JoTm[]
  }
}

export interface JoLienTxt {
  "@idtxt": string
  "@titretxt": string
}

export type JoNature = (typeof allJoNatures)[number]

export type JoOrigine = (typeof allJoOrigines)[number]

export interface JorfArticle {
  BLOC_TEXTUEL?: {
    CONTENU: string // HTML
  }
  CONTEXTE: {
    TEXTE: {
      "@cid": string
      "@date_publi": string
      "@date_signature": string
      "@nature"?: JorfArticleTexteNature
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
      TM?: JorfArticleTm
    }
  }
  META: {
    META_COMMUN: {
      ANCIEN_ID?: string
      ELI_ALIAS?: {
        ID_ELI_ALIAS: string
      }
      ID: string
      ID_ELI?: string
      NATURE?: JorfArticleNature
      ORIGINE: JorfArticleOrigine
      URL: string
    }
    META_SPEC: {
      META_ARTICLE: {
        DATE_DEBUT: string
        DATE_FIN: string
        /// Mots-clés
        MCS_ART?: { MC: string[] }
        NUM?: string
        TYPE?: JorfArticleType
      }
    }
  }
  VERSIONS: {
    VERSION: Array<{
      "@etat"?: JorfArticleEtat
      LIEN_ART: {
        "@debut": string
        "@etat"?: JorfArticleEtat
        "@fin": string
        "@id": string
        "@num"?: string
        "@origine": JorfArticleLienArticleOrigine
      }
    }>
  }
}

export type JorfArticleEtat = (typeof allJorfArticleEtats)[number]

export type JorfArticleLienArticleOrigine =
  (typeof allJorfArticleLienArticleOrigines)[number]

export type JorfArticleNature = (typeof allJorfArticleNatures)[number]

export type JorfArticleOrigine = (typeof allJorfArticleOrigines)[number]

export type JorfArticleTexteNature = (typeof allJorfArticleTexteNatures)[number]

/// Table des matières (TM) d'un article de Journal officiel
export interface JorfArticleTm {
  TITRE_TM: {
    "#text"?: string
    "@debut": string
    "@fin": string
    "@id": string
  }
  TM?: JorfArticleTm
}

export type JorfArticleType = (typeof allJorfArticleTypes)[number]

export interface JorfSectionTa {
  COMMENTAIRE?: string
  CONTEXTE: {
    ID: string
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
      TITRE_TXT: Array<{
        "#text": string
        "@c_titre_court"?: string
        "@debut": string
        "@fin": string
        "@id_txt": string
      }>
      TM?: JorfSectionTaTm[]
    }
  }
  TITRE_TA?: string
  STRUCTURE_TA?: Array<{
    LIEN_ART?: Array<{
      "@debut": string
      "@etat"?: JorfSectionTaLienArtEtat
      "@fin": string
      "@id": string
      "@num"?: string
      "@origine"?: JorfSectionTaLienArtOrigine
    }>
    LIEN_SECTION_TA?: Array<{
      "#text"?: string
      "@cid": string
      "@debut": string
      // "@etat"?: JorfSectionTaLienSectionTaEtat
      "@fin": string
      "@id": string
      "@niv": number
      "@url": string
    }>
  }>
}

export type JorfSectionTaLienArtEtat =
  (typeof allJorfSectionTaLienArtEtats)[number]

export type JorfSectionTaLienArtOrigine =
  (typeof allJorfSectionTaLienArtOrigines)[number]

export type JorfSectionTaLienSectionTaEtat =
  (typeof allJorfSectionTaLienSectionTaEtats)[number]

export type JorfSectionTaTexteNature =
  (typeof allJorfSectionTaTexteNatures)[number]

interface JorfSectionTaTm {
  TITRE_TM: {
    "#text"?: string
    "@debut": string
    "@fin": string
    "@id": string
  }
  TM?: JorfSectionTaTm
}

/// Table des matières (TM) d'un Journal officiel
export interface JoTm {
  "@niv": number
  LIEN_TXT?: JoLienTxt[]
  TITRE_TM: string
  TM?: JoTm[]
}

export const allJoNatures = ["JO"] as const
export const allJoNaturesMutable = [...allJoNatures]

export const allJoOrigines = ["JORF"] as const
export const allJoOriginesMutable = [...allJoOrigines]

export const allJorfArticleEtats = [
  "ABROGE",
  "ABROGE_DIFF",
  "ANNULE",
  "MODIFIE",
  "MODIFIE_MORT_NE",
  "PERIME",
  "TRANSFERE",
  "VIGUEUR",
  "VIGUEUR_DIFF",
] as const
export const allJorfArticleEtatsMutable = [...allJorfArticleEtats]

export const allJorfArticleLienArticleOrigines = ["JORF", "LEGI"] as const
export const allJorfArticleLienArticleOriginesMutable = [
  ...allJorfArticleLienArticleOrigines,
]

export const allJorfArticleNatures = ["Article"] as const
export const allJorfArticleNaturesMutable = [...allJorfArticleNatures]

export const allJorfArticleOrigines = ["JORF"] as const
export const allJorfArticleOriginesMutable = [...allJorfArticleOrigines]

export const allJorfArticleTexteNatures = [
  "ABROGATION", // 10
  "Accord multilatéral", // 3
  "ACCORD_FONCTION_PUBLIQUE", //
  "ACCORD", // 153
  "ADDITIF", // 139
  "ANNEXE", // 2
  "ANNONCES", // 755
  "ARRANGEMENT", // 1
  "ARRET", // 23
  "ARRETE", // 1228598
  "ATTESTATION", // 1
  "AVENANT", // 533
  "AVIS", // 101688
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
  "DECISION_CC", // 51
  "DECISION_EURO", // 15
  "DECISION", // 244100
  "DECLARATION", // 77
  "DECRET_LOI", // 85
  "DECRET", // 555543
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
  "LOI_CONSTIT", // 76
  "LOI_ORGANIQUE", // 1144
  "LOI_PROGRAMME", // 10
  "LOI", // 64957
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
export const allJorfArticleTexteNaturesMutable = [...allJorfArticleTexteNatures]

export const allJorfArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
] as const
export const allJorfArticleTypesMutable = [...allJorfArticleTypes]

export const allJorfSectionTaLienArtEtats = ["VIGUEUR"] as const
export const allJorfSectionTaLienArtEtatsMutable = [
  ...allJorfSectionTaLienArtEtats,
]

export const allJorfSectionTaLienArtOrigines = ["JORF"] as const
export const allJorfSectionTaLienArtOriginesMutable = [
  ...allJorfSectionTaLienArtOrigines,
]

export const allJorfSectionTaLienSectionTaEtats = [] as const
export const allJorfSectionTaLienSectionTaEtatsMutable = [
  ...allJorfSectionTaLienSectionTaEtats,
]

export const allJorfSectionTaTexteNatures = [
  "Accord multilatéral", // 2
  "ACCORD_FONCTION_PUBLIQUE", // 2
  "ACCORD", // 3
  "ADDITIF", // 3
  "ARRETE", // 53716
  "AVENANT", // 89
  "AVIS", // 3212
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
  "LOI_ORGANIQUE", // 71
  "LOI", // 5161
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
export const allJorfSectionTaTexteNaturesMutable = [
  ...allJorfSectionTaTexteNatures,
]
