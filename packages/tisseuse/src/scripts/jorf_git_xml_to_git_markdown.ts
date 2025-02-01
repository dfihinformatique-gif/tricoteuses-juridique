import {
  auditChain,
  auditOptions,
  auditRequire,
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
  JorfSectionTa,
  JorfTexte,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type { LegiArticle, LegiSectionTa, LegiTexte } from "$lib/legal/legi"
import { cleanHtmlFragment, escapeHtml } from "$lib/strings"

type CategoryTag = (typeof allCategoriesCode)[number]

interface LegalObjectByIdByCategorieByOrigine {
  JORF: {
    ARTICLE: Record<string, JorfArticle>
    ID: Record<string, string>
    JO: Record<string, Jo>
    SECTION_TA: Record<string, JorfSectionTa>
    TEXTE: Record<string, JorfTexte>
    VERSIONS: Record<string, Versions>
  }
  LEGI: {
    ARTICLE: Record<string, LegiArticle>
    SECTION_TA: Record<string, LegiSectionTa>
    TEXTE: Record<string, LegiTexte>
  }
}

interface ReferencesByLegalIdByCategoreByOrigine {
  JORF: {
    ARTICLE: Record<
      string,
      {
        articlesIds?: Set<string>
        sectionsTaIds?: Set<string>
        textesIds?: Set<string>
      }
    >
    JO: Record<
      string,
      {
        // articlesIds?: Set<string>
        // sectionsTaIds?: Set<string>
        textesIds?: Set<string>
      }
    >
    SECTION_TA: Record<
      string,
      {
        articlesIds?: Set<string>
        sectionsTaIds?: Set<string>
        textesIds?: Set<string>
      }
    >
    TEXTE: Record<
      string,
      {
        articlesIds?: Set<string>
        textesIds?: Set<string>
      }
    >
  }
  LEGI: {
    ARTICLE: Record<
      string,
      {
        articlesIds?: Set<string>
        sectionsTaIds?: Set<string>
        textesIds?: Set<string>
      }
    >
    SECTION_TA: Record<
      string,
      {
        articlesIds?: Set<string>
        sectionsTaIds?: Set<string>
        textesIds?: Set<string>
      }
    >
    TEXTE: Record<
      string,
      {
        articlesIds?: Set<string>
        textesIds?: Set<string>
      }
    >
  }
}

type LegalObjectsTypes = "article" | "jo" | "sectionTa" | "texte"

const allCategoriesCode = [
  "ARTICLE",
  "ID",
  "JO",
  "SECTION_TA",
  "TEXTE_VERSION",
  "TEXTELR",
  "VERSIONS",
] as const

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

function addReferencesToLegalObjects(
  legalObjectByIdByCategorieByOrigine: LegalObjectByIdByCategorieByOrigine,
  referencesByLegalIdByCategoreByOrigine: ReferencesByLegalIdByCategoreByOrigine,
) {
  for (const texte of Object.values(
    legalObjectByIdByCategorieByOrigine.texte,
  )) {
    const texteId = texte.META.META_COMMUN.ID
    const liens = texte.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
    if (liens !== undefined) {
      for (const lien of liens) {
        const lienId = lien["@id"]
        if (lienId === undefined) {
          continue
        }
        const lienObjectType = legalObjectTypeFromId(lienId)
        const lienObject =
          legalObjectByIdByCategorieByOrigine[lienObjectType]?.[lienId]
        if (lienObject === undefined) {
          continue
        }
        ;(
          (referencesByLegalIdByCategoreByOrigine[lienObjectType][lienId] ??=
            {}).textesIds ?? new Set()
        ).add(texteId)
      }
    }
  }
}

async function convertGitTree(
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  targetRepository: nodegit.Repository,
  targetExistingTree: nodegit.Tree | undefined,
  categoryTag: CategoryTag | undefined,
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
        categoryTag,
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
        CategoryTag | "?xml",
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
        if (categoryTag !== undefined && categoryTag !== tag) {
          continue
        }
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
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
            break
          }
          case "JO": {
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
            break
          }
          case "SECTION_TA": {
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
            break
          }
          case "TEXTE_VERSION": {
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
            break
          }
          case "TEXTELR": {
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
            break
          }
          case "VERSIONS": {
            //   if (categoryTag === undefined || categoryTag === tag) {
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
            //   }
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

function legalObjectTypeFromId(id: string): LegalObjectsTypes {
  const typeKey = id.slice(4, 8)
  switch (typeKey) {
    case "ARTI":
      return "article"
    case "SCTA":
      return "sectionTa"
    case "TEXT":
      return "texte"
    default:
      throw new Error(`Unknown type of ID: ${id}`)
  }
}

async function loadSourceLegalObjects(
  legalObjectByIdByCategorieByOrigine: LegalObjectByIdByCategorieByOrigine,
  sourceTree: nodegit.Tree,
  categoryTag: CategoryTag | undefined,
): Promise<void> {
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await loadSourceLegalObjects(
        legalObjectByIdByCategorieByOrigine,
        await sourceEntry.getTree(),
        categoryTag,
      )
    } else {
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
      for (const [tag, element] of Object.entries(xmlData) as [
        CategoryTag | "?xml",
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
        if (categoryTag !== undefined && categoryTag !== tag) {
          continue
        }
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
            legalObjectByIdByCategorieByOrigine.article[
              article.META.META_COMMUN.ID
            ] = article
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
            legalObjectByIdByCategorieByOrigine.eli[id] = eli
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
            legalObjectByIdByCategorieByOrigine.jo[jo.META.META_COMMUN.ID] = jo
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
            legalObjectByIdByCategorieByOrigine.sectionTa[sectionTa.ID] =
              sectionTa
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
            legalObjectByIdByCategorieByOrigine.texte[texteId] = {
              ...texteVersion,
              ...(legalObjectByIdByCategorieByOrigine.texte[texteId] ?? {}),
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
            legalObjectByIdByCategorieByOrigine.texte[texteId] = {
              ...(legalObjectByIdByCategorieByOrigine.texte[texteId] ?? {}),
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
            legalObjectByIdByCategorieByOrigine.versions[eli] = versions
            legalObjectByIdByCategorieByOrigine.versions[id] = versions
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

async function jorfToGitMarkdown(
  dilaDir: string,
  {
    category,
    force,
    // push,
    resume,
    silent,
  }: {
    category?: string
    force?: boolean
    push?: boolean
    resume?: string
    silent?: boolean
  } = {},
): Promise<number> {
  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  let exitCode = 0
  const [categoryTag, categoryError] = auditOptions([
    ...[...allCategoriesCode],
  ])(strictAudit, category) as [CategoryTag | undefined, unknown]
  assert.strictEqual(
    categoryError,
    null,
    `Error for category ${JSON.stringify(categoryTag)}:\n${JSON.stringify(
      categoryError,
      null,
      2,
    )}`,
  )
  const sourceGitDir = path.join(dilaDir, "jorf", ".git")
  const sourceRepository = await nodegit.Repository.open(sourceGitDir)
  const targetGitDir = path.join(dilaDir, "jorf_simple.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  const legalObjectByIdByCategorieByOrigine: LegalObjectByIdByCategorieByOrigine =
    {
      article: {},
      eli: {},
      jo: {},
      sectionTa: {},
      texte: {},
      versions: {},
    }
  const referencesByLegalIdByCategoreByOrigine: ReferencesByLegalIdByCategoreByOrigine =
    {
      article: {},
      jo: {},
      sectionTa: {},
      texte: {},
    }
  let skip = resume !== undefined
  let sourceCommit: nodegit.Commit | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  for await (const sourceCommitOid of iterCommitsOids(sourceRepository, true)) {
    const sourceCommitOidString = sourceCommitOid.tostrS()
    if (skip) {
      if (sourceCommitOidString === resume) {
        skip = false
      } else {
        continue
      }
    }

    if (!targetBaseCommitFound) {
      let targetBaseCommitOid: nodegit.Oid | undefined
      for await (targetBaseCommitOid of iterCommitsOids(
        targetRepository,
        false,
      )) {
        const targetBaseCommit =
          await targetRepository.getCommit(targetBaseCommitOid)
        const targetBaseCommitMessage = targetBaseCommit.message()
        const targetBaseCommitMessageMatch =
          targetBaseCommitMessage.match(/\(([\da-f]{40})\)$/)
        if (targetBaseCommitMessageMatch?.[1] === sourceCommitOidString) {
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
        const targetCommitMessageMatch =
          targetCommitMessage.match(/\(([\da-f]{40})\)$/)
        if (
          targetCommitMessageMatch === null ||
          targetCommitMessageMatch[1] !== sourceCommitOidString
        ) {
          console.warn(
            `Unexpected target commit message "${targetCommitMessage}", not matching source commit ${sourceCommitOidString}`,
          )
          targetCommitsOidsIterationsDone = true
        } else {
          continue
        }
      }
      if (!silent) {
        console.log(
          `Resuming conversion at source commit ${sourceCommitOidString}, parent target commit ${targetPreviousCommitOid?.tostrS() ?? "none"}…`,
        )
      }
    }

    steps.push({ label: "Loading objects", start: performance.now() })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    // Set sourcePreviousCommit to undefined when sourceCommit is
    // the first commit to convert, event when sourceCommit has a
    // parent commit.
    const sourcePreviousCommit = sourceCommit
    const sourcePreviousTree = await sourcePreviousCommit?.getTree()
    sourceCommit = await sourceRepository.getCommit(sourceCommitOid)
    const sourceTree = await sourceCommit.getTree()
    const targetPreviousCommit =
      targetPreviousCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetPreviousCommitOid)
    const targetPreviousTree = await targetPreviousCommit?.getTree()

    if (sourcePreviousCommit === undefined) {
      await loadSourceLegalObjects(
        legalObjectByIdByCategorieByOrigine,
        sourceTree,
        categoryTag,
      )
    } else {
      // TODO
    }

    // Add refrences (reverse links).
    steps.push({
      label: "Adding references (reverse links)",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    addReferencesToLegalObjects(
      legalObjectByIdByCategorieByOrigine,
      referencesByLegalIdByCategoreByOrigine,
    )

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
      categoryTag,
    )) as nodegit.Oid
    assert.notStrictEqual(targetTreeOid, undefined)
    if (targetTreeOid.tostrS() === targetPreviousTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    // Commit changes.
    const sourceAuthorWhen = sourceCommit.author().when()
    const sourceCommitterWhen = sourceCommit.committer().when()
    const targetCommitMessage = `${sourceCommit.message().trim()} (${sourceCommitOidString})`
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

  return exitCode
}

sade("jorf_git_xml_to_git_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing latest commits of JORF data converted to Markdown",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option("-k, --category", "Convert only given type of data")
  .option("-p, --push", "Push generated repository")
  .option("-r, --resume", "Resume conversion at given source commit ID")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await jorfToGitMarkdown(dilaDir, options))
  })
  .parse(process.argv)
