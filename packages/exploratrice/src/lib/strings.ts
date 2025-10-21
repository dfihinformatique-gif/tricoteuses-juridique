export const capitalizeFirstLetter = <
  StringOrUndefined extends string | undefined,
>(
  s: StringOrUndefined,
): StringOrUndefined =>
  (s === undefined
    ? undefined
    : s.length === 0
      ? ""
      : s[0].toLocaleUpperCase() + s.slice(1)) as StringOrUndefined

export const cleanHtmlContenu = <StringOrUndefined extends string | undefined>(
  fragment: StringOrUndefined,
): StringOrUndefined =>
  fragment === undefined
    ? (undefined as StringOrUndefined)
    : (fragment
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
        .trim() as StringOrUndefined)
