import { Anomalies, type LegiTexteVersion } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import sade from "sade"

import { formatLongDate } from "$lib/dates"
import { jsonReplacer } from "$lib/json.js"
import {
  legiAnomaliesDb,
  legiDb,
  tisseuseDb,
} from "$lib/server/databases/index.js"
import type { TextAstText } from "$lib/text_parsers/ast.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import {
  replacePatterns,
  simplifyText,
  simplifyUnicodeCharacters,
} from "$lib/text_parsers/simplifiers.js"
import { definitionTexteFrancais } from "$lib/text_parsers/texts.js"
import { chainTransformers } from "$lib/text_parsers/transformers.js"

interface AnalyseTitre {
  date?: string
  dateCalendrierRepublicain?: string
  nature?: string
  num?: string
  resteDuTitre?: string
}

interface LegifranceTextDescription {
  analysesTitres: AnalyseTitre[]
  cid: string
  date: string
  nature: string
  num?: string
  titres: Set<string>
}

interface TextDescription {
  legifrance?: LegifranceTextDescription
  titresOfficieux?: string[]
}

async function extractTextsInfos({
  autocompletion: generateAutocompletions,
  json: generateTextsInfosJson,
}: {
  autocompletion?: boolean
  json?: boolean
}): Promise<number> {
  const anomalies = new Anomalies(legiAnomaliesDb, [
    "date du texte différente",
    "format du titre du texte non reconnu",
    "nature du texte différente",
    "num du texte différent",
    // "texte différent",
  ])
  await anomalies.load()

  const legifranceTextDescriptionByCid = new Map<
    string,
    LegifranceTextDescription
  >()
  for (const nature of [
    // "ARRETE",
    // "CIRCULAIRE",
    "CODE",
    "CONSTITUTION",
    // "DECLARATION",
    // "DECRET",
    // "DECRET_LOI",
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
      const cid = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.CID
      const date = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
      const num = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM
      // if (id === "LEGITEXT000005617202") {
      //   // Loi n° 96-64 du 29 janvier 1996 autorisant la ratification du traité d'amitié
      //   // et de coopération entre la République française et la République d'Ouzbékistan
      //   // has the CID JORFTEXT000000367879 of:
      //   // LOI no 94-1098 du 19 décembre 1994 autorisant la ratification de la convention
      //   // sur l'interdiction de la mise au point, de la fabrication, du stockage et de
      //   // l'emploi des armes chimiques et sur leur destruction
      //   // => Ignore it.
      //   await anomalies.add({
      //     category: "texte différent",
      //     id,
      //     message: `Le texte a changé pour le même CID ${cid}`,
      //   })
      //   continue
      // }
      let legifranceTextDescription = legifranceTextDescriptionByCid.get(cid)
      if (legifranceTextDescription === undefined) {
        legifranceTextDescription = {
          analysesTitres: [],
          cid,
          date,
          nature,
          titres: new Set(),
        }
        legifranceTextDescriptionByCid.set(cid, legifranceTextDescription)
      } else {
        if (date !== "2999-01-01") {
          if (legifranceTextDescription.date === "2999-01-01") {
            legifranceTextDescription.date = date
          } else if (date !== legifranceTextDescription.date) {
            await anomalies.add({
              category: "date du texte différente",
              id,
              message: `La date du texte a changé pour le même CID ${cid}: ${legifranceTextDescription.date} et ${date}`,
              path: "META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE",
            })
          }
        }
        if (nature !== legifranceTextDescription.nature) {
          await anomalies.add({
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
            await anomalies.add({
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
        const title = rawTitle
          .replace(/\n/g, " ")
          .replace(/ {2,}/g, " ")
          .replace(/ \(\d+\)\.?$/, "")
          .replace(/\.$/, "")

        if (["code", "loi", "ordonnance"].includes(title.toLowerCase())) {
          // Example: JORFTEXT000000569621
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
            anomalies.add({
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
          legifranceTextDescription.titres.add(titleToParse)
          const simplifiedTitle = simplifyTextTitle(titleToParse)
          const context = new TextParserContext(simplifiedTitle)
          const titleParsing = definitionTexteFrancais(context) as
            | TextAstText
            | undefined
          if (titleParsing == null) {
            anomalies.add({
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
              anomalies.add({
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
            anomalies.add({
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
              anomalies.add({
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
                }).filter(([_key, value]) => value !== undefined),
              ) as AnalyseTitre,
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
          legifranceTextDescription.titres.add(title)
        }
      }
    }
  }

  if (generateAutocompletions) {
    const existingTitreTexteAutocompletionKeys = new Set(
      (
        await tisseuseDb<Array<{ autocompletion: string; id: string }>>`
          SELECT *
          FROM titre_texte_autocompletion
          WHERE id LIKE 'JORFTEXT%' OR id LIKE 'LEGITEXT%'
        `
      ).map(({ autocompletion, id }) => JSON.stringify([id, autocompletion])),
    )
    for (const { cid, titres } of legifranceTextDescriptionByCid.values()) {
      for (const titre of titres) {
        if (
          !existingTitreTexteAutocompletionKeys.delete(
            JSON.stringify([cid, titre]),
          )
        ) {
          await tisseuseDb`
            INSERT INTO titre_texte_autocompletion (
              autocompletion,
              id
            ) VALUES (
              ${titre},
              ${cid}
            )
          `
        }
      }
    }
    for (const obsoleteTitreTexteAutocompletionKey of existingTitreTexteAutocompletionKeys) {
      const [id, autocompletion] = JSON.parse(
        obsoleteTitreTexteAutocompletionKey,
      ) as [string, string]
      await tisseuseDb`
        DELETE FROM titre_texte_autocompletion
        WHERE
          id = ${id}
          AND autocompletion = ${autocompletion}
      `
    }
  }

  if (generateTextsInfosJson) {
    await fs.writeJson(
      "texts_infos.json",
      [...legifranceTextDescriptionByCid.entries()]
        .sort(([cid1], [cid2]) => cid1.localeCompare(cid2))
        .map(([_cid, legifranceTextDescription]) => ({
          legifrance: {
            ...legifranceTextDescription,
            titres: [...legifranceTextDescription.titres].sort(),
          },
        })),
      { encoding: "utf-8", replacer: jsonReplacer, spaces: 2 },
    )
  }

  await anomalies.save()

  return 0
}

function simplifyTextTitle(title: string): string {
  return chainTransformers("Simplification d'un titre de texte", [
    replacePatterns,
    simplifyUnicodeCharacters,
    simplifyText,
  ])(title).output
}

sade("extract_texts_infos", true)
  .describe(
    "Extract names of codes, laws, etc and convert them to JSON structures used for links, search, etc",
  )
  .option("-a, --autocompletion", "Generate autocompletions SQL table")
  .option("-j, --json", "Generate texts infos JSON file")
  .action(async (options) => {
    process.exit(await extractTextsInfos(options))
  })
  .parse(process.argv)
