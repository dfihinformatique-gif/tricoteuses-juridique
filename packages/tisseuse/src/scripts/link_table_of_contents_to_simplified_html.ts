/**
 * TODO;
 * Ce script devrait travailler sur Documents_enrichis, mais ce n'est pas le seul.
 * Car il y a un script qui met les liens, etc.
 * Documents_enrichis doit contenir tout ce que contient Documents (sauf éventuellement des formats inutiles).
 * Il faut donc un script de syncronisation entre Documents et Documents_enrichis, qui (re)lance plusieurs scripts
 * quand quelque chose a changé entre les fichiers d'un Documents et ceux d'un Documents_enrichis.
 * Problème : le script de synchronisation devrait faire partie de @tricoteuses/assemblee.
 * Mais les scripts qui mettent les liens et ce script qui détecte la structure doit faire partie de @tricoteuses/tisseuse.
 * Quand le script de synchronisation détecte qu'une document (quelque soit son format a changé ou a été ajouté ou…) il devrait
 * lancer tisseuse.
 * Pas de problème car c'est tricoteuses-assemblee-update qui gère tout cela et tricoteuses-assemblee-update peut aussi bien
 * lancer des scripts assemblee que des scripts tisseuse.
 *
 * Ce script parse_bill_structure travaille sur un seul document (dans Documents_enrichis) dont le chemin lui est fourni.
 * Il suppose que le script simplify_assemblee_document, qui simplifie le document (et qui créé les fichiers intermédiaires
 * dans le répertoire) est déjà passé.
 *
 * Il y a deux scripts (ou deux modes d'appel du même script) :
 * * un qui extrait un JSON contenant l'arborescence des sections et des articles avec seulement le contenu de la ligne
 *   Cela permet d'éditer ce fichier avec un éditeur et d'y ajouter manuellement les sections non détectées par ce script.
 *   Attention, quand on repasse le script il ne faut pas modifier le fichier qui a été modifié manuellement
 *   => 2 fichiers distincts !
 * * un qui part de ce fichier, retrouve les lignes dans le fichier texte et mémorise dans un autre fichier json la
 *   position de début et de fin dans texte et dans le HTML de chacune des sections et chacun des articles.
 * * pour faire le diff entre ce document et un autre, il n'y a plus qu'à utiliser les fichiers json des 2 documents pour
 *   trouver les positions (dans le texte) des articles à comparer, faire le diff pour chacun des articles et le montrer dans
 *   le HTML en ajoutant les élements HTML adéquats.
 */

import fs from "fs-extra"
import sade from "sade"

import {
  newReverseTransformationsMergedFromPositionsIterator,
  reverseTransformationFromPosition,
  TableOfContentsArticlePositioned,
  TableOfContentsDivisionPositioned,
  TextParserContext,
  walkTableOfContents,
  type FragmentPosition,
  type TableOfContents,
  type Transformation,
} from "$lib"
import { readTransformation } from "$lib/server"

function* addPositionsToTableOfContentsItems({
  context,
  tableOfContents,
  transformation,
}: {
  context: TextParserContext
  tableOfContents: TableOfContents
  transformation: Transformation
}): Generator<
  TableOfContentsArticlePositioned | TableOfContentsDivisionPositioned,
  void,
  unknown
> {
  let index = 0
  const originalPositionsFromTransformedIterator =
    newReverseTransformationsMergedFromPositionsIterator(transformation)
  for (const tableOfContentsItem of walkTableOfContents(tableOfContents)) {
    const lineRegExp = new RegExp(
      // TODO: Use RegExp.escape as soon as tricoteuses-legifrance (and nodegit)
      // can be used with NodeJS >= 24.
      // `^${RegExp.escape(tableOfContentsItem.line)}$`,
      `^${tableOfContentsItem.line}$`,
      "m",
    )
    lineRegExp.lastIndex = index
    const lineMatch = lineRegExp.exec(context.input)
    if (lineMatch === null) {
      throw new Error(
        `Table of contents item "${tableOfContentsItem.line}" not found in HTML`,
      )
    }

    const position: FragmentPosition = {
      start: lineMatch.index,
      stop: lineMatch.index + lineMatch[0].length,
    }
    const originalTransformation = reverseTransformationFromPosition(
      originalPositionsFromTransformedIterator,
      position,
    )
    const tableOfContentsItemPositioned = tableOfContentsItem as
      | TableOfContentsArticlePositioned
      | TableOfContentsDivisionPositioned
    tableOfContentsItemPositioned.originalTransformation =
      originalTransformation
    tableOfContentsItemPositioned.position = position
    yield tableOfContentsItemPositioned

    index = position.stop
  }
}

async function linkTableOfContentsToSimplifiedHtml(
  htmlPath: string,
  transformationDir: string,
  tableOfContentsPath: string,
  segmentationPath: string,
): Promise<number> {
  const html = await fs.readFile(htmlPath, { encoding: "utf-8" })
  const transformation = readTransformation(html, transformationDir)
  const text = transformation.output
  const context = new TextParserContext(text)
  const tableOfContents = (await fs.readJson(tableOfContentsPath, {
    encoding: "utf-8",
  })) as TableOfContents

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of addPositionsToTableOfContentsItems({
    context,
    tableOfContents,
    transformation,
  })) {
    // Do nothing.
  }

  await fs.writeJson(segmentationPath, tableOfContents, {
    encoding: "utf-8",
    spaces: 2,
  })

  return 0
}

sade(
  "link_table_of_contents_to_simplified_html <html_bill> <transformation_dir> <table_of_contents> <segmentation>",
  true,
)
  .describe("Insert table of contents links into a simplified HTML document")
  .action(
    async (
      htmlPath,
      transformationDir,
      tableOfContentsPath,
      segmentationPath,
    ) => {
      process.exit(
        await linkTableOfContentsToSimplifiedHtml(
          htmlPath,
          transformationDir,
          tableOfContentsPath,
          segmentationPath,
        ),
      )
    },
  )
  .parse(process.argv)
