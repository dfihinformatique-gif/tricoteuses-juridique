import {
  legislatureOptions,
  walkDocumentAndDivisions,
  type Subdivision,
} from "@tricoteuses/assemblee"
import * as git from "@tricoteuses/assemblee/git"
import {
  iterLoadAssembleeDocuments,
  pathFromDocumentUid,
} from "@tricoteuses/assemblee/loaders"
import fs from "fs-extra"
import assert from "node:assert"
import path from "node:path"
import sade from "sade"

import { TextParserContext, addLinksToHtml, addLinksToText } from "$lib"
import config from "$lib/server/config.js"
import { europeDb, legiDb } from "$lib/server/databases/index.js"

const { linkBaseUrl, linkType } = config

async function addLinksToAssembleeParsedDocuments({
  commit,
  datasets: dataDir,
  force,
  html,
  legislature: legislatureOrLegislatures,
  pull,
  remote,
  text,
  uid: firstUid,
}: {
  commit?: boolean
  datasets: string
  force?: boolean
  html?: boolean
  legislature?: string | string[]
  pull?: boolean
  remote?: string
  text?: boolean
  uid?: string
}): Promise<number> {
  assert(!commit || !firstUid, 'Options "commit" & "uid" are incompatible')
  const legislatures =
    legislatureOrLegislatures === undefined || legislatureOrLegislatures === "0"
      ? legislatureOptions
      : Array.isArray(legislatureOrLegislatures)
        ? legislatureOrLegislatures
            .map((legislature) => parseInt(legislature))
            .filter((legislature) => legislatureOptions.includes(legislature))
        : [parseInt(legislatureOrLegislatures)]

  const documentsFilesDir = path.join(dataDir, "Documents")
  if (pull) {
    git.resetAndPull(documentsFilesDir)
  }
  await fs.ensureDir(documentsFilesDir)

  let skip = Boolean(firstUid)
  for (const legislature of legislatures) {
    for (const {
      document,
      filePath: documentPath,
    } of iterLoadAssembleeDocuments(dataDir, legislature)) {
      for (const documentOrDivision of walkDocumentAndDivisions(document)) {
        if (skip) {
          if (documentOrDivision.uid === firstUid) {
            skip = false
          } else {
            continue
          }
        }

        const documentOrDivisionFilesDir = pathFromDocumentUid(
          documentsFilesDir,
          documentOrDivision.uid,
        )
        const subdivisionsPath = path.join(
          documentOrDivisionFilesDir,
          "dyn-opendata_subdivisions.json",
        )
        if (!(await fs.pathExists(subdivisionsPath))) {
          continue
        }
        const subdivisions = (await fs.readJson(subdivisionsPath, {
          encoding: "utf-8",
        })) as Subdivision[]

        let changed = false
        const date = (
          documentOrDivision.cycleDeVie.chrono.dateCreation ??
          documentOrDivision.cycleDeVie.chrono.dateDepot ??
          documentOrDivision.cycleDeVie.chrono.datePublication ??
          documentOrDivision.cycleDeVie.chrono.datePublicationWeb
        )
          ?.toISOString()
          .split("T")[0] as string
        assert.notStrictEqual(date, undefined)
        let previousHtmlContext: TextParserContext | undefined = undefined
        let previousTextContext: TextParserContext | undefined = undefined
        for (const subdivision of subdivisions) {
          const { alineas } = subdivision
          if (alineas == null) {
            continue
          }
          for (const alinea of alineas) {
            if (
              html &&
              alinea.html !== undefined &&
              (force || alinea.html_avec_liens === undefined)
            ) {
              const { context, output } = await addLinksToHtml({
                date,
                europeDb,
                html: alinea.html,
                legiDb,
                linkBaseUrl,
                linkType,
                previousContext: previousHtmlContext,
              })
              previousHtmlContext = context
              alinea.html_avec_liens = output
              changed = true
            }

            if (
              text &&
              alinea.texte !== undefined &&
              (force || alinea.texte_avec_liens === undefined)
            ) {
              const { context, output } = await addLinksToText({
                date,
                europeDb,
                legiDb,
                linkBaseUrl,
                linkType,
                previousContext: previousTextContext,
                text: alinea.texte,
              })
              previousTextContext = context
              alinea.texte_avec_liens = output
              changed = true
            }
          }
        }

        if (changed) {
          await fs.writeJson(subdivisionsPath, subdivisions, {
            encoding: "utf-8",
            spaces: 2,
          })
          console.log(`Added links to ${documentPath}`)
        }
      }
    }
  }

  if (commit) {
    return git.commitAndPush(
      documentsFilesDir,
      "Ajout de nouveaux liens",
      remote === undefined ? undefined : [remote],
    )
  }

  return 0
}

sade("add_links_to_assemblee_parsed_documents", true)
  .describe(
    "Add links to HTML fragments (articles) of parsed Assemblée HTML documents",
  )
  .option("-c, --commit", "Commit links added to HTML fragments")
  .option("-d, --datasets", "Path of directory containing Assemblée datasets")
  .option("-f, --force", "Force generation of links even if they already exist")
  .option("-h, --html", "Add links to HTML of alineas")
  .option("-l, --legislature", "Legislature of dataset to use")
  .option("-p, --pull", "Pull dataset before adding links to it")
  .option("-r, --remote", "Name of upstream repository to push to")
  .option("-t, --text", "Add links to texts of alineas")
  .option("-u, --uid", "Resume script at document with given UID")
  .action(async (options) => {
    process.exit(await addLinksToAssembleeParsedDocuments(options))
  })
  .parse(process.argv)
