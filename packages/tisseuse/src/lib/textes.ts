export const cleanTexteTitle = <StringOrUndefined extends string | undefined>(
  title: StringOrUndefined,
): StringOrUndefined =>
  title
    ?.replace(/\n/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/ \(\d+\)\.?$/, "")
    .replace(/\.$/, "") as StringOrUndefined
