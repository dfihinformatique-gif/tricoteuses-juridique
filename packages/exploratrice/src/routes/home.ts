import type { Suggestion } from "$lib/autocompletion"

export interface HomePageInfos {
  documents: Suggestion[]
  dossiersParlementaires: Suggestion[]
  jos: Suggestion[]
  textes: Suggestion[]
}
