import { auditChain, auditRequire, strictAudit } from "@auditors/core"
import assert from "assert"
import { XMLParser } from "fast-xml-parser"
import he from "he"

import { auditDossierLegislatif } from "$lib/auditors/dole"
import type { DossierLegislatif, XmlHeader } from "$lib/legal"

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_1",
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_2",
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_3",
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_4",
    "DOSSIER_LEGISLATIF.CONTENU.CONTENU_DOSSIER_5",
    "DOSSIER_LEGISLATIF.CONTENU.EXPOSE_MOTIF",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

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
          assert.strictEqual(xmlHeader["@encoding"], "UTF-8", filePath)
          assert.strictEqual(xmlHeader["@version"], "1.0", filePath)
          break
        }
        case "DOSSIER_LEGISLATIF": {
          const [dossierLegislatif, error] = auditChain(
            auditDossierLegislatif,
            auditRequire,
          )(strictAudit, element) as [DossierLegislatif, unknown]
          assert.strictEqual(
            error,
            null,
            `Unexpected format for DOSSIER_LEGISLATIF:\n${JSON.stringify(
              dossierLegislatif,
              null,
              2,
            )}\nError:\n${JSON.stringify(error, null, 2)}`,
          )
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
