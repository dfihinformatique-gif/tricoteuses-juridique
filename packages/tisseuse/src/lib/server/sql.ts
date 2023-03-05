import type { PendingQuery, Row } from "postgres"

import { db } from "$lib/server/databases"

export function joinSqlClauses(
  joiner: PendingQuery<Row[]>,
  clauses: Array<PendingQuery<Row[]>>,
): PendingQuery<Row[]> {
  return clauses.reduce(
    (acc, clause, index) => db`${acc} ${index > 0 ? joiner : db``} ${clause}`,
    db``,
  )
}
