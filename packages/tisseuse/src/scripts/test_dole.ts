import assert from "assert"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import type { DossierLegislatif } from "$lib/legal/dole.js"
import type { JorfTexteVersion, JorfTextelr } from "$lib/legal/jorf.js"
import { parseDossierLegislatif } from "$lib/parsers/dole.js"
import { db } from "$lib/server/databases/index.js"
import { walkTree } from "$lib/server/nodegit/trees.js"

async function testDole(dilaDir: string): Promise<void> {
  const repository = await nodegit.Repository.open(
    path.join(dilaDir, "dole.git"),
  )
  const headReference = await repository.head()
  const commit = await repository.getCommit(headReference.target())
  const tree = await commit.getTree()

  iterXmlFiles: for await (const entry of walkTree(repository, tree)) {
    if (entry.isTree()) {
      continue
    }

    const filePath = entry.path()
    if (!filePath.endsWith(".xml")) {
      console.info(`Skipping non XML file at ${filePath}`)
      continue
    }

    const blob = await entry.getBlob()
    const buffer = blob.content()
    const xmlString = buffer.toString("utf8")
    const dossierLegislatif = parseDossierLegislatif(filePath, xmlString)
    if (dossierLegislatif === undefined) {
      break iterXmlFiles
    }

    const metaDossierLegislatif = dossierLegislatif.META.META_DOSSIER_LEGISLATIF
    const textelrs: JorfTextelr[] = []
    const texteVersions: JorfTexteVersion[] = []
    for (const idTexteName of [
      "ID_TEXTE_1",
      "ID_TEXTE_2",
      "ID_TEXTE_3",
      "ID_TEXTE_4",
      "ID_TEXTE_5",
    ] as Array<keyof DossierLegislatif["META"]["META_DOSSIER_LEGISLATIF"]>) {
      const idTexte = metaDossierLegislatif[idTexteName] as string | undefined
      if (idTexte === undefined) {
        continue
      }
      assert(idTexte.startsWith("JORFTEXT"))

      const textelr = (
        await db<{ data: JorfTextelr }[]>`
          SELECT data
          FROM textelr
          WHERE id = ${idTexte}
        `
      ).map(({ data }) => data)[0]
      if (textelr === undefined) {
        console.warn(
          `In dossier législatif ${dossierLegislatif.META.META_COMMUN.ID}, field META.META_DOSSIER_LEGISLATIF.${idTexteName} has value ${idTexte} that is not a valid JORF reference of a textelr`,
        )
        continue
      }
      const texteVersion = (
        await db<{ data: JorfTexteVersion }[]>`
          SELECT data
          FROM texte_version
          WHERE id = ${idTexte}
        `
      ).map(({ data }) => data)[0]
      if (texteVersion === undefined) {
        console.warn(
          `In dossier législatif ${dossierLegislatif.META.META_COMMUN.ID}, field META.META_DOSSIER_LEGISLATIF.${idTexteName} has value ${idTexte} that is not a valid JORF reference of a texte_version`,
        )
        continue
      }
      textelrs.push(textelr)
      texteVersions.push(texteVersion)
    }
    const natures = textelrs.map((textelr) => textelr.META.META_COMMUN.NATURE)
    for (const expectedNatures of [
      [],
      ["DECISION", "DECISION"],
      ["DIRECTIVE_EURO"],
      ["LOI"],
      [
        "LOI",
        undefined, // Décision
      ],
      [
        "LOI",
        undefined, // Décision
        "LOI",
      ],
      ["LOI", "AVIS"],
      ["LOI", "DECISION"],
      ["LOI", "DECISION", "ACCORD"],
      ["LOI", "DECISION", "AVIS", "LOI"],
      ["LOI", "DECISION", "DECISION"],
      ["LOI", "DECISION", "DECISION", "LOI"],
      ["LOI", "DECISION", "DIRECTIVE_EURO"],
      ["LOI", "DECISION", "LOI"],
      ["LOI", "DECISION", "LOI", "DECISION"],
      ["LOI", "DECISION", "LOI", "LOI"],
      ["LOI", "DECISION", "RAPPORT", "ORDONNANCE"],
      ["LOI", "DECRET"],
      ["LOI", "DIRECTIVE_EURO"],
      ["LOI", "DIRECTIVE_EURO", "DIRECTIVE_EURO"],
      ["LOI", "LOI"],
      ["LOI", "LOI", "DECISION"],
      ["LOI", "LOI", "DECISION", "DECISION"],
      ["LOI", "LOI", "DECISION", "DIRECTIVE_EURO"],
      ["LOI", "LOI", "LOI"],
      ["LOI", "RAPPORT", "LOI"],
      ["LOI_CONSTIT"],
      ["LOI_ORGANIQUE"],
      ["LOI_ORGANIQUE", "DECISION"],
      ["LOI_ORGANIQUE", "LOI_ORGANIQUE"],
      ["LOI_ORGANIQUE", "LOI_ORGANIQUE", "DECISION"],
      ["ORDONNANCE"],
      // [
      //   "ORDONNANCE",
      //   undefined, // Rapport au Président de la République relatif à l'ordonnance
      // ],
      // [
      //   "ORDONNANCE",
      //   undefined, // Rapport au Président de la République relatif à l'ordonnance
      //   "LOI",
      // ],
      // // ["ORDONNANCE", "LOI"],
      // ["ORDONNANCE", "LOI", "DECISION"],
      // ["ORDONNANCE", "ORDONNANCE", "LOI"],
      // ["ORDONNANCE", "ORDONNANCE", "ORDONNANCE", "LOI"],
      // ["ORDONNANCE", "ORDONNANCE", "ORDONNANCE", "RAPPORT", "LOI"],
      // ["ORDONNANCE", "ORDONNANCE", "RAPPORT", "LOI"],
      ["ORDONNANCE", "ORDONNANCE", "RAPPORT"],
      // ["ORDONNANCE", "ORDONNANCE", "RAPPORT", "LOI"],
      ["ORDONNANCE", "RAPPORT"],
      ["ORDONNANCE", "RAPPORT", "DECISION"],
      // ["ORDONNANCE", "RAPPORT", "DECISION", "LOI"],
      ["ORDONNANCE", "RAPPORT", "DECRET"],
      // ["ORDONNANCE", "RAPPORT", "DECRET", "LOI"],
      ["ORDONNANCE", "RAPPORT", "DECRET", "ORDONNANCE"],
      ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO"],
      ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "DIRECTIVE_EURO"],
      [
        "ORDONNANCE",
        "RAPPORT",
        "DIRECTIVE_EURO",
        "DIRECTIVE_EURO",
        "DIRECTIVE_EURO",
      ],
      // ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "DIRECTIVE_EURO", "LOI"],
      // ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "LOI"],
      // ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "LOI", "DIRECTIVE_EURO"],
      // ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "LOI", "LOI"],
      ["ORDONNANCE", "RAPPORT", "DIRECTIVE_EURO", "ORDONNANCE"],
      // ["ORDONNANCE", "RAPPORT", "LOI"],
      // ["ORDONNANCE", "RAPPORT", "LOI", "DECISION"],
      // ["ORDONNANCE", "RAPPORT", "LOI", "DIRECTIVE_EURO"],
      // ["ORDONNANCE", "RAPPORT", "LOI", "DIRECTIVE_EURO", "DIRECTIVE_EURO"],
      // ["ORDONNANCE", "RAPPORT", "LOI", "LOI"],
      // ["ORDONNANCE", "RAPPORT", "LOI", "LOI", "LOI"],
      ["ORDONNANCE", "RAPPORT", "ORDONNANCE"],
      [
        "ORDONNANCE",
        "RAPPORT",
        "ORDONNANCE",
        undefined, // Rapport au Président de la République relatif à l'ordonnance
      ],
      // [
      //   "ORDONNANCE",
      //   "RAPPORT",
      //   "ORDONNANCE",
      //   undefined, // Rapport au Président de la République relatif à l'ordonnance
      //   "LOI",
      // ],
      [
        "ORDONNANCE",
        "RAPPORT",
        "ORDONNANCE",
        "DIRECTIVE_EURO",
        "DIRECTIVE_EURO",
      ],
      // ["ORDONNANCE", "RAPPORT", "ORDONNANCE", "LOI"],
      ["ORDONNANCE", "RAPPORT", "ORDONNANCE", "ORDONNANCE"],
      // ["ORDONNANCE", "RAPPORT", "ORDONNANCE", "ORDONNANCE", "LOI"],
      ["ORDONNANCE", "RAPPORT", "ORDONNANCE", "ORDONNANCE", "ORDONNANCE"],
      ["ORDONNANCE", "RAPPORT", "RAPPORT"],
      // ["ORDONNANCE", "RAPPORT", "RAPPORT", "LOI"],
      ["RAPPORT"],
      // ["RAPPORT", "ORDONNANCE", "LOI"],
    ]) {
      if (
        natures.length === expectedNatures.length &&
        natures.every((nature, index) => nature === expectedNatures[index])
      ) {
        continue iterXmlFiles
      }
    }
    // console.log(
    //   "Dossier",
    //   dossierLegislatif.META.META_COMMUN.ID,
    //   dossierLegislatif.META.META_DOSSIER_LEGISLATIF.TITRE,
    // )
    for (const [index, textelr] of textelrs.entries()) {
      const texteVersion = texteVersions[index]
      if (textelr.META.META_COMMUN.NATURE === "LOI") {
        console.log(
          "Dossier",
          dossierLegislatif.META.META_COMMUN.ID,
          dossierLegislatif.META.META_DOSSIER_LEGISLATIF.TITRE,
        )
        console.log(
          " ",
          textelr.META.META_COMMUN.ID,
          textelr.META.META_COMMUN.NATURE,
          texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
        )
      }
    }
  }
}

sade("test_dole <dilaDir>", true)
  .describe("Test Dila's DOLE database")
  .action(async (dilaDir) => {
    await testDole(dilaDir)
    process.exit(0)
  })
  .parse(process.argv)
