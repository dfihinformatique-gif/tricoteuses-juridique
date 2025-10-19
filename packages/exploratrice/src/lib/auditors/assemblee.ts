import { auditChain, auditString, auditTest } from "@auditors/core"
import {
  compteRenduUidRegex,
  documentUidRegex,
  dossierUidRegex,
  questionUidRegex,
  reunionUidRegex,
  scrutinUidRegex,
} from "@tricoteuses/assemblee"

export const auditAssembleeUid = auditChain(
  auditString,
  auditTest(
    (uid: string) =>
      [
        compteRenduUidRegex,
        documentUidRegex,
        dossierUidRegex,
        questionUidRegex,
        reunionUidRegex,
        scrutinUidRegex,
      ].some((regex) => regex.test(uid)),
    "Invalid format for Assemblée UID",
  ),
)

export const auditDocumentUid = auditChain(
  auditString,
  auditTest(
    (uid: string) => documentUidRegex.test(uid),
    "Invalid format for Assemblée Document UID",
  ),
)

export const auditDossierParlementaireUid = auditChain(
  auditString,
  auditTest(
    (uid: string) => dossierUidRegex.test(uid),
    "Invalid format for Assemblée DossierParlementaire UID",
  ),
)
