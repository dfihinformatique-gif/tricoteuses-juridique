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
