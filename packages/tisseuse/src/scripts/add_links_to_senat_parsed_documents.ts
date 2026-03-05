import * as git from "@tricoteuses/assemblee/git"
import { sessionOptions, Session, Article } from "@tricoteuses/senat"
import { iterLoadSenatTextes, TEXTE_FOLDER } from "@tricoteuses/senat/loaders"
import fs from "fs-extra"
import assert from "node:assert"
import path from "node:path"
import sade from "sade"

import { TextParserContext, addLinksToHtml, addLinksToText } from "$lib"
import config from "$lib/server/config.js"
import { europeDb, legiDb } from "$lib/server/databases/index.js"

const { linkBaseUrl, linkType } = config

async function addLinksToSenatParsedDocuments({
  commit,
  datasets: dataDir,
  force,
  html,
  session: sessionOrSessions,
  pull,
  remote,
  text,
  texcod: firstTexcod,
}: {
  commit?: boolean
  datasets: string
  force?: boolean
  html?: boolean
  session?: string | string[]
  pull?: boolean
  remote?: string
  text?: boolean
  texcod?: string
}): Promise<number> {
  assert(
    !commit || !firstTexcod,
    'Options "commit" & "texcod" are incompatible',
  )
  const sessions =
    sessionOrSessions === undefined || sessionOrSessions === "0"
      ? sessionOptions
      : Array.isArray(sessionOrSessions)
        ? sessionOrSessions
            .map((session) => parseInt(session))
            .filter((session) => sessionOptions.includes(session as Session))
        : [parseInt(sessionOrSessions)]

  const textesFilesDir = path.join(dataDir, TEXTE_FOLDER)
  if (pull) {
    git.resetAndPull(textesFilesDir)
  }
  await fs.ensureDir(textesFilesDir)

  let skip = Boolean(firstTexcod)
  for (const session of sessions) {
    for (const { filePathFromDataset, item: texte } of iterLoadSenatTextes(
      dataDir,
      session,
    )) {
      if (skip) {
        if (texte.texcod === firstTexcod) {
          skip = false
        } else {
          continue
        }
      }

      if (texte.divisions === undefined) {
        continue
      }

      const jsonFilePath = path.join(
        dataDir,
        TEXTE_FOLDER,
        filePathFromDataset!
          .replace(/^\/original\//, "transformed/")
          .replace(/\.html$/, ".json"),
      )

      let changed = false
      const date = (
        texte.date ??
        texte.date_presentation ??
        texte.date_depot ??
        texte.date_publication
      )?.split("T")[0] as string
      assert.notStrictEqual(date, undefined)
      let previousHtmlContext: TextParserContext | undefined = undefined
      let previousTextContext: TextParserContext | undefined = undefined
      for (const division of texte.divisions) {
        if (division.tag !== "article") {
          continue
        }
        const article = division as Article
        for (const alinea of article.alineas) {
          if (
            html &&
            alinea.html != null &&
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
            alinea.text != null &&
            (force || alinea.text_avec_liens === undefined)
          ) {
            const { context, output } = await addLinksToText({
              date,
              europeDb,
              legiDb,
              linkBaseUrl,
              linkType,
              previousContext: previousTextContext,
              text: alinea.text,
            })
            previousTextContext = context
            alinea.text_avec_liens = output
            changed = true
          }
        }
      }

      if (changed) {
        await fs.writeJson(jsonFilePath, texte, {
          encoding: "utf-8",
          spaces: 2,
        })
        console.log(`Added links to ${jsonFilePath}`)
      }
    }
  }

  if (commit) {
    return git.commitAndPush(
      textesFilesDir,
      "Ajout de nouveaux liens",
      remote === undefined ? undefined : [remote],
    )
  }

  return 0
}

sade("add_links_to_senat_parsed_textes", true)
  .describe(
    "Add links to HTML fragments (articles) of parsed Assemblée HTML textes",
  )
  .option("-c, --commit", "Commit links added to HTML fragments")
  .option("-d, --datasets", "Path of directory containing Assemblée datasets")
  .option("-f, --force", "Force generation of links even if they already exist")
  .option("-h, --html", "Add links to HTML of alineas")
  .option("-p, --pull", "Pull dataset before adding links to it")
  .option("-r, --remote", "Name of upstream repository to push to")
  .option("-s, --session", "Sénat session of dataset to use")
  .option("-t, --text", "Add links to texts of alineas")
  .option("-u, --texcod", "Resume script at texte with given UID")
  .action(async (options) => {
    process.exit(await addLinksToSenatParsedDocuments(options))
  })
  .parse(process.argv)
