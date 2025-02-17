export const idRegExp =
  /^(CNIL|DOLE|JORF|KALI|LEGI)(ARTI|CONT|SCTA|TEXT)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/

export function gitPathFromId(id: string, extension: ".json" | ".md") {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    throw new Error(`Unknown ID format: ${id}`)
  }
  return `${idMatch.slice(1, -1).join("/")}/${idMatch.at(-1)}${extension}`
}
