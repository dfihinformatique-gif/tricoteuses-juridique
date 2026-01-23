/**
 * TODO;
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

import sade from "sade"

import { addPositionsToTableOfContentsFile } from "$lib/server"

sade(
  "add_positions_to_table_of_contents <html_bill> <transformation_dir> <table_of_contents> <segmentation>",
  true,
)
  .describe("Add positions (both HTML & simplified) to a table of contents")
  .action(
    async (
      htmlPath,
      transformationDir,
      tableOfContentsPath,
      segmentationPath,
    ) => {
      await addPositionsToTableOfContentsFile(
        htmlPath,
        transformationDir,
        tableOfContentsPath,
        segmentationPath,
      )
      process.exit(0)
    },
  )
  .parse(process.argv)
