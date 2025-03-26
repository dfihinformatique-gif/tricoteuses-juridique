import { error } from "@sveltejs/kit"

import type { DossierLegislatif } from "$lib/legal/dole.js"
import { db } from "$lib/server/databases/index.js"

import type { PageServerLoad } from "./$types.js"

export const load: PageServerLoad = async ({ params }) => {
  const dossierLegislatif = (
    await db<{ data: DossierLegislatif }[]>`
    SELECT data FROM dossier_legislatif
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (dossierLegislatif === undefined) {
    error(404, `Dossier législatif ${params.id} non trouvé`)
  }
  return { dossier_legislatif: dossierLegislatif }
}
