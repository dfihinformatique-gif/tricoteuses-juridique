import sade from "sade"

import type { JorfTexteVersion } from "$lib/legal/jorf.js"
import { db } from "$lib/server/databases/index.js"

async function detectJorfTextesPrincipaux(): Promise<void> {
  const texteVersionCursor = db<
    {
      data: JorfTexteVersion
      est_texte_principal: boolean | null
      id: string
    }[]
  >`
    SELECT data, est_texte_principal, id
    FROM texte_version
    WHERE
      data -> 'META' -> 'META_COMMUN' ->> 'ORIGINE' = 'JORF'
  `.cursor(100)
  for await (const rows of texteVersionCursor) {
    for (const { data: texteVersion, est_texte_principal, id } of rows) {
      let estTextePrincipal = false
      const dossiersLegislatifsJorfTextesId = (
        await db<{ jorf_texte_principal_id: string | null }[]>`
          SELECT jorf_texte_principal_id
          FROM dossier_legislatif
          WHERE ${id} = ANY(jorf_textes_id)
        `
      ).map(({ jorf_texte_principal_id }) => jorf_texte_principal_id)
      if (dossiersLegislatifsJorfTextesId.length === 0) {
        const nature = texteVersion.META.META_COMMUN.NATURE
        if (
          nature !== undefined &&
          ["LOI", "LOI_CONSTIT", "LOI_ORGANIQUE", "ORDONNANCE"].includes(nature)
        ) {
          const liens =
            texteVersion.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN ?? []
          if (
            nature !== "ORDONNANCE" &&
            liens.length > 0 &&
            liens.every(
              (lien) =>
                lien["@naturetexte"] === "ORDONNANCE" &&
                lien["@sens"] === "source" &&
                lien["@typelien"] === "APPLICATION",
            )
          ) {
            // Le texte est une loi qui se contente d'appliquer uniquement des ordonnances.
            // Ce n'est donc pas un texte principal.
            // estTextePrincipal = false
          } else {
            estTextePrincipal = true
          }
        }
      } else {
        estTextePrincipal = dossiersLegislatifsJorfTextesId.some(
          (dossierLegislatifJorfTexteId) => dossierLegislatifJorfTexteId === id,
        )
      }
      if (estTextePrincipal !== Boolean(est_texte_principal)) {
        await db`
          UPDATE texte_version
          SET est_texte_principal = ${estTextePrincipal || null}
          WHERE id = ${id}
        `
      }
    }
  }
}

sade("detect_jorf_textes_principaux", true)
  .describe(
    'Detect Légifrance JORF texts that should the main text of a "dossier législatif" (even when the dossier législatif doesn\'t exist)',
  )
  .action(async () => {
    await detectJorfTextesPrincipaux()
    process.exit(0)
  })
  .parse(process.argv)
