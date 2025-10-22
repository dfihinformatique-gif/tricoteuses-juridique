export type PossibleType = (typeof possibleTypes)[number]

export const possibleTypes = [
  "Assemblée document",
  "Assemblée dossier",
  "JO",
  "Légifrance texte",
] as const
