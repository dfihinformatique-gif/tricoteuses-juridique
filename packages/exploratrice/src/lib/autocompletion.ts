export type PossibleType = (typeof possibleTypes)[number]

export interface Suggestion {
  autocompletion: string
  badge?: string
  date?: string
  distance: number
  id: string
}

export interface SuggestionDb {
  autocompletion: string
  badge: string | null
  date: string | null
  distance: number
  id: string
}

export const possibleTypes = [
  "Assemblée document",
  "Assemblée dossier",
  "JO",
  "Légifrance texte",
] as const

export const suggestionFromSuggestionDb = (
  suggestion: SuggestionDb,
): Suggestion => {
  if (suggestion.badge === null) {
    delete (
      suggestion as {
        badge?: string
      }
    ).badge
  }
  if (suggestion.date === null) {
    delete (
      suggestion as {
        date?: string
      }
    ).date
  }
  return suggestion as Suggestion
}
