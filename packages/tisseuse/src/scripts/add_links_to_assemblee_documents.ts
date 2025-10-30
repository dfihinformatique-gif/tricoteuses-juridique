import { walkDocumentAndDivisions } from "@tricoteuses/assemblee"
import * as git from "@tricoteuses/assemblee/git"
import {
  iterLoadAssembleeDocuments,
  pathFromDocumentUid,
} from "@tricoteuses/assemblee/loaders"
import { gitPathFromId } from "@tricoteuses/legifrance"
import fs from "fs-extra"
import assert from "node:assert"
import path from "node:path"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { legiDb } from "$lib/server/databases/index.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import { parseTextLinks } from "$lib/text_parsers/text_links.js"
import {
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
} from "$lib/text_parsers/transformers.js"

async function addLinksToAssembleeDocuments({
  commit,
  datasets: dataDir,
  full,
  legislature,
  pull,
  remote,
  uid: firstUid,
}: {
  commit?: boolean
  datasets: string
  full?: boolean
  legislature: string
  pull?: boolean
  remote?: string
  uid?: string
}): Promise<number> {
  assert(!commit || !firstUid, 'Options "commit" & "uid" are incompatible')

  const documentsFilesDir = path.join(dataDir, "Documents")
  const enrichedDocumentsFilesDir = path.join(dataDir, "Documents_enrichi")
  if (pull) {
    git.resetAndPull(documentsFilesDir)
  }
  await fs.ensureDir(documentsFilesDir)

  let skip = Boolean(firstUid)
  for (const { document } of iterLoadAssembleeDocuments(
    dataDir,
    parseInt(legislature),
  )) {
    // Ignore documents from Sénat, except RAPP.
    if (
      document.uid.substring(4, 6) === "SN" &&
      !document.uid.startsWith("RAPP")
    ) {
      continue
    }

    if (skip) {
      if (document.uid === firstUid) {
        skip = false
      } else {
        continue
      }
    }

    const date = (
      document.cycleDeVie.chrono.dateCreation ??
      document.cycleDeVie.chrono.dateDepot ??
      document.cycleDeVie.chrono.datePublication ??
      document.cycleDeVie.chrono.datePublicationWeb
    )?.toString() as string
    assert.notStrictEqual(date, undefined)

    const documentsFilesDir = path.join(dataDir, "Documents")
    const documentFilesDir = pathFromDocumentUid(
      documentsFilesDir,
      document.uid,
    )
    const htmlPath = path.join(documentFilesDir, "dyn-opendata.html")
    if (!(await fs.pathExists(htmlPath))) {
      continue
    }
    const html = await fs.readFile(htmlPath, { encoding: "utf-8" })
    const transformation = simplifyHtml({ removeAWithHref: true })(html)
    const context = new TextParserContext(transformation.output)
    let output = html
    let outputOffset = 0

    for await (const link of parseTextLinks({
      context,
      date,
      legiDb,
      // logIgnoredReferencesTypes,
      // logPartialReferences,
      // logReferences,
      // state: { defaultTextId },
      transformation,
    })) {
      switch (link.type) {
        case "article_definition": {
          const {
            article,
            originalTransformation: articleOriginalTransformation,
            textId,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in article definition: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<span class="definition_article" id="definition_article_${textId}_${article.num!}">${original}</span>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        case "external_article": {
          const {
            articleId,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleId !== undefined) {
            if (articleOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external article link: ${JSON.stringify(link, null, 2)}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              articleOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              articleOriginalTransformation,
              `<a class="lien_article_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                articleOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                articleOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (articleOriginalTransformation.position.stop -
                articleOriginalTransformation.position.start)
          }
          break
        }

        case "external_division": {
          const {
            originalTransformation: divisionOriginalTransformation,
            sectionTaId,
          } = link
          if (sectionTaId !== undefined) {
            if (divisionOriginalTransformation === undefined) {
              throw new Error(
                `Missing originalTransformation attribute in external division link: ${JSON.stringify(link, null, 2)}`,
              )
            }
            const original = reverseTransformedInnerFragment(
              output,
              divisionOriginalTransformation,
              outputOffset,
            )
            const replacement = reverseTransformedReplacement(
              divisionOriginalTransformation,
              `<a class="lien_division_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>`,
            )
            output =
              output.slice(
                0,
                divisionOriginalTransformation.position.start + outputOffset,
              ) +
              replacement +
              output.slice(
                divisionOriginalTransformation.position.stop + outputOffset,
              )
            outputOffset +=
              replacement.length -
              (divisionOriginalTransformation.position.stop -
                divisionOriginalTransformation.position.start)
          }
          break
        }

        case "external_text": {
          const { originalTransformation: texteOriginalTransformation, text } =
            link
          if (text.cid === undefined) {
            if (text.relative !== 0) {
              // It is not "la présente loi".
              // Note: Don't throw an exception because it occurs for all kinds of non handled texts (conventions,
              // décrets, etc).
              console.error(
                `Link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
              )
            }
            continue
          }

          if (texteOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in external text link: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            texteOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            texteOriginalTransformation,
            `<a class="lien_texte_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>`,
          )
          output =
            output.slice(
              0,
              texteOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              texteOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (texteOriginalTransformation.position.stop -
              texteOriginalTransformation.position.start)
          break
        }

        case "internal_article": {
          const {
            definition,
            originalTransformation: articleOriginalTransformation,
          } = link
          if (articleOriginalTransformation === undefined) {
            throw new Error(
              `Missing originalTransformation attribute in internal article link: ${JSON.stringify(link, null, 2)}`,
            )
          }
          const original = reverseTransformedInnerFragment(
            output,
            articleOriginalTransformation,
            outputOffset,
          )
          const replacement = reverseTransformedReplacement(
            articleOriginalTransformation,
            `<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>`,
          )
          output =
            output.slice(
              0,
              articleOriginalTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleOriginalTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleOriginalTransformation.position.stop -
              articleOriginalTransformation.position.start)
          break
        }

        default: {
          assertNever("Link", link)
        }
      }
    }

    const enrichedDocumentFilesDir = pathFromDocumentUid(
      enrichedDocumentsFilesDir,
      document.uid,
    )
    await fs.ensureDir(enrichedDocumentFilesDir)
    const enrichedHtmlPath = path.join(
      enrichedDocumentFilesDir,
      "dyn-opendata.html",
    )
    await fs.writeFile(enrichedHtmlPath, output, { encoding: "utf-8" })
    console.log(`Added links to ${enrichedHtmlPath}`)
  }

  if (commit) {
    return git.commitAndPush(
      documentsFilesDir,
      "Ajout de liens",
      remote === undefined ? undefined : [remote],
    )
  }

  return 0
}

sade("add_links_to_assemblee_documents", true)
  .describe("Add links to Assemblée HTML documents")
  .option("-c, --commit", "Commit links added to HTML fragments")
  .option("-d, --datasets", "Path of directory containing Assemblée datasets")
  .option(
    "-f, --full",
    "Add links to every documents, even already linked ones",
  )
  .option("-l, --legislature", "Legislature of dataset to use")
  .option("-p, --pull", "Pull dataset before adding links to it")
  .option("-r, --remote", "Name of upstream repository to push to")
  .option("-u, --uid", "Resume script at document with given UID")
  .action(async (options) => {
    process.exit(await addLinksToAssembleeDocuments(options))
  })
  .parse(process.argv)
