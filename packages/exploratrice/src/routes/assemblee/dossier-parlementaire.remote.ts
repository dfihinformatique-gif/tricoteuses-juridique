import type { Document, DossierParlementaire } from "@tricoteuses/assemblee"
import {
  getOrLoadDocumentsByDossierParlementaireUid,
  getOrLoadDossierParlementaire,
  newAssembleeObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { DossierParlementaireUidSchema } from "$lib/zod/assemblee.js"
import { zodToStandardSchema } from "$lib/zod/standardschema.js"
import { assembleeDb, legiDb } from "$lib/server/databases/index.js"

import type { DossierParlementairePageInfos } from "./dossiers-parlementaires.js"

export const queryDossierParlementairePageInfos = query(
  zodToStandardSchema(DossierParlementaireUidSchema),
  async (uid): Promise<DossierParlementairePageInfos | undefined> => {
    const [dossierParlementaire, documents, legifranceTexteId] =
      await Promise.all([
        (async (): Promise<DossierParlementaire | undefined> =>
          await getOrLoadDossierParlementaire(
            assembleeDb,
            newAssembleeObjectCache(),
            uid,
          ))(),
        (async (): Promise<Document[]> =>
          await getOrLoadDocumentsByDossierParlementaireUid(
            assembleeDb,
            newAssembleeObjectCache(),
            uid,
          ))(),
        (async (): Promise<string | null> =>
          (
            await legiDb<
              Array<{
                id: string
              }>
            >`
          SELECT id
          FROM texte_version_dossier_legislatif_assemblee_associations
          WHERE assemblee_uid = ${uid}
        `
          )[0]?.id)(),
      ])
    if (dossierParlementaire === undefined) {
      return undefined
    }
    return Object.fromEntries(
      Object.entries({
        documentByUid:
          documents.length === 0
            ? undefined
            : Object.fromEntries(
                documents.map((document) => [document.uid, document]),
              ),
        dossierParlementaire,
        legifranceTexteId,
      }).filter(([, value]) => value != null),
    ) as unknown as DossierParlementairePageInfos
  },
)
