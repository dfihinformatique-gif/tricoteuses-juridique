import fs from "fs-extra"
import Papa from "papaparse"
import sade from "sade"

import type { DossierLegislatif } from "$lib/legal"
import { db } from "$lib/server/database"

async function exportEcheanciers(csvFilePath: string): Promise<void> {
  const data: Array<{
    article?: string
    base_legale?: string
    cid_loi_cible?: string
    date_prevue?: string
    decret?: string
    derniere_maj?: string
    id: string
    lien_article_id?: string
    lien_article_texte?: string
    numero_ordre?: string
    objet?: string
    titre: string
  }> = []
  for (const { data: dossierLegislatif } of await db<
    { data: DossierLegislatif }[]
  >`
    SELECT data FROM dossier_legislatif
  `) {
    const echeancier = dossierLegislatif.CONTENU.ECHEANCIER
    if (echeancier === undefined) {
      data.push({
        id: dossierLegislatif.META.META_COMMUN.ID,
        titre: dossierLegislatif.META.META_DOSSIER_LEGISLATIF.TITRE,
      })
      continue
    }
    for (const ligne of echeancier.LIGNE) {
      for (const lienArticle of ligne.LIEN_ARTICLE ?? [
        { "@id": undefined, "#text": undefined },
      ]) {
        data.push({
          article: ligne.ARTICLE,
          base_legale: ligne.BASE_LEGALE,
          cid_loi_cible: ligne.CID_LOI_CIBLE,
          date_prevue: ligne.DATE_PREVUE,
          decret: ligne.DECRET,
          lien_article_id: lienArticle["@id"],
          lien_article_texte: lienArticle["#text"],
          derniere_maj: echeancier["@derniere_maj"],
          id: dossierLegislatif.META.META_COMMUN.ID,
          numero_ordre: ligne.NUMERO_ORDRE.map((numero) =>
            numero.toString(),
          ).join(", "),
          objet: ligne.OBJET,
          titre: dossierLegislatif.META.META_DOSSIER_LEGISLATIF.TITRE,
        })
      }
    }
  }
  const csvFile = await fs.writeFile(
    csvFilePath,
    Papa.unparse(data, {
      columns: [
        "id",
        "titre",
        "derniere_maj",
        "article",
        "lien_article_id",
        "lien_article_texte",
        "base_legale",
        "objet",
        "date_prevue",
        "decret",
        "cid_loi_cible",
        "numero_ordre",
      ],
    }),
  )
}

sade("export_dole_echeancier_to_csv <csvFilePath>", true)
  .describe("Export schedules of legislative files from Dila's DOLE database")
  .action(async (csvFilePath) => {
    await exportEcheanciers(csvFilePath)
    process.exit(0)
  })
  .parse(process.argv)
