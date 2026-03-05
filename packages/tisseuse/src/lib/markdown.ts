// Taken from Tricoteuses Légifrance
export function escapeMarkdownLinkTitle<
  StringOrUndefined extends string | undefined,
>(s: StringOrUndefined): StringOrUndefined {
  return s
    ?.replace(/\s+/g, " ")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]") as StringOrUndefined
}
