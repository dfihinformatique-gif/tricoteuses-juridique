import { CodeActe, type DossierParlementaire } from "@tricoteuses/assemblee"
import assert from "assert"
import sade from "sade"

import type { DossierLegislatif, JorfTextelr } from "$lib/legal"
import { assembleeDb, db } from "$lib/server/databases"

async function associateDossiersLegislatifsWithAssemblee({
  verbose,
}: { verbose?: boolean } = {}): Promise<void> {
  const dossierAssociationRemainingIds = new Set(
    (
      await db<{ id: string }[]>`
        SELECT id
        FROM dossier_legislatif_assemblee_associations
      `
    ).map(({ id }) => id),
  )

  const dossierIdByLawId: { [nor: string]: string } = {}
  const lawIdByNor: { [nor: string]: string } = {}
  for (const dossier of (
    await db<{ data: DossierLegislatif }[]>`
      SELECT data
      FROM dossier_legislatif
      WHERE
        data -> 'META' -> 'META_DOSSIER_LEGISLATIF' ->> 'TYPE' IN ('LOI_PUBLIEE', 'ORDONNANCE_PUBLIEE')
    `
  ).map(({ data }) => data)) {
    const lawsId = new Set<string>()
    const metaDossierLegislatif = dossier.META.META_DOSSIER_LEGISLATIF
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
          `In dossier législatif ${dossier.META.META_COMMUN.ID}, field META.META_DOSSIER_LEGISLATIF.${idTexteName} has value ${idTexte} that is not a valid JORF reference`,
        )
        continue
      }
      if (
        ["LOI", "LOI_CONSTIT", "LOI_ORGANIQUE", "ORDONNANCE"].includes(
          textelr.META.META_COMMUN.NATURE as string,
        )
      ) {
        lawsId.add(idTexte)
        const nor = textelr.META.META_SPEC.META_TEXTE_CHRONICLE.NOR
        assert.notStrictEqual(nor, undefined)
        lawIdByNor[nor as string] = idTexte
        dossierIdByLawId[idTexte] = dossier.META.META_COMMUN.ID
      }
    }
    if (lawsId.size === 0) {
      console.warn(
        `In dossier législatif ${dossier.META.META_COMMUN.ID}, fields META.META_DOSSIER_LEGISLATIF.ID_TEXTE_n don't reference any valid law`,
      )
      continue
    }
  }

  const assembleeDossiersPromulgues = (
    await assembleeDb<{ data: DossierParlementaire }[]>`
      SELECT data
      FROM dossiers
      WHERE data @? '$.actesLegislatifs[*].codeActe ? (@ == "PROM")'
    `
  ).map(({ data }) => data)

  for (const assembleeDossier of assembleeDossiersPromulgues) {
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
    const lawId = lawIdByNor[nor as string]
    if (lawId === undefined) {
      // Law has no Légifrance "dossier législatif".
      // This is normal for example for "lois de ratification d'accords entre pays".
      if (verbose) {
        console.log(
          `The Assemblée "dossier législatif" ${assembleeDossier.uid} has a NOR ${nor} that is not found in Légifrance "dossiers législatifs"`,
        )
      }
      continue
    }
    assert.notStrictEqual(lawId, undefined)
    const dossierId = dossierIdByLawId[lawId]
    assert.notStrictEqual(dossierId, undefined)
    await db`
      INSERT INTO dossier_legislatif_assemblee_associations (
        id,
        assemblee_uid
      ) VALUES (
        ${dossierId},
        ${assembleeDossier.uid}
      )
      ON CONFLICT (id)
      DO UPDATE SET
        assemblee_uid = ${assembleeDossier.uid}
    `
    dossierAssociationRemainingIds.delete(dossierId)
  }

  for (const id of dossierAssociationRemainingIds) {
    console.log(
      `Deleting association ${id} with "dossier législatif" of Assemblée…`,
    )
    await db`
      DELETE FROM dossier_legislatif_assemblee_associations
      WHERE id = ${id}
    `
  }
}

sade("associate_dossiers_legislatifs_with_assemblee", true)
  .describe(
    'Associate Légifrance "dossiers législatifs" with those of Assemblée nationale',
  )
  .option("--verbose", "Log all messages")
  .action(async (options) => {
    await associateDossiersLegislatifsWithAssemblee(options)
    process.exit(0)
  })
  .parse(process.argv)
