export type JsonValue =
  | boolean
  | JsonValue[]
  | null
  | number
  | string
  | { [key: string]: JsonValue }

/// Helper function to use with JSON.stringify, to ensure that
/// attributes of objects are sorted by name.
export const jsonReplacer = (_key: number | string, value: JsonValue) =>
  value instanceof Object && !Array.isArray(value)
    ? Object.keys(value)
        .sort()
        .reduce((sorted: { [key: string]: JsonValue }, key: string) => {
          sorted[key] = value[key]
          return sorted
        }, {})
    : value
