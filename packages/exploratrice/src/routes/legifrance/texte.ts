import type {
  JorfTextelr,
  JorfTexteVersion,
  LegiTextelr,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"

export interface TextePageInfos extends TexteWithLinks {
  otherVersionsTextesVersions: Array<JorfTexteVersion | LegiTexteVersion>
}

export interface TexteWithLinks {
  abro?: string
  dossierLegislatifAssembleeUid?: string
  nota?: string
  notice?: string
  signataires?: string
  sm?: string
  tp?: string
  visas?: string
  textelr?: JorfTextelr | LegiTextelr | undefined
  texteVersion?: JorfTexteVersion | LegiTexteVersion
}
