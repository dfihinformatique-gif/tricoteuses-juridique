export type IdOrigine = (typeof idsOrigines)[number]

export type IdType = (typeof idsTypes)[number]

export const idsOrigines = ["CNIL", "DOLE", "JORF", "KALI", "LEGI"] as const

export const idsTypes = ["ARTI", "CONT", "SCTA", "TEXT"] as const

export const idRegExp =
  /^(CNIL|DOLE|JORF|KALI|LEGI)(ARTI|CONT|SCTA|TEXT)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/

export function extractOrigineFromId(id: string): IdOrigine {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    throw new Error(`Unknown ID format: ${id}`)
  }
  return idMatch[1] as IdOrigine
}

export function extractTypeFromId(id: string): IdType {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    throw new Error(`Unknown ID format: ${id}`)
  }
  return idMatch[2] as IdType
}

export function gitPathFromId(id: string, extension: ".json" | ".md"): string {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    throw new Error(`Unknown ID format: ${id}`)
  }
  return `${idMatch.slice(1, -1).join("/")}/${id}${extension}`
}
