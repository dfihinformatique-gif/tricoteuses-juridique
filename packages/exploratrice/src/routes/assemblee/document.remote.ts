import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  strictAudit,
} from "@auditors/core"
import type { Document, DocumentFilesIndex } from "@tricoteuses/assemblee"
import { pathFromDocumentUid } from "@tricoteuses/assemblee/loaders"
import { slugify } from "@tricoteuses/legifrance"
import {
  getOrLoadDocument,
  newAssembleeObjectCache,
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  walkTableOfContents,
  type TableOfContentsArticlePositioned,
  type TableOfContentsDivisionPositioned,
  type TableOfContentsPositioned,
} from "@tricoteuses/tisseuse"
import fs from "fs-extra"
import path from "node:path"

import { query } from "$app/server"
import { auditDocumentUid } from "$lib/auditors/assemblee.js"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import config from "$lib/server/config.js"
import { assembleeDb } from "$lib/server/databases/index.js"

import type { DocumentPageInfos } from "./documents.js"

export const queryDocumentPageInfos = query(
  standardSchemaV1<string>(
    strictAudit,
    auditTrimString,
    auditEmptyToNull,
    auditDocumentUid,
    auditRequire,
  ),
  async (uid): Promise<DocumentPageInfos | undefined> => {
    let documentDir: string
    try {
      documentDir = pathFromDocumentUid(config.assembleeDocumentsDir, uid)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EACCES") {
        // Permission Denied (EACCES).
        return undefined
      }
      throw error
    }
    const [document, documentFilesIndex] = await Promise.all([
      (async (): Promise<Document | undefined> =>
        await getOrLoadDocument(assembleeDb, newAssembleeObjectCache(), uid))(),
      (async (): Promise<DocumentFilesIndex | undefined> => {
        if (!(await fs.pathExists(documentDir))) {
          return undefined
        }
        const indexPath = path.join(documentDir, "index.json")
        if (!(await fs.pathExists(indexPath))) {
          return undefined
        }
        return (await fs.readJson(indexPath, {
          encoding: "utf-8",
        })) as DocumentFilesIndex
      })(),
    ])
    if (document === undefined || documentFilesIndex === undefined) {
      return undefined
    }
    const documentFileInfos =
      documentFilesIndex["raw-html"]?.find(
        (documentFileInfos) => documentFileInfos.status === 200,
      ) ??
      documentFilesIndex.html?.find(
        (documentFileInfos) => documentFileInfos.status === 200,
      )
    if (
      documentFileInfos === undefined ||
      documentFileInfos.filename === undefined
    ) {
      return undefined
    }
    for (const currentDocumentDir of [
      documentDir.replace("/Documents/", "/Documents_enrichi/"),
      documentDir,
    ]) {
      const documentPath = path.join(
        currentDocumentDir,
        documentFileInfos.filename,
      )
      if (await fs.pathExists(documentPath)) {
        let documentHtml = await fs.readFile(documentPath, {
          encoding: "utf-8",
        })
        const documentSegmentationPath = documentPath.replace(
          /\.html$/,
          "_segmentation.json",
        )
        const documentSegmentation = (await fs.pathExists(
          documentSegmentationPath,
        ))
          ? ((await fs.readJson(documentSegmentationPath, {
              encoding: "utf-8",
            })) as TableOfContentsPositioned)
          : undefined
        if (documentSegmentation !== undefined) {
          let offset = 0
          for (const {
            line,
            originalTransformation,
            type,
          } of walkTableOfContents(documentSegmentation) as Iterable<
            | TableOfContentsArticlePositioned
            | TableOfContentsDivisionPositioned,
            void,
            unknown
          >) {
            if (type !== "article") {
              continue
            }
            const innerFragment = reverseTransformedInnerFragment(
              documentHtml,
              originalTransformation,
              offset,
            )
            const replacement = reverseTransformedReplacement(
              originalTransformation,
              `<a id="tricoteuses-${slugify(line)}" style="scroll-margin-top: 3em">${innerFragment}</a>`,
            )
            documentHtml =
              documentHtml.slice(
                0,
                originalTransformation.position.start + offset,
              ) +
              replacement +
              documentHtml.slice(originalTransformation.position.stop + offset)
            offset +=
              replacement.length -
              (originalTransformation.position.stop -
                originalTransformation.position.start)
          }
        }
        return {
          document,
          documentFileInfos,
          documentFilesIndex,
          documentHtml,
          documentSegmentation,
        }
      }
    }
    return undefined
  },
)
