import type { PageServerLoad } from "./$types"
import { queryDocuments } from "./documents"

export const load: PageServerLoad = async ({ url }) => {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  const { documents, total } = await queryDocuments(limit, offset)

  const totalPages = Math.ceil(total / limit)

  return {
    currentPage: page,
    documents,
    totalPages,
  }
}
