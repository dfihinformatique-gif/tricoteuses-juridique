import type { PageServerLoad } from "./$types"
import { queryJos } from "../journaux_officiels"

export const load: PageServerLoad = async ({ url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  const { jos, total } = await queryJos(limit, offset)

  const totalPages = Math.ceil(total / limit)

  return {
    currentPage: page,
    jos,
    totalPages,
  }
}
