import assert from "assert"
import fs from "fs-extra"
import Papa from "papaparse"
import path from "path"
import sade from "sade"

import { assembleeDb, db } from "$lib/server/databases"

async function associateJorfTextesWithAssembleeCommissions(
  dilaDir: string,
  { verbose }: { verbose?: boolean } = {},
): Promise<void> {
  const loisCommissionsAssembleeFilePath = path.join(
    dilaDir,
    "lois_commissions_assemblee.csv",
  )
  const loisCommissionsAssembleeCsv = await fs.readFile(
    loisCommissionsAssembleeFilePath,
    { encoding: "utf-8" },
  )
  const loisCommissionsAssembleeOutput = Papa.parse(
    loisCommissionsAssembleeCsv.trim(),
    {
      header: true,
    },
  )
  assert.strictEqual(
    loisCommissionsAssembleeOutput.errors.length,
    0,
    JSON.stringify(loisCommissionsAssembleeOutput.errors, null, 2),
  )
  const commissionFondAssembleeUidByLoiJorfId = Object.fromEntries(
    (loisCommissionsAssembleeOutput.data as Array<{ [key: string]: string }>)
      .map((row) => [row["ID loi JORF"], row["Commission ID"]])
      .filter(
        ([, commissionFondAssembleeUid]) =>
          commissionFondAssembleeUid.match(/^PO\d+$/) !== null,
      ),
  )

  const loisCommissionsSpecialesAssembleeFilePath = path.join(
    dilaDir,
    "lois_commissions_speciales_assemblee.csv",
  )
  const loisCommissionsSpecialesAssembleeCsv = await fs.readFile(
    loisCommissionsSpecialesAssembleeFilePath,
    { encoding: "utf-8" },
  )
  const loisCommissionsSpecialesAssembleeOutput = Papa.parse(
    loisCommissionsSpecialesAssembleeCsv.trim(),
    {
      header: true,
    },
  )
  assert.strictEqual(
    loisCommissionsSpecialesAssembleeOutput.errors.length,
    0,
    JSON.stringify(loisCommissionsSpecialesAssembleeOutput.errors, null, 2),
  )
  const commissionSpecialeAssembleeUidByLoiJorfId = Object.fromEntries(
    (
      loisCommissionsSpecialesAssembleeOutput.data as Array<{
        [key: string]: string
      }>
    )
      .map((row) => [row["ID loi JORF"], row["Code commission"]])
      .filter(
        ([, commissionSpecialeAssembleeUid]) =>
          commissionSpecialeAssembleeUid.match(/^PO\d+$/) !== null,
      ),
  )
  Object.assign(
    commissionFondAssembleeUidByLoiJorfId,
    commissionSpecialeAssembleeUidByLoiJorfId,
  )

  // Note: "2002-06-19" below is the first day of the XIIth legislature.
  // The is no Dila "dossier législatif" before this date.
  const texteVersionCursor = db<{ assemblee_uid: string | null; id: string }[]>`
    SELECT assemblee_uid, texte_version.id
    FROM texte_version
    LEFT JOIN texte_version_dossier_legislatif_assemblee_associations
      ON texte_version.id = texte_version_dossier_legislatif_assemblee_associations.id
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
    for (const { assemblee_uid: dossierAssembleeUid, id: loiJorfId } of rows) {
      let commissionFondAssembleeUid: string | undefined = undefined
      if (dossierAssembleeUid !== null) {
        commissionFondAssembleeUid = (
          await assembleeDb<{ commission_fond_uid: string }[]>`
            SELECT commission_fond_uid
            FROM dossiers
            WHERE uid = ${dossierAssembleeUid}
          `
        )[0]?.commission_fond_uid
      }
      await db`
        UPDATE texte_version
        SET commission_fond_assemblee_uid = ${
          commissionFondAssembleeUid ??
          commissionFondAssembleeUidByLoiJorfId[loiJorfId] ??
          null
        }
        WHERE id = ${loiJorfId}
      `
    }
  }
}

sade("associate_jorf_textes_with_assemblee_commissions <dilaDir>", true)
  .describe(
    "Associe les lois Légifrance du JORF avec les commissions au fond de l'Assemblée",
  )
  .option("-V, --verbose", "Log all messages")
  .action(async (dilaDir, options) => {
    await associateJorfTextesWithAssembleeCommissions(dilaDir, options)
    process.exit(0)
  })
  .parse(process.argv)
