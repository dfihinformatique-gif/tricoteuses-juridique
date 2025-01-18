import type { LegiTexteNature } from "$lib/legal/legi"
import { slugify } from "$lib/strings"

export const organizationNameByTexteNature: Partial<
  Record<LegiTexteNature, string>
> = {
  CODE: "codes",
  CONSTITUTION: "constitution",
  DECLARATION: "declarations",
}

export function repositoryNameFromTitle(title: string): string {
  const slug = slugify(title, "_")
  let repositoryName = slug
  if (repositoryName.length > 100) {
    repositoryName = repositoryName
      .replaceAll("_de_", "_")
      .replaceAll("_des_", "_")
      .replaceAll("_l_", "_")
      .replaceAll("_la_", "_")
      .replaceAll("_le_", "_")
      .replaceAll("_les_", "_")
  }
  while (repositoryName.length > 100) {
    repositoryName = repositoryName.replace(/_[^_]+$/, "")
  }
  return repositoryName
}

export function urlFromUrlAndQuery(
  urlOrPathname: string,
  query: {
    [key: string]:
      | boolean
      | number
      | string
      | undefined
      | null
      | Iterable<boolean | number | string | undefined | null>
  },
) {
  const search = new URLSearchParams(
    Object.entries(query).reduce(
      (couples, [key, value]) => {
        if (value != null) {
          if (
            typeof value !== "string" &&
            typeof (
              value as Iterable<boolean | number | string | undefined | null>
            )[Symbol.iterator] === "function"
          ) {
            for (const item of value as Iterable<
              boolean | number | string | undefined | null
            >) {
              if (item != null) {
                couples.push([key, item.toString()])
              }
            }
          } else {
            couples.push([key, value.toString()])
          }
        }
        return couples
      },
      [] as Array<[string, string]>,
    ),
  ).toString()
  return search ? `${urlOrPathname}?${search}` : urlOrPathname
}
