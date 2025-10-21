import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import { error } from "@sveltejs/kit"
import type { Document, DossierParlementaire } from "@tricoteuses/assemblee"
import {
  getOrLoadDocumentsByDossierParlementaireUid,
  getOrLoadDossierParlementaire,
  newAssembleeObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { auditDossierParlementaireUid } from "$lib/auditors/assemblee.js"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { assembleeDb, legiDb } from "$lib/server/databases/index.js"

import type { DossierParlementairePageInfos } from "./dossiers_parlementaires.js"

export const queryDossierParlementairePageInfos = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditDossierParlementaireUid,
    auditRequire,
  ),
  async (uid): Promise<DossierParlementairePageInfos> => {
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
      error(404)
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
