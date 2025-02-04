import {
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import dedent from "dedent-js"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import {
  auditJo,
  auditJorfArticle,
  auditJorfSectionTa,
  auditJorfTextelr,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import { auditId, auditVersions } from "$lib/auditors/legal"
import type { Versions, XmlHeader } from "$lib/legal"
import type {
  Jo,
  JorfArticle,
  JorfArticleTm,
  JorfCategorieTag,
  JorfSectionTa,
  JorfTexte,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTexte,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { cleanHtmlFragment, escapeHtml } from "$lib/strings"
import { assertNever } from "$lib/asserts"
import {
  auditLegiArticle,
  auditLegiSectionTa,
  auditLegiTextelr,
  auditLegiTexteVersion,
} from "$lib/auditors/legi"

interface JorfObjectByIdByCategorie {
  ARTICLE: Record<string, JorfArticle>
  ID: Record<string, string>
  JO: Record<string, Jo>
  SECTION_TA: Record<string, JorfSectionTa>
  TEXTE: Record<string, JorfTexte>
  VERSIONS: Record<string, Versions>
}

interface LegalObjectByIdByCategorieByOrigine {
  JORF: JorfObjectByIdByCategorie
  LEGI: LegiObjectByIdByCategorie
}

type LegalObjectsTypes = "article" | "jo" | "sectionTa" | "texte"

interface LegiObjectByIdByCategorie {
  ARTICLE: Record<string, LegiArticle>
  SECTION_TA: Record<string, LegiSectionTa>
  TEXTE: Record<string, LegiTexte>
}

type Origine = (typeof origines)[number]

// interface ReferencesByJorfIdByCategorie {
//   ARTICLE: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       sectionsTaIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
//   JO: Record<
//     string,
//     {
//       // articlesIds?: Set<string>
//       // sectionsTaIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
//   SECTION_TA: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       sectionsTaIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
//   TEXTE: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
// }

// interface ReferencesByLegalIdByCategorieByOrigine {
//   JORF: ReferencesByJorfIdByCategorie
//   LEGI: ReferencesByLegiIdByCategorie
// }
// interface ReferencesByLegiIdByCategorie {
//   ARTICLE: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       sectionsTaIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
//   SECTION_TA: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       sectionsTaIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
//   TEXTE: Record<
//     string,
//     {
//       articlesIds?: Set<string>
//       textesIds?: Set<string>
//     }
//   >
// }

const dilaDateRegExp = /20\d\d[01]\d[0-3]\d-([0-6]\d){3}/
const origines = ["JORF", "LEGI"] as const
const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "ARTICLE.BLOC_TEXTUEL.CONTENU",
    "ARTICLE.NOTA.CONTENU",
    "ARTICLE.SM.CONTENU",
    "TEXTE_VERSION.ABRO.CONTENU",
    "TEXTE_VERSION.NOTA.CONTENU",
    "TEXTE_VERSION.NOTICE.CONTENU",
    "TEXTE_VERSION.RECT.CONTENU",
    "TEXTE_VERSION.SIGNATAIRES.CONTENU",
    "TEXTE_VERSION.SM.CONTENU",
    "TEXTE_VERSION.TP.CONTENU",
    "TEXTE_VERSION.VISAS.CONTENU",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

// function addReferencesToJorfObjects(
//   jorfObjectByIdByCategorie: JorfObjectByIdByCategorie,
//   referencesByJorfId: ReferencesByJorfIdByCategorie,
// ) {
//   for (const texte of Object.values(
//     jorfObjectByIdByCategorie.TEXTE,
//   )) {
//     const texteId = texte.META.META_COMMUN.ID
//     const liens = texte.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
//     if (liens !== undefined) {
//       for (const lien of liens) {
//         const lienId = lien["@id"]
//         if (lienId === undefined) {
//           continue
//         }
//         const lienObjectType = legalObjectTypeFromId(lienId)
//         const lienObject =
//           legalObjectByIdByCategorieByOrigine[lienObjectType]?.[lienId]
//         if (lienObject === undefined) {
//           continue
//         }
//         ;(
//           (jorfObjectByIdByCategorie[lienObjectType][lienId] ??=
//             {}).textesIds ?? new Set()
//         ).add(texteId)
//       }
//     }
//   }
// }

async function convertGitTree(
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  targetRepository: nodegit.Repository,
  targetExistingTree: nodegit.Tree | undefined,
): Promise<nodegit.Oid | undefined> {
  const targetTreeBuilder = await nodegit.Treebuilder.create(targetRepository)
  const sourcePreviousEntryByName =
    sourcePreviousTree === undefined
      ? undefined
      : Object.fromEntries(
          sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
        )
  const targetExistingEntryByName =
    targetExistingTree === undefined
      ? undefined
      : Object.fromEntries(
          targetExistingTree.entries().map((entry) => [entry.name(), entry]),
        )
  for (const sourceEntry of sourceTree.entries()) {
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourcePreviousEntry !== undefined) {
      // Ensure that at the end of the loop sourcePreviousEntryByName contains
      // only entries deleted from the source tree.
      delete sourcePreviousEntryByName![sourceEntryName]
    }
    const targetExistingEntry = targetExistingEntryByName?.[sourceEntryName]
    if (
      sourceEntry.oid() === sourcePreviousEntry?.oid() &&
      targetExistingEntry !== undefined
    ) {
      // Reuse existing target entry.
      targetTreeBuilder.insert(
        targetExistingEntry.name(),
        targetExistingEntry.id(),
        targetExistingEntry.filemode(),
      )
    } else if (sourceEntry.isTree()) {
      const targetSubtreeOid = await convertGitTree(
        await sourcePreviousEntry?.getTree(),
        await sourceEntry.getTree(),
        targetRepository,
        await targetExistingEntry?.getTree(),
      )
      if (targetSubtreeOid !== undefined) {
        await targetTreeBuilder.insert(
          sourceEntryName,
          targetSubtreeOid,
          sourceEntry.filemode(),
        )
      }
    } else {
      const targetEntryName = sourceEntryName.replace(/\.xml$/, ".md")
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
      for (const [tag, element] of Object.entries(xmlData) as [
        JorfCategorieTag | "?xml",
        (
          | Jo
          | JorfArticle
          | JorfSectionTa
          | JorfTextelr
          | JorfTexteVersion
          | Versions
          | XmlHeader
        ),
      ][]) {
        switch (tag) {
          case "?xml": {
            break
          }

          case "ARTICLE": {
            const [article, error] = auditChain(auditJorfArticle, auditRequire)(
              strictAudit,
              element,
            ) as [JorfArticle, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for ARTICLE:\n${JSON.stringify(
                article,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const articleId = article.META.META_COMMUN.ID
            const articleNumber = article.META.META_SPEC.META_ARTICLE.NUM
            const texte = article.CONTEXTE.TEXTE
            const titresTexte = texte.TITRE_TXT
            const texteTitle =
              titresTexte === undefined
                ? "Texte sans titre"
                : titresTexte.length === 1
                  ? (
                      titresTexte[0]["#text"] ??
                      titresTexte[0]["@c_titre_court"] ??
                      "Texte sans titre"
                    )
                      .replace(/\s+/g, " ")
                      .trim()
                  : titresTexte
                      .map(
                        (titreTexte) =>
                          `${(
                            titreTexte["#text"] ??
                            titreTexte["@c_titre_court"] ??
                            "Texte sans titre"
                          )
                            .replace(/\s+/g, " ")
                            .trim()}${
                            titreTexte["@debut"] === "2999-01-01" &&
                            titreTexte["@fin"] === "2999-01-01"
                              ? ""
                              : titreTexte["@fin"] === "2999-01-01"
                                ? ` (depuis le ${titreTexte["@debut"]})`
                                : ` (du ${titreTexte["@debut"]} au ${titreTexte["@debut"]})`
                          }`,
                      )
                      .join("<br />\n")
            const tm = texte.TM
            const articleMarkdown = [
              dedent`
                ---
                ${[
                  // ["État", (article as LegiArticle).META.META_SPEC.META_ARTICLE.ETAT],
                  ["Type", article.META.META_SPEC.META_ARTICLE.TYPE],
                  [
                    "Date de début",
                    article.META.META_SPEC.META_ARTICLE.DATE_DEBUT,
                  ],
                  ["Date de fin", article.META.META_SPEC.META_ARTICLE.DATE_FIN],
                  ["Identifiant", articleId],
                  ["Ancien identifiant", article.META.META_COMMUN.ANCIEN_ID],
                  // TODO: Mettre l'URL dans le Git Tricoteuses
                  ["URL", article.META.META_COMMUN.URL],
                ]
                  .filter(([, value]) => value !== undefined)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join("\n")}
                ---
              `,
              tm === undefined
                ? dedent`
                    <h2>
                      ${escapeHtml(texteTitle).replaceAll("\n", "\n  ")}
                    </h2>
                  `
                : dedent`
                    <ul>
                      <li>
                        <h2>
                          ${escapeHtml(texteTitle).replaceAll("\n", "\n      ")}
                        </h2>
                        ${generateJorfArticleTmBreadcrumb(tm).replaceAll("\n", "\n    ")}
                      </li>
                    </ul>
                  `,
              articleNumber === undefined
                ? undefined
                : `<h1>${escapeHtml(`Article ${articleNumber}`)}</h1>`,

              await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU),
            ]
              .filter((block) => block !== undefined)
              .join("\n\n")
            // console.log(articleMarkdown)
            // console.log("\n", "=".repeat(100), "\n")
            const targetBlobOid = await targetRepository.createBlobFromBuffer(
              Buffer.from(articleMarkdown, "utf-8"),
            )
            targetTreeBuilder.insert(
              targetEntryName,
              targetBlobOid,
              sourceEntry.filemode(),
            )
            break
          }
          case "ID": {
            //     assert.strictEqual(relativeSplitPath[0], "global")
            //     assert.strictEqual(relativeSplitPath[1], "eli")
            //     const eli = relativeSplitPath.slice(2, -1).join("/")
            //     const [id, idError] = auditChain(auditId, auditRequire)(
            //       strictAudit,
            //       element,
            //     )
            //     assert.strictEqual(
            //       idError,
            //       null,
            //       `Unexpected format for ID:\n${JSON.stringify(
            //         id,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(idError, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO id (
            //         eli,
            //         id
            //       ) VALUES (
            //         ${eli},
            //         ${id}
            //       )
            //       ON CONFLICT (eli)
            //       DO UPDATE SET
            //         id = ${id}
            //     `
            //     idRemainingElis.delete(eli)
            break
          }
          case "JO": {
            //     const [jo, error] = auditChain(auditJo, auditRequire)(
            //       strictAudit,
            //       element,
            //     ) as [Jo, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for JO:\n${JSON.stringify(
            //         jo,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO jo (
            //         id,
            //         data
            //       ) VALUES (
            //         ${jo.META.META_COMMUN.ID},
            //         ${db.json(jo as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(jo as unknown as JSONValue)}
            //     `
            //     joRemainingIds.delete(jo.META.META_COMMUN.ID)
            break
          }
          case "SECTION_TA": {
            //     const [section, error] = auditChain(
            //       auditJorfSectionTa,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfSectionTa, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for SECTION_TA:\n${JSON.stringify(
            //         section,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO section_ta (
            //         id,
            //         data
            //       ) VALUES (
            //         ${section.ID},
            //         ${db.json(section as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(section as unknown as JSONValue)}
            //     `
            //     sectionTaRemainingIds.delete(section.ID)
            break
          }
          case "TEXTE_VERSION": {
            //     const [texteVersion, error] = auditChain(
            //       auditJorfTexteVersion,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfTexteVersion, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
            //         texteVersion,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     const textAFragments = [
            //       texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
            //       texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
            //     ].filter((text) => text !== undefined)
            //     const natureEtNum =
            //       texteVersion.META.META_COMMUN.NATURE !== undefined &&
            //         texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM !==
            //         undefined
            //         ? `${texteVersion.META.META_COMMUN.NATURE.toUpperCase()}.${texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM}`
            //         : null
            //     await db`
            //       INSERT INTO texte_version (
            //         id,
            //         data,
            //         nature,
            //         nature_et_num,
            //         text_search
            //       ) VALUES (
            //         ${texteVersion.META.META_COMMUN.ID},
            //         ${db.json(texteVersion as unknown as JSONValue)},
            //         ${texteVersion.META.META_COMMUN.NATURE ?? null},
            //         ${natureEtNum},
            //         setweight(to_tsvector('french', ${textAFragments.join(
            //       " ",
            //     )}), 'A')
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(texteVersion as unknown as JSONValue)},
            //         nature = ${texteVersion.META.META_COMMUN.NATURE ?? null},
            //         nature_et_num = ${natureEtNum},
            //         text_search = setweight(to_tsvector('french', ${textAFragments.join(
            //       " ",
            //     )}), 'A')
            //     `
            //     texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            break
          }
          case "TEXTELR": {
            //     const [textelr, error] = auditChain(
            //       auditJorfTextelr,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfTextelr, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for TEXTELR:\n${JSON.stringify(
            //         textelr,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO textelr (
            //         id,
            //         data
            //       ) VALUES (
            //         ${textelr.META.META_COMMUN.ID},
            //         ${db.json(textelr as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(textelr as unknown as JSONValue)}
            //     `
            //     textelrRemainingIds.delete(textelr.META.META_COMMUN.ID)
            break
          }
          case "VERSIONS": {
            //     assert.strictEqual(relativeSplitPath[0], "global")
            //     assert.strictEqual(relativeSplitPath[1], "eli")
            //     const eli = relativeSplitPath.slice(2, -1).join("/")
            //     const [versions, versionsError] = auditChain(
            //       auditVersions,
            //       auditRequire,
            //     )(strictAudit, element)
            //     assert.strictEqual(
            //       versionsError,
            //       null,
            //       `Unexpected format for VERSIONS:\n${JSON.stringify(
            //         versions,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
            //     )
            //     const id = versions.VERSION["@id"]
            //     await db`
            //       INSERT INTO versions (
            //         eli,
            //         id,
            //         data
            //       ) VALUES (
            //         ${eli},
            //         ${id},
            //         ${db.json(versions as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (eli)
            //       DO UPDATE SET
            //         id = ${id},
            //         data = ${db.json(versions as unknown as JSONValue)}
            //     `
            //     versionsRemainingElis.delete(id)
            break
          }
          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntryName}`,
            )
            break
          }
        }
      }
    }
  }

  // Remaining entries in sourcePreviousEntryByName are deleted.
  // => Remove them from targetTree.
  // TODO

  return targetTreeBuilder.entrycount() === 0
    ? undefined
    : await targetTreeBuilder.write()
}

function generateJorfArticleTmBreadcrumb(
  tm: JorfArticleTm,
  headingLevel = 3,
): string {
  return tm.TM === undefined
    ? dedent`
        <ul>
          <li>
            <h${headingLevel}>
              ${escapeHtml(tm.TITRE_TM["#text"] ?? "Section sans titre").replaceAll("\n", "\n      ")}
            </h${headingLevel}>
          </li>
        </ul>
      `
    : dedent`
        <ul>
          <li>
            <h${headingLevel}>
              ${escapeHtml(tm.TITRE_TM["#text"] ?? "Section sans titre").replaceAll("\n", "\n      ")}
            </h${headingLevel}>
            ${generateJorfArticleTmBreadcrumb(tm.TM, Math.min(headingLevel + 1, 6)).replaceAll("\n", "\n    ")}
          </li>
        </ul>
      `
}

async function gitXmlToGitMarkdown(
  dilaDir: string,
  {
    force,
    init,
    // push,
    silent,
  }: {
    force?: boolean
    init?: string
    push?: boolean
    silent?: boolean
  } = {},
): Promise<number> {
  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  let exitCode = 0
  const [dilaStartDate, dilaStartDateError] = auditChain(
    auditTest(
      (value: string) => dilaDateRegExp.test(value),
      (value) => `Date not found in "${value}"`,
    ),
    auditFunction((value: string) => value.match(dilaDateRegExp)?.[0]),
    auditRequire,
  )(strictAudit, init) as [string, unknown]
  assert.strictEqual(
    dilaStartDateError,
    null,
    `Error in init option: ${JSON.stringify(dilaStartDate)}:\n${JSON.stringify(
      dilaStartDateError,
      null,
      2,
    )}`,
  )

  const sourceRepositoryByOrigine = Object.fromEntries(
    await Promise.all(
      origines.map(async (origine) => [
        origine,
        await nodegit.Repository.open(
          path.join(dilaDir, origine.toLowerCase(), ".git"),
        ),
      ]),
    ),
  )
  const targetGitDir = path.join(dilaDir, "jorf_simple.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  const legalObjectByIdByCategorieByOrigine: LegalObjectByIdByCategorieByOrigine =
    {
      JORF: {
        ARTICLE: {},
        ID: {},
        JO: {},
        SECTION_TA: {},
        TEXTE: {},
        VERSIONS: {},
      },
      LEGI: {
        ARTICLE: {},
        SECTION_TA: {},
        TEXTE: {},
      },
    }
  // const referencesByLegalIdByCategorieByOrigine: ReferencesByLegalIdByCategorieByOrigine =
  //   {
  //     JORF: {
  //       ARTICLE: {},
  //       JO: {},
  //       SECTION_TA: {},
  //       TEXTE: {},
  //     },
  //     LEGI: {
  //       ARTICLE: {},
  //       SECTION_TA: {},
  //       TEXTE: {},
  //     },
  //   }
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<"JORF" | "LEGI", nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  for await (const {
    dilaDate,
    sourceCommitByOrigine,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryByOrigine, true)) {
    console.log(
      dilaDate,
      Object.entries(sourceCommitByOrigine).map(([origine, commit]) => [
        origine,
        commit.message(),
      ]),
    )
    if (skip) {
      if (dilaDate >= dilaStartDate) {
        skip = false
      } else {
        continue
      }
    }

    // The first time that this part of the loop is reached,
    // find the commit of target to use for a base for future
    // target commits.
    if (!targetBaseCommitFound) {
      let targetBaseCommitOid: nodegit.Oid | undefined
      for await (targetBaseCommitOid of iterCommitsOids(
        targetRepository,
        false,
      )) {
        const targetBaseCommit =
          await targetRepository.getCommit(targetBaseCommitOid)
        const targetBaseCommitMessage = targetBaseCommit.message()
        if (targetBaseCommitMessage === dilaDate) {
          targetBaseCommitFound = true
          targetBaseCommitOid = targetBaseCommit.parents()[0]
          break
        }
      }
      if (!targetBaseCommitFound) {
        targetBaseCommitFound = true
        targetBaseCommitOid = undefined
      }
      if (targetBaseCommitOid !== undefined) {
        // Start targetCommitsOidsIterator at targetBaseCommitOid.
        for await (targetCommitOid of targetCommitsOidsIterator) {
          if (targetCommitOid.equal(targetBaseCommitOid)) {
            break
          }
        }
      }
    }

    const targetPreviousCommitOid = targetCommitOid
    if (!force && !targetCommitsOidsIterationsDone) {
      // If a target commit already exists for this source commit, reuse it.
      const { done, value } = await targetCommitsOidsIterator.next()
      if (done) {
        targetCommitsOidsIterationsDone = true
      } else {
        targetCommitOid = value
        const targetCommit = await targetRepository.getCommit(targetCommitOid)
        const targetCommitMessage = targetCommit.message()
        if (targetCommitMessage !== dilaDate) {
          console.warn(
            `Unexpected target commit message "${targetCommitMessage}", not matching date of source commits ${dilaDate}`,
          )
          targetCommitsOidsIterationsDone = true
        } else {
          continue
        }
      }
      if (!silent) {
        console.log(`Resuming conversion at date ${dilaDate}…`)
      }
    }

    steps.push({ label: "Loading objects", start: performance.now() })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )

    const sourceTreeByOrigine: Record<Origine, nodegit.Tree> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(sourceCommitByOrigine).map(
            async ([origine, sourceCommit]) => [
              origine,
              await sourceCommit?.getTree(),
            ],
          ),
        ),
      )
    const targetPreviousCommit =
      targetPreviousCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetPreviousCommitOid)
    const targetPreviousTree = await targetPreviousCommit?.getTree()

    if (sourcePreviousCommitByOrigine === undefined) {
      for (const [origine, sourceTree] of Object.entries(
        sourceTreeByOrigine,
      ) as Array<[Origine, nodegit.Tree]>) {
        console.log(`Loading source ${origine}`)
        switch (origine) {
          case "JORF": {
            await loadSourceJorfObjects(
              legalObjectByIdByCategorieByOrigine[origine],
              sourceTree,
            )
            break
          }
          case "LEGI": {
            await loadSourceLegiObjects(
              legalObjectByIdByCategorieByOrigine[origine],
              sourceTree,
            )
            break
          }
          default:
            assertNever("Origine", origine)
        }
      }
    } else {
      // const sourcePreviousTreeByOrigine: Record<Origine, nodegit.Tree> =
      //   Object.fromEntries(
      //     await Promise.all(
      //       Object.entries(sourcePreviousCommitByOrigine).map(
      //         async ([origine, sourcePreviousCommit]) => [
      //           origine,
      //           await sourcePreviousCommit.getTree(),
      //         ],
      //       ),
      //     ),
      //   )
      // TODO
    }
    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    // Add refrences (reverse links).
    // steps.push({
    //   label: "Adding references (reverse links)",
    //   start: performance.now(),
    // })
    // console.log(
    //   `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    // )
    // addReferencesToLegalObjects(
    //   legalObjectByIdByCategorieByOrigine,
    //   referencesByLegalIdByCategorieByOrigine,
    // )

    console.log("Performance: ")
    for (const [index, step] of steps.entries()) {
      console.log(
        `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
      )
    }
    return exitCode

    const targetTreeOid = (await convertGitTree(
      sourcePreviousTree,
      sourceTree,
      targetRepository,
      targetPreviousTree,
    )) as nodegit.Oid
    assert.notStrictEqual(targetTreeOid, undefined)
    if (targetTreeOid.tostrS() === targetPreviousTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    // Commit changes.
    const sourceAuthorWhen = sourceCommit.author().when()
    const sourceCommitterWhen = sourceCommit.committer().when()
    const targetCommitMessage = dilaDate
    if (!silent) {
      console.log(`New commit: ${targetCommitMessage}`)
    }
    targetCommitOid = await targetRepository.createCommit(
      "HEAD",
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        sourceAuthorWhen.time(),
        sourceAuthorWhen.offset(),
      ),
      nodegit.Signature.create(
        "Tricoteuses",
        "tricoteuses@tricoteuses.fr",
        sourceCommitterWhen.time(),
        sourceCommitterWhen.offset(),
      ),
      targetCommitMessage,
      targetTreeOid,
      [targetPreviousCommitOid].filter(
        (oid) => oid !== undefined,
      ) as nodegit.Oid[],
    )
  }
  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  return exitCode
}

async function* iterCommitsOids(
  repository: nodegit.Repository,
  reverse: boolean,
): AsyncGenerator<nodegit.Oid, void> {
  const revisionWalker = repository.createRevWalk()
  revisionWalker.pushHead()
  if (reverse) {
    revisionWalker.sorting(nodegit.Revwalk.SORT.REVERSE)
  }
  while (true) {
    try {
      const commitOid = await revisionWalker.next()
      yield commitOid
    } catch (err) {
      if (
        (err as Error)?.message.includes("Method next has thrown an error.")
      ) {
        break
      }
      throw err
    }
  }
}

async function* iterSourceCommitsWithSameDilaDate(
  repositoryByOrigine: Record<Origine, nodegit.Repository>,
  reverse: boolean,
): AsyncGenerator<
  { dilaDate: string; sourceCommitByOrigine: Record<Origine, nodegit.Commit> },
  void
> {
  // When reverse is false, the first commit is the most recent one.
  // When reverse is true, the first commit is the latest one.
  const commitsOidsIteratorByOrigine = Object.fromEntries(
    Object.entries(repositoryByOrigine).map(([origine, repository]) => [
      origine,
      iterCommitsOids(repository, reverse),
    ]),
  )
  iterCommitsWithSameDilaDate: while (true) {
    const commitOrNullByOrigine: Record<string, nodegit.Commit | null> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(commitsOidsIteratorByOrigine).map(
            async ([origine, commitsOidsIterator]) => {
              const { done, value } = await commitsOidsIterator.next()
              if (done) {
                return [origine, null]
              }
              return [
                origine,
                await repositoryByOrigine[origine as Origine].getCommit(
                  value as nodegit.Oid,
                ),
              ]
            },
          ),
        ),
      )
    if (
      Object.values(commitOrNullByOrigine).some((commit) => commit === null)
    ) {
      return
    }
    const commitByOrigine = commitOrNullByOrigine as Record<
      Origine,
      nodegit.Commit
    >
    const commitDilaDateByOrigine = Object.fromEntries(
      Object.entries(commitByOrigine).map(([origine, commit]) => {
        const message = commit.message()
        const dilaDate = message.match(dilaDateRegExp)?.[0] ?? null
        return [origine, dilaDate]
      }),
    )
    let dilaDateGoal = Object.values(commitDilaDateByOrigine).reduce(
      (dilaDateGoal, commitDilaDate) =>
        commitDilaDate === null
          ? dilaDateGoal
          : dilaDateGoal === null
            ? commitDilaDate
            : reverse
              ? commitDilaDate > dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal
              : commitDilaDate < dilaDateGoal
                ? commitDilaDate
                : dilaDateGoal,
      null,
    )
    if (dilaDateGoal === null) {
      continue iterCommitsWithSameDilaDate
    }

    // Iterate commits until each origin has the same commit date as the others.
    tryNextDilaDate: while (true) {
      for (const origineAndCommitTuple of Object.entries(commitByOrigine)) {
        const origine = origineAndCommitTuple[0]
        let commit = origineAndCommitTuple[1]
        let commitDilaDate = commitDilaDateByOrigine[origine]
        while (
          commitDilaDate === null ||
          (reverse
            ? commitDilaDate < dilaDateGoal
            : commitDilaDate > dilaDateGoal)
        ) {
          const { done, value } =
            await commitsOidsIteratorByOrigine[origine].next()
          if (done) {
            return
          }
          commitByOrigine[origine as Origine] = commit =
            await repositoryByOrigine[origine as Origine].getCommit(
              value as nodegit.Oid,
            )
          const message = commit.message()
          commitDilaDateByOrigine[origine] = commitDilaDate =
            message.match(dilaDateRegExp)?.[0] ?? null
        }
        if (commitDilaDate !== dilaDateGoal) {
          dilaDateGoal = commitDilaDate
          // Check if each origin has a commit with the new dilaDateGoal.
          continue tryNextDilaDate
        }
      }
      // The commits of each origin have the same Dila date.
      yield {
        dilaDate: dilaDateGoal,
        sourceCommitByOrigine: { ...commitByOrigine },
      }
      // Go to the next commit of each origin and look again for a Dila date
      // that is present in the commits of each origin.
      continue iterCommitsWithSameDilaDate
    }
  }
}

// function legalObjectTypeFromId(id: string): LegalObjectsTypes {
//   const typeKey = id.slice(4, 8)
//   switch (typeKey) {
//     case "ARTI":
//       return "article"
//     case "SCTA":
//       return "sectionTa"
//     case "TEXT":
//       return "texte"
//     default:
//       throw new Error(`Unknown type of ID: ${id}`)
//   }
// }

async function loadSourceJorfObjects(
  jorfObjectByIdByCategorie: JorfObjectByIdByCategorie,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await loadSourceJorfObjects(
        jorfObjectByIdByCategorie,
        await sourceEntry.getTree(),
      )
    } else {
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
      for (const [tag, element] of Object.entries(xmlData) as [
        JorfCategorieTag | "?xml",
        (
          | Jo
          | JorfArticle
          | JorfSectionTa
          | JorfTextelr
          | JorfTexteVersion
          | Versions
          | XmlHeader
        ),
      ][]) {
        switch (tag) {
          case "?xml": {
            break
          }

          case "ARTICLE": {
            const [article, error] = auditChain(auditJorfArticle, auditRequire)(
              strictAudit,
              element,
            ) as [JorfArticle, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for ARTICLE:\n${JSON.stringify(
                article,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            jorfObjectByIdByCategorie.ARTICLE[article.META.META_COMMUN.ID] =
              article
            break
          }

          case "ID": {
            const sourceEntryPath = sourceEntry.path()
            const sourceEntrySplitPath = sourceEntryPath.split("/")
            assert.strictEqual(sourceEntrySplitPath[0], "global")
            assert.strictEqual(sourceEntrySplitPath[1], "eli")
            const eli = sourceEntrySplitPath.slice(2, -1).join("/")
            const [id, idError] = auditChain(auditId, auditRequire)(
              strictAudit,
              element,
            )
            assert.strictEqual(
              idError,
              null,
              `Unexpected format for ID:\n${JSON.stringify(
                id,
                null,
                2,
              )}\nError:\n${JSON.stringify(idError, null, 2)}`,
            )
            jorfObjectByIdByCategorie.ID[id] = eli
            break
          }

          case "JO": {
            const [jo, error] = auditChain(auditJo, auditRequire)(
              strictAudit,
              element,
            ) as [Jo, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for JO:\n${JSON.stringify(
                jo,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            jorfObjectByIdByCategorie.JO[jo.META.META_COMMUN.ID] = jo
            break
          }

          case "SECTION_TA": {
            const [sectionTa, error] = auditChain(
              auditJorfSectionTa,
              auditRequire,
            )(strictAudit, element) as [JorfSectionTa, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for SECTION_TA:\n${JSON.stringify(
                sectionTa,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            jorfObjectByIdByCategorie.SECTION_TA[sectionTa.ID] = sectionTa
            break
          }

          case "TEXTE_VERSION": {
            const [texteVersion, error] = auditChain(
              auditJorfTexteVersion,
              auditRequire,
            )(strictAudit, element) as [JorfTexteVersion, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
                texteVersion,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const texteId = texteVersion.META.META_COMMUN.ID
            jorfObjectByIdByCategorie.TEXTE[texteId] = {
              ...texteVersion,
              ...(jorfObjectByIdByCategorie.TEXTE[texteId] ?? {}),
            }
            break
          }

          case "TEXTELR": {
            const [textelr, error] = auditChain(auditJorfTextelr, auditRequire)(
              strictAudit,
              element,
            ) as [JorfTextelr, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for TEXTELR:\n${JSON.stringify(
                textelr,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const texteId = textelr.META.META_COMMUN.ID
            jorfObjectByIdByCategorie.TEXTE[texteId] = {
              ...(jorfObjectByIdByCategorie.TEXTE[texteId] ?? {}),
              STRUCT: textelr.STRUCT,
              VERSIONS: textelr.VERSIONS,
            }
            break
          }

          case "VERSIONS": {
            const sourceEntryPath = sourceEntry.path()
            const sourceEntrySplitPath = sourceEntryPath.split("/")
            assert.strictEqual(sourceEntrySplitPath[0], "global")
            assert.strictEqual(sourceEntrySplitPath[1], "eli")
            const eli = sourceEntrySplitPath.slice(2, -1).join("/")
            const [versions, versionsError] = auditChain(
              auditVersions,
              auditRequire,
            )(strictAudit, element) as [Versions, unknown]
            assert.strictEqual(
              versionsError,
              null,
              `Unexpected format for VERSIONS:\n${JSON.stringify(
                versions,
                null,
                2,
              )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
            )
            const id = versions.VERSION["@id"]
            // TODO: Shall we keep the two and in the same dict?
            jorfObjectByIdByCategorie.VERSIONS[eli] = versions
            jorfObjectByIdByCategorie.VERSIONS[id] = versions
            break
          }

          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntry.path()}`,
            )
            break
          }
        }
      }
    }
  }
}

async function loadSourceLegiObjects(
  legiObjectByIdByCategorie: LegiObjectByIdByCategorie,
  sourceTree: nodegit.Tree,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await loadSourceLegiObjects(
        legiObjectByIdByCategorie,
        await sourceEntry.getTree(),
      )
    } else {
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
      for (const [tag, element] of Object.entries(xmlData) as [
        LegiCategorieTag | "?xml",
        (
          | LegiArticle
          | LegiSectionTa
          | LegiTextelr
          | LegiTexteVersion
          | Versions
          | XmlHeader
        ),
      ][]) {
        switch (tag) {
          case "?xml": {
            break
          }

          case "ARTICLE": {
            const [article, error] = auditChain(auditLegiArticle, auditRequire)(
              strictAudit,
              element,
            ) as [LegiArticle, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for ARTICLE:\n${JSON.stringify(
                article,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            legiObjectByIdByCategorie.ARTICLE[article.META.META_COMMUN.ID] =
              article
            break
          }

          // case "ID": {
          //   const sourceEntryPath = sourceEntry.path()
          //   const sourceEntrySplitPath = sourceEntryPath.split("/")
          //   assert.strictEqual(sourceEntrySplitPath[0], "global")
          //   assert.strictEqual(sourceEntrySplitPath[1], "eli")
          //   const eli = sourceEntrySplitPath.slice(2, -1).join("/")
          //   const [id, idError] = auditChain(auditId, auditRequire)(
          //     strictAudit,
          //     element,
          //   )
          //   assert.strictEqual(
          //     idError,
          //     null,
          //     `Unexpected format for ID:\n${JSON.stringify(
          //       id,
          //       null,
          //       2,
          //     )}\nError:\n${JSON.stringify(idError, null, 2)}`,
          //   )
          //   legiObjectByIdByCategorie.ID[id] = eli
          //   break
          // }

          case "SECTION_TA": {
            const [sectionTa, error] = auditChain(
              auditLegiSectionTa,
              auditRequire,
            )(strictAudit, element) as [LegiSectionTa, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for SECTION_TA:\n${JSON.stringify(
                sectionTa,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            legiObjectByIdByCategorie.SECTION_TA[sectionTa.ID] = sectionTa
            break
          }

          case "TEXTE_VERSION": {
            const [texteVersion, error] = auditChain(
              auditLegiTexteVersion,
              auditRequire,
            )(strictAudit, element) as [LegiTexteVersion, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
                texteVersion,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const texteId = texteVersion.META.META_COMMUN.ID
            legiObjectByIdByCategorie.TEXTE[texteId] = {
              ...texteVersion,
              ...(legiObjectByIdByCategorie.TEXTE[texteId] ?? {}),
            }
            break
          }

          case "TEXTELR": {
            const [textelr, error] = auditChain(auditLegiTextelr, auditRequire)(
              strictAudit,
              element,
            ) as [LegiTextelr, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for TEXTELR:\n${JSON.stringify(
                textelr,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const texteId = textelr.META.META_COMMUN.ID
            legiObjectByIdByCategorie.TEXTE[texteId] = {
              ...(legiObjectByIdByCategorie.TEXTE[texteId] ?? {}),
              STRUCT: textelr.STRUCT,
              VERSIONS: textelr.VERSIONS,
            }
            break
          }

          // case "VERSIONS": {
          //   const sourceEntryPath = sourceEntry.path()
          //   const sourceEntrySplitPath = sourceEntryPath.split("/")
          //   assert.strictEqual(sourceEntrySplitPath[0], "global")
          //   assert.strictEqual(sourceEntrySplitPath[1], "eli")
          //   const eli = sourceEntrySplitPath.slice(2, -1).join("/")
          //   const [versions, versionsError] = auditChain(
          //     auditVersions,
          //     auditRequire,
          //   )(strictAudit, element) as [Versions, unknown]
          //   assert.strictEqual(
          //     versionsError,
          //     null,
          //     `Unexpected format for VERSIONS:\n${JSON.stringify(
          //       versions,
          //       null,
          //       2,
          //     )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
          //   )
          //   const id = versions.VERSION["@id"]
          //   legalObjectByIdByCategorieByOrigine.versions[eli] = versions
          //   legalObjectByIdByCategorieByOrigine.versions[id] = versions
          //   break
          // }

          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntry.path()}`,
            )
            break
          }
        }
      }
    }
  }
}

sade("git_xml_to_git_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing latest commits of JORF & LEGI data converted to Markdown",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await gitXmlToGitMarkdown(dilaDir, options))
  })
  .parse(process.argv)
