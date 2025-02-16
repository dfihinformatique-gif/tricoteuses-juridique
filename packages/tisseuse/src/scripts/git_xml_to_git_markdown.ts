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
import {
  bestItemForDate,
  type ReferencesToLegalObject,
  type SourceArticle,
  type SourceTexteVersion,
  type Versions,
  type XmlHeader,
} from "$lib/legal"
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
  LegiArticleTm,
  LegiCategorieTag,
  LegiSectionTa,
  LegiTexte,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { idRegExp } from "$lib/legal/shared"
import { xmlParser } from "$lib/parsers/shared"
import config from "$lib/server/config"
import {
  dilaDateRegExp,
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

type ReferencesOrNullByTargetId = Map<string, ReferencesToLegalObject | null>

const { forgejo } = config

async function convertArticleElementToMarkdown(
  origine: Origine,
  element: unknown,
  referencesToLegalObject: ReferencesToLegalObject | null,
  targetRepository: nodegit.Repository,
) {
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
  const referringArticlesSources = (
    referencesToLegalObject?.sources ?? []
  ).filter((source) => source.kind === "ARTICLE")
  const referringTextesSources = (
    referencesToLegalObject?.sources ?? []
  ).filter((source) => source.kind === "TEXTE_VERSION")
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
    referringArticlesSources.length === 0
      ? undefined
      : dedent`
          <h2>Articles faisant référence à l'article</h2>

          ${htmlFromSourceArticles(referringArticlesSources)}
        `,
    referringTextesSources.length === 0
      ? undefined
      : dedent`
            <h2>Textes faisant référence à l'article</h2>

            ${htmlFromSourceTextesVersions(referringTextesSources)}
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
  referencesToLegalObject: ReferencesToLegalObject | null,
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
          referencesToLegalObject,
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
  referencesToLegalObject: ReferencesToLegalObject | null,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  switch (origine) {
    case "JORF": {
      return await convertJorfObjectToMarkdown(
        sourceBlobEntry,
        referencesToLegalObject,
        targetRepository,
      )
    }
    case "LEGI": {
      return await convertLegiObjectToMarkdown(
        sourceBlobEntry,
        referencesToLegalObject,
        targetRepository,
      )
    }
    default:
      assertNever("Origine", origine)
  }
}

async function convertLegiObjectToMarkdown(
  sourceBlobEntry: nodegit.TreeEntry,
  referencesToLegalObject: ReferencesToLegalObject | null,
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
          referencesToLegalObject,
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
  referencesTree: nodegit.Tree,
  referencesOrNullByTargetId: ReferencesOrNullByTargetId,
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
          referencesTree,
          referencesOrNullByTargetId,
          targetOidByIdTree,
          targetRepository,
        )
      ) {
        changed = true
      }
    } else {
      // SourceEntry is a blob.
      const id = sourceEntry.name().replace(/\.xml$/, "")
      // Caution: There are a lot of "versions" value for id (for ELI files).
      let referencesToLegalObject = referencesOrNullByTargetId.get(id)
      const targetExistingOid = getOidFromIdTree(targetOidByIdTree, id)
      if (
        sourceEntry.oid() !== sourcePreviousEntry?.oid() ||
        referencesToLegalObject !== undefined ||
        targetExistingOid === undefined
      ) {
        if (referencesToLegalObject === undefined) {
          referencesToLegalObject =
            id === "versions"
              ? null
              : await loadReferencesToTargetId(
                  referencesTree,
                  referencesOrNullByTargetId,
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
              referencesToLegalObject,
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
          origine === "LIENS_DONNEES_JURIDIQUES"
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
    const referencesOrNullByTargetId = await loadReferencesChanges(
      sourcePreviousTreeByOrigine?.LIENS_DONNEES_JURIDIQUES,
      sourceTreeByOrigine.LIENS_DONNEES_JURIDIQUES,
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
      if (origine === "LIENS_DONNEES_JURIDIQUES") {
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
          sourceTreeByOrigine.LIENS_DONNEES_JURIDIQUES,
          referencesOrNullByTargetId,
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/liens_donnees_juridiques.git`
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
  repositoryByOrigine: Record<OrigineEtendue, nodegit.Repository>,
  reverse: boolean,
): AsyncGenerator<
  {
    dilaDate: string
    sourceCommitByOrigine: Record<OrigineEtendue, nodegit.Commit>
  },
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
                await repositoryByOrigine[origine as OrigineEtendue].getCommit(
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
      OrigineEtendue,
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
          commitByOrigine[origine as OrigineEtendue] = commit =
            await repositoryByOrigine[origine as OrigineEtendue].getCommit(
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

function htmlFromSourceArticles(sources: SourceArticle[]): string {
  return dedent`
    <ul>
      ${sources
        .map((source) => {
          const articleTitleFragment =
            "article" +
            [source.number, source.type, source.state]
              .filter((value) => value !== undefined)
              .map((value) => ` ${value}`)
              .join("") +
            ((source.startDate === undefined ||
              source.startDate === "2999-01-01") &&
            (source.endDate === undefined || source.endDate === "2999-01-01")
              ? ""
              : source.endDate === undefined || source.endDate === "2999-01-01"
                ? `, en vigueur depuis le ${source.startDate}`
                : `, en vigueur du ${source.startDate} au ${source.endDate}`)

          const { texte } = source
          const texteTitleFragment =
            texte === undefined
              ? undefined
              : texte.title === undefined
                ? `${texte.nature ?? "Texte"} ${texte.id} manquant`
                : texte.title
          return dedent`
            <li>
              <a href="${escapeHtml(source.url, true)}">${escapeHtml(
                [texteTitleFragment, articleTitleFragment]
                  .filter((fragment) => fragment !== undefined)
                  .join(" - "),
              )}</a> ${source.linkType} ${source.direction}
            </li>
          `
        })
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

function htmlFromSourceTextesVersions(sources: SourceTexteVersion[]): string {
  return dedent`
    <ul>
      ${sources
        .map((source) => {
          const texteTitleFragment =
            (source.title === undefined
              ? `${source.nature ?? "Texte"} ${source.id} manquant`
              : source.title) +
            (source.state === undefined ? "" : ` ${source.state}`) +
            ((source.startDate === undefined ||
              source.startDate === "2999-01-01") &&
            (source.endDate === undefined || source.endDate === "2999-01-01")
              ? ""
              : source.endDate === undefined || source.endDate === "2999-01-01"
                ? `, en vigueur depuis le ${source.startDate}`
                : `, en vigueur du ${source.startDate} au ${source.endDate}`)
          return dedent`
            <li>
              <a href="${escapeHtml(source.url, true)}">${escapeHtml(
                texteTitleFragment,
              )}</a> ${source.linkType} ${source.direction}
            </li>
          `
        })
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

async function loadReferencesChanges(
  sourcePreviousTree: nodegit.Tree | undefined,
  sourceTree: nodegit.Tree,
  referencesOrNullByTargetId: ReferencesOrNullByTargetId = new Map(),
): Promise<ReferencesOrNullByTargetId> {
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
      // Entry has not changed => No reference to change.
      continue
    }
    if (sourceEntry.isTree()) {
      // When sourcePreviousEntry is not undefined, it is also a tree.
      await loadReferencesChanges(
        await sourcePreviousEntry?.getTree(),
        await sourceEntry.getTree(),
        referencesOrNullByTargetId,
      )
    } else {
      // When sourcePreviousEntry is not undefined, it is also a blob.
      const referencesToLegalObject = JSON.parse(
        (await sourceEntry.getBlob()).content().toString("utf-8"),
      ) as ReferencesToLegalObject
      referencesOrNullByTargetId.set(
        referencesToLegalObject.targetId,
        referencesToLegalObject,
      )
    }
  }

  // Entries remaining in sourcePreviousEntryByName are deleted.
  if (sourcePreviousEntryByName !== undefined) {
    for (const sourcePreviousEntry of Object.values(
      sourcePreviousEntryByName,
    )) {
      await loadReferencesDeletions(
        sourcePreviousEntry,
        referencesOrNullByTargetId,
      )
    }
  }

  return referencesOrNullByTargetId
}

async function loadReferencesDeletions(
  sourcePreviousEntry: nodegit.TreeEntry,
  referencesOrNullByTargetId: ReferencesOrNullByTargetId,
): Promise<void> {
  if (sourcePreviousEntry.isTree()) {
    for (const sourcePreviousChildEntry of (
      await sourcePreviousEntry.getTree()
    ).entries()) {
      await loadReferencesDeletions(
        sourcePreviousChildEntry,
        referencesOrNullByTargetId,
      )
    }
  } else {
    const targetId = sourcePreviousEntry.name().replace(/\.json$/, "")
    referencesOrNullByTargetId.set(targetId, null)
  }
}

async function loadReferencesToTargetId(
  referencesTree: nodegit.Tree,
  referencesOrNullByTargetId: ReferencesOrNullByTargetId,
  targetId: string,
): Promise<ReferencesToLegalObject | null> {
  const targetIdMatch = targetId.match(idRegExp)
  if (targetIdMatch === null) {
    console.warn(
      `loadReferencesToTargetId: Skipping unexpected ID format: ${targetId}`,
    )
    return null
  }

  let entry: nodegit.TreeEntry
  try {
    let referencesSubTree = referencesTree
    for (const targetDirName of targetIdMatch!.slice(1, -1)) {
      entry = await referencesSubTree.getEntry(targetDirName)
      referencesSubTree = await entry.getTree()
    }
    const targetFilename = targetId + ".json"
    entry = await referencesSubTree.getEntry(targetFilename)
  } catch {
    referencesOrNullByTargetId.set(targetId, null)
    return null
  }
  const referencesToTargetId = JSON.parse(
    (await entry.getBlob()).content().toString("utf-8"),
  ) as ReferencesToLegalObject
  referencesOrNullByTargetId.set(targetId, referencesToTargetId)
  return referencesToTargetId
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
