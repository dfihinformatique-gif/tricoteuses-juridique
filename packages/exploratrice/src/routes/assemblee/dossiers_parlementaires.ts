import type { Document, DossierParlementaire } from "@tricoteuses/assemblee"

export interface DossierParlementairePageInfos {
  documentByUid?: { [uid: string]: Document }
  dossierParlementaire: DossierParlementaire
  legifranceTexteId?: string
}
