import {
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

import {
  assertNever,
  parseTextLinks,
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  simplifyHtml,
  simplifyPlainText,
  TextParserContext,
  urlFromLegalId,
} from "$lib"
import config from "$lib/server/config.js"
import { legiDb } from "$lib/server/databases/index.js"

const { linkBaseUrl, linkType } = config

async function addLinksToAssembleeParsedDocuments({
  commit,
  datasets: dataDir,
  force,
  html,
  legislature,
  pull,
  remote,
  text,
  uid: firstUid,
}: {
  commit?: boolean
  datasets: string
  force?: boolean
  html?: boolean
  legislature: string
  pull?: boolean
  remote?: string
  text?: boolean
  uid?: string
}): Promise<number> {
  assert(!commit || !firstUid, 'Options "commit" & "uid" are incompatible')

  const documentsFilesDir = path.join(dataDir, "Documents")
  if (pull) {
    git.resetAndPull(documentsFilesDir)
  }
  await fs.ensureDir(documentsFilesDir)

  let skip = Boolean(firstUid)
  for (const { document, filePath: documentPath } of iterLoadAssembleeDocuments(
    dataDir,
    parseInt(legislature),
  )) {
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
      )?.toString() as string
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
            const transformation = simplifyHtml({ removeAWithHref: true })(
              alinea.html,
            )
            const context = new TextParserContext(transformation.output)
            context.currentArticle = previousHtmlContext?.currentArticle
            context.currentText = previousHtmlContext?.currentText
            previousHtmlContext = context
            let output = alinea.html
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
                      articleOriginalTransformation.position.start +
                        outputOffset,
                    ) +
                    replacement +
                    output.slice(
                      articleOriginalTransformation.position.stop +
                        outputOffset,
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
                      `<a class="lien_article_externe" href="${urlFromLegalId(linkType, linkBaseUrl, articleId)}">${original}</a>`,
                    )
                    output =
                      output.slice(
                        0,
                        articleOriginalTransformation.position.start +
                          outputOffset,
                      ) +
                      replacement +
                      output.slice(
                        articleOriginalTransformation.position.stop +
                          outputOffset,
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
                      `<a class="lien_division_externe" href="${urlFromLegalId(linkType, linkBaseUrl, sectionTaId)}">${original}</a>`,
                    )
                    output =
                      output.slice(
                        0,
                        divisionOriginalTransformation.position.start +
                          outputOffset,
                      ) +
                      replacement +
                      output.slice(
                        divisionOriginalTransformation.position.stop +
                          outputOffset,
                      )
                    outputOffset +=
                      replacement.length -
                      (divisionOriginalTransformation.position.stop -
                        divisionOriginalTransformation.position.start)
                  }
                  break
                }

                case "external_text": {
                  const {
                    originalTransformation: texteOriginalTransformation,
                    text,
                  } = link
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
                    `<a class="lien_texte_externe" href="${urlFromLegalId(linkType, linkBaseUrl, text.cid!)}">${original}</a>`,
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
                      articleOriginalTransformation.position.start +
                        outputOffset,
                    ) +
                    replacement +
                    output.slice(
                      articleOriginalTransformation.position.stop +
                        outputOffset,
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

            alinea.html_avec_liens = output === alinea.html ? null : output
            changed = true
          }

          if (
            text &&
            alinea.texte !== undefined &&
            (force || alinea.texte_avec_liens === undefined)
          ) {
            const transformation = simplifyPlainText(alinea.texte)
            const context = new TextParserContext(transformation.output)
            context.currentArticle = previousTextContext?.currentArticle
            context.currentText = previousTextContext?.currentText
            previousTextContext = context
            let output = alinea.texte
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
                  // TODO: We could use an HTML span to set an ID, butI don't know if Legiwatch will support it.
                  // const {
                  //   article,
                  //   originalTransformation: articleOriginalTransformation,
                  //   textId,
                  // } = link
                  // if (articleOriginalTransformation === undefined) {
                  //   throw new Error(
                  //     `Missing originalTransformation attribute in article definition: ${JSON.stringify(link, null, 2)}`,
                  //   )
                  // }
                  // const original = reverseTransformedInnerFragment(
                  //   output,
                  //   articleOriginalTransformation,
                  //   outputOffset,
                  // )
                  // const replacement = reverseTransformedReplacement(
                  //   articleOriginalTransformation,
                  //   `<span class="definition_article" id="definition_article_${textId}_${article.num!}">${original}</span>`,
                  // )
                  // output =
                  //   output.slice(
                  //     0,
                  //     articleOriginalTransformation.position.start +
                  //       outputOffset,
                  //   ) +
                  //   replacement +
                  //   output.slice(
                  //     articleOriginalTransformation.position.stop +
                  //       outputOffset,
                  //   )
                  // outputOffset +=
                  //   replacement.length -
                  //   (articleOriginalTransformation.position.stop -
                  //     articleOriginalTransformation.position.start)
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
                      `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, articleId)})`,
                    )
                    output =
                      output.slice(
                        0,
                        articleOriginalTransformation.position.start +
                          outputOffset,
                      ) +
                      replacement +
                      output.slice(
                        articleOriginalTransformation.position.stop +
                          outputOffset,
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
                      `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, sectionTaId)})`,
                    )
                    output =
                      output.slice(
                        0,
                        divisionOriginalTransformation.position.start +
                          outputOffset,
                      ) +
                      replacement +
                      output.slice(
                        divisionOriginalTransformation.position.stop +
                          outputOffset,
                      )
                    outputOffset +=
                      replacement.length -
                      (divisionOriginalTransformation.position.stop -
                        divisionOriginalTransformation.position.start)
                  }
                  break
                }

                case "external_text": {
                  const {
                    originalTransformation: texteOriginalTransformation,
                    text,
                  } = link
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
                    `[${escapeMarkdownLinkTitle(original)}](${urlFromLegalId(linkType, linkBaseUrl, text.cid!)})`,
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
                    `[${escapeMarkdownLinkTitle(original)}](#definition_article_${definition.textId}_${definition.article.num!})`,
                  )
                  output =
                    output.slice(
                      0,
                      articleOriginalTransformation.position.start +
                        outputOffset,
                    ) +
                    replacement +
                    output.slice(
                      articleOriginalTransformation.position.stop +
                        outputOffset,
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

            alinea.texte_avec_liens = output === alinea.texte ? null : output
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

  if (commit) {
    return git.commitAndPush(
      documentsFilesDir,
      "Ajout de nouveaux liens",
      remote === undefined ? undefined : [remote],
    )
  }

  return 0
}

// Taken from Tricoteuses Légifrance
function escapeMarkdownLinkTitle<StringOrUndefined extends string | undefined>(
  s: StringOrUndefined,
): StringOrUndefined {
  return s
    ?.replace(/\s+/g, " ")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]") as StringOrUndefined
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
