import {
  capitalizeFirstLetter,
  walkActes,
  type Document,
  type DossierParlementaire,
} from "@tricoteuses/assemblee"
import sade from "sade"

import { assembleeDb, tisseuseDb } from "$lib/server/databases/index.js"

interface AssembleeDescription {
  cartouches: Cartouche[]
  uid: string
}

export interface Cartouche {
  badge?: string
  titre: string
}

function addCartouche(cartouches: Cartouche[], cartouche: Cartouche): void {
  if (
    cartouches.find(
      (exisitingAutocompletion) =>
        exisitingAutocompletion.titre === cartouche.titre,
    ) === undefined
  ) {
    cartouches.push(cartouche)
  }
}

async function extractAssembleeTextsDescriptions(): Promise<
  Map<string, AssembleeDescription>
> {
  const assembleeDescriptionByUid = new Map<string, AssembleeDescription>()
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
      assembleeDescriptionByUid.set(uid, {
        cartouches: [
          {
            badge: dossierParlementaire.procedureParlementaire.libelle,
            titre: capitalizeFirstLetter(
              dossierParlementaire.titreDossier.titre,
            ),
          },
        ],
        uid: uid,
      })

      if (dossierParlementaire.actesLegislatifs !== undefined) {
        const documentsUids = new Set<string>()
        for (const acte of walkActes(dossierParlementaire.actesLegislatifs)) {
          if (acte.texteAdopteRef !== undefined) {
            documentsUids.add(acte.texteAdopteRef)
          }
          if (acte.texteAssocieRef !== undefined) {
            documentsUids.add(acte.texteAssocieRef)
          }
        }

        if (documentsUids.size !== 0) {
          for (const { data: document, uid: documentUid } of await assembleeDb<
            Array<{ data: Document; uid: string }>
          >`
            SELECT data, uid
            FROM documents
            WHERE uid in ${assembleeDb([...documentsUids])}
          `) {
            const documentCartouches = [
              {
                badge: document.denominationStructurelle,
                titre: capitalizeFirstLetter(document.titres.titrePrincipal),
              },
            ]
            if (
              document.titres.titrePrincipalCourt !==
              document.titres.titrePrincipal
            ) {
              addCartouche(documentCartouches, {
                badge: document.denominationStructurelle,
                titre: capitalizeFirstLetter(
                  document.titres.titrePrincipalCourt,
                ),
              })
            }
            assembleeDescriptionByUid.set(documentUid, {
              cartouches: documentCartouches,
              uid: documentUid,
            })
          }
        }
      }
    }
  }
  return assembleeDescriptionByUid
}

async function extractAssembleeDossiersEtDocumentsInfos({
  autocompletion: generateAutocompletions,
}: {
  autocompletion?: boolean
}): Promise<number> {
  const assembleeDescriptionByUid = await extractAssembleeTextsDescriptions()

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
    for (const { cartouches, uid } of assembleeDescriptionByUid.values()) {
      for (const cartouche of cartouches) {
        await tisseuseDb`
          INSERT INTO titre_texte_autocompletion (
            autocompletion,
            badge,
            id
          ) VALUES (
            ${cartouche.titre},
            ${cartouche.badge ?? null},
            ${uid}
          )
          ON CONFLICT (autocompletion, id) DO UPDATE SET
            badge = EXCLUDED.badge
          WHERE titre_texte_autocompletion.badge IS DISTINCT FROM EXCLUDED.badge
        `
        existingTitreTexteAutocompletionKeys.delete(
          JSON.stringify([uid, cartouche.titre]),
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
