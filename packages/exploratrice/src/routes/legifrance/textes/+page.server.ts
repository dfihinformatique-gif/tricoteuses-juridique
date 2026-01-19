import type { PageServerLoad } from "./$types"
import { queryTextes } from "../textes"

export const load: PageServerLoad = async ({ url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  const { textes, total } = await queryTextes(limit, offset)

  const totalPages = Math.ceil(total / limit)

  return {
    currentPage: page,
    textes,
    totalPages,
  }
}
