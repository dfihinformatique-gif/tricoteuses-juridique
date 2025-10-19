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
import { assembleeDb } from "$lib/server/databases/index.js"

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
    const [dossierParlementaire, documents] = await Promise.all([
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
      }).filter(([, value]) => value != null),
    ) as unknown as DossierParlementairePageInfos
  },
)
