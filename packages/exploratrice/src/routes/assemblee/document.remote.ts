import { z } from "zod"
import type { Document, DocumentFilesIndex } from "@tricoteuses/assemblee"
import { pathFromDocumentUid } from "@tricoteuses/assemblee/loaders"
import { slugify } from "@tricoteuses/legifrance"
import {
  getOrLoadDocument,
  newAssembleeObjectCache,
  reverseTransformedInnerFragment,
  reverseTransformedReplacement,
  walkTableOfContents,
  type SourceMapSegment,
  type TableOfContentsArticlePositioned,
  type TableOfContentsDivisionPositioned,
  type TableOfContentsPositioned,
  type Transformation,
} from "@tricoteuses/tisseuse"
import { readTransformation } from "@tricoteuses/tisseuse/server"
import fs from "fs-extra"
import path from "node:path"

import { query } from "$app/server"
import { DocumentUidSchema } from "$lib/zod/assemblee.js"
import { zodToStandardSchema } from "$lib/zod/standardschema.js"
import config from "$lib/server/config.js"
import { assembleeDb } from "$lib/server/databases/index.js"

import type { DocumentPageInfos, DocumentsDiffPageInfos } from "./documents.js"

const loadDocumentPageInfos = async (
  uid: string,
  {
    idPrefix = "tricoteuses-",
    transformation,
  }: { idPrefix?: string; transformation?: boolean } = {},
): Promise<DocumentPageInfos | undefined> => {
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
      const documentOriginalHtml = await fs.readFile(documentPath, {
        encoding: "utf-8",
      })
      let documentHtml = documentOriginalHtml

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
      const sourceMap: SourceMapSegment[] = []
      if (documentSegmentation !== undefined) {
        // Add segmentation for table of contents.
        // This segmentation will also be added as a first transformation from HTML to text.
        let offset = 0
        for (const {
          line,
          originalTransformation,
          type,
        } of walkTableOfContents(documentSegmentation) as Iterable<
          TableOfContentsArticlePositioned | TableOfContentsDivisionPositioned,
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
            `<a id="${idPrefix}${slugify(line)}" style="scroll-margin-top: 3em">${innerFragment}</a>`,
          )
          const replacementStart =
            originalTransformation.position.start + offset
          const existingLength =
            originalTransformation.position.stop -
            originalTransformation.position.start
          documentHtml =
            documentHtml.slice(0, replacementStart) +
            replacement +
            documentHtml.slice(originalTransformation.position.stop + offset)
          sourceMap.push({
            inputIndex: replacementStart,
            inputLength: replacement.length,
            outputIndex: originalTransformation.position.start,
            outputLength: existingLength,
          })
          offset += replacement.length - existingLength
        }
      }

      let documentTransformation: Transformation | undefined = undefined
      const documentTransformationPath = documentPath.replace(
        /\.html$/,
        "_transformation",
      )
      if (transformation && (await fs.pathExists(documentTransformationPath))) {
        documentTransformation = readTransformation(
          documentHtml,
          documentTransformationPath,
        )
        if (documentSegmentation !== undefined) {
          // Add table of contents segmentation as a first transformation.
          documentTransformation = {
            input: documentHtml,
            output: documentTransformation.output,
            transformations: [
              {
                input: documentHtml,
                output: documentOriginalHtml,
                sourceMap,
                title: "Ajout des ancres pour le sommaire",
              },
              documentTransformation,
            ],
            title:
              "Simplification du HTML et ajout des ancres pour le sommaire",
          }
        }
      }

      return {
        document,
        documentFileInfos,
        documentFilesIndex,
        documentHtml,
        documentSegmentation,
        documentTransformation,
      }
    }
  }
  return undefined
}

export const queryDocumentPageInfos = query(
  zodToStandardSchema(DocumentUidSchema),
  async (uid): Promise<DocumentPageInfos | undefined> =>
    await loadDocumentPageInfos(uid),
)

export const queryDocumentsDiffPageInfos = query(
  zodToStandardSchema(
    z
      .array(DocumentUidSchema)
      .length(2, "Expected a couple, got an array of different size")
      .transform((arr) => arr as [string, string])
  ),
  async ([previousUid, currentUid]): Promise<DocumentsDiffPageInfos> => {
    const [previous, current] = await Promise.all([
      loadDocumentPageInfos(previousUid, {
        idPrefix: "tricoteuses-avant-",
        transformation: true,
      }),
      loadDocumentPageInfos(currentUid, {
        idPrefix: "tricoteuses-apres-",
        transformation: true,
      }),
    ])
    return { current, previous }
  },
)
