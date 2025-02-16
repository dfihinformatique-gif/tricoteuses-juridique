import { auditChain, auditRequire, strictAudit } from "@auditors/core"

import { auditDossierLegislatif } from "$lib/auditors/dole"
import type { DossierLegislatif, XmlHeader } from "$lib/legal"
import { xmlParser } from "$lib/parsers/shared"

export function parseDossierLegislatif(
  filePath: string,
  xmlString: string,
): DossierLegislatif | undefined {
  try {
    const xmlData = xmlParser.parse(xmlString)
    for (const [key, element] of Object.entries(xmlData) as [
      string,
      DossierLegislatif | XmlHeader,
    ][]) {
      switch (key) {
        case "?xml": {
          const xmlHeader = element as XmlHeader
          if (
            xmlHeader["@encoding"] !== "UTF-8" ||
            xmlHeader["@version"] !== "1.0"
          ) {
            throw new Error(
              `Unexpected XML header for ${filePath}: ${JSON.stringify(xmlHeader)}`,
            )
          }
          break
        }
        case "DOSSIER_LEGISLATIF": {
          const [dossierLegislatif, error] = auditChain(
            auditDossierLegislatif,
            auditRequire,
          )(strictAudit, element) as [DossierLegislatif, unknown]
          if (error !== null) {
            throw new Error(
              `Unexpected format for DOSSIER_LEGISLATIF:\n${JSON.stringify(
                dossierLegislatif,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
          }

          return dossierLegislatif
        }
        default: {
          console.warn(
            `Unexpected root element "${key}" in XML file: ${filePath}`,
          )
          return undefined
        }
      }
    }
    return undefined
  } catch (e) {
    console.error("An error occurred while parsing XML file", filePath)
    throw e
  }
}
