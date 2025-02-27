import {
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
import { bestItemForDate } from "$lib/legal"
import {
  extractOrigineFromId,
  extractTypeFromId,
  gitPathFromId,
  type IdType,
} from "$lib/legal/ids"
import type { JorfArticle, JorfArticleTm, JorfTexte } from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleMetaArticle,
  LegiArticleTm,
  LegiTexte,
} from "$lib/legal/legi"
import type { LegalObjectReferences } from "$lib/legal/references"
import config from "$lib/server/config"
import { licence } from "$lib/server/gitify/repositories"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  type Origine,
} from "$lib/server/nodegit/commits"
import {
  getOidFromIdTree,
  readOidByIdTree,
  removeOidByIdTreeEmptyNodes,
  setOidInIdTree,
  walkPreviousAndCurrentOidByIdTrees,
  writeOidByIdTree,
  type OidByIdTree,
} from "$lib/server/nodegit/trees"
import { cleanHtmlFragment, escapeHtml } from "$lib/strings"

interface ReferenceMarkdown {
  id: string
  markdown: string
}

type ReferencesOrNullById = Map<string, LegalObjectReferences | null>

type SourceRepositorySymbol = "references" | "json"

const { forgejo } = config

async function* convertArticleOutgoingReferencesToMarkdown(
  origine: Origine,
  article: JorfArticle | LegiArticle,
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
): AsyncGenerator<ReferenceMarkdown, void> {
  const texte = article.CONTEXTE.TEXTE
  if (texte["@cid"] !== undefined) {
    const referrent = await getOrLoadJsonObject(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      texte["@cid"],
    )
    yield {
      id: texte["@cid"],
      markdown: `Texte : <a href="${escapeHtml(gitPathFromId(texte["@cid"], ".md"), true)}">${escapeHtml(referrent === undefined ? `Objet ${texte["@cid"]} manquant` : linkTitleFromIdAndLegalObject(texte["@cid"], referrent))}</a>`,
    }
  }

  // TODO: continue
}

async function convertArticleToMarkdown(
  origine: Origine,
  article: JorfArticle | LegiArticle,
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid> {
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
        assertNever("Symbol", origine)
      }
    }
  }

  const incomingReferencesMarkdownByIdType: Partial<Record<IdType, string[]>> =
    {}
  for (const incomingReferenceMarkdown of await convertIncomingReferencesToMarkdown(
    referrerById,
  )) {
    ;(incomingReferencesMarkdownByIdType[
      extractTypeFromId(incomingReferenceMarkdown.id)
    ] ??= []).push(incomingReferenceMarkdown.markdown)
  }
  assert(
    Object.keys(incomingReferencesMarkdownByIdType).every((idType) =>
      ["ARTI", "TEXT"].includes(idType),
    ),
  )

  const outgoingReferencesMarkdown: string[] = []
  const referenceById = { ...referrerById }
  for await (const outgoingReferenceMarkdown of convertArticleOutgoingReferencesToMarkdown(
    origine,
    article,
    referenceById,
    jsonOidByIdTree,
    jsonRepository,
  )) {
    outgoingReferencesMarkdown.push(outgoingReferenceMarkdown.markdown)
  }

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
    incomingReferencesMarkdownByIdType.ARTI === undefined
      ? undefined
      : dedent`
          <h2>Articles faisant référence à l'article</h2>

          ${htmlListFromHtmlItems(incomingReferencesMarkdownByIdType.ARTI)}
        `,
    incomingReferencesMarkdownByIdType.TEXT === undefined
      ? undefined
      : dedent`
            <h2>Textes faisant référence à l'article</h2>

            ${htmlListFromHtmlItems(incomingReferencesMarkdownByIdType.TEXT)}
          `,
    outgoingReferencesMarkdown.length === 0
      ? undefined
      : dedent`
              <h2>Références faites par l'article</h2>

              ${htmlListFromHtmlItems(outgoingReferencesMarkdown)}
            `,
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(articleMarkdown, "utf-8"),
  )
}

function* convertIncomingArticleReferencesToMarkdown(
  articleId: string,
  article: JorfArticle | LegiArticle,
): Generator<ReferenceMarkdown, void> {
  if (false) {
    yield { id: "TODO", markdown: "TODO" }
  }
}

async function convertIncomingReferencesToMarkdown(
  referrerById: Record<string, unknown>,
): Promise<ReferenceMarkdown[]> {
  const incomingReferencesMarkdown: ReferenceMarkdown[] = []
  for (const [referrerId, referrer] of Object.entries(referrerById)) {
    const referrerIdType = extractTypeFromId(referrerId)
    switch (referrerIdType) {
      case "ARTI": {
        incomingReferencesMarkdown.push(
          ...convertIncomingArticleReferencesToMarkdown(
            referrerId,
            referrer as JorfArticle | LegiArticle,
          ),
        )
        break
      }
      case "CONT": {
        // TODO
        break
      }

      case "SCTA": {
        // TODO
        break
      }

      case "TEXT": {
        // TODO
        break
      }

      default: {
        assertNever("Referrer ID Type", referrerIdType)
      }
    }
  }
  // TODO: Sort incomingReferencesMarkdown.
  return incomingReferencesMarkdown
}

async function convertJorfObjectToMarkdown(
  id: string,
  legalObject: unknown,
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      return await convertArticleToMarkdown(
        "JORF",
        legalObject as JorfArticle,
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
      )
    }
    case "CONT": {
      return undefined
    }

    case "SCTA": {
      return undefined
    }

    case "TEXT": {
      return undefined
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }

  return undefined
}

async function convertLegalObjectToMarkdown(
  id: string,
  legalObject: unknown,
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  const origine = extractOrigineFromId(id)
  switch (origine) {
    case "CNIL":
    case "JORF": {
      return convertJorfObjectToMarkdown(
        id,
        legalObject,
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
      )
    }

    case "DOLE": {
      // TODO
      // return convertDoleObjectToMarkdown(
      //   id,
      //   legalObject
      //   referrerById,
      //   targetRepository,
      // )
      return undefined
    }

    case "KALI": {
      // TODO
      // return convertKaliObjectToMarkdown(
      //   id,
      //   legalObject
      //   referrerById,
      //   targetRepository,
      // )
      return undefined
    }

    case "LEGI": {
      return convertLegiObjectToMarkdown(
        id,
        legalObject,
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
      )
    }

    default: {
      assertNever("Origine", origine)
    }
  }
}

async function convertLegiObjectToMarkdown(
  id: string,
  legalObject: unknown,
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid | undefined> {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      return await convertArticleToMarkdown(
        "LEGI",
        legalObject as LegiArticle,
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
      )
    }

    case "CONT": {
      return undefined
    }

    case "SCTA": {
      return undefined
    }

    case "TEXT": {
      return undefined
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }

  return undefined
}

async function convertJsonTreeToMarkdown(
  previousJsonOidByIdTree: OidByIdTree,
  jsonOidByIdTree: OidByIdTree,
  jsonRepository: nodegit.Repository,
  previousReferencesOidByIdTree: OidByIdTree,
  referencesOidByIdTree: OidByIdTree,
  referencesRepository: nodegit.Repository,
  targetOidByIdTree: OidByIdTree,
  targetRepository: nodegit.Repository,
): Promise<boolean> {
  let changed = false
  for (const {
    blobOid,
    id,
    previousBlobOid,
  } of walkPreviousAndCurrentOidByIdTrees(
    previousJsonOidByIdTree,
    jsonOidByIdTree,
  )) {
    const previousReferences = (
      await loadJsonObject<LegalObjectReferences>(
        previousReferencesOidByIdTree,
        referencesRepository,
        id,
      )
    )?.references
    const previousReferrerOidById = Object.fromEntries(
      await Promise.all(
        (previousReferences === undefined ? [] : previousReferences).map(
          async (referrerId) => [
            referrerId,
            getOidFromIdTree(jsonOidByIdTree, referrerId),
          ],
        ),
      ),
    ) as Record<string, nodegit.Oid | undefined>

    const references = (
      await loadJsonObject<LegalObjectReferences>(
        referencesOidByIdTree,
        referencesRepository,
        id,
      )
    )?.references
    const referrerOidById = Object.fromEntries(
      await Promise.all(
        (references === undefined ? [] : references).map(async (referrerId) => [
          referrerId,
          getOidFromIdTree(jsonOidByIdTree, referrerId),
        ]),
      ),
    ) as Record<string, nodegit.Oid | undefined>

    if (
      blobOid?.tostrS() === previousBlobOid?.tostrS() &&
      Object.keys(referrerOidById).length ===
        Object.keys(previousReferrerOidById).length &&
      Object.entries(referrerOidById).every(
        ([referrerId, referrerOid]) =>
          referrerOid?.tostrS() ===
          previousReferrerOidById[referrerId]?.tostrS(),
      )
    ) {
      // Neither object nor its referrers have changed.
      continue
    }

    const legalObject =
      blobOid === undefined
        ? undefined
        : JSON.parse(
            (await jsonRepository.getBlob(blobOid)).content().toString("utf-8"),
          )
    const referrerById = Object.fromEntries(
      (
        await Promise.all(
          Object.entries(referrerOidById).map(
            async ([referrerId, referrerOid]) => [
              referrerId,
              referrerOid === undefined
                ? undefined
                : JSON.parse(
                    (await jsonRepository.getBlob(referrerOid))
                      .content()
                      .toString("utf-8"),
                  ),
            ],
          ),
        )
      ).filter(([, referrer]) => referrer !== undefined),
    ) as Record<string, unknown>

    if (legalObject === undefined && Object.keys(referrerById).length === 0) {
      // Object is empty and has no referrers => delete it.
      if (setOidInIdTree(targetOidByIdTree, id, undefined)) {
        changed = true
      }
    } else if (
      setOidInIdTree(
        targetOidByIdTree,
        id,
        await convertLegalObjectToMarkdown(
          id,
          legalObject,
          referrerById,
          jsonOidByIdTree,
          jsonRepository,
          targetRepository,
        ),
      )
    ) {
      changed = true
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

async function getOrLoadJsonObject<ObjectType>(
  jsonObjectByIdCache: Record<string, ObjectType | null>,
  oidByIdTree: OidByIdTree,
  repository: nodegit.Repository,
  id: string,
): Promise<ObjectType | undefined> {
  let jsonObject: ObjectType | undefined | null = jsonObjectByIdCache[id]
  if (jsonObject !== undefined) {
    return (jsonObject as ObjectType) ?? undefined
  }
  jsonObject = await loadJsonObject<ObjectType>(oidByIdTree, repository, id)
  jsonObjectByIdCache[id] = jsonObject ?? null
  return jsonObject
}

async function gitJsonToGitMarkdown(
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

  const jsonRepository = await nodegit.Repository.open(
    path.join(dilaDir, "textes_juridiques_json.git"),
  )
  const referencesRepository = await nodegit.Repository.open(
    path.join(dilaDir, "references_textes_juridiques_json.git"),
  )
  const sourceRepositoryBySymbol: Record<
    SourceRepositorySymbol,
    nodegit.Repository
  > = {
    json: jsonRepository,
    references: referencesRepository,
  }
  const targetGitDir = path.join(dilaDir, "textes_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  let jsonOidByIdTree: OidByIdTree = { childByKey: new Map() }
  let referencesOidByIdTree: OidByIdTree = { childByKey: new Map() }
  let skip = true
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  let targetOidByIdTree: OidByIdTree = { childByKey: new Map() }
  for await (const {
    dilaDate,
    sourceCommitByOrigine: sourceCommitBySymbol,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryBySymbol, true)) {
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
      if (targetBaseCommitOid === undefined) {
        // Create initial commit.

        const builder = await nodegit.Treebuilder.create(targetRepository)

        const licenceOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(licence, "utf-8"),
        )
        builder.insert(
          "LICENCE.md",
          licenceOid,
          nodegit.TreeEntry.FILEMODE.BLOB,
        ) // 0o040000

        const readmeOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(
            dedent`
              <h1>Textes juridiques</h1>

              > **Avertissement** : Ce dépôt fait partie du projet [Tricoteuses](https://tricoteuses.fr/)
              > de conversion à git des textes juridiques français.
              > **Il peut contenir des erreurs !**
            `,
            "utf-8",
          ),
        )
        builder.insert("README.md", readmeOid, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000

        const targetTreeOid = await builder.write()

        const headExists = await nodegit.Reference.lookup(
          targetRepository,
          "HEAD",
        )
          .then(() => true)
          .catch(() => false)
        if (headExists) {
          nodegit.Reference.remove(targetRepository, "HEAD")
        }

        targetCommitOid = await targetRepository.createCommit(
          "HEAD",
          nodegit.Signature.create(
            "Tricoteuses",
            "tricoteuses@tricoteuses.fr",
            0,
            0,
          ),
          nodegit.Signature.create(
            "Tricoteuses",
            "tricoteuses@tricoteuses.fr",
            0,
            0,
          ),
          "Création du dépôt git",
          targetTreeOid,
          [],
        )
        commitsChanged = true
      } else {
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
      label: "Read JSON oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const jsonCommit = sourceCommitBySymbol.json
    const jsonTree = await jsonCommit.getTree()
    const previousJsonOidByIdTree = jsonOidByIdTree
    jsonOidByIdTree = await readOidByIdTree(
      jsonRepository,
      jsonTree,
      ".json",
      jsonOidByIdTree,
    )

    steps.push({
      label: "Read references oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const referencesCommit = sourceCommitBySymbol.references
    const referencesTree = await referencesCommit.getTree()
    const previousReferencesOidByIdTree = referencesOidByIdTree
    referencesOidByIdTree = await readOidByIdTree(
      referencesRepository,
      referencesTree,
      ".json",
      referencesOidByIdTree,
    )

    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    // Read target oidByIdTree if it has not been read yet.
    if (targetOidByIdTree.oid === undefined) {
      steps.push({
        label: "Read target oidByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      targetOidByIdTree = await readOidByIdTree(
        targetRepository,
        targetExistingTree,
        ".md",
        targetOidByIdTree,
      )
    }

    let commitChanged = false
    steps.push({
      label: "Convert JSON to Markdown",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    console.log("Converting JSON to Markdown")
    if (
      await convertJsonTreeToMarkdown(
        previousJsonOidByIdTree,
        jsonOidByIdTree,
        jsonRepository,
        previousReferencesOidByIdTree,
        referencesOidByIdTree,
        referencesRepository,
        targetOidByIdTree,
        targetRepository,
      )
    ) {
      commitChanged = true
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
      const sourceAuthorWhen = jsonCommit.author().when()
      const sourceCommitterWhen = jsonCommit.committer().when()
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

// function htmlFromIncomingArticlesEdges(edges: Edge[]): string {
//   return dedent`
//     <ul>
//       ${edges
//         .map((edge) => {
//           const articleRecap = edge.node as RelationArticle
//           const articleTitleFragment =
//             "article" +
//             [articleRecap.number, articleRecap.type, articleRecap.state]
//               .filter((value) => value !== undefined)
//               .map((value) => ` ${value}`)
//               .join("") +
//             ((articleRecap.startDate === undefined ||
//               articleRecap.startDate === "2999-01-01") &&
//             (articleRecap.endDate === undefined ||
//               articleRecap.endDate === "2999-01-01")
//               ? ""
//               : articleRecap.endDate === undefined ||
//                   articleRecap.endDate === "2999-01-01"
//                 ? `, en vigueur depuis le ${articleRecap.startDate}`
//                 : `, en vigueur du ${articleRecap.startDate} au ${articleRecap.endDate}`)

//           const texte = articleRecap.texte as TexteRecap | undefined
//           const texteTitleFragment =
//             texte === undefined
//               ? undefined
//               : texte.title === undefined
//                 ? `${texte.nature ?? "Texte"} ${texte.id} manquant`
//                 : texte.title
//           return dedent`
//             <li>
//               <a href="${escapeHtml(gitPathFromId(articleRecap.id, ".md"), true)}">${escapeHtml(
//                 [texteTitleFragment, articleTitleFragment]
//                   .filter((fragment) => fragment !== undefined)
//                   .join(" - "),
//               )}</a> ${edge.linkType} ${edge.direction}
//             </li>
//           `
//         })
//         .join("\n")
//         .replaceAll("\n", "\n  ")}
//     </ul>
//   `
// }

// function htmlFromIncomingTextesEdges(edges: Edge[]): string {
//   return dedent`
//     <ul>
//       ${edges
//         .map((edge) => {
//           const texteRecap = edge.node as RelationTexte
//           const texteTitleFragment =
//             (texteRecap.title === undefined
//               ? `${texteRecap.nature ?? "Texte"} ${texteRecap.id} manquant`
//               : texteRecap.title) +
//             (texteRecap.state === undefined ? "" : ` ${texteRecap.state}`) +
//             ((texteRecap.startDate === undefined ||
//               texteRecap.startDate === "2999-01-01") &&
//             (texteRecap.endDate === undefined ||
//               texteRecap.endDate === "2999-01-01")
//               ? ""
//               : texteRecap.endDate === undefined ||
//                   texteRecap.endDate === "2999-01-01"
//                 ? `, en vigueur depuis le ${texteRecap.startDate}`
//                 : `, en vigueur du ${texteRecap.startDate} au ${texteRecap.endDate}`)
//           return dedent`
//             <li>
//               <a href="${escapeHtml(gitPathFromId(texteRecap.id, ".md"), true)}">${escapeHtml(
//                 texteTitleFragment,
//               )}</a> ${edge.linkType} ${edge.direction}
//             </li>
//           `
//         })
//         .join("\n")
//         .replaceAll("\n", "\n  ")}
//     </ul>
//   `
// }

// function htmlFromOutgoingEdges(edges: Edge[]): string {
//   return dedent`
//     <ul>
//       ${edges
//         .map(async (edge) => {
//           const { node } = edge
//           let a: string | undefined = undefined
//           switch (node.kind) {
//             case undefined: {
//               // Incomplete edge with only one ID (ie legal object was not found)
//               return `<li>${node.id}</li>`
//             }

//             case "ARTICLE": {
//               const articleTitleFragment =
//                 "article" +
//                 [node.number, node.type, node.state]
//                   .filter((value) => value !== undefined)
//                   .map((value) => ` ${value}`)
//                   .join("") +
//                 ((node.startDate === undefined ||
//                   node.startDate === "2999-01-01") &&
//                 (node.endDate === undefined || node.endDate === "2999-01-01")
//                   ? ""
//                   : node.endDate === undefined || node.endDate === "2999-01-01"
//                     ? `, en vigueur depuis le ${node.startDate}`
//                     : `, en vigueur du ${node.startDate} au ${node.endDate}`)

//               const texte = node.texte as TexteRecap | undefined
//               const texteTitleFragment =
//                 texte === undefined
//                   ? undefined
//                   : (texte.title ??
//                     `${texte.nature ?? "Texte"} ${texte.id} manquant`)
//               a = `<a href="${escapeHtml(gitPathFromId(node.id, ".md"), true)}">${escapeHtml([texteTitleFragment, articleTitleFragment].filter((fragment) => fragment !== undefined).join(" - "))}</a>`
//               break
//             }

//             case "JO": {
//               break
//             }

//             default: {
//               assertNever("RelationNode.kind", node.kind)
//             }
//           }
//           const referredId = referredLien["@id"] ?? referredLien["@cidtexte"]
//           if (referredId !== undefined) {
//             if (/^(CNIL|DOLE|JORF|KALI|LEGI)ARTI\d{12}$/.test(referredId)) {
//               const article = await getOrLoadArticle(context, referredId)
//               if (article !== null) {
//                 const metaArticle = article.META.META_SPEC.META_ARTICLE
//                 const articleTitleFragment =
//                   "article" +
//                   [
//                     metaArticle.NUM,
//                     metaArticle.TYPE,
//                     (metaArticle as LegiArticleMetaArticle).ETAT,
//                   ]
//                     .filter((value) => value !== undefined)
//                     .map((value) => ` ${value}`)
//                     .join("") +
//                   (metaArticle.DATE_DEBUT === "2999-01-01" &&
//                   metaArticle.DATE_FIN === "2999-01-01"
//                     ? ""
//                     : metaArticle.DATE_FIN === "2999-01-01"
//                       ? `, en vigueur depuis le ${metaArticle.DATE_DEBUT}`
//                       : `, en vigueur du ${metaArticle.DATE_DEBUT} au ${metaArticle.DATE_FIN}`)

//                 const articleTexte = article.CONTEXTE.TEXTE
//                 const referredTextTitreTxt = bestItemForDate(
//                   articleTexte.TITRE_TXT,
//                   metaArticle.DATE_DEBUT,
//                 )
//                 const referredTextTitleFragment =
//                   referredTextTitreTxt === undefined
//                     ? `${articleTexte["@nature"] ?? "Texte"} ${articleTexte["@cid"]} manquant`
//                     : (referredTextTitreTxt["#text"]
//                         ?.replace(/\s+/g, " ")
//                         .trim()
//                         .replace(/\s+\(\d+\)$/, "") ??
//                       referredTextTitreTxt["@c_titre_court"] ??
//                       `${articleTexte["@nature"] ?? "Texte"} ${articleTexte["@cid"]} sans titre`)
//                 a = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(articleTitleFragment)}</a>`
//               }
//             }

//             if (/^(CNIL|DOLE|JORF|KALI|LEGI)SCTA\d{12}$/.test(referredId)) {
//               const referredSectionTa = await getOrLoadSectionTa(
//                 context,
//                 referredId,
//               )
//               if (referredSectionTa !== null) {
//                 const referredSectionTaTitleFragment =
//                   referredSectionTa.TITRE_TA?.replace(/\s+/g, " ").trim() ??
//                   "Section sans titre"

//                 const referredSectionTaTexte = referredSectionTa.CONTEXTE.TEXTE
//                 const referredTextTitreTxt = bestItemForDate(
//                   referredSectionTaTexte.TITRE_TXT,
//                   today, // TODO: Use a better date?
//                 )
//                 const referredTextTitleFragment =
//                   referredTextTitreTxt === undefined
//                     ? `${referredSectionTaTexte["@nature"] ?? "Texte"} ${referredSectionTaTexte["@cid"]} manquant`
//                     : (referredTextTitreTxt["#text"]
//                         ?.replace(/\s+/g, " ")
//                         .trim()
//                         .replace(/\s+\(\d+\)$/, "") ??
//                       referredTextTitreTxt["@c_titre_court"] ??
//                       `${referredSectionTaTexte["@nature"] ?? "Texte"} ${referredSectionTaTexte["@cid"]} sans titre`)
//                 a = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(referredSectionTaTitleFragment)}</a>`
//               }
//             }

//             if (/^(CNIL|DOLE|JORF|KALI|LEGI)TEXT\d{12}$/.test(referredId)) {
//               const referredTexteVersion = await getOrLoadTexteVersion(
//                 context,
//                 referredId,
//               )
//               if (referredTexteVersion !== null) {
//                 const metaTexteVersion =
//                   referredTexteVersion.META.META_SPEC.META_TEXTE_VERSION
//                 const referredTextTitle =
//                   (
//                     metaTexteVersion.TITREFULL ??
//                     metaTexteVersion.TITRE ??
//                     referredId
//                   )
//                     .replace(/\s+/g, " ")
//                     .trim()
//                     .replace(/\s+\(\d+\)$/, "") +
//                   ((metaTexteVersion as LegiMetaTexteVersion).ETAT === undefined
//                     ? ""
//                     : ` ${(metaTexteVersion as LegiMetaTexteVersion).ETAT}`) +
//                   (((metaTexteVersion.DATE_DEBUT === undefined ||
//                     metaTexteVersion.DATE_DEBUT === "2999-01-01") &&
//                     metaTexteVersion.DATE_FIN === undefined) ||
//                   metaTexteVersion.DATE_FIN === "2999-01-01"
//                     ? ""
//                     : metaTexteVersion.DATE_FIN === undefined ||
//                         metaTexteVersion.DATE_FIN === "2999-01-01"
//                       ? `, en vigueur depuis le ${metaTexteVersion.DATE_DEBUT}`
//                       : `, en vigueur du ${metaTexteVersion.DATE_DEBUT} au ${metaTexteVersion.DATE_FIN}`)
//                 a = `<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitle)}</a>`
//               }
//             }
//           }
//           return dedent`
//             <li>
//               ${[referredLien["@datesignatexte"], referredLien["@typelien"], referredLien["@sens"]].filter((item) => item !== undefined).join(" ")} ${a ?? escapeHtml(referredLien["#text"] ?? "lien sans titre")}
//             </li>
//           `
//         })
//         .join("\n")
//         .replaceAll("\n", "\n  ")}
//     </ul>
//   `
// }

function htmlListFromHtmlItems(items: string[]): string {
  return dedent`
    <ul>
      ${items
        .map(
          (item) => dedent`
            <li>
              ${item.replaceAll("\n", "\n  ")}
            </li>
          `,
        )
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

function linkTitleFromIdAndLegalObject(
  id: string,
  legalObject: unknown,
): string {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      const article = legalObject as JorfArticle | LegiArticle
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
                .join(", ")
      return [
        texteTitle,
        articleNumber === undefined ? undefined : `article ${articleNumber}`,
      ]
        .filter((fragment) => fragment !== undefined)
        .join(", ")
    }

    case "CONT": {
      return `absoluteTitleFromIdAndLegalObject TODO: ${id}`
    }

    case "SCTA": {
      return `absoluteTitleFromIdAndLegalObject TODO: ${id}`
    }

    case "TEXT": {
      return `absoluteTitleFromIdAndLegalObject TODO: ${id}`
    }

    default: {
      assertNever("ID Type", idType)
    }
  }
}

async function loadJsonObject<ObjectType>(
  oidByIdTree: OidByIdTree,
  repository: nodegit.Repository,
  id: string,
): Promise<ObjectType | undefined> {
  const oid = getOidFromIdTree(oidByIdTree, id)
  if (oid === undefined) {
    return undefined
  }

  return JSON.parse(
    (await repository.getBlob(oid)).content().toString("utf-8"),
  ) as ObjectType
}

// async function loadRelationsChanges(
//   sourcePreviousTree: nodegit.Tree | undefined,
//   sourceTree: nodegit.Tree,
//   referencesOrNullById: ReferencesOrNullById = new Map(),
// ): Promise<ReferencesOrNullById> {
//   const sourcePreviousEntryByName =
//     sourcePreviousTree === undefined
//       ? undefined
//       : Object.fromEntries(
//           sourcePreviousTree.entries().map((entry) => [entry.name(), entry]),
//         )
//   for (const sourceEntry of sourceTree.entries()) {
//     const sourceEntryName = sourceEntry.name()
//     const sourcePreviousEntry = sourcePreviousEntryByName?.[sourceEntryName]
//     if (sourcePreviousEntry !== undefined) {
//       // Ensure that at the end of the loop sourcePreviousEntryByName contains
//       // only entries deleted from the source tree.
//       delete sourcePreviousEntryByName![sourceEntryName]
//     }
//     if (sourceEntry.oid() === sourcePreviousEntry?.oid()) {
//       // Entry has not changed => No relation to change.
//       continue
//     }
//     if (sourceEntry.isTree()) {
//       // When sourcePreviousEntry is not undefined, it is also a tree.
//       await loadRelationsChanges(
//         await sourcePreviousEntry?.getTree(),
//         await sourceEntry.getTree(),
//         referencesOrNullById,
//       )
//     } else {
//       // When sourcePreviousEntry is not undefined, it is also a blob.
//       const relation = JSON.parse(
//         (await sourceEntry.getBlob()).content().toString("utf-8"),
//       ) as LegalObjectReferences
//       referencesOrNullById.set(relation.id, relation)
//     }
//   }

//   // Entries remaining in sourcePreviousEntryByName are deleted.
//   if (sourcePreviousEntryByName !== undefined) {
//     for (const sourcePreviousEntry of Object.values(
//       sourcePreviousEntryByName,
//     )) {
//       await loadRelationsDeletions(sourcePreviousEntry, referencesOrNullById)
//     }
//   }

//   return referencesOrNullById
// }

// async function loadRelationsDeletions(
//   sourcePreviousEntry: nodegit.TreeEntry,
//   referencesOrNullById: ReferencesOrNullById,
// ): Promise<void> {
//   if (sourcePreviousEntry.isTree()) {
//     for (const sourcePreviousChildEntry of (
//       await sourcePreviousEntry.getTree()
//     ).entries()) {
//       await loadRelationsDeletions(
//         sourcePreviousChildEntry,
//         referencesOrNullById,
//       )
//     }
//   } else {
//     const targetId = sourcePreviousEntry.name().replace(/\.json$/, "")
//     referencesOrNullById.set(targetId, null)
//   }
// }

sade("git_json_to_git_markdown <dilaDir>", true)
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
    process.exit(await gitJsonToGitMarkdown(dilaDir, options))
  })
  .parse(process.argv)
