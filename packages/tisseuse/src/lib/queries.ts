export interface PaginationQuery {
  limit: number
  offset: number
}

export interface SearchQuery {
  limit: number
  offset: number
  q?: string
}
