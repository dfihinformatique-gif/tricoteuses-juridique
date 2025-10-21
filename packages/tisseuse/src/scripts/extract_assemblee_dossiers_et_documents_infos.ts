import type { DossierParlementaire } from "@tricoteuses/assemblee"
import sade from "sade"

import { assembleeDb, tisseuseDb } from "$lib/server/databases/index.js"

interface AssembleeTextDescription {
  cartouches: Cartouche[]
  dossierParlementaireUid: string
}

export interface Cartouche {
  badge?: string
  titre: string
}

async function extractAssembleeTextsDescriptions(): Promise<
  Map<string, AssembleeTextDescription>
> {
  const assembleeTextDescriptionByDossierParlementaireUid = new Map<
    string,
    AssembleeTextDescription
  >()
  for await (const dossierParlementaireRows of assembleeDb<
    Array<{ data: DossierParlementaire; uid: string }>
  >`
    SELECT data, uid
    FROM dossiers
  `.cursor(100)) {
    for (const {
      data: dossierParlementaire,
      uid,
    } of dossierParlementaireRows) {
      assembleeTextDescriptionByDossierParlementaireUid.set(uid, {
        cartouches: [
          {
            badge: dossierParlementaire.procedureParlementaire.libelle,
            titre: dossierParlementaire.titreDossier.titre,
          },
        ],
        dossierParlementaireUid: uid,
      })
    }
  }
  return assembleeTextDescriptionByDossierParlementaireUid
}

async function extractAssembleeDossiersEtDocumentsInfos({
  autocompletion: generateAutocompletions,
}: {
  autocompletion?: boolean
}): Promise<number> {
  const assembleeTextDescriptionByDossierParlementaireUid =
    await extractAssembleeTextsDescriptions()

  if (generateAutocompletions) {
    const existingTitreTexteAutocompletionKeys = new Set(
      (
        await tisseuseDb<Array<{ autocompletion: string; id: string }>>`
          SELECT autocompletion, id
          FROM titre_texte_autocompletion
          WHERE id LIKE 'DLR%'
        `
      ).map(({ autocompletion, id }) => JSON.stringify([id, autocompletion])),
    )
    for (const {
      cartouches,
      dossierParlementaireUid,
    } of assembleeTextDescriptionByDossierParlementaireUid.values()) {
      for (const cartouche of cartouches) {
        await tisseuseDb`
          INSERT INTO titre_texte_autocompletion (
            autocompletion,
            badge,
            id
          ) VALUES (
            ${cartouche.titre},
            ${cartouche.badge ?? null},
            ${dossierParlementaireUid}
          )
          ON CONFLICT (autocompletion, id) DO UPDATE SET
            badge = EXCLUDED.badge
          WHERE titre_texte_autocompletion.badge IS DISTINCT FROM EXCLUDED.badge
        `
        existingTitreTexteAutocompletionKeys.delete(
          JSON.stringify([dossierParlementaireUid, cartouche.titre]),
        )
      }
    }
    for (const obsoleteTitreTexteAutocompletionKey of existingTitreTexteAutocompletionKeys) {
      const [id, autocompletion] = JSON.parse(
        obsoleteTitreTexteAutocompletionKey,
      ) as [string, string]
      await tisseuseDb`
        DELETE FROM titre_texte_autocompletion
        WHERE
          id = ${id}
          AND autocompletion = ${autocompletion}
      `
    }
  }

  return 0
}

sade("extract_assemblee_dossiers_et_documents_infos", true)
  .describe("Extract names of Assemblée legislative folders & documents")
  .option("-a, --autocompletion", "Generate cartouches SQL table")
  .action(async (options) => {
    process.exit(await extractAssembleeDossiersEtDocumentsInfos(options))
  })
  .parse(process.argv)
