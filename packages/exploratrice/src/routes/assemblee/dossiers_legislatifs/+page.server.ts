import type { PageServerLoad } from "./$types"
import { queryDossiers } from "../dossiers_legislatifs"

export const load: PageServerLoad = async ({ url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  const { dossiers, total } = await queryDossiers(limit, offset)

  const totalPages = Math.ceil(total / limit)

  return {
    currentPage: page,
    dossiers,
    totalPages,
  }
}
