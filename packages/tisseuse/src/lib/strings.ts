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
