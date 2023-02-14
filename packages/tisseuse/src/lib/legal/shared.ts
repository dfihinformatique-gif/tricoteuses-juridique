export type Sens = (typeof allSens)[number]

export const allSens = ["cible", "source"] as const
export const allSensMutable = [...allSens]
