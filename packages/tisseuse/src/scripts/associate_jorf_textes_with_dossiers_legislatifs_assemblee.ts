import { CodeActe, type DossierParlementaire } from "@tricoteuses/assemblee"
import assert from "assert"
import sade from "sade"

import type { JorfTexteVersion } from "$lib/legal"
import { assembleeDb, db } from "$lib/server/databases"

async function associateJorfTextesWithDossiersLegislatifsAssemblee({
  verbose,
}: { verbose?: boolean } = {}): Promise<void> {
  const associationRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM texte_version_dossier_legislatif_assemblee_associations
      `
    ).map(({ id }) => id),
  )

  const jorfTexteIdByNor: { [nor: string]: string } = {}
  // Note: "2002-06-19" below is the first day of the XIIth legislature.
  // The is no Dila "dossier législatif" before this date.
  const texteVersionCursor = db<{ data: JorfTexteVersion; id: string }[]>`
    SELECT data, id
    FROM texte_version
    WHERE
      data -> 'META' -> 'META_COMMUN' ->> 'NATURE' IN (
        'LOI',
        'LOI_CONSTIT',
        'LOI_ORGANIQUE',
        'ORDONNANCE'
      )
      AND data -> 'META' -> 'META_COMMUN' ->> 'ORIGINE' = 'JORF'
      AND data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'DATE_TEXTE' >= '2002-06-19'
  `.cursor(100)
  for await (const rows of texteVersionCursor) {
    for (const { data: texteVersion, id } of rows) {
      console.log(
        texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE,
        id,
      )
      const nor = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR
      assert.notStrictEqual(nor, undefined)
      jorfTexteIdByNor[nor as string] = id
    }
  }

  const assembleeDossiersPromulguesCursor = assembleeDb<
    { data: DossierParlementaire }[]
  >`
    SELECT data
    FROM dossiers
    WHERE data @? '$.actesLegislatifs[*].codeActe ? (@ == "PROM")'
  `.cursor(100)
  for await (const rows of assembleeDossiersPromulguesCursor) {
    for (const { data: assembleeDossier } of rows) {
      const promActe = assembleeDossier.actesLegislatifs?.find(
        (acte) => (acte.codeActe as unknown as string) === CodeActe.Prom,
      )
      assert.notStrictEqual(promActe, undefined)
      const promPubActe = promActe?.actesLegislatifs?.find(
        (acte) => (acte.codeActe as unknown as string) === CodeActe.PromPub,
      )
      assert.notStrictEqual(promPubActe, undefined)
      const nor = promPubActe?.infoJo?.referenceNor ?? promPubActe?.referenceNor
      if (nor === undefined) {
        console.log(
          `The Assemblée "dossier législatif" ${assembleeDossier.uid} doesn't contain a NOR yet`,
        )
        continue
      }
      const jorfTexteId = jorfTexteIdByNor[nor as string]
      if (jorfTexteId === undefined) {
        // JORF texte has no Légifrance "dossier législatif".
        // This is normal for example for "lois de ratification d'accords entre pays".
        if (verbose) {
          console.log(
            `The Assemblée "dossier législatif" ${assembleeDossier.uid} has a NOR ${nor} that is not found in Légifrance "dossiers législatifs"`,
          )
        }
        continue
      }
      assert.notStrictEqual(jorfTexteId, undefined)
      await db`
        INSERT INTO texte_version_dossier_legislatif_assemblee_associations (
          id,
          assemblee_uid
        ) VALUES (
          ${jorfTexteId},
          ${assembleeDossier.uid}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          assemblee_uid = ${assembleeDossier.uid}
      `
      associationRemainingIds.delete(jorfTexteId)
    }
  }

  for (const id of associationRemainingIds) {
    console.log(
      `Deleting association with text ${id} and "dossier législatif" of Assemblée…`,
    )
    await db`
      DELETE FROM texte_version_dossier_legislatif_assemblee_associations
      WHERE id = ${id}
    `
  }
}

sade("associate_jorf_texts_with_dossiers_legislatifs_assemblee", true)
  .describe(
    'Associate Légifrance JORF laws & ordinances with Assemblée nationale "dossiers législatifs"',
  )
  .option("-V, --verbose", "Log all messages")
  .action(async (options) => {
    await associateJorfTextesWithDossiersLegislatifsAssemblee(options)
    process.exit(0)
  })
  .parse(process.argv)
