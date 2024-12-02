import originalSlugify from "slug"

export const diacritiquesMinuscule: { [letter: string]: string } = {
  ae: "(ae|æ)",
  oe: "(oe|œ)",
  a: "(a|â|ä|à)",
  c: "(c|ç)",
  e: "(e|é|ê|ë|è)",
  i: "(i|î|ï)",
  o: "(o|ô|ö)",
  u: "(u|û|ü|ù)",
  y: "(y|ÿ)",
  "'": "('|‘|’)",
  "‘": "(‘|'|’)",
  "’": "(’|'|‘)",
}

const slugifyCharmap = {
  ...originalSlugify.defaults.charmap,
  "'": " ",
  "@": " ",
  ".": " ",
}

export function slugify(string: string, replacement?: string | null) {
  const options: {
    charmap: { [character: string]: string }
    mode: string
    replacement: string
  } = {
    charmap: slugifyCharmap,
    mode: "rfc3986",
    replacement: replacement || "-",
  }
  return originalSlugify(string, options)
}
