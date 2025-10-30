import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import type { Document, DocumentFilesIndex } from "@tricoteuses/assemblee"
import { pathFromDocumentUid } from "@tricoteuses/assemblee/loaders"
import {
  getOrLoadDocument,
  newAssembleeObjectCache,
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
    cleanAudit,
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
        return {
          document,
          documentFileInfos,
          documentFilesIndex,
          documentHtml: await fs.readFile(documentPath, {
            encoding: "utf-8",
          }),
        }
      }
    }
    return undefined
  },
)
