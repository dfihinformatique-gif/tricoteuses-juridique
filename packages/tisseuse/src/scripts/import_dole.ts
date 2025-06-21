import assert from "assert"
import nodegit from "nodegit"
import path from "path"
import type { JSONValue } from "postgres"
import sade from "sade"

import type { DossierLegislatif } from "$lib/legal/dole.js"
import type { JorfTextelr } from "$lib/legal/jorf.js"
import { parseDossierLegislatif } from "$lib/parsers/dole.js"
import { db } from "$lib/server/databases/index.js"
import { walkTree } from "$lib/server/nodegit/trees.js"

async function importDole(
  dilaDir: string,
  { resume, verbose }: { resume?: string; verbose?: boolean } = {},
): Promise<void> {
  let skip = resume !== undefined
  const deleteRemainingIds = !skip

  const dossierLegislatifRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM dossier_legislatif
      `
    ).map(({ id }) => id),
  )

  const repository = await nodegit.Repository.open(
    path.join(dilaDir, "dole.git"),
  )
  const headReference = await repository.head()
  const commit = await repository.getCommit(headReference.target())
  const tree = await commit.getTree()

  iterXmlFiles: for await (const entry of walkTree(repository, tree)) {
    if (entry.isTree()) {
      continue
    }

    const filePath = entry.path()
    if (skip) {
      if (filePath.startsWith(resume as string)) {
        skip = false
        console.log(`Resuming at file ${filePath}...`)
      } else {
        continue
      }
    }

    if (!filePath.endsWith(".xml")) {
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    try {
      const blob = await entry.getBlob()
      const buffer = blob.content()
      const xmlString = buffer.toString("utf8")
      const dossierLegislatif = parseDossierLegislatif(filePath, xmlString)
      if (dossierLegislatif === undefined) {
        break iterXmlFiles
      }

      const metaDossierLegislatif =
        dossierLegislatif.META.META_DOSSIER_LEGISLATIF
      const jorfTextesId = new Set<string>()
      let jorfTextePrincipalId: string | undefined = undefined
      for (const idTexteName of [
        "ID_TEXTE_1",
        "ID_TEXTE_2",
        "ID_TEXTE_3",
        "ID_TEXTE_4",
        "ID_TEXTE_5",
      ] as Array<keyof DossierLegislatif["META"]["META_DOSSIER_LEGISLATIF"]>) {
        const idTexte = metaDossierLegislatif[idTexteName] as string | undefined
        if (idTexte === undefined) {
          continue
        }
        assert(idTexte.startsWith("JORFTEXT"))

        const textelr = (
          await db<{ data: JorfTextelr }[]>`
          SELECT data
          FROM textelr
          WHERE id = ${idTexte}
        `
        ).map(({ data }) => data)[0]
        if (textelr === undefined) {
          console.warn(
            `In dossier législatif ${dossierLegislatif.META.META_COMMUN.ID}, field META.META_DOSSIER_LEGISLATIF.${idTexteName} has value ${idTexte} that is not a valid JORF reference`,
          )
          continue
        }
        if (
          ["LOI", "LOI_CONSTIT", "LOI_ORGANIQUE", "ORDONNANCE"].includes(
            textelr.META.META_COMMUN.NATURE as string,
          ) &&
          jorfTextePrincipalId === undefined
        ) {
          // Only the first law or "ordonnance" in dossier législatif is important.
          // The following are "rectificatifs" or "ratification d'ordonnance", etc.
          jorfTextePrincipalId = idTexte
        }
        jorfTextesId.add(idTexte)
      }

      await db`
        INSERT INTO dossier_legislatif (
          id,
          data,
          jorf_texte_principal_id,
          jorf_textes_id
        ) VALUES (
          ${dossierLegislatif.META.META_COMMUN.ID},
          ${db.json(dossierLegislatif as unknown as JSONValue)},
          ${jorfTextePrincipalId ?? null},
          ${jorfTextesId.size === 0 ? null : [...jorfTextesId]}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          data = EXCLUDED.data,
          jorf_texte_principal_id = EXCLUDED.jorf_texte_principal_id,
          jorf_textes_id = EXCLUDED.jorf_textes_id
        WHERE
          dossier_legislatif.data IS DISTINCT FROM EXCLUDED.data OR
          dossier_legislatif.jorf_texte_principal_id IS DISTINCT FROM EXCLUDED.jorf_texte_principal_id OR
          dossier_legislatif.jorf_textes_id IS DISTINCT FROM EXCLUDED.jorf_textes_id
      `
      dossierLegislatifRemainingIds.delete(
        dossierLegislatif.META.META_COMMUN.ID,
      )
    } catch (e) {
      console.error("An error occurred while parsing XML file", filePath)
      throw e
    }
  }

  if (deleteRemainingIds) {
    for (const id of dossierLegislatifRemainingIds) {
      if (verbose) {
        console.log(`Deleting DOSSIER_LEGISLATIF ${id}…`)
      }
      await db`
        DELETE FROM dossier_legislatif
        WHERE id = ${id}
      `
    }
  }
}

sade("import_dole <dilaDir>", true)
  .describe("Import Dila's DOLE database")
  .option("-r, --resume", "Resume import at given relative file path")
  .option("-v, --verbose", "Show more log messages")
  .example(
    "--resume dole/global/JORF/DOLE/00/00/36/07/36/JORFDOLE000036073697.xml ../dila-data/",
  )
  .action(async (dilaDir, options) => {
    await importDole(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
