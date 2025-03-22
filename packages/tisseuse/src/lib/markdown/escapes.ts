// export function escapeMarkdown<StringOrUndefined extends string | undefined>(
//   s: StringOrUndefined,
// ): StringOrUndefined {
//   return s
//     ?.replaceAll("\\", "\\\\")
//     .replaceAll("`", "\\`")
//     .replaceAll("*", "\\*")
//     .replaceAll("_", "\\_")
//     .replaceAll("{", "\\{")
//     .replaceAll("}", "\\}")
//     .replaceAll("[", "\\[")
//     .replaceAll("]", "\\]")
//     .replaceAll("<", "\\<")
//     .replaceAll(">", "\\>")
//     .replaceAll("(", "\\(")
//     .replaceAll(")", "\\)")
//     .replaceAll("#", "\\#")
//     .replaceAll("+", "\\+")
//     .replaceAll("-", "\\-")
//     .replaceAll(".", "\\.")
//     .replaceAll("!", "\\!")
//     .replaceAll("|", "\\|") as StringOrUndefined
// }

export function escapeMarkdownLinkTitle<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s
    ?.replace(/\s+/g, " ")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]") as StringOrUndefined
}

export function escapeMarkdownLinkUrl<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s?.replaceAll("(", "\\(").replaceAll(")", "\\)") as StringOrUndefined
}

export function escapeMarkdownListItemOrTitle<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s?.replace(/\s+/g, " ") as StringOrUndefined
}

export function escapeMarkdownText<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s
    ?.replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replace(/^#/g, "\\#")
    .replace(/^-/g, "\\-") as StringOrUndefined
}

export function escapeMarkdownTitle<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s?.replace(/\s+/g, " ") as StringOrUndefined
}
