import { error } from "@sveltejs/kit"

import type { DossierLegislatif } from "$lib/legal"
import { db } from "$lib/server/databases"

import type { PageServerLoad } from "./$types"

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
