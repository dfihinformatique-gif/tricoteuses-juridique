import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"
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
  async (uid): Promise<DocumentPageInfos> => {
    const documentDir = pathFromDocumentUid(config.assembleeDocumentsDir, uid)
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
      error(404)
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
      error(404)
    }
    const documentPath = path.join(documentDir, documentFileInfos.filename)
    if (!(await fs.pathExists(documentPath))) {
      error(404)
    }
    return {
      document,
      documentFileInfos,
      documentFilesIndex,
      documentHtml: await fs.readFile(documentPath, { encoding: "utf-8" }),
    }
  },
)
