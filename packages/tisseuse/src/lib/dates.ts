const dateLongFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
})

export function formatLongDate(date: string): string {
  return dateLongFormatter.format(new Date(date)).replace(/^1 /, "1er ")
}
