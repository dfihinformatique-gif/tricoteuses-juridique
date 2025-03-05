import * as prettier from "prettier"
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

export async function cleanHtmlFragment(
  fragment: string | undefined,
): Promise<string | undefined> {
  try {
    return fragment === undefined
      ? undefined
      : (
          await prettier.format(
            fragment
              .replaceAll("<<", "«")
              .replaceAll(">>", "»")
              .replace(/<p>(.*?)<\/p>/gs, "$1<br />\n\n")
              .replace(/\s*(<br\s*\/>\s*)+/gs, "<br />\n\n")
              // When a <p> with attributes, is followed by a <br />,
              // remove the <br />.
              .replace(/<\/p>\s*<br\s*\/>/gs, "</p>")
              // Remove <br /> at the beginning of fragment.
              .replace(/^\s*(<br\s*\/>\s*)+/gs, "")
              // Remove <br /> at the end of fragment.
              .replace(/\s*(<br\s*\/>\s*)+$/gs, "")
              .trim(),
            {
              parser: "html",
            },
          )
        )
          // Remove blank lines after a <br > when the text is indented,
          // because it breaks Markdown rendering.
          .replace(/<br \/>\n\n+ /g, "<br />\n ")
  } catch (e) {
    console.trace(`Cleanup of following text failed:\n${fragment}`)
    console.error(e)
    return fragment
  }
}

// Taken from https://github.com/sveltejs/svelte/blob/main/packages/svelte/src/escaping.js
export function escapeHtml<StringOrUndefined extends string | undefined>(
  s: StringOrUndefined,
  isAttribute = false,
): StringOrUndefined {
  if (s === undefined) {
    return undefined as StringOrUndefined
  }

  const pattern = isAttribute ? /[&"<]/g : /[&<]/g
  pattern.lastIndex = 0

  let escaped = ""
  let last = 0

  while (pattern.test(s)) {
    const i = pattern.lastIndex - 1
    const ch = s[i]
    escaped +=
      s.substring(last, i) +
      (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;")
    last = i + 1
  }

  return (escaped + s.substring(last)) as StringOrUndefined
}

export function escapeMarkdown<StringOrUndefined extends string | undefined>(
  s: StringOrUndefined,
): StringOrUndefined {
  return s
    ?.replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("#", "\\#")
    .replaceAll("+", "\\+")
    .replaceAll("-", "\\-")
    .replaceAll(".", "\\.")
    .replaceAll("!", "\\!")
    .replaceAll("|", "\\|") as StringOrUndefined
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
