import type { RequestHandler } from "@sveltejs/kit"
import type { JSONObject } from "@sveltejs/kit/types/private"

import type { DossierLegislatif } from "$lib/data"
import { db } from "$lib/server/database"

export const GET: RequestHandler = async ({ params }) => {
  const dossierLegislatif = (
    await db<{ data: DossierLegislatif }[]>`
    SELECT data FROM dossier_legislatif
    WHERE id = ${params.id}
  `
  ).map(({ data }) => data)[0]

  if (dossierLegislatif === undefined) {
    return { status: 404 }
  }
  return {
    body: { dossier_legislatif: dossierLegislatif as unknown as JSONObject },
  }
}
