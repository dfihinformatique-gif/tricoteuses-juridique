export const fullDateFormatter = (date: Date | string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(typeof date === "string" ? new Date(date) : date)

export const shortDateFormatter = (date: Date | string): string =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
  }).format(typeof date === "string" ? new Date(date) : date)
