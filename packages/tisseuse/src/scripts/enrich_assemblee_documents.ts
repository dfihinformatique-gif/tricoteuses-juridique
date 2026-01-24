import { walkDocumentAndDivisions } from "@tricoteuses/assemblee"
import * as git from "@tricoteuses/assemblee/git"
import {
  iterLoadAssembleeDocuments,
  pathFromDocumentUid,
} from "@tricoteuses/assemblee/loaders"
import fs from "fs-extra"
import assert from "node:assert"
import path from "node:path"
import sade from "sade"

import { addLinksOrReferencesToHtmlFile } from "$lib/server/html_links.js"
import {
  addPositionsToTableOfContentsFile,
  simplifiedHtmlBillFileToTableOfContentsFile,
} from "$lib/server"

async function enrichAssembleeDocuments({
  commit,
  datasets: dataDir,
  force,
  legislature,
  pull,
  remote,
  uid: firstUid,
  verbose,
}: {
  commit?: boolean
  datasets: string
  force?: boolean
  legislature: string
  pull?: boolean
  remote?: string
  uid?: string
  verbose?: boolean
}): Promise<number> {
  assert(!commit || !firstUid, 'Options "commit" & "uid" are incompatible')

  const documentsFilesDir = path.join(dataDir, "Documents")
  const enrichedDocumentsFilesDir = path.join(dataDir, "Documents_enrichis")
  if (pull) {
    git.resetAndPull(documentsFilesDir)
    git.resetAndPull(enrichedDocumentsFilesDir)
  }
  await fs.ensureDir(documentsFilesDir)
  await fs.ensureDir(enrichedDocumentsFilesDir)

  let skip = Boolean(firstUid)
  for (const { document } of iterLoadAssembleeDocuments(
    dataDir,
    parseInt(legislature),
  )) {
    for (const documentOrDivision of walkDocumentAndDivisions(document)) {
      // Ignore documents from Sénat, except RAPP.
      if (
        documentOrDivision.uid.substring(4, 6) === "SN" &&
        !documentOrDivision.uid.startsWith("RAPP")
      ) {
        continue
      }

      if (skip) {
        if (documentOrDivision.uid === firstUid) {
          skip = false
        } else {
          continue
        }
      }

      const date = (
        documentOrDivision.cycleDeVie.chrono.dateCreation ??
        documentOrDivision.cycleDeVie.chrono.dateDepot ??
        documentOrDivision.cycleDeVie.chrono.datePublication ??
        documentOrDivision.cycleDeVie.chrono.datePublicationWeb
      )
        ?.toISOString()
        .split("T")[0] as string
      assert.notStrictEqual(date, undefined)

      const documentOrDivisionFilesDir = pathFromDocumentUid(
        documentsFilesDir,
        documentOrDivision.uid,
      )
      const htmlFilePath = path.join(
        documentOrDivisionFilesDir,
        "dyn-opendata.html",
      )
      if (!(await fs.pathExists(htmlFilePath))) {
        continue
      }

      const enrichedDocumentOrDivisionFilesDir = pathFromDocumentUid(
        enrichedDocumentsFilesDir,
        documentOrDivision.uid,
      )
      if (await fs.pathExists(enrichedDocumentOrDivisionFilesDir)) {
        if (!force) {
          continue
        }
      } else {
        await fs.ensureDir(enrichedDocumentOrDivisionFilesDir)
      }

      if (verbose) {
        console.log(
          `Enriching ${documentOrDivision.uid} at ${enrichedDocumentOrDivisionFilesDir}…`,
        )
      }

      const htmlWithLinksFilePath = path.join(
        enrichedDocumentOrDivisionFilesDir,
        "dyn-opendata_avec_liens.html",
      )
      const htmlWithLinksTransformationsOutputDir = path.join(
        enrichedDocumentOrDivisionFilesDir,
        "dyn-opendata_avec_liens_transformations",
      )
      await addLinksOrReferencesToHtmlFile({
        date,
        // defaultTextId,
        htmlFilePath,
        htmlWithLinksFilePath,
        htmlWithLinksOrReferencesFilePath: path.join(
          enrichedDocumentOrDivisionFilesDir,
          "dyn-opendata_avec_liens_ou_references.html",
        ),
        htmlWithLinksTransformationsOutputDir,
        htmlWithReferencesFilePath: path.join(
          enrichedDocumentOrDivisionFilesDir,
          "dyn-opendata_avec_references.html",
        ),
        // logIgnoredReferencesTypes,
        // logPartialReferences,
        // logReferences,
        referredLegifranceTextsInfosFilePath: path.join(
          enrichedDocumentOrDivisionFilesDir,
          "textes_references.json",
        ),
      })

      const tableOfContentsFilePath = path.join(
        enrichedDocumentOrDivisionFilesDir,
        "sommaire.json",
      )
      await simplifiedHtmlBillFileToTableOfContentsFile(
        htmlWithLinksFilePath,
        htmlWithLinksTransformationsOutputDir,
        tableOfContentsFilePath,
      )
      await addPositionsToTableOfContentsFile(
        htmlWithLinksFilePath,
        htmlWithLinksTransformationsOutputDir,
        tableOfContentsFilePath,
        path.join(
          enrichedDocumentOrDivisionFilesDir,
          "dyn-opendata_avec_liens_segmentation.json",
        ),
      )
    }
  }

  if (commit) {
    return git.commitAndPush(
      enrichedDocumentsFilesDir,
      "Ajout des liens et des références à Légifrance",
      remote === undefined ? undefined : [remote],
    )
  }

  return 0
}

sade("enrich_assemblee_documents", true)
  .describe("Enrich Assemblée HTML documents")
  .option("-c, --commit", "Commit links added to HTML fragments")
  .option("-d, --datasets", "Path of directory containing Assemblée datasets")
  .option(
    "-f, --force",
    "Add links and references to every documents, even already enriched ones",
  )
  .option("-l, --legislature", "Legislature of dataset to use")
  .option("-p, --pull", "Pull dataset before adding links to it")
  .option("-r, --remote", "Name of upstream repository to push to")
  .option("-u, --uid", "Resume script at document with given UID")
  .action(async (options) => {
    process.exit(await enrichAssembleeDocuments(options))
  })
  .parse(process.argv)
