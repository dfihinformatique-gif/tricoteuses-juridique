import {
  Audit,
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { assertNever } from "$lib/asserts"
import {
  auditJo,
  auditJorfArticle,
  auditJorfSectionTa,
  auditJorfTextelr,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import { auditId, auditVersions } from "$lib/auditors/legal"
import {
  auditLegiArticle,
  auditLegiSectionTa,
  auditLegiTextelr,
  auditLegiTexteVersion,
} from "$lib/auditors/legi"
import { bestItemForDate, type Versions, type XmlHeader } from "$lib/legal"
import { gitPathFromId, idRegExp } from "$lib/legal/ids"
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
  LegiArticleMetaArticle,
  LegiArticleTm,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTexte,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { xmlParser } from "$lib/parsers/shared"
import config from "$lib/server/config"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  originesEtendues,
  type Origine,
  type OrigineEtendue,
} from "$lib/server/nodegit/commits"
import {
  getOidFromIdTree,
  readOidByIdTree,
  removeOidByIdTreeEmptyNodes,
  setOidInIdTree,
  writeOidByIdTree,
  type OidByIdTree,
} from "$lib/server/nodegit/trees"
import { cleanHtmlFragment, escapeHtml } from "$lib/strings"

type RelationsOrNullById = Map<string, LegalObjectRelations | null>

const { forgejo } = config

async function convertArticleElementToMarkdown(
  origine: Origine,
  element: unknown,
  relations: LegalObjectRelations | null,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid> {
  let auditArticle: (audit: Audit, data: unknown) => [unknown, unknown]
  switch (origine) {
    case "JORF": {
      auditArticle = auditJorfArticle
      break
    }
    case "LEGI": {
      auditArticle = auditLegiArticle
      break
    }
    default: {
      assertNever("Origine", origine)
    }
  }
  const [article, error] = auditChain(auditArticle, auditRequire)(
    strictAudit,
    element,
  ) as [JorfArticle | LegiArticle, unknown]
  assert.strictEqual(
    error,
    null,
    `Unexpected format for ${origine} ARTICLE:\n${JSON.stringify(
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
  let tmBreadcrumb: string | undefined = undefined
  if (tm !== undefined) {
    switch (origine) {
      case "JORF": {
        tmBreadcrumb = generateJorfArticleTmBreadcrumb(tm as JorfArticleTm)
        break
      }
      case "LEGI": {
        tmBreadcrumb = generateLegiArticleTmBreadcrumb(
          tm as LegiArticleTm,
          article.META.META_SPEC.META_ARTICLE.DATE_DEBUT,
        )
        break
      }
      default: {
        assertNever("Origine", origine)
      }
    }
  }
  const incomingArticlesEdges = (relations?.incoming ?? []).filter(
    (edge) => edge.node.kind === "ARTICLE",
  )
  const incomingTextesEdges = (relations?.incoming ?? []).filter(
    (edge) => edge.node.kind === "TEXTE",
  )
  const articleMarkdown = [
    dedent`
      ---
      ${[
        // ["État", (article as LegiArticle).META.META_SPEC.META_ARTICLE.ETAT],
        ["Type", article.META.META_SPEC.META_ARTICLE.TYPE],
        ["Date de début", article.META.META_SPEC.META_ARTICLE.DATE_DEBUT],
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
    tmBreadcrumb === undefined
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
              ${tmBreadcrumb.replaceAll("\n", "\n    ")}
            </li>
          </ul>
        `,
    articleNumber === undefined
      ? undefined
      : `<h1>${escapeHtml(`Article ${articleNumber}`)}</h1>`,
    await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU),
    incomingArticlesEdges.length === 0
      ? undefined
      : dedent`
          <h2>Articles faisant référence à l'article</h2>

          ${htmlFromIncomingArticlesEdges(incomingArticlesEdges)}
        `,
    incomingTextesEdges.length === 0
      ? undefined
      : dedent`
            <h2>Textes faisant référence à l'article</h2>

            ${htmlFromIncomingTextesEdges(incomingTextesEdges)}
          `,
      relations?.outgoing === undefined
        ? undefined
        : dedent`
              <h2>Références faites par l'article</h2>

              ${htmlFromOutgoingEdges(relations.outgoing)}
            `,
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  // console.log(articleMarkdown)
  // console.log("\n", "=".repeat(100), "\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(articleMarkdown, "utf-8"),
  )
}

async function convertJorfObjectToMarkdown(
  sourceBlobEntry: nodegit.TreeEntry,
  relations: LegalObjectRelations | null,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  const sourceEntryName = sourceBlobEntry.name()
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    JorfCategorieTag | "?xml",
    unknown,
  ][]) {
    switch (tag) {
      case "?xml": {
        break
      }

      case "ARTICLE": {
        return await convertArticleElementToMarkdown(
          "JORF",
          element,
          relations,
          targetRepository,
        )
      }

      case "ID": {
        return undefined
      }

      case "JO": {
        return undefined
      }

      case "SECTION_TA": {
        return undefined
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
        return undefined
      }

      case "TEXTELR": {
        return undefined
      }

      case "VERSIONS": {
        return undefined
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceEntryName}`,
        )
      }
    }
  }
  return undefined
}

async function convertLegalObjectToMarkdown(
  origine: Origine,
  sourceBlobEntry: nodegit.TreeEntry,
  relations: LegalObjectRelations | null,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  switch (origine) {
    case "JORF": {
      return await convertJorfObjectToMarkdown(
        sourceBlobEntry,
        relations,
        targetRepository,
      )
    }
    case "LEGI": {
      return await convertLegiObjectToMarkdown(
        sourceBlobEntry,
        relations,
        targetRepository,
      )
    }
    default:
      assertNever("Origine", origine)
  }
}

async function convertLegiObjectToMarkdown(
  sourceBlobEntry: nodegit.TreeEntry,
  relations: LegalObjectRelations | null,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  const sourceEntryName = sourceBlobEntry.name()
  const xmlData = xmlParser.parse((await sourceBlobEntry.getBlob()).content())
  for (const [tag, element] of Object.entries(xmlData) as [
    LegiCategorieTag | "?xml",
    unknown,
  ][]) {
    switch (tag) {
      case "?xml": {
        break
      }

      case "ARTICLE": {
        return await convertArticleElementToMarkdown(
          "LEGI",
          element,
          relations,
          targetRepository,
        )
      }

      case "ID": {
        return undefined
      }

      case "SECTION_TA": {
        return undefined
      }

      case "TEXTE_VERSION": {
        //     const [texteVersion, error] = auditChain(
        //       auditLegiTexteVersion,
        //       auditRequire,
        //     )(strictAudit, element) as [LegiTexteVersion, unknown]
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
        return undefined
      }

      case "TEXTELR": {
        return undefined
      }

      case "VERSIONS": {
        return undefined
      }

      default: {
        console.warn(
          `Unexpected root element "${tag}" in XML file: ${sourceEntryName}`,
        )
      }
    }
  }
  return undefined
}

async function convertSourceTreeToMarkdown(
  origine: Origine,
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  relationsTree: nodegit.Tree,
  relationsOrNullById: RelationsOrNullById,
  targetOidByIdTree: OidByIdTree,
  targetRepository: nodegit.Repository,
): Promise<boolean> {
  let changed = false
  const sourcePreviousEntryByName =
    sourcePreviousTree === undefined
      ? undefined
      : Object.fromEntries(
          sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
        )
  for (const sourceEntry of sourceTree.entries()) {
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourceEntry.isTree()) {
      if (
        await convertSourceTreeToMarkdown(
          origine,
          sourcePreviousEntry?.isTree()
            ? await sourcePreviousEntry?.getTree()
            : undefined,
          await sourceEntry.getTree(),
          relationsTree,
          relationsOrNullById,
          targetOidByIdTree,
          targetRepository,
        )
      ) {
        changed = true
      }
    } else {
      // SourceEntry is a blob.
      const id = sourceEntry.name().replace(/\.xml$/, "")
      if (id === "versions") {
        continue
      }
      if (id.match(idRegExp) === null) {
        console.warn(
          `Ignoring source entry "${sourceEntry.path()}" with unknown ID format: ${id}`,
        )
        continue
      }
      let relations = relationsOrNullById.get(id)
      const targetExistingOid = getOidFromIdTree(targetOidByIdTree, id)
      if (
        sourceEntry.oid() !== sourcePreviousEntry?.oid() ||
        relations !== undefined ||
        targetExistingOid === undefined
      ) {
        if (relations === undefined) {
          relations = await loadLegalObjectRelations(
            relationsTree,
            relationsOrNullById,
            id,
          )
        }
        if (
          setOidInIdTree(
            targetOidByIdTree,
            id,
            await convertLegalObjectToMarkdown(
              origine,
              sourceEntry,
              relations,
              targetRepository,
            ),
          )
        ) {
          changed = true
        }
      }
    }
  }
  return changed
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

function generateLegiArticleTmBreadcrumb(
  tm: LegiArticleTm,
  dateDebutArticle: string,
  headingLevel = 3,
): string {
  const titreTm = bestItemForDate(tm.TITRE_TM, dateDebutArticle)
  return tm.TM === undefined
    ? dedent`
        <ul>
          <li>
            <h${headingLevel}>
              ${escapeHtml(titreTm?.["#text"] ?? "Section sans titre").replaceAll("\n", "\n      ")}
            </h${headingLevel}>
          </li>
        </ul>
      `
    : dedent`
        <ul>
          <li>
            <h${headingLevel}>
              ${escapeHtml(titreTm?.["#text"] ?? "Section sans titre").replaceAll("\n", "\n      ")}
            </h${headingLevel}>
            ${generateLegiArticleTmBreadcrumb(tm.TM, dateDebutArticle, Math.min(headingLevel + 1, 6)).replaceAll("\n", "\n    ")}
          </li>
        </ul>
      `
}

async function gitXmlToGitMarkdown(
  dilaDir: string,
  {
    force,
    init,
    push,
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

  const exitCode = 0
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
      originesEtendues.map(async (origine) => [
        origine,
        await nodegit.Repository.open(
          origine === "RELATIONS_DONNEES_JURIDIQUES"
            ? path.join(dilaDir, origine.toLowerCase() + ".git")
            : path.join(dilaDir, origine.toLowerCase(), ".git"),
        ),
      ]),
    ),
  )
  const targetGitDir = path.join(dilaDir, "textes_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  let skip = true
  let sourcePreviousCommitByOrigine:
    | Record<OrigineEtendue, nodegit.Commit>
    | undefined = undefined
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  const targetOidByIdTree: OidByIdTree = new Map()
  for await (const {
    dilaDate,
    sourceCommitByOrigine,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryByOrigine, true)) {
    if (skip) {
      if (dilaDate >= dilaStartDate) {
        skip = false
      } else {
        continue
      }
    }

    // The first time that this part of the loop is reached,
    // find the commit of target to use as base for future
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

    const targetExistingCommitOid = targetCommitOid
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

    steps.push({
      label: "Load modified reverse links",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const sourcePreviousTreeByOrigine: Record<OrigineEtendue, nodegit.Tree> =
      sourcePreviousCommitByOrigine === undefined
        ? undefined
        : Object.fromEntries(
            await Promise.all(
              Object.entries(sourcePreviousCommitByOrigine).map(
                async ([origine, sourcePreviousCommit]) => [
                  origine,
                  await sourcePreviousCommit.getTree(),
                ],
              ),
            ),
          )
    const sourceTreeByOrigine: Record<OrigineEtendue, nodegit.Tree> =
      Object.fromEntries(
        await Promise.all(
          Object.entries(sourceCommitByOrigine).map(
            async ([origine, sourceCommit]) => [
              origine,
              await sourceCommit.getTree(),
            ],
          ),
        ),
      )
    const relationsOrNullById = await loadRelationsChanges(
      sourcePreviousTreeByOrigine?.RELATIONS_DONNEES_JURIDIQUES,
      sourceTreeByOrigine.RELATIONS_DONNEES_JURIDIQUES,
    )

    // Ensure that sourcePreviousCommitByOrigine will be updated for next iteration.
    sourcePreviousCommitByOrigine = sourceCommitByOrigine

    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    // Read oidByIdTree if it has not been read yet.
    if (targetOidByIdTree.size === 0) {
      steps.push({
        label: "Read oidByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      for (const [name, subOidByIdTree] of (
        await readOidByIdTree(targetRepository, targetExistingTree)
      ).entries()) {
        targetOidByIdTree.set(name, subOidByIdTree)
      }
    }

    let commitChanged = false
    for (const [origine, sourceTree] of Object.entries(
      sourceTreeByOrigine,
    ) as Array<[OrigineEtendue, nodegit.Tree]>) {
      if (origine === "RELATIONS_DONNEES_JURIDIQUES") {
        continue
      }
      steps.push({
        label: `Convert ${origine} to Markdown`,
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      console.log(`Converting ${origine} to Markdown`)
      if (
        await convertSourceTreeToMarkdown(
          origine,
          sourcePreviousTreeByOrigine?.[origine],
          sourceTree,
          sourceTreeByOrigine.RELATIONS_DONNEES_JURIDIQUES,
          relationsOrNullById,
          targetOidByIdTree,
          targetRepository,
        )
      ) {
        commitChanged = true
      }
    }
    if (!commitChanged) {
      // No change to commit.
      continue
    }

    // Cleanup oidByIdTree.
    steps.push({
      label: "Cleanup oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    removeOidByIdTreeEmptyNodes(targetOidByIdTree)

    // Write updated oidByIdTree.
    steps.push({
      label: "Write updated oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const targetTreeOid = await writeOidByIdTree(
      targetRepository,
      targetOidByIdTree,
      ".md",
    )
    if (targetTreeOid.tostrS() === targetExistingTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    if (commitChanged) {
      // Commit changes.
      const sourceAuthorWhen = sourceCommitByOrigine.JORF.author().when()
      const sourceCommitterWhen = sourceCommitByOrigine.JORF.committer().when()
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
        targetTreeOid!,
        [targetExistingCommitOid].filter(
          (oid) => oid !== undefined,
        ) as nodegit.Oid[],
      )
      commitsChanged = true
    }
  }

  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  if (commitsChanged) {
    await targetRepository.createBranch("main", targetCommitOid!, true)
    await targetRepository.setHead("refs/heads/main")

    if (forgejo !== undefined && push) {
      steps.push({
        label: "Push new commits",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      let targetRemote: nodegit.Remote
      try {
        targetRemote = await targetRepository.getRemote("origin")
      } catch (error) {
        if (
          (error as Error).message.includes("remote 'origin' does not exist")
        ) {
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/textes_juridiques.git`
          targetRemote = await nodegit.Remote.create(
            targetRepository,
            "origin",
            targetRemoteUrl,
          )
        } else {
          throw error
        }
      }
      const targetBranch = await targetRepository.getCurrentBranch()
      const targetBranchName = targetBranch.shorthand()
      const refspec = `+HEAD:refs/heads/${targetBranchName}` // "+" => force push
      await targetRemote.push([refspec], {
        callbacks: {
          credentials: (_url: string, username: string) => {
            return nodegit.Credential.sshKeyFromAgent(username)
          },
        },
      })
      await nodegit.Branch.setUpstream(
        targetBranch,
        `origin/${targetBranchName}`,
      )
    }
  }

  // console.log("Performance: ")
  // for (const [index, step] of steps.entries()) {
  //   console.log(
  //     `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
  //   )
  // }

  return exitCode
}

function htmlFromIncomingArticlesEdges(edges: Edge[]): string {
  return dedent`
    <ul>
      ${edges
        .map((edge) => {
          const articleRecap = edge.node as RelationArticle
          const articleTitleFragment =
            "article" +
            [articleRecap.number, articleRecap.type, articleRecap.state]
              .filter((value) => value !== undefined)
              .map((value) => ` ${value}`)
              .join("") +
            ((articleRecap.startDate === undefined ||
              articleRecap.startDate === "2999-01-01") &&
            (articleRecap.endDate === undefined ||
              articleRecap.endDate === "2999-01-01")
              ? ""
              : articleRecap.endDate === undefined ||
                  articleRecap.endDate === "2999-01-01"
                ? `, en vigueur depuis le ${articleRecap.startDate}`
                : `, en vigueur du ${articleRecap.startDate} au ${articleRecap.endDate}`)

          const texte = articleRecap.texte as TexteRecap | undefined
          const texteTitleFragment =
            texte === undefined
              ? undefined
              : texte.title === undefined
                ? `${texte.nature ?? "Texte"} ${texte.id} manquant`
                : texte.title
          return dedent`
            <li>
              <a href="${escapeHtml(gitPathFromId(articleRecap.id, ".md"), true)}">${escapeHtml(
                [texteTitleFragment, articleTitleFragment]
                  .filter((fragment) => fragment !== undefined)
                  .join(" - "),
              )}</a> ${edge.linkType} ${edge.direction}
            </li>
          `
        })
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

function htmlFromIncomingTextesEdges(edges: Edge[]): string {
  return dedent`
    <ul>
      ${edges
        .map((edge) => {
          const texteRecap = edge.node as RelationTexte
          const texteTitleFragment =
            (texteRecap.title === undefined
              ? `${texteRecap.nature ?? "Texte"} ${texteRecap.id} manquant`
              : texteRecap.title) +
            (texteRecap.state === undefined ? "" : ` ${texteRecap.state}`) +
            ((texteRecap.startDate === undefined ||
              texteRecap.startDate === "2999-01-01") &&
            (texteRecap.endDate === undefined ||
              texteRecap.endDate === "2999-01-01")
              ? ""
              : texteRecap.endDate === undefined ||
                  texteRecap.endDate === "2999-01-01"
                ? `, en vigueur depuis le ${texteRecap.startDate}`
                : `, en vigueur du ${texteRecap.startDate} au ${texteRecap.endDate}`)
          return dedent`
            <li>
              <a href="${escapeHtml(gitPathFromId(texteRecap.id, ".md"), true)}">${escapeHtml(
                texteTitleFragment,
              )}</a> ${edge.linkType} ${edge.direction}
            </li>
          `
        })
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

function htmlFromOutgoingEdges(edges: Edge[]): string {
  return dedent`
    <ul>
      ${(
        edges.map(async (edge) => {
          const {node} = edge
          let a: string | undefined = undefined
            switch (node.kind) {
              case undefined: {
                // Incomplete edge with only one ID (ie legal object was not found)
                return `<li>${node.id}</li>`
              }

              case "ARTICLE": {
                const articleTitleFragment =
                  "article" +
                  [
                    node.number,
                    node.type,
                    node.state,
                  ]
                    .filter((value) => value !== undefined)
                    .map((value) => ` ${value}`)
                    .join("") +
                  ((node.startDate === undefined || node.startDate === "2999-01-01") &&
                    (node.endDate === undefined || node.endDate === "2999-01-01")
                    ? ""
                    : (node.endDate === undefined || node.endDate === "2999-01-01")
                      ? `, en vigueur depuis le ${node.startDate}`
                      : `, en vigueur du ${node.startDate} au ${node.endDate}`)

                const texte = node.texte as TexteRecap | undefined
                const texteTitleFragment = texte === undefined ? undefined : texte.title ?? `${texte.nature ?? "Texte"} ${texte.id} manquant`
                a = `<a href="${escapeHtml(gitPathFromId(node.id, ".md"), true)}">${escapeHtml([texteTitleFragment, articleTitleFragment].filter(fragment => fragment !== undefined).join(" - "))}</a>`
                break
              }

              case "JO": {
                break
              }

              default: {
                assertNever("RelationNode.kind", node.kind)
              }
            }
          const referredId = referredLien["@id"] ?? referredLien["@cidtexte"]
          if (referredId !== undefined) {
            if (/^(CNIL|DOLE|JORF|KALI|LEGI)ARTI\d{12}$/.test(referredId)) {
              const article = await getOrLoadArticle(
                context,
                referredId,
              )
              if (article !== null) {
                const metaArticle =
                  article.META.META_SPEC.META_ARTICLE
                const articleTitleFragment =
                  "article" +
                  [
                    metaArticle.NUM,
                    metaArticle.TYPE,
                    (metaArticle as LegiArticleMetaArticle).ETAT,
                  ]
                    .filter((value) => value !== undefined)
                    .map((value) => ` ${value}`)
                    .join("") +
                  (metaArticle.DATE_DEBUT === "2999-01-01" &&
                  metaArticle.DATE_FIN === "2999-01-01"
                    ? ""
                    : metaArticle.DATE_FIN === "2999-01-01"
                      ? `, en vigueur depuis le ${metaArticle.DATE_DEBUT}`
                      : `, en vigueur du ${metaArticle.DATE_DEBUT} au ${metaArticle.DATE_FIN}`)

                const articleTexte = article.CONTEXTE.TEXTE
                const referredTextTitreTxt = bestItemForDate(
                  articleTexte.TITRE_TXT,
                  metaArticle.DATE_DEBUT,
                )
                const referredTextTitleFragment =
                  referredTextTitreTxt === undefined
                    ? `${articleTexte["@nature"] ?? "Texte"} ${articleTexte["@cid"]} manquant`
                    : (referredTextTitreTxt["#text"]
                        ?.replace(/\s+/g, " ")
                        .trim()
                        .replace(/\s+\(\d+\)$/, "") ??
                      referredTextTitreTxt["@c_titre_court"] ??
                      `${articleTexte["@nature"] ?? "Texte"} ${articleTexte["@cid"]} sans titre`)
                a = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(articleTitleFragment)}</a>`
              }
            }

            if (/^(CNIL|DOLE|JORF|KALI|LEGI)SCTA\d{12}$/.test(referredId)) {
              const referredSectionTa = await getOrLoadSectionTa(
                context,
                referredId,
              )
              if (referredSectionTa !== null) {
                const referredSectionTaTitleFragment =
                  referredSectionTa.TITRE_TA?.replace(/\s+/g, " ").trim() ??
                  "Section sans titre"

                const referredSectionTaTexte =
                  referredSectionTa.CONTEXTE.TEXTE
                const referredTextTitreTxt = bestItemForDate(
                  referredSectionTaTexte.TITRE_TXT,
                  today, // TODO: Use a better date?
                )
                const referredTextTitleFragment =
                  referredTextTitreTxt === undefined
                    ? `${referredSectionTaTexte["@nature"] ?? "Texte"} ${referredSectionTaTexte["@cid"]} manquant`
                    : (referredTextTitreTxt["#text"]
                        ?.replace(/\s+/g, " ")
                        .trim()
                        .replace(/\s+\(\d+\)$/, "") ??
                      referredTextTitreTxt["@c_titre_court"] ??
                      `${referredSectionTaTexte["@nature"] ?? "Texte"} ${referredSectionTaTexte["@cid"]} sans titre`)
                a = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(referredSectionTaTitleFragment)}</a>`
              }
            }

            if (/^(CNIL|DOLE|JORF|KALI|LEGI)TEXT\d{12}$/.test(referredId)) {
              const referredTexteVersion = await getOrLoadTexteVersion(
                context,
                referredId,
              )
              if (referredTexteVersion !== null) {
                const metaTexteVersion =
                  referredTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                const referredTextTitle =
                  (
                    metaTexteVersion.TITREFULL ??
                    metaTexteVersion.TITRE ??
                    referredId
                  )
                    .replace(/\s+/g, " ")
                    .trim()
                    .replace(/\s+\(\d+\)$/, "") +
                  ((metaTexteVersion as LegiMetaTexteVersion).ETAT ===
                  undefined
                    ? ""
                    : ` ${(metaTexteVersion as LegiMetaTexteVersion).ETAT}`) +
                  (((metaTexteVersion.DATE_DEBUT === undefined ||
                    metaTexteVersion.DATE_DEBUT === "2999-01-01") &&
                    metaTexteVersion.DATE_FIN === undefined) ||
                  metaTexteVersion.DATE_FIN === "2999-01-01"
                    ? ""
                    : metaTexteVersion.DATE_FIN === undefined ||
                        metaTexteVersion.DATE_FIN === "2999-01-01"
                      ? `, en vigueur depuis le ${metaTexteVersion.DATE_DEBUT}`
                      : `, en vigueur du ${metaTexteVersion.DATE_DEBUT} au ${metaTexteVersion.DATE_FIN}`)
                a = `<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitle)}</a>`
              }
            }
          }
          return dedent`
            <li>
              ${[referredLien["@datesignatexte"], referredLien["@typelien"], referredLien["@sens"]].filter((item) => item !== undefined).join(" ")} ${a ?? escapeHtml(referredLien["#text"] ?? "lien sans titre")}
            </li>
          `
        }),
      )
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

async function loadLegalObjectRelations(
  relationsTree: nodegit.Tree,
  relationsOrNullById: RelationsOrNullById,
  id: string,
): Promise<LegalObjectRelations | null> {
  const idMatch = id.match(idRegExp)
  if (idMatch === null) {
    console.warn(
      `loadLegalObjectRelations: Skipping unexpected ID format: ${id}`,
    )
    return null
  }

  let entry: nodegit.TreeEntry
  try {
    let relationsSubTree = relationsTree
    for (const targetDirName of idMatch!.slice(1, -1)) {
      entry = await relationsSubTree.getEntry(targetDirName)
      relationsSubTree = await entry.getTree()
    }
    const targetFilename = id + ".json"
    entry = await relationsSubTree.getEntry(targetFilename)
  } catch {
    relationsOrNullById.set(id, null)
    return null
  }
  const relations = JSON.parse(
    (await entry.getBlob()).content().toString("utf-8"),
  ) as LegalObjectRelations
  relationsOrNullById.set(id, relations)
  return relations
}

async function loadRelationsChanges(
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  relationsOrNullById: RelationsOrNullById = new Map(),
): Promise<RelationsOrNullById> {
  const sourcePreviousEntryByName =
    sourcePreviousTree === undefined
      ? undefined
      : Object.fromEntries(
          sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
        )
  for (const sourceEntry of sourceTree.entries()) {
    const sourceEntryName = sourceEntry.name()
    const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
    if (sourcePreviousEntry !== undefined) {
      // Ensure that at the end of the loop sourcePreviousEntryByName contains
      // only entries deleted from the source tree.
      delete sourcePreviousEntryByName![sourceEntryName]
    }
    if (sourceEntry.oid() === sourcePreviousEntry?.oid()) {
      // Entry has not changed => No relation to change.
      continue
    }
    if (sourceEntry.isTree()) {
      // When sourcePreviousEntry is not undefined, it is also a tree.
      await loadRelationsChanges(
        await sourcePreviousEntry?.getTree(),
        await sourceEntry.getTree(),
        relationsOrNullById,
      )
    } else {
      // When sourcePreviousEntry is not undefined, it is also a blob.
      const relation = JSON.parse(
        (await sourceEntry.getBlob()).content().toString("utf-8"),
      ) as LegalObjectRelations
      relationsOrNullById.set(relation.id, relation)
    }
  }

  // Entries remaining in sourcePreviousEntryByName are deleted.
  if (sourcePreviousEntryByName !== undefined) {
    for (const sourcePreviousEntry of Object.values(
      sourcePreviousEntryByName,
    )) {
      await loadRelationsDeletions(sourcePreviousEntry, relationsOrNullById)
    }
  }

  return relationsOrNullById
}

async function loadRelationsDeletions(
  sourcePreviousEntry: nodegit.TreeEntry,
  relationsOrNullById: RelationsOrNullById,
): Promise<void> {
  if (sourcePreviousEntry.isTree()) {
    for (const sourcePreviousChildEntry of (
      await sourcePreviousEntry.getTree()
    ).entries()) {
      await loadRelationsDeletions(
        sourcePreviousChildEntry,
        relationsOrNullById,
      )
    }
  } else {
    const targetId = sourcePreviousEntry.name().replace(/\.json$/, "")
    relationsOrNullById.set(targetId, null)
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
