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
      URL: string
      ORIGINE: JorfArticleOrigine
    }
    META_SPEC: {
      META_ARTICLE: {
        DATE_FIN: string
        DATE_DEBUT: string
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

export type JoNature = (typeof allJoNatures)[number]

export type JoOrigine = (typeof allJoOrigines)[number]

export type JorfArticleEtat = (typeof allJorfArticleEtats)[number]

export type JorfArticleLienArticleOrigine =
  (typeof allJorfArticleLienArticleOrigines)[number]

export type JorfArticleNature = (typeof allJorfArticleNatures)[number]

export type JorfArticleOrigine = (typeof allJorfArticleOrigines)[number]

export type JorfArticleTexteNature = (typeof allJorfArticleTexteNatures)[number]

export type JorfArticleType = (typeof allJorfArticleTypes)[number]

/// Table des matières (TM)
export interface JorfArticleTm {
  TITRE_TM: {
    "#text"?: string
    "@debut": string
    "@fin": string
    "@id": string
  }
  TM?: JorfArticleTm
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
  "DECRET", // 555543
  "LOI", // 64957
  "ARRETE", // 1228598
  "DECISION", // 244100
  "LISTE", // 24279
  "AVIS", // 101688
  "CODE", // 14737
  "RESULTATS", // 14954
  "MODIFICATION", // 724
  "RAPPORT", // 2491
  "REGLEMENT", // 1930
  "LOI_ORGANIQUE", // 1144
  "CIRCULAIRE", // 3933
  "LOI_PROGRAMME", // 10
  "CITATION", // 423
  "ORDONNANCE", // 33582
  "DELIBERATION", // 11012
  "INSTRUCTION", // 1207
  "AVENANT", // 533
  "DECLARATION", // 77
  "OBSERVATION", // 623
  "INFORMATION", // 143
  "RECOMMANDATION", // 204
  "SAISINE", // 1075
  "EXEQUATUR", // 173
  "TABLEAU", // 1063
  "REMISE", // 119
  "ACCORD", // 153
  "MEMOIRE", // 72
  "DECISION_CC", // 51
  "LOI_CONSTIT", // 76
  "LETTRE", // 10
  "ELECTIONDUPRESIDENTDELAREPUBLIQU", // 16
  "CONVENTION", // 972
  "ARRET", // 23
  "CONTRAT", // 32
  "COMPOSITION", // 19
  "ADDITIF", // 139
  "VOCABULAIRE", // 170
  "DATE", // 1
  "PROTOCOLE", // 25
  "PROPOSITION", // 11
  "DECRET_LOI", // 85
  "COMMUNIQUE", // 3
  "PROCLAMATION", // 17
  "CONSTITUTION", // 41
  "DIRECTIVE", // 11
  "DECISION_EURO", // 15
  "ABROGATION", // 10
  "PREMIER", // 1
  "PUBLICATION", // 2
  "RECTIFICATIF", // 3
  "DEUXIEME", // 5
  "DELEGATION", // 1
  "ANNEXE", // 2
  "RELEVE", // 2
  "COMPLEMENT", // 2
  "ARRANGEMENT", // 1
  "TROISIEME", // 2
  "ELECTION", // 1
  "SUSPENSION", // 2
  "ATTESTATION", // 1
  "CANDIDAT", // 2
  "CHARTE", // 1
  "PROJET", // 6
  "INFORMATIONS_DIVERSES", // 524
  "INFORMATIONS_PARLEMENTAIRES", // 6335
  "INFORMATIONS_CESE", // 285
  "ANNONCES", // 755
  "Accord multilatéral", // 3
  "ACCORD_FONCTION_PUBLIQUE", //
] as const
export const allJorfArticleTexteNaturesMutable = [...allJorfArticleTexteNatures]

export const allJorfArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
] as const
export const allJorfArticleTypesMutable = [...allJorfArticleTypes]
