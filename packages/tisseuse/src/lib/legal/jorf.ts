import type { Sens } from "./shared"

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
  "@titretxt"?: string
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
      TITRE_TXT?: Array<{
        "#text"?: string
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
      META_ARTICLE: JorfArticleMetaArticle
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

export interface JorfArticleMetaArticle {
  DATE_DEBUT: string
  DATE_FIN: string
  /// Mots-clés
  MCS_ART?: { MC: string[] }
  NUM?: string
  TYPE?: JorfArticleType
}

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

export interface JorfMetaTexteChronicle {
  CID: string
  DATE_PUBLI: string
  DATE_TEXTE: string
  NOR?: string
  NUM?: string
  NUM_PARUTION?: number
  NUM_SEQUENCE?: number
  ORIGINE_PUBLI?: string
  PAGE_DEB_PUBLI?: number
  PAGE_FIN_PUBLI?: number
}

// Section Texte Article
// Correspond à un niveau d'une table des matières
export interface JorfSectionTa {
  ID: string
  COMMENTAIRE?: string
  CONTEXTE: {
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
  STRUCTURE_TA?: JorfSectionTaStructure
}

export interface JorfSectionTaLienArt {
  "@debut": string
  "@etat"?: JorfSectionTaLienArtEtat
  "@fin": string
  "@id": string
  "@num"?: string
  "@origine"?: JorfSectionTaLienArtOrigine
}

export type JorfSectionTaLienArtEtat =
  (typeof allJorfSectionTaLienArtEtats)[number]

export type JorfSectionTaLienArtOrigine =
  (typeof allJorfSectionTaLienArtOrigines)[number]

export interface JorfSectionTaLienSectionTa {
  "#text"?: string
  "@cid": string
  "@debut": string
  // "@etat"?: JorfSectionTaLienSectionTaEtat
  "@fin": string
  "@id": string
  "@niv": number
  "@url": string
}

export type JorfSectionTaLienSectionTaEtat =
  (typeof allJorfSectionTaLienSectionTaEtats)[number]

// Structure d'une Section Texte Article
// Lien vers les sous-niveaux (articles ou Sections Texte Article) d'un niveau de table des matières
export interface JorfSectionTaStructure {
  LIEN_ART?: JorfSectionTaLienArt[]
  LIEN_SECTION_TA?: JorfSectionTaLienSectionTa[]
}

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

export interface JorfTextelr {
  META: {
    META_COMMUN: {
      ANCIEN_ID?: string
      ELI_ALIAS?: {
        ID_ELI_ALIAS: string
      }
      ID: string
      ID_ELI?: string
      NATURE?: JorfTexteNature
      ORIGINE: JorfTexteOrigine
      URL: string
    }
    META_SPEC: {
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
    }
  }
  STRUCT?: JorfTextelrStructure
  VERSIONS: {
    VERSION: Array<{
      "@etat"?: JorfTextelrEtat
      LIEN_TXT: {
        "@debut": string
        "@fin": string
        "@id": string
        "@num"?: string
      }
    }>
  }
}

export type JorfTextelrEtat = (typeof allJorfTextelrEtats)[number]

export interface JorfTextelrLienArt {
  "@debut": string
  "@etat"?: JorfTextelrLienArtEtat
  "@fin": string
  "@id": string
  // "@nature"?: undefined
  "@num"?: string
  "@origine"?: JorfTextelrLienArtOrigine
}

export type JorfTextelrLienArtEtat = (typeof allJorfTextelrLienArtEtats)[number]

export type JorfTextelrLienArtNature =
  (typeof allJorfTextelrLienArtNatures)[number]

export type JorfTextelrLienArtOrigine =
  (typeof allJorfTextelrLienArtOrigines)[number]

export type JorfTexteNature = (typeof allJorfTexteNatures)[number]

export type JorfTexteOrigine = (typeof allJorfTexteOrigines)[number]

export interface JorfTextelrLienSectionTa {
  "#text"?: string
  "@cid": string
  "@debut": string
  // "@etat"?: undefined
  "@fin": string
  "@id": string
  "@niv": number
  "@url": string
}

// Structure du JorfTextelr
// Premier niveau de table des matières
export interface JorfTextelrStructure {
  LIEN_ART?: JorfTextelrLienArt[]
  LIEN_SECTION_TA?: JorfTextelrLienSectionTa[]
}
export interface JorfTexteVersion {
  ABRO?: {
    CONTENU: string // HTML
  }
  ENTREPRISE?: {
    "@texte_entreprise": "non" | "oui"
    DATES_EFFET?: {
      DATE_EFFET: string[]
    }
    DOMAINES?: {
      DOMAINE: string[]
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
      NATURE?: JorfTexteNature
      ORIGINE: JorfTexteOrigine
      URL: string
    }
    META_SPEC: {
      META_TEXTE_CHRONICLE: JorfMetaTexteChronicle
      META_TEXTE_VERSION: {
        AUTORITE?: string
        DATE_DEBUT: string
        DATE_FIN: string
        LIENS?: {
          LIEN: Array<JorfTexteVersionLien>
        }
        MCS_TXT?: {
          MC: string[]
        }
        MINISTERE?: string
        TITRE?: string
        TITREFULL?: string
      }
    }
  }
  NOTICE?: {
    CONTENU: string // HTML
  }
  RECT?: {
    CONTENU: string // HTML
  }
  SIGNATAIRES?: {
    CONTENU: string // HTML
  }
  // Résumé/abstract du texte (summary ???)
  SM?: {
    CONTENU: string // HTML
  }
  // Travaux préparatoires
  TP?: {
    CONTENU: string // HTML
  }
  VISAS?: {
    CONTENU: string // HTML
  }
}

export interface JorfTexteVersionLien {
  "#text"?: string
  "@cidtexte"?: string // Present if and only if @id is present
  "@datesignatexte"?: string
  "@id"?: string
  "@naturetexte"?: JorfTexteVersionLienNature
  "@nortexte"?: string
  "@num"?: string
  "@numtexte"?: string
  "@sens": Sens
  "@typelien": JorfTexteVersionLienType
}

export type JorfTexteVersionLienNature =
  (typeof allJorfTexteVersionLienNatures)[number]

export type JorfTexteVersionLienType =
  (typeof allJorfTexteVersionLienTypes)[number]

/// Table des matières (TM) d'un Journal officiel
export interface JoTm {
  "@niv": number
  LIEN_TXT?: JoLienTxt[]
  TITRE_TM: string
  TM?: JoTm[]
}

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
  "VIGUEUR_DIFF",
  "VIGUEUR",
] as const

export const allJorfArticleLienArticleOrigines = ["JORF", "LEGI"] as const

export const allJorfArticleNatures = ["Article"] as const

export const allJorfArticleOrigines = ["JORF"] as const

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

export const allJorfArticleTypes = [
  "AUTONOME",
  "ENTIEREMENT_MODIF",
  "PARTIELLEMENT_MODIF",
] as const

export const allJorfSectionTaLienArtEtats = ["VIGUEUR"] as const

export const allJorfSectionTaLienArtOrigines = ["JORF"] as const

export const allJorfSectionTaLienSectionTaEtats = [] as const

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

export const allJorfTextelrEtats = [
  "ABROGE_DIFF", // 129
  "ABROGE", // 21890
  "ANNULE", // 199
  "MODIFIE_MORT_NE", // 24
  "MODIFIE", // 3008
  "PERIME", // 3127
  "VIGUEUR_DIFF", // 103
  "VIGUEUR", // 98711
] as const

export const allJorfTextelrLienArtEtats = ["VIGUEUR"] as const

export const allJorfTextelrLienArtNatures = [] as const

export const allJorfTextelrLienArtOrigines = ["JORF"] as const

export const allJorfTexteNatures = [
  "ABROGATION", // 8
  "Accord multilatéral", // 1
  "ACCORD_FONCTION_PUBLIQUE", // 4
  "ACCORD", // 46
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
  "DECISION_CC", // 96
  "DECISION_EURO", // 550
  "DECISION", // 67164
  "DECLARATION", // 20
  "DECLARATIONEURO", // 18
  "DECRET_LOI", // 660
  "DECRET", // 209363
  "DELEGATION", // 1
  "DELIBERATION", // 3993
  "DELIBERATIONEURO", // 36
  "DEUXIEME", // 5
  "DIRECTIVE_EURO", // 4249
  "DIRECTIVE", // 13
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
  "LOI_CONSTIT", // 12
  "LOI_ORGANIQUE", // 105
  "LOI_PROGRAMME", // 2
  "LOI", // 12859
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
  "ACCORD CADRE", // 1
  "ACCORD CADRE NATIONAL",
  "ACCORD COLLECTIF",
  "Accord collectif", // 6
  "Accord collectif interbranche",
  "Accord collectif national sectoriel", // 7
  "Accord collectif national", // 50
  "ACCORD COLLECTIF NATIONAL", // 57
  "ACCORD DE BRANCHE", // 1
  "Accord de branche", // 24
  "Accord de champ", // 1
  "Accord de convergence", // 3
  "Accord de méthode", // 23
  "Accord de rattachement", // 1
  "Accord de substitution", // 12
  "Accord du", // 1
  "Accord interbranches", // 5
  "Accord interprétatif", // 3
  "Accord interprofessionnel départemental", // 1
  "Accord interprofessionnel", // 8
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
  "ACCORD_FONCTION_PUBLIQUE", // 12
  "Accord-cadre interbranches", // 2
  "ACCORD-CADRE", // 20
  "Accord-cadre", // 7
  "Accord-type", // 1
  "ACCORD", // 1048
  "accord", // 130
  "Accord", // 22442
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
  "CONVENTION", // 329
  "DECISION_CC", // 116
  "DECISION_EURO", // 243
  "Décision", // 1
  "DECISION", // 109937
  "DECLARATION", // 8
  "DECRET_LOI", // 2061
  "DECRET", // 747993
  "Délibération", // 1
  "DELIBERATION", // 10824
  "DELIBERATIONEURO", // 26
  "Dénonciation par lettre", // 3
  "Dénonciation", // 2
  "DIRECTIVE_EURO", // 22593
  "DIRECTIVE", // 43
  "ELECTIONDUPRESIDENTDELAREPUBLIQU", // 6
  "INFORMATION", // 26
  "INFORMATIONS_DIVERSES", // 16
  "INFORMATIONS_PARLEMENTAIRES", // 2576
  "INSTRUCTION", // 218
  "INSTRUCTIONEURO", // 700
  "Lettre de dénonciation", // 1
  "LETTREEURO", // 5
  "LISTE", // 262
  "LOI_CONSTIT", // 30
  "LOI_ORGANIQUE", // 2899
  "LOI_PROGRAMME", // 55
  "LOI", // 216342
  "MEMOIRE", // 21
  "MODIFICATION", // 125
  "NOTE", // 3
  "OBSERVATION", // 256
  "ORDONNANCE", // 35340
  "Procès-verbal de désaccord", // 4
  "PROJET", // 93
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
  "RECOMMANDATION_EURO", // 1
  "RECOMMANDATION", // 243
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
