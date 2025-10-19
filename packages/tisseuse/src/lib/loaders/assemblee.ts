import type { Document, DossierParlementaire } from "@tricoteuses/assemblee"
import type { JSONValue, Sql } from "postgres"

import type { AssembleeObjectCache } from "$lib/cache.js"

export async function getOrLoadDocument(
  assembleeDb: Sql,
  assembleeObjectCache: AssembleeObjectCache,
  uid: string,
): Promise<Document | undefined> {
  let documentCache = assembleeObjectCache.get("Document")
  if (documentCache === undefined) {
    documentCache = new Map()
    assembleeObjectCache.set("Document", documentCache)
  }
  let document = documentCache.get(uid) as Document | undefined | null
  if (document === undefined) {
    document = (
      await assembleeDb<
        Array<{
          data: Document
        }>
      >`
        SELECT data
        FROM documents
        WHERE uid = ${uid}
      `
    )[0]?.data
    documentCache.set(uid, (document as unknown as JSONValue) ?? null)
  }
  return document ?? undefined
}

export async function getOrLoadDocumentsByDossierParlementaireUid(
  assembleeDb: Sql,
  assembleeObjectCache: AssembleeObjectCache,
  dossierUid: string,
): Promise<Document[]> {
  let documentCache = assembleeObjectCache.get("Document")
  if (documentCache === undefined) {
    documentCache = new Map()
    assembleeObjectCache.set("Document", documentCache)
  }
  return (
    await assembleeDb<
      Array<{
        data: Document
        uid: string
      }>
    >`
      SELECT data, uid
      FROM documents
      WHERE dossier_uid = ${dossierUid}
    `
  ).map(({ data: document, uid }) => {
    documentCache.set(uid, (document as unknown as JSONValue) ?? null)
    return document
  })
}

export async function getOrLoadDossierParlementaire(
  assembleeDb: Sql,
  assembleeObjectCache: AssembleeObjectCache,
  uid: string,
): Promise<DossierParlementaire | undefined> {
  let dossierCache = assembleeObjectCache.get("DossierParlementaire")
  if (dossierCache === undefined) {
    dossierCache = new Map()
    assembleeObjectCache.set("DossierParlementaire", dossierCache)
  }
  let dossier = dossierCache.get(uid) as DossierParlementaire | undefined | null
  if (dossier === undefined) {
    dossier = (
      await assembleeDb<
        Array<{
          data: DossierParlementaire
        }>
      >`
        SELECT data
        FROM dossiers
        WHERE uid = ${uid}
      `
    )[0]?.data
    dossierCache.set(uid, (dossier as unknown as JSONValue) ?? null)
  }
  return dossier ?? undefined
}
