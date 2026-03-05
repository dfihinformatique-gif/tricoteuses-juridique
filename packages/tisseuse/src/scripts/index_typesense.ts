import {
  capitalizeFirstLetter,
  walkActes,
  type Acteur,
  type Document,
  type DossierParlementaire,
} from "@tricoteuses/assemblee"
import { Anomalies, type LegiTexteVersion } from "@tricoteuses/legifrance"
import sade from "sade"
import Typesense from "typesense"

import {
  cleanTexteTitle,
  definitionTexteFrancais,
  formatLongDate,
  simplifyPlainText,
  TextParserContext,
  type TextAstText,
} from "$lib"
import {
  assembleeDb,
  legiAnomaliesDb,
  legiDb,
} from "$lib/server/databases/index.js"

export interface Cartouche {
  badge?: string
  date?: string
  titre: string
  type: string
}

interface LegifranceTitleAnalysis {
  date?: string
  dateCalendrierRepublicain?: string
  nature?: string
  num?: string
  resteDuTitre?: string
}

interface LegifranceTextDescription {
  analysesTitres: LegifranceTitleAnalysis[]
  cartouches: Cartouche[]
  cid: string
  date: string
  nature: string
  num?: string
}

function addCartouche(cartouches: Cartouche[], cartouche: Cartouche): void {
  if (
    cartouches.find(
      (exisitingAutocompletion) =>
        exisitingAutocompletion.titre === cartouche.titre &&
        exisitingAutocompletion.type === cartouche.type,
    ) === undefined
  ) {
    cartouches.push(cartouche)
  }
}

// -------------------------------------------------------------------------
// EXTRACT ACTEURS
// -------------------------------------------------------------------------

interface ActeurDescription {
  uid: string
  prenom: string
  nom: string
  nomComplet: string
  civ: string
}

async function extractActeursDescriptions(): Promise<ActeurDescription[]> {
  const acteurs: ActeurDescription[] = []
  for await (const acteurRows of assembleeDb<
    Array<{ data: Acteur; uid: string }>
  >`
    SELECT data, uid
    FROM acteurs
  `.cursor(100)) {
    for (const { data: acteur, uid } of acteurRows) {
      const { ident } = acteur.etatCivil
      acteurs.push({
        uid,
        prenom: ident.prenom,
        nom: ident.nom,
        nomComplet: `${ident.prenom} ${ident.nom}`,
        civ: ident.civ,
      })
    }
  }
  return acteurs
}

// -------------------------------------------------------------------------
// EXTRACT ORGANES
// -------------------------------------------------------------------------

interface OrganeDescription {
  uid: string
  libelle: string
  codeType: string
  dateDebut: string | null
  dateFin: string | null
}

async function extractOrganesDescriptions(): Promise<OrganeDescription[]> {
  const organes: OrganeDescription[] = []
  for await (const organeRows of assembleeDb<Array<{ data: any; uid: string }>>`
    SELECT data, uid
    FROM organes
  `.cursor(100)) {
    for (const { data: organe, uid } of organeRows) {
      if (organe.libelle) {
        const viMoDe = organe.viMoDe as
          | { dateDebut?: string; dateFin?: string }
          | undefined
        organes.push({
          uid,
          libelle: organe.libelle,
          codeType: organe.codeType || "",
          dateDebut: viMoDe?.dateDebut ? viMoDe.dateDebut.split("T")[0] : null,
          dateFin: viMoDe?.dateFin ? viMoDe.dateFin.split("T")[0] : null,
        })
      }
    }
  }
  return organes
}

// -------------------------------------------------------------------------
// EXTRACT ASSEMBLEE
// -------------------------------------------------------------------------

interface AssembleeDescription {
  cartouches: Cartouche[]
  uid: string
}

async function extractAssembleeTextsDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const assembleeDescriptionByUid = new Map<string, AssembleeDescription>()
  for await (const dossierParlementaireRows of assembleeDb<
    Array<{ data: DossierParlementaire; uid: string }>
  >`
    SELECT data, uid
    FROM dossiers
  `.cursor(100)) {
    for (const {
      data: dossierParlementaire,
      uid,
    } of dossierParlementaireRows) {
      assembleeDescriptionByUid.set(uid, {
        cartouches: [
          {
            badge: dossierParlementaire.procedureParlementaire.libelle,
            date:
              dossierParlementaire.actesLegislatifs === undefined
                ? undefined
                : walkActes(dossierParlementaire.actesLegislatifs).reduce(
                    (mostRecentDate: string | undefined, acte) => {
                      const date = acte.dateActe?.toString()
                      if (date === undefined) {
                        return mostRecentDate
                      }
                      if (mostRecentDate === undefined) {
                        return date
                      }
                      return date > mostRecentDate ? date : mostRecentDate
                    },
                    undefined,
                  ),
            titre: capitalizeFirstLetter(
              dossierParlementaire.titreDossier.titre,
            ),
            type: "Assemblée dossier",
          },
        ],
        uid: uid,
      })

      if (dossierParlementaire.actesLegislatifs !== undefined) {
        const documentsUids = new Set<string>()
        for (const acte of walkActes(dossierParlementaire.actesLegislatifs)) {
          if (acte.texteAdopteRef !== undefined) {
            documentsUids.add(acte.texteAdopteRef)
          }
          if (acte.texteAssocieRef !== undefined) {
            documentsUids.add(acte.texteAssocieRef)
          }
        }

        if (documentsUids.size !== 0) {
          for (const { data: document, uid: documentUid } of await assembleeDb<
            Array<{ data: Document; uid: string }>
          >`
            SELECT data, uid
            FROM documents
            WHERE uid in ${assembleeDb([...documentsUids])}
          `) {
            const { chrono } = document.cycleDeVie
            const date = [
              chrono.dateCreation,
              chrono.dateDepot,
              chrono.datePublication,
              chrono.datePublicationWeb,
            ].reduce((mostRecentDate: string | undefined, dateObject) => {
              const date = dateObject?.toString()
              if (date === undefined) {
                return mostRecentDate
              }
              if (mostRecentDate === undefined) {
                return date
              }
              return date > mostRecentDate ? date : mostRecentDate
            }, undefined)
            const documentCartouches: Cartouche[] = [
              {
                badge: document.denominationStructurelle,
                date,
                titre: capitalizeFirstLetter(document.titres.titrePrincipal),
                type: "Assemblée document",
              },
            ]
            if (
              document.titres.titrePrincipalCourt !==
              document.titres.titrePrincipal
            ) {
              addCartouche(documentCartouches, {
                badge: document.denominationStructurelle,
                date,
                titre: capitalizeFirstLetter(
                  document.titres.titrePrincipalCourt,
                ),
                type: "Assemblée document",
              })
            }
            assembleeDescriptionByUid.set(documentUid, {
              cartouches: documentCartouches,
              uid: documentUid,
            })
          }
        }
      }
    }
  }
  return assembleeDescriptionByUid
}

async function extractAmendementsDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const assembleeDescriptionByUid = new Map<string, AssembleeDescription>()
  for await (const amendementRows of assembleeDb<
    Array<{ data: any; uid: string }>
  >`
    SELECT data, uid
    FROM amendements
  `.cursor(1000)) {
    for (const { data: amendement, uid } of amendementRows) {
      assembleeDescriptionByUid.set(uid, {
        cartouches: [
          {
            badge: "Amendement",
            date: amendement.cycleDeVie?.dateDepot?.split("T")[0],
            titre: `Amendement ${amendement.identification?.numeroLong || uid}`,
            type: "Assemblée amendement",
          },
        ],
        uid,
      })
    }
  }
  return assembleeDescriptionByUid
}

async function extractScrutinsDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const assembleeDescriptionByUid = new Map<string, AssembleeDescription>()
  for await (const scrutinRows of assembleeDb<
    Array<{ data: any; uid: string }>
  >`
    SELECT data, uid
    FROM scrutins
  `.cursor(1000)) {
    for (const { data: scrutin, uid } of scrutinRows) {
      assembleeDescriptionByUid.set(uid, {
        cartouches: [
          {
            badge: "Scrutin",
            date: scrutin.dateScrutin?.split("T")[0],
            titre: scrutin.titre || `Scrutin ${scrutin.numero || uid}`,
            type: "Assemblée scrutin",
          },
        ],
        uid,
      })
    }
  }
  return assembleeDescriptionByUid
}

async function extractReunionsDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const assembleeDescriptionByUid = new Map<string, AssembleeDescription>()
  for await (const reunionRows of assembleeDb<
    Array<{ data: any; uid: string }>
  >`
    SELECT data, uid
    FROM reunions
  `.cursor(1000)) {
    for (const { data: reunion, uid } of reunionRows) {
      assembleeDescriptionByUid.set(uid, {
        cartouches: [
          {
            badge: "Réunion",
            date: reunion.timestampDebut?.split("T")[0],
            titre: reunion.odj?.resumeOdj?.[0] || "Réunion",
            type: "Assemblée réunion",
          },
        ],
        uid,
      })
    }
  }
  return assembleeDescriptionByUid
}

// -------------------------------------------------------------------------
// EXTRACT LEGIFRANCE
// -------------------------------------------------------------------------

async function extractLegifranceJoDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const descriptions = new Map<string, AssembleeDescription>()
  for await (const rows of legiDb<Array<{ id: string; data: any }>>`
    SELECT id, data FROM jo
  `.cursor(1000)) {
    for (const { id, data } of rows) {
      const titre = data.META?.META_SPEC?.META_CONTENEUR?.TITRE
      if (!titre) continue
      const date = data.META?.META_SPEC?.META_CONTENEUR?.DATE_PUBLI
      if (date === "2999-01-01") continue
      const badge = data.META?.META_COMMUN?.NATURE || "JO"

      descriptions.set(id, {
        uid: id,
        cartouches: [
          {
            badge,
            date,
            titre,
            type: "Journal officiel",
          },
        ],
      })
    }
  }
  return descriptions
}

async function extractLegifranceTextsDescriptions(
  anomalies?: Anomalies,
): Promise<Map<string, LegifranceTextDescription>> {
  const legifranceTextDescriptionByCid = new Map<
    string,
    LegifranceTextDescription
  >()
  for (const nature of [
    "CODE",
    "CONSTITUTION",
    "LOI",
    "LOI_CONSTIT",
    "LOI_ORGANIQUE",
    "LOI_PROGRAMME",
    "ORDONNANCE",
  ]) {
    for (const { data: texteVersion, id } of await legiDb<
      { data: LegiTexteVersion; id: string }[]
    >`
      SELECT data, id
      FROM texte_version
      WHERE
        nature = ${nature}
        AND (
          id LIKE 'LEGITEXT%'
          OR id LIKE 'JORFTEXT%'
        )
    `) {
      const metaTexteChronicle =
        texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE
      const cid = metaTexteChronicle.CID
      const date = metaTexteChronicle.DATE_TEXTE
      const num = metaTexteChronicle.NUM

      let legifranceTextDescription = legifranceTextDescriptionByCid.get(cid)
      if (legifranceTextDescription === undefined) {
        legifranceTextDescription = {
          cartouches: [],
          analysesTitres: [],
          cid,
          date,
          nature,
        }
        legifranceTextDescriptionByCid.set(cid, legifranceTextDescription)
      } else {
        if (date !== "2999-01-01") {
          if (legifranceTextDescription.date === "2999-01-01") {
            legifranceTextDescription.date = date
          } else if (date !== legifranceTextDescription.date) {
            await anomalies?.add({
              category: "date du texte différente",
              id,
              message: `La date du texte a changé pour le même CID ${cid}: ${legifranceTextDescription.date} et ${date}`,
              path: "META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE",
            })
          }
        }
        if (nature !== legifranceTextDescription.nature) {
          await anomalies?.add({
            category: "nature du texte différente",
            id,
            message: `La nature du texte a changé pour le même CID ${cid}: ${legifranceTextDescription.nature} et ${nature}`,
            path: "META.META_COMMUN.NATURE",
          })
        }
        if (num !== undefined) {
          if (legifranceTextDescription.num === undefined) {
            legifranceTextDescription.num = num
          } else if (num !== legifranceTextDescription.num) {
            await anomalies?.add({
              category: "num du texte différent",
              id,
              message: `Le num du texte a changé pour le même CID ${cid}: ${legifranceTextDescription.num} et ${num}`,
              path: "META.META_SPEC.META_TEXTE_CHRONICLE.NUM",
            })
          }
        }
      }

      for (const [titlePath, rawTitle] of [
        [
          "META.META_SPEC.META_TEXTE_VERSION.TITRE",
          texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
        ],
        [
          "META.META_SPEC.META_TEXTE_VERSION.TITREFULL",
          texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
        ],
      ]) {
        if (rawTitle === undefined) {
          continue
        }
        const title = cleanTexteTitle(rawTitle)

        if (["code", "loi", "ordonnance"].includes(title.toLowerCase())) {
          continue
        }
        const otherTitles = new Set<string>()
        const titlesToParse = new Set<string>()
        switch (title) {
          case "Constitution du 4 octobre 1958": {
            titlesToParse.add(title)
            otherTitles.add("Constitution")
            break
          }
          case "Loi contenant organisation du notariat (loi 25 ventôse an XI)": {
            titlesToParse.add(
              "Loi du 25 ventôse an XI (16 mars 1803) contenant organisation du notariat",
            )
            break
          }
          case "Loi des 16-24 août 1790 sur l'organisation judiciaire": {
            otherTitles.add(title)
            titlesToParse.add(
              "Loi du 16 août 1790 sur l'organisation judiciaire",
            )
            break
          }
          case "Loi du 25 juillet 1891":
          case "Loi du 25 juillet 1891 autorisant le Mont-de-Piété de Paris à faire des avances sur valeurs mobilières au porteur": {
            titlesToParse.add(title)
            if (date !== "1891-07-25") {
              titlesToParse.add(`Loi du ${formatLongDate(date)}`)
              titlesToParse.add(
                `Loi du ${formatLongDate(date)} autorisant le Mont-de-Piété de Paris à faire des avances sur valeurs mobilières au porteur`,
              )
            }
            break
          }
          case "Loi n° 1987 du 24 mai 1941":
          case "Loi n° 1987 du 24 mai 1941 relative à la normalisation": {
            titlesToParse.add(title)
            titlesToParse.add("Loi n° 41-1987 du 24 mai 1941")
            titlesToParse.add(
              "Loi n° 41-1987 du 24 mai 1941 relative à la normalisation",
            )
            break
          }
          case "Loi n° 427 du 1er avril 1942":
          case "Loi n° 427 du 1er avril 1942 relative aux titres de navigation maritime": {
            titlesToParse.add(title)
            titlesToParse.add("Loi n° 42-427 du 1 avril 1942")
            titlesToParse.add(
              "Loi n° 42-427 du 1 avril 1942 relative aux titres de navigation maritime",
            )
            break
          }
          case "Loi n° 71-562 du 12 juillet 1971":
          case "Loi n° 71-562 du 12 juillet 1971 de programme sur l'équipement sportif et socio-éducatif": {
            titlesToParse.add(title)
            if (date !== "1971-07-12") {
              titlesToParse.add(`Loi n° 71-562 du ${formatLongDate(date)}`)
              titlesToParse.add(
                `Loi n° 71-562 du ${formatLongDate(date)} de programme sur l'équipement sportif et socio-éducatif`,
              )
            }
            break
          }
          case "Loi n° 72-516 du 28 septembre 1972":
          case "Loi n° 72-516 du 28 septembre 1972 amendant l'ordonnance n° 67-813 du 26 septembre 1967 relative aux sociétés coopératives agricoles, à leurs unions, à leurs fédérations, aux sociétés d'intérêt collectif agricole et aux sociétés mixtes d'intérêt agricole": {
            titlesToParse.add(title)
            if (date !== "1972-09-28") {
              titlesToParse.add(`Loi n° 72-516 du ${formatLongDate(date)}`)
              titlesToParse.add(
                `Loi n° 72-516 du ${formatLongDate(date)} amendant l'ordonnance n° 67-813 du 26 septembre 1967 relative aux sociétés coopératives agricoles, à leurs unions, à leurs fédérations, aux sociétés d'intérêt collectif agricole et aux sociétés mixtes d'intérêt agricole`,
              )
            }
            break
          }
          case "Loi n° 77-1423 du 27 décembre 1977 77-1423 du 27 décembre 1977 autorisant l'approbation de la convention sur le commerce international des espèces de faune et de flore sauvages menacées d'extinction, ensemble quatre annexes, ouverte à la signature à Washington jusqu'au 30 avril 1973 et, après cette date, à Berne jusqu'au 31 décembre 1974": {
            anomalies?.add({
              category: "format du titre du texte non reconnu",
              id,
              message:
                "Le titre contient deux fois le numéro et la date du texte",
              path: titlePath,
            })
            titlesToParse.add(
              "Loi n° 77-1423 du 27 décembre 1977 autorisant l'approbation de la convention sur le commerce international des espèces de faune et de flore sauvages menacées d'extinction, ensemble quatre annexes, ouverte à la signature à Washington jusqu'au 30 avril 1973 et, après cette date, à Berne jusqu'au 31 décembre 1974",
            )
            break
          }
          case "Loi n° 93-931 du 22 juillet 1993": {
            titlesToParse.add(title)
            if (num !== "93-931") {
              titlesToParse.add("Loi n° 93-937 du 22 juillet 1993")
            }
            break
          }
          default: {
            titlesToParse.add(title)
          }
        }

        for (const titleToParse of titlesToParse) {
          addCartouche(legifranceTextDescription.cartouches, {
            badge: nature,
            date: legifranceTextDescription.date,
            titre: titleToParse,
            type: "Légifrance texte",
          })
          const simplifiedTitle = simplifyPlainText(titleToParse).output
          const context = new TextParserContext(simplifiedTitle)
          const titleParsing = definitionTexteFrancais(context) as
            | TextAstText
            | undefined
          if (titleParsing == null) {
            anomalies?.add({
              category: "format du titre du texte non reconnu",
              id,
              message: `Le titre de ${nature} n° ${num} du ${date} (${cid}) a probablement une erreur : "${titleToParse}"`,
              path: titlePath,
            })
            continue
          }
          if (titleParsing.date !== undefined) {
            if (legifranceTextDescription.date === "2999-01-01") {
              legifranceTextDescription.date = titleParsing.date
            } else if (titleParsing.date !== legifranceTextDescription.date) {
              anomalies?.add({
                category: "date du texte différente",
                id,
                message: `La date "${titleParsing.date}" extraite du titre diffère de la date du texte "${legifranceTextDescription.date}"`,
                path: titlePath,
              })
            }
          }
          if (
            titleParsing.nature !== undefined &&
            titleParsing.nature !== legifranceTextDescription.nature
          ) {
            anomalies?.add({
              category: "nature du texte différente",
              id,
              message: `La nature "${titleParsing.nature}" extraite du titre diffère de la nature du texte "${legifranceTextDescription.nature}"`,
              path: titlePath,
            })
          }
          if (
            titleParsing.num !== undefined &&
            titleParsing.num !== legifranceTextDescription.num
          ) {
            if (legifranceTextDescription.num === undefined) {
              legifranceTextDescription.num = titleParsing.num
            } else {
              anomalies?.add({
                category: "num du texte différent",
                id,
                message: `Le num "${titleParsing.num}" extrait du titre diffère du num du texte "${legifranceTextDescription.num}"`,
                path: titlePath,
              })
            }
          }
          const analyseTitre = legifranceTextDescription.analysesTitres.find(
            ({ date, dateCalendrierRepublicain, nature, num, resteDuTitre }) =>
              (date === undefined ||
                titleParsing.date === undefined ||
                date === titleParsing.date) &&
              (dateCalendrierRepublicain === undefined ||
                titleParsing.dateCalendrierRepublicain === undefined ||
                dateCalendrierRepublicain ===
                  titleParsing.dateCalendrierRepublicain) &&
              (nature === undefined ||
                titleParsing.nature === undefined ||
                nature === titleParsing.nature) &&
              (num === undefined ||
                titleParsing.num === undefined ||
                num === titleParsing.num) &&
              (resteDuTitre === undefined ||
                titleParsing.titleRest === undefined ||
                resteDuTitre === titleParsing.titleRest),
          )
          if (analyseTitre === undefined) {
            legifranceTextDescription.analysesTitres.push(
              Object.fromEntries(
                Object.entries({
                  date: titleParsing.date,
                  dateCalendrierRepublicain:
                    titleParsing.dateCalendrierRepublicain,
                  nature: titleParsing.nature,
                  num: titleParsing.num,
                  resteDuTitre: titleParsing.titleRest,
                }).filter(([, value]) => value !== undefined),
              ) as LegifranceTitleAnalysis,
            )
          } else {
            if (
              titleParsing.date !== undefined &&
              analyseTitre.date === undefined
            ) {
              analyseTitre.date = titleParsing.date
            }
            if (
              titleParsing.dateCalendrierRepublicain !== undefined &&
              analyseTitre.dateCalendrierRepublicain === undefined
            ) {
              analyseTitre.dateCalendrierRepublicain =
                titleParsing.dateCalendrierRepublicain
            }
            if (
              titleParsing.nature !== undefined &&
              analyseTitre.nature === undefined
            ) {
              analyseTitre.nature = titleParsing.nature
            }
            if (
              titleParsing.num !== undefined &&
              analyseTitre.num === undefined
            ) {
              analyseTitre.num = titleParsing.num
            }
            if (
              titleParsing.titleRest !== undefined &&
              analyseTitre.resteDuTitre === undefined
            ) {
              analyseTitre.resteDuTitre = titleParsing.titleRest
            }
          }
        }

        for (const title of otherTitles) {
          addCartouche(legifranceTextDescription.cartouches, {
            badge: nature,
            date: legifranceTextDescription.date,
            titre: title,
            type: "Légifrance texte",
          })
        }
      }
    }
  }
  return legifranceTextDescriptionByCid
}

// -------------------------------------------------------------------------
// TYPESENSE INDEXING
// -------------------------------------------------------------------------

async function indexToTypesense(options: {
  anomalies?: boolean
  acteurs?: boolean
  organes?: boolean
  textes?: boolean
  amendements?: boolean
  scrutins?: boolean
  reunions?: boolean
  jo?: boolean
}): Promise<number> {
  const indexAll =
    !options.textes &&
    !options.acteurs &&
    !options.organes &&
    !options.amendements &&
    !options.scrutins &&
    !options.reunions &&
    !options.jo
  const indexTextes = indexAll || options.textes
  const indexActeurs = indexAll || options.acteurs
  const indexOrganes = indexAll || options.organes
  const indexAmendements = indexAll || options.amendements
  const indexScrutins = indexAll || options.scrutins
  const indexReunions = indexAll || options.reunions
  const indexJo = indexAll || options.jo

  const typesenseHost = process.env.TYPESENSE_HOST || "localhost"
  const typesensePort = process.env.TYPESENSE_PORT || "8108"
  const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || "http"
  const typesenseApiKey = process.env.TYPESENSE_API_KEY || "xyz"

  console.log(
    `Initialisation de Typesense sur ${typesenseHost}:${typesensePort} ...`,
  )
  const client = new Typesense.Client({
    nodes: [
      {
        host: typesenseHost,
        port: parseInt(typesensePort, 10),
        protocol: typesenseProtocol,
      },
    ],
    apiKey: typesenseApiKey,
  })

  const batchSize = 1000

  const typesenseBaseUrl = `${typesenseProtocol}://${typesenseHost}:${typesensePort}`
  const typesenseHeaders = {
    "Content-Type": "application/json",
    "X-TYPESENSE-API-KEY": typesenseApiKey,
  }

  if (indexTextes) {
    try {
      await client.collections("textes_juridiques").delete()
    } catch {
      // Ignorer si la collection n'existe pas encore
    }

    // Créer le synonym set avec les synonymes (API v30 synonym_sets)
    const synonymSetName = "textes-juridiques-synonyms"
    console.log(
      `Création du synonym set '${synonymSetName}' pour 'textes_juridiques'...`,
    )
    const createSetResponse = await fetch(
      `${typesenseBaseUrl}/synonym_sets/${synonymSetName}`,
      {
        method: "PUT",
        headers: typesenseHeaders,
        body: JSON.stringify({
          items: [
            {
              id: "jo-synonyms",
              synonyms: [
                "JO",
                "JORF",
                "Journal officiel",
                "Journal officiel de la république française",
              ],
            },
            {
              id: "plf-synonyms",
              synonyms: ["PLF", "Projet de loi de finances"],
            },
            {
              id: "plfss-synonyms",
              synonyms: [
                "PLFSS",
                "Projet de loi de financement de la sécurité sociale",
              ],
            },
            {
              id: "pjl-synonyms",
              synonyms: ["PJL", "Projet de loi"],
            },
            {
              id: "ppl-synonyms",
              synonyms: ["PPL", "Proposition de loi"],
            },
          ],
        }),
      },
    )
    if (!createSetResponse.ok) {
      const body = await createSetResponse.text()
      console.error(
        `Erreur lors de la création du synonym set (${createSetResponse.status}): ${body}`,
      )
    } else {
      console.log(`Synonym set '${synonymSetName}' créé avec 5 synonymes.`)
    }

    await client.collections().create({
      name: "textes_juridiques",
      fields: [
        { name: "id", type: "string" },
        { name: "text_id", type: "string", facet: true },
        { name: "autocompletion", type: "string" },
        { name: "badge", type: "string", optional: true, facet: true },
        { name: "date", type: "string", optional: true, sort: true },
        { name: "annee", type: "int32", optional: true, sort: true },
        { name: "type", type: "string", facet: true },
      ],
      token_separators: ["-", "'"],
    })

    // Lier le synonym set à la collection
    const patchResponse = await fetch(
      `${typesenseBaseUrl}/collections/textes_juridiques`,
      {
        method: "PATCH",
        headers: typesenseHeaders,
        body: JSON.stringify({ synonym_sets: [synonymSetName] }),
      },
    )
    if (!patchResponse.ok) {
      const body = await patchResponse.text()
      console.error(
        `Erreur lors du lien du synonym set à la collection (${patchResponse.status}): ${body}`,
      )
    } else {
      console.log(
        `Synonym set '${synonymSetName}' lié à la collection 'textes_juridiques'.`,
      )
    }

    const documents: Record<string, unknown>[] = []

    // 1. Extraire et ajouter les données Assemblée
    console.log(
      "Extraction des dossiers et documents de l'Assemblée nationale...",
    )
    const assembleeDescriptionByUid = await extractAssembleeTextsDescriptions()
    for (const { uid, cartouches } of assembleeDescriptionByUid.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${uid}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: uid,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) {
          doc.badge = cartouche.badge
        }
        if (cartouche.date != null) {
          doc.date = cartouche.date
        }
        if (annee != null) {
          doc.annee = annee
        }
        documents.push(doc)
      }
    }

    // 2. Extraire et ajouter les données Légifrance
    console.log("Extraction des textes de lois de Légifrance...")
    const anomalies = options.anomalies
      ? new Anomalies(legiAnomaliesDb, [
          "date du texte différente",
          "format du titre du texte non reconnu",
          "nature du texte différente",
          "num du texte différent",
        ])
      : undefined
    await anomalies?.load()

    const legifranceTextDescriptionByCid =
      await extractLegifranceTextsDescriptions(anomalies)

    for (const { cid, cartouches } of legifranceTextDescriptionByCid.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${cid}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: cid,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) {
          doc.badge = cartouche.badge
        }
        if (cartouche.date != null) {
          doc.date = cartouche.date
        }
        if (annee != null) {
          doc.annee = annee
        }
        documents.push(doc)
      }
    }

    await anomalies?.save()

    console.log(`Indexation de ${documents.length} documents dans Typesense...`)

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await client
        .collections("textes_juridiques")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, documents.length)} / ${documents.length}`,
      )
    }

    console.log("Les documents ont été envoyés à Typesense.")
  }

  if (indexJo) {
    console.log("Extraction des Journal officiels de Légifrance...")
    const legifranceJoDescriptionById = await extractLegifranceJoDescriptions()
    const documents: Record<string, unknown>[] = []
    for (const {
      uid: id,
      cartouches,
    } of legifranceJoDescriptionById.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${id}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: id,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) doc.badge = cartouche.badge
        if (cartouche.date != null) doc.date = cartouche.date
        if (annee != null) doc.annee = annee
        documents.push(doc)
      }
    }

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await client
        .collections("textes_juridiques")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, documents.length)} / ${documents.length}`,
      )
    }

    console.log("Les documents ont été envoyés à Typesense.")
  }

  if (indexAmendements) {
    console.log("Extraction des amendements de l'Assemblée nationale...")
    const documents: Record<string, unknown>[] = []
    const amendementsDescriptions = await extractAmendementsDescriptions()
    for (const { uid, cartouches } of amendementsDescriptions.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${uid}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: uid,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) doc.badge = cartouche.badge
        if (cartouche.date != null) doc.date = cartouche.date
        if (annee != null) doc.annee = annee
        documents.push(doc)
      }
    }
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await client
        .collections("textes_juridiques")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, documents.length)} / ${documents.length}`,
      )
    }
  }

  if (indexScrutins) {
    console.log("Extraction des scrutins de l'Assemblée nationale...")
    const documents: Record<string, unknown>[] = []
    const scrutinsDescriptions = await extractScrutinsDescriptions()
    for (const { uid, cartouches } of scrutinsDescriptions.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${uid}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: uid,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) doc.badge = cartouche.badge
        if (cartouche.date != null) doc.date = cartouche.date
        if (annee != null) doc.annee = annee
        documents.push(doc)
      }
    }
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await client
        .collections("textes_juridiques")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, documents.length)} / ${documents.length}`,
      )
    }
  }

  if (indexReunions) {
    console.log("Extraction des réunions de l'Assemblée nationale...")
    const documents: Record<string, unknown>[] = []
    const reunionsDescriptions = await extractReunionsDescriptions()
    for (const { uid, cartouches } of reunionsDescriptions.values()) {
      for (let i = 0; i < cartouches.length; i++) {
        const cartouche = cartouches[i]
        let annee: number | undefined
        if (cartouche.date) {
          const parsed = parseInt(cartouche.date.slice(0, 4), 10)
          if (!isNaN(parsed)) {
            annee = parsed
          }
        }
        const doc: Record<string, unknown> = {
          id: `${uid}-${cartouche.type
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9-_]/g, "_")}-${i}`,
          text_id: uid,
          autocompletion: cartouche.titre,
          type: cartouche.type,
        }
        if (cartouche.badge != null) doc.badge = cartouche.badge
        if (cartouche.date != null) doc.date = cartouche.date
        if (annee != null) doc.annee = annee
        documents.push(doc)
      }
    }
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize)
      await client
        .collections("textes_juridiques")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, documents.length)} / ${documents.length}`,
      )
    }
  }

  if (indexActeurs) {
    // 3. Extraire et indexer les acteurs
    console.log("Extraction des acteurs de l'Assemblée nationale...")

    try {
      await client.collections("acteurs").delete()
    } catch {
      // Ignorer si la collection n'existe pas encore
    }

    await client.collections().create({
      name: "acteurs",
      fields: [
        { name: "id", type: "string" },
        { name: "uid", type: "string" },
        { name: "prenom", type: "string", sort: true },
        { name: "nom", type: "string", sort: true },
        { name: "nom_complet", type: "string" },
        { name: "civ", type: "string", facet: true },
      ],
      token_separators: ["-", "'"],
    })

    const acteursDescriptions = await extractActeursDescriptions()
    const acteurDocuments: Record<string, unknown>[] = acteursDescriptions.map(
      (acteur) => ({
        id: acteur.uid,
        uid: acteur.uid,
        prenom: acteur.prenom,
        nom: acteur.nom,
        nom_complet: acteur.nomComplet,
        civ: acteur.civ,
      }),
    )

    console.log(
      `Indexation de ${acteurDocuments.length} acteurs dans Typesense...`,
    )

    for (let i = 0; i < acteurDocuments.length; i += batchSize) {
      const batch = acteurDocuments.slice(i, i + batchSize)
      await client
        .collections("acteurs")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, acteurDocuments.length)} / ${acteurDocuments.length}`,
      )
    }

    console.log("Les acteurs ont été envoyés à Typesense.")
  }

  if (indexOrganes) {
    try {
      await client.collections("organes").delete()
    } catch {
      // Ignorer si la collection n'existe pas encore
    }

    await client.collections().create({
      name: "organes",
      fields: [
        { name: "id", type: "string" },
        { name: "uid", type: "string" },
        { name: "libelle", type: "string", sort: true },
        { name: "codeType", type: "string", facet: true },
        { name: "dateDebut", type: "string", optional: true, sort: true },
        { name: "dateFin", type: "string", optional: true },
      ],
      token_separators: ["-", "'"],
    })

    const organesDescriptions = await extractOrganesDescriptions()
    const organeDocuments = organesDescriptions.map((organe) => ({
      id: organe.uid,
      uid: organe.uid,
      libelle: organe.libelle,
      codeType: organe.codeType,
      ...(organe.dateDebut !== null ? { dateDebut: organe.dateDebut } : {}),
      ...(organe.dateFin !== null ? { dateFin: organe.dateFin } : {}),
    }))

    console.log(
      `Indexation de ${organeDocuments.length} organes dans Typesense...`,
    )

    for (let i = 0; i < organeDocuments.length; i += batchSize) {
      const batch = organeDocuments.slice(i, i + batchSize)
      await client
        .collections("organes")
        .documents()
        .import(batch, { action: "upsert" })
      console.log(
        `Indexés ${Math.min(i + batchSize, organeDocuments.length)} / ${organeDocuments.length}`,
      )
    }

    console.log("Les organes ont été envoyés à Typesense.")
  }

  return 0
}

sade("index_typesense", true)
  .describe(
    "Extrait les textes de lois, projets de loi et acteurs pour les pousser vers Typesense",
  )
  .option("-A, --anomalies", "Log anomalies into canutes_anomalies database")
  .option("-a, --acteurs", "Indexer les acteurs")
  .option("-o, --organes", "Indexer les organes")
  .option("-t, --textes", "Indexer les textes de lois et projets de loi")
  .option("-m, --amendements", "Indexer les amendements")
  .option("-s, --scrutins", "Indexer les scrutins")
  .option("-r, --reunions", "Indexer les réunions")
  .option("-j, --jo", "Indexer les JO")
  .action(async (options) => {
    process.exit(await indexToTypesense(options))
  })
  .parse(process.argv)
