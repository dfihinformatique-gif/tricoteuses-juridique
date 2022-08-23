export type Follow = typeof allFollows[number]

export const allFollows = [
  "LIENS.LIEN[@sens=cible,@typelien=CREATION].@id",
] as const
export const allFollowsMutable = [...allFollows]
