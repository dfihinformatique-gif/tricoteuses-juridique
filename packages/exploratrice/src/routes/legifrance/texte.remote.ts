import {
  auditEmptyToNull,
  auditRequire,
  auditTrimString,
  cleanAudit,
} from "@auditors/core"
import {
  auditLegalId,
  type JorfTexteVersion,
  type LegiTexteVersion,
} from "@tricoteuses/legifrance"
import {
  getOrLoadTextelr,
  getOrLoadTextesVersions,
  newLegifranceObjectCache,
} from "@tricoteuses/tisseuse"

import { query } from "$app/server"
import { standardSchemaV1 } from "$lib/auditors/standardschema.js"
import { legiDb } from "$lib/server/databases/index.js"

import type { TextePageInfos } from "./texte.js"

export const queryTextePageInfos = query(
  standardSchemaV1<string>(
    cleanAudit,
    auditTrimString,
    auditEmptyToNull,
    auditLegalId,
    auditRequire,
  ),
  async (id): Promise<TextePageInfos> => {
    const legifranceObjectCache = newLegifranceObjectCache()
    const [textelr, texteVersionWithLinks, dossierLegislatifAssembleeUid] =
      await Promise.all([
        (async () => getOrLoadTextelr(legiDb, legifranceObjectCache, id))(),
        (async (): Promise<{
          abro?: string
          nota?: string
          notice?: string
          signataires?: string
          sm?: string
          texteVersion: JorfTexteVersion | LegiTexteVersion
          tp?: string
          visas?: string
        } | null> =>
          (
            await legiDb<
              Array<{
                abro: string | null
                data: JorfTexteVersion | LegiTexteVersion
                nota: string | null
                notice: string | null
                signataires: string | null
                sm: string | null
                tp: string | null
                visas: string | null
              }>
            >`
              SELECT
                abro,
                data,
                nota,
                notice,
                signataires,
                sm,
                tp,
                visas
              FROM texte_version
              LEFT JOIN texte_contenu_avec_liens ON texte_version.id = texte_contenu_avec_liens.id
              WHERE texte_version.id = ${id}
            `
          ).map(
            ({
              abro,
              data: texteVersion,
              nota,
              notice,
              signataires,
              sm,
              tp,
              visas,
            }) =>
              Object.fromEntries(
                Object.entries({
                  abro,
                  nota,
                  notice,
                  signataires,
                  sm,
                  texteVersion,
                  tp,
                  visas,
                }),
              ) as {
                abro?: string
                nota?: string
                notice?: string
                signataires?: string
                sm?: string
                texteVersion: JorfTexteVersion | LegiTexteVersion
                tp?: string
                visas?: string
              },
          )[0])(),
        (async (): Promise<string | null> =>
          (
            await legiDb<
              Array<{
                assemblee_uid: string
              }>
            >`
              SELECT
              assemblee_uid
              FROM texte_version_dossier_legislatif_assemblee_associations
              WHERE id = ${id}
            `
          )[0]?.assemblee_uid)(),
      ])
    const otherVersionsTextesVersions =
      textelr === undefined
        ? []
        : await getOrLoadTextesVersions(
            legiDb,
            legifranceObjectCache,
            textelr.VERSIONS.VERSION.map(
              (versionTextelr) => versionTextelr.LIEN_TXT["@id"],
            ).filter((versionTextelrId) => versionTextelrId !== id),
          )

    return Object.fromEntries(
      Object.entries({
        otherVersionsTextesVersions,
        textelr,
        ...(texteVersionWithLinks ?? {}),
        dossierLegislatifAssembleeUid,
      }).filter(([, value]) => value !== null),
    ) as unknown as TextePageInfos
  },
)
