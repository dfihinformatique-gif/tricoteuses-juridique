import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import objectHash from "object-hash"
import git, { type TreeEntry, type TreeObject } from "isomorphic-git"
import path from "path"
import * as prettier from "prettier"

import { sortArticlesNumbers } from "$lib/articles"
import { bestItemForDate } from "$lib/legal"
import type {
  JorfArticle,
  JorfSectionTaLienArt,
  JorfSectionTaStructure,
  JorfTextelr,
  JorfTexteVersion,
  JorfTexteVersionLien,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleLien,
  LegiArticleMetaArticle,
  LegiMetaTexteVersion,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTextelrLienArt,
  LegiTexteVersion,
  LegiTexteVersionLien,
} from "$lib/legal/legi"
import type {
  ArticleGitDb,
  ArticleLienDb,
  SectionTaGitDb,
  TexteVersionGitDb,
  TexteVersionLienDb,
} from "$lib/legal/shared"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"
import { slugify } from "$lib/strings"

import {
  actions,
  getOrLoadArticle,
  getOrLoadSectionTa,
  getOrLoadTextelr,
  getOrLoadTexteVersion,
  walkStructureTree,
  walkTextelrLiensArticles,
  type Action,
  type Context,
  type TexteManquant,
} from "./contexts"
import {
  registerLegiArticleModifiersAndReferences,
  registerLegiSectionTaModifiersAndReferences,
  registerLegiTextModifiersAndReferences,
} from "./references"
import { licence, writeTextFileBlob } from "./repositories"
import {
  addArticleToTree,
  type SectionTaNode,
  type TextelrNode,
} from "./texts_trees"

const minDateObject = new Date("1971-01-01")
const minDateTimestamp = Math.floor(minDateObject.getTime() / 1000)
const oneDay = 24 * 60 * 60 // hours * minutes * seconds
const todayObject = new Date(new Date().toISOString().slice(0, 10))
const today = todayObject.toISOString().slice(0, 10)

async function addLienArticleToCurrentArticles(
  context: Context,
  consolidatedIdsByAction: Partial<Record<Action, Set<string>>>,
  currentArticleByNumber: Record<string, JorfArticle | LegiArticle>,
  action: Action,
  lienArticle: LegiTextelrLienArt | JorfSectionTaLienArt | LegiSectionTaLienArt,
): Promise<void> {
  const articleId = lienArticle["@id"]
  if (context.currentInternalIds.has(articleId)) {
    if (action === "DELETE" && consolidatedIdsByAction.DELETE?.has(articleId)) {
      context.currentInternalIds.delete(articleId)
      return
    }
  } else if (consolidatedIdsByAction.CREATE?.has(articleId)) {
    if (action === "CREATE") {
      context.currentInternalIds.add(articleId)
    }
  } else {
    return
  }
  if (action === "DELETE") {
    return
  }
  const article = await getOrLoadArticle(context, articleId)
  if (article === null) {
    return
  }
  const metaArticle = article.META.META_SPEC.META_ARTICLE
  if ((metaArticle as LegiArticleMetaArticle).ETAT === "MODIFIE_MORT_NE") {
    // Occurs for example when a part of a law is cancelled later by another text higher in
    // the hierarchy of norms
    return
  }
  if (metaArticle.DATE_DEBUT >= metaArticle.DATE_FIN) {
    // Ignore articles with invalid interval of dates.
    return
  }
  const articleNumber = metaArticle.NUM as string
  if (articleNumber === undefined) {
    // TODO: Don't ignore articles without numbers => rework sort of articles.
    // Example of article annexe without number : LEGIARTI000033818922
    console.error(`Ignoring article without number: ${articleId}.`)
    return
  }
  const existingArticle = currentArticleByNumber[articleNumber]
  if (
    existingArticle !== undefined &&
    existingArticle.META.META_COMMUN.ID !== articleId
  ) {
    console.error(
      `    Article number ${articleNumber} encountered twice ${existingArticle.META.META_COMMUN.ID} & ${articleId}`,
    )
    // Keep only the "best" article.
    if (
      existingArticle.META.META_SPEC.META_ARTICLE.DATE_DEBUT <
      metaArticle.DATE_DEBUT
    ) {
      currentArticleByNumber[articleNumber] = article
    }
  } else {
    currentArticleByNumber[articleNumber] = article
  }
}

async function cleanHtmlFragment(
  fragment: string | undefined,
): Promise<string | undefined> {
  try {
    return fragment === undefined
      ? undefined
      : (
          await prettier.format(
            fragment
              .replaceAll("<<", "«")
              .replaceAll(">>", "»")
              .replace(/<p>(.*?)<\/p>/gs, "$1<br />\n\n")
              .replace(/\s*(<br\s*\/>\s*)+/gs, "<br />\n\n")
              // Remove <br /> at the beginning of fragment.
              .replace(/^\s*(<br\s*\/>\s*)+/gs, "")
              // Remove <br /> at the end of fragment.
              .replace(/\s*(<br\s*\/>\s*)+$/gs, "")
              .trim(),
            {
              parser: "html",
            },
          )
        )
          // Remove blank lines after a <br > when the text is indented,
          // because it breaks Markdown rendering.
          .replace(/<br \/>\n\n+ /g, "<br />\n ")
  } catch (e) {
    console.trace(`Cleanup of following text failed:\n${fragment}`)
    console.error(e)
    return fragment
  }
}

// Taken from https://github.com/sveltejs/svelte/blob/main/packages/svelte/src/escaping.js
function escapeHtml<StringOrUndefined extends string | undefined>(
  s: StringOrUndefined,
  isAttribute = false,
): StringOrUndefined {
  if (s === undefined) {
    return undefined as StringOrUndefined
  }

  const pattern = isAttribute ? /[&"<]/g : /[&<]/g
  pattern.lastIndex = 0

  let escaped = ""
  let last = 0

  while (pattern.test(s)) {
    const i = pattern.lastIndex - 1
    const ch = s[i]
    escaped +=
      s.substring(last, i) +
      (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;")
    last = i + 1
  }

  return (escaped + s.substring(last)) as StringOrUndefined
}

async function generateArticlesGit(
  context: Context,
  articles: Array<JorfArticle | LegiArticle> | undefined,
  date: string,
  repositoryRelativeDir: string,
): Promise<{
  readmeLinks: Array<{ href: string; title: string }>
  tree: TreeObject
}> {
  const readmeLinks: Array<{ href: string; title: string }> = []
  const tree: TreeObject = []

  if (articles !== undefined) {
    for (const article of articles) {
      const articleId = article.META.META_COMMUN.ID
      const articleNumber = article.META.META_SPEC.META_ARTICLE.NUM
      const articleTitle = `Article ${articleNumber ?? articleId}`
      let articleSlug = slugify(articleTitle, "_")
      if (articleSlug.length > 252) {
        articleSlug = articleSlug.slice(0, 251)
        if (articleSlug.at(-1) !== "_") {
          articleSlug += "_"
        }
      }
      const articleFilename = `${articleSlug}.md`
      const articleRepositoryRelativeFilePath = path.join(
        repositoryRelativeDir,
        articleFilename,
      )
      const articleCache =
        context.textFileCacheByRepositoryRelativeFilePath[
          articleRepositoryRelativeFilePath
        ]
      if (
        articleCache === undefined ||
        articleId !== articleCache.id ||
        articleCache.custom !== undefined
      ) {
        const articleMarkdown = dedent`
          ---
          ${[
            ["État", (article as LegiArticle).META.META_SPEC.META_ARTICLE.ETAT],
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

          <h1>${escapeHtml(articleTitle)}</h1>

          ${await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU)}
        `

        let referringArticlesLiensHtml: string | undefined
        const referringArticlesLiens =
          context.referringArticlesLiensById[articleId]
        if (referringArticlesLiens !== undefined) {
          referringArticlesLiensHtml = dedent`
            <h2>Articles faisant référence à l'article</h2>

            ${await htmlFromReferringArticlesLiens(context, referringArticlesLiens)}
          `
        }

        let referringTextsLiensHtml: string | undefined
        const referringTextsLiens = context.referringTextsLiensById[articleId]
        if (referringTextsLiens !== undefined) {
          referringTextsLiensHtml = dedent`
            <h2>Textes faisant référence à l'article</h2>

            ${await htmlFromReferringTextsLiens(context, referringTextsLiens)}
          `
        }

        let referredLiensHtml: string | undefined
        const referredLiens = (article as LegiArticle).LIENS?.LIEN
        if (referredLiens !== undefined) {
          referredLiensHtml = dedent`
            <h2>Références faites par l'article</h2>

            ${await htmlFromReferredLiens(context, referredLiens)}
          `
        }

        const referencesHtml = [
          referringArticlesLiensHtml,
          referringTextsLiensHtml,
          referredLiensHtml,
        ]
          .filter((block) => block !== undefined)
          .join("\n\n")
        const detailsHtml =
          referencesHtml === ""
            ? undefined
            : dedent`
                <details>
                  <summary><em>Références</em></summary>

                  ${referencesHtml.replaceAll("\n", "\n  ")}
                </details>
              `

        const treeEntry = await writeTextFileBlob(
          context.gitdir,
          articleFilename,
          [articleMarkdown, detailsHtml]
            .filter((block) => block !== undefined)
            .join("\n\n") + "\n",
        )
        tree.push(treeEntry)
        context.articleGitById[articleId] ??= {
          date,
          path: articleRepositoryRelativeFilePath,
        }
        context.textFileCacheByRepositoryRelativeFilePath[
          articleRepositoryRelativeFilePath
        ] = {
          id: articleId,
          treeEntry,
        }
      } else {
        tree.push(articleCache.treeEntry)
      }
      readmeLinks.push({ href: articleFilename, title: articleTitle })
    }
  }
  return {
    readmeLinks,
    tree,
  }
}

export async function generateConsolidatedTextGit(
  consolidatedTextId: string,
  gitdir: string,
  {
    currentSourceCodeCommitOid,
    force,
    "log-commits": logCommits,
    "log-references": logReferences,
  }: {
    currentSourceCodeCommitOid?: string
    force?: boolean
    "log-commits"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  const context: Context = {
    articleById: {},
    articleGitById: {},
    consolidatedIdsByActionByModifyingTextIdByDate: {},
    consolidatedTextCid: consolidatedTextId, // Temporary value, overrided below
    consolidatedTextInternalIds: new Set([consolidatedTextId]),
    consolidatedTextModifyingTextsIdsByActionByPublicationDate: {},
    currentInternalIds: new Set(),
    gitdir,
    hasModifyingTextIdByActionByConsolidatedArticleId: {},
    jorfCreatorIdByConsolidatedId: {},
    logReferences,
    modifyingArticleIdByActionByConsolidatedId: {},
    modifyingTextsIdsByArticleActionDate: {},
    referringArticlesLiensById: {},
    referringTextsLiensById: {},
    sectionTaById: {},
    sectionTaGitById: {},
    textelrById: {},
    texteManquantById: {},
    texteVersionById: {},
    texteVersionGitById: {},
    textFileCacheByRepositoryRelativeFilePath: {},
  }
  const consolidatedTextelr = (await getOrLoadTextelr(
    context,
    consolidatedTextId,
  )) as LegiTextelr
  assert.notStrictEqual(consolidatedTextelr, null)
  const consolidatedTexteVersion = (await getOrLoadTexteVersion(
    context,
    consolidatedTextId,
  )) as LegiTexteVersion
  assert.notStrictEqual(consolidatedTexteVersion, null)
  const meta = consolidatedTexteVersion.META
  const metaTexteChronicle = meta.META_SPEC.META_TEXTE_CHRONICLE
  context.consolidatedTextCid = metaTexteChronicle.CID
  // It seems that the CID of a LEGI text is the ID of the original JORF text
  // that created the first version of the law.
  // Most texts of LOI nature (except 191 / 3533) have a JORFTEXT CID.
  // Most texts of DECRET nature (except 409 / 53952) have a JORFTEXT CID.
  // Most texts of ARRETE nature (except 2832 / 80224) have a JORFTEXT CID.
  // Idem for the CONSTITUTION.
  // All texts of CODE nature have their CID === ID. But this is normal because a CODE
  // is not created from a single JORF law.
  const jorfCreatorArticleIdByNum: Record<string, string> = {}
  if (context.consolidatedTextCid.startsWith("JORFTEXT")) {
    context.jorfCreatorIdByConsolidatedId[consolidatedTextId] =
      context.consolidatedTextCid

    // Map JORF articles by their number, to be able to associate them with the LEGI article that they
    // create.
    const jorfCreatorTextelr = (await getOrLoadTextelr(
      context,
      context.consolidatedTextCid,
    )) as JorfTextelr
    // Note we currently ignore JORF SectionTAs and reference only their articles.
    for await (const {
      lienArticle: jorfCreatorLienArticle,
    } of walkTextelrLiensArticles(context, jorfCreatorTextelr)) {
      // Note: In JORF text of 1958 Constitution (JORFTEXT000000571356), for example,
      // `num` of articles are only present in LienArticle, not in (incomplete) articles
      // themselves.
      const articleNumber = jorfCreatorLienArticle["@num"]
      if (articleNumber !== undefined) {
        jorfCreatorArticleIdByNum[articleNumber] = jorfCreatorLienArticle["@id"]
      }
    }
  }

  const metaTexteVersion = meta.META_SPEC.META_TEXTE_VERSION
  console.log(
    `${meta.META_COMMUN.ID} ${(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? meta.META_COMMUN.ID).replace(/\s+/g, " ").trim()} (${metaTexteVersion.DATE_DEBUT ?? ""} — ${metaTexteVersion.DATE_FIN === "2999-01-01" ? "…" : (metaTexteVersion.DATE_FIN ?? "")}, ${metaTexteVersion.ETAT})`,
  )

  // First Pass: Register IDs of internal objects and associate them with
  // their JORF counterparts (when JORF articles exist they should have the
  // same content as their LEGI counterparts).

  for await (const { lienSectionTa } of walkStructureTree(
    context,
    consolidatedTextelr.STRUCT as
      | JorfSectionTaStructure
      | LegiSectionTaStructure,
  )) {
    context.consolidatedTextInternalIds.add(lienSectionTa["@id"])
  }
  for await (const { lienArticle } of walkTextelrLiensArticles(
    context,
    consolidatedTextelr,
  )) {
    const articleId = lienArticle["@id"]
    context.consolidatedTextInternalIds.add(articleId)
    if (
      lienArticle["@debut"] === metaTexteChronicle.DATE_PUBLI &&
      lienArticle["@num"] !== undefined
    ) {
      const jorfCreatorArticleId =
        jorfCreatorArticleIdByNum[lienArticle["@num"]]
      if (jorfCreatorArticleId !== undefined) {
        context.jorfCreatorIdByConsolidatedId[articleId] = jorfCreatorArticleId
      }
    }
  }

  // Second Pass : Register texts & articles that modify parts (aka SectionTA & Article) of the consolidated text.

  await registerLegiTextModifiersAndReferences(
    context,
    0,
    consolidatedTextelr,
    consolidatedTexteVersion,
  )

  for await (const {
    lienSectionTa,
    parentsSectionTa,
    sectionTa,
  } of walkStructureTree(
    context,
    consolidatedTextelr.STRUCT as
      | JorfSectionTaStructure
      | LegiSectionTaStructure,
  )) {
    await registerLegiSectionTaModifiersAndReferences(
      context,
      parentsSectionTa === undefined ? 0 : parentsSectionTa.length,
      lienSectionTa,
      sectionTa,
    )
  }

  for await (const {
    lienArticle,
    parentsSectionTa,
  } of walkTextelrLiensArticles(context, consolidatedTextelr)) {
    const article = (await getOrLoadArticle(
      context,
      lienArticle["@id"],
    )) as LegiArticle
    if (article !== null) {
      await registerLegiArticleModifiersAndReferences(
        context,
        parentsSectionTa === undefined ? 0 : 1 + parentsSectionTa.length,
        article,
      )
    }
  }

  // If code & data have not changed and no force option, don't generate git repository.
  const dataHash = objectHash({
    articleById: context.articleById,
    sectionTaById: context.sectionTaById,
    textelrById: context.textelrById,
    texteVersionById: context.texteVersionById,
  })
  if (!force) {
    const consolidatedTextGitHashes = (
      await db<{ data_hash: string; source_code_commit_oid: string }[]>`
      SELECT * FROM consolidated_texts_git_hashes
      WHERE id = ${consolidatedTextId}
    `
    )[0]
    if (consolidatedTextGitHashes !== undefined) {
      // if (
      //   currentSourceCodeCommitOid ===
      //   consolidatedTextGitHashes.source_code_commit_oid
      // ) {
      if (dataHash === consolidatedTextGitHashes.data_hash) {
        return 10
      }
      // }
    }
  }

  // Associate modified articles without modifying text with a modifying text that modified other articles at the same date.
  for await (const { lienArticle } of walkTextelrLiensArticles(
    context,
    consolidatedTextelr,
  )) {
    const consolidatedArticleId = lienArticle["@id"]
    const hasModifyingTextIdByAction =
      context.hasModifyingTextIdByActionByConsolidatedArticleId[
        consolidatedArticleId
      ]
    for (const action of actions) {
      if (!hasModifyingTextIdByAction?.[action]) {
        const consolidatedArticle = await getOrLoadArticle(
          context,
          consolidatedArticleId,
        )
        if (consolidatedArticle === null) {
          continue
        }
        const consolidatedArticleActionDate =
          action === "CREATE"
            ? consolidatedArticle.META.META_SPEC.META_ARTICLE.DATE_DEBUT
            : consolidatedArticle.META.META_SPEC.META_ARTICLE.DATE_FIN
        if (consolidatedArticleActionDate !== "2999-01-01") {
          const modifyingTextsIds =
            (context.modifyingTextsIdsByArticleActionDate[
              consolidatedArticleActionDate
            ] ??= new Set())
          if (modifyingTextsIds.size === 0) {
            // No modifying text can be associated with the modification of consolidated article
            // => Create a fake one.
            const texteManquantId = "ZZZZ TEXTE MANQUANT"
            if (
              context.consolidatedIdsByActionByModifyingTextIdByDate[
                consolidatedArticleActionDate
              ]?.[texteManquantId] === undefined
            ) {
              context.texteManquantById[texteManquantId] ??= {
                publicationDate: consolidatedArticleActionDate,
              }
            }
            modifyingTextsIds.add(texteManquantId)
            ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
              consolidatedArticleActionDate
            ] ??= {})[texteManquantId] ??= {})[action] ??= new Set()).add(
              consolidatedArticleId,
            )
          } else if (modifyingTextsIds.size === 1) {
            // There is only one modifying text for this date => use it.
            const modifyingTextId = modifyingTextsIds.values().next()
              .value as string
            ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
              consolidatedArticleActionDate
            ] ??= {})[modifyingTextId] ??= {})[action] ??= new Set()).add(
              consolidatedArticleId,
            )
          } else {
            // Several text modify different consolidated articles at this date.
            // Try to find the best one.
            // This could be:
            // - one of the texts whose publication date is the nearest before this date
            // - the text that modifies the most articles at this date
            // …
            // TODO: Improve heuristic.
            const modifyingTextId = modifyingTextsIds.values().next()
              .value as string
            ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
              consolidatedArticleActionDate
            ] ??= {})[modifyingTextId] ??= {})[action] ??= new Set()).add(
              consolidatedArticleId,
            )
          }
        }
      }
    }
  }

  // Generation of Git repository

  await fs.remove(gitdir)
  await fs.mkdir(gitdir, { recursive: true })
  await git.init({
    bare: true,
    defaultBranch: "main",
    gitdir,
    fs,
  })

  const tree: TreeObject = []

  // Generate LICENCE.md file.
  const licenseFilename = "LICENCE.md"
  const licenseRepositoryRelativeFilePath = licenseFilename
  const treeEntry = await writeTextFileBlob(
    context.gitdir,
    licenseFilename,
    licence,
  )
  tree.push(treeEntry)
  context.textFileCacheByRepositoryRelativeFilePath[
    licenseRepositoryRelativeFilePath
  ] = {
    id: licenseRepositoryRelativeFilePath,
    treeEntry,
  }

  const treeOid = await git.writeTree({
    fs,
    gitdir,
    tree,
  })
  let commitOid = await git.writeCommit({
    commit: {
      author: {
        email: "tricoteuses@tricoteuses.fr",
        name: "Tricoteuses",
        timestamp: 0,
        timezoneOffset: -60,
      },
      committer: {
        email: "republique@tricoteuses.fr",
        name: "République française",
        timestamp: 0,
        timezoneOffset: -60,
      },
      message: "Création du dépôt Git",
      parent: [],
      tree: treeOid,
    },
    fs,
    gitdir,
  })
  await git.writeRef({
    force: true,
    fs,
    gitdir,
    ref: "refs/heads/main",
    value: commitOid,
  })

  let future = false
  let latestTreeOid: string | undefined = undefined
  for (const [date, consolidatedIdsByActionByModifyingTextId] of Object.entries(
    context.consolidatedIdsByActionByModifyingTextIdByDate,
  ).toSorted(([date1], [date2]) => date1.localeCompare(date2))) {
    if (logCommits) {
      console.log(date)
    }
    const dateObject = new Date(date)
    const timezoneOffset = dateObject.getTimezoneOffset() // in minutes
    let timestamp = Math.floor(dateObject.getTime() / 1000)
    if (timestamp < minDateTimestamp) {
      const diffDays = Math.round((minDateTimestamp - timestamp) / oneDay)
      timestamp = minDateTimestamp - diffDays
    }
    timestamp += timezoneOffset * 60

    // Sort modifying texts at current date.
    const modifyingTexteVersionArray: Array<
      JorfTexteVersion | LegiTexteVersion | TexteManquant
    > = []
    for (const modifyingTextId of Object.keys(
      consolidatedIdsByActionByModifyingTextId,
    )) {
      let modifyingTexteVersion:
        | JorfTexteVersion
        | LegiTexteVersion
        | TexteManquant = context.texteManquantById[
        modifyingTextId
      ] as TexteManquant
      if (modifyingTexteVersion === undefined) {
        modifyingTexteVersion = (await getOrLoadTexteVersion(
          context,
          modifyingTextId,
        )) as JorfTexteVersion | LegiTexteVersion
        assert.notStrictEqual(modifyingTexteVersion, null)
      }
      modifyingTexteVersionArray.push(modifyingTexteVersion)
    }
    modifyingTexteVersionArray.sort(
      (modifyingTexteVersion1, modifyingTexteVersion2) => {
        if (
          (modifyingTexteVersion1 as TexteManquant).publicationDate !==
          undefined
        ) {
          return 1
        }
        if (
          (modifyingTexteVersion2 as TexteManquant).publicationDate !==
          undefined
        ) {
          return -1
        }
        const metaTexteChronicle1 = (
          modifyingTexteVersion1 as JorfTexteVersion | LegiTexteVersion
        ).META.META_SPEC.META_TEXTE_CHRONICLE
        const publicationDate1 = metaTexteChronicle1.DATE_PUBLI
        const metaTexteChronicle2 = (
          modifyingTexteVersion2 as JorfTexteVersion | LegiTexteVersion
        ).META.META_SPEC.META_TEXTE_CHRONICLE
        const publicationDate2 = metaTexteChronicle2.DATE_PUBLI
        if (publicationDate1 !== publicationDate2) {
          return publicationDate1.localeCompare(publicationDate2)
        }
        const number1 = metaTexteChronicle1.NUM
        if (number1 === undefined) {
          return 1
        }
        const number2 = metaTexteChronicle2.NUM
        if (number2 === undefined) {
          return -1
        }
        return number1.localeCompare(number2)
      },
    )

    for (const [
      modifyingTextIndex,
      modifyingTexteVersion,
    ] of modifyingTexteVersionArray.entries()) {
      const t0 = performance.now()
      let modifyingTextId: string
      let modifyingTextTitle: string
      if (
        (modifyingTexteVersion as TexteManquant).publicationDate === undefined
      ) {
        modifyingTextId = (
          modifyingTexteVersion as JorfTexteVersion | LegiTexteVersion
        ).META.META_COMMUN.ID
        modifyingTextTitle = (
          (modifyingTexteVersion as JorfTexteVersion | LegiTexteVersion).META
            .META_SPEC.META_TEXTE_VERSION.TITREFULL ??
          (modifyingTexteVersion as JorfTexteVersion | LegiTexteVersion).META
            .META_SPEC.META_TEXTE_VERSION.TITRE ??
          modifyingTextId
        )
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\s+\(\d+\)$/, "")
      } else {
        modifyingTextId = "ZZZZ TEXTE MANQUANT"
        modifyingTextTitle = `!!! Texte non trouvé ${date} !!!`
      }
      if (logCommits) {
        console.log(`  ${modifyingTextId} ${modifyingTextTitle}`)
      }
      const consolidatedIdsByAction =
        consolidatedIdsByActionByModifyingTextId[modifyingTextId]
      if (consolidatedIdsByAction.DELETE !== undefined && logCommits) {
        console.log(
          `    DELETE: ${[...consolidatedIdsByAction.DELETE].toSorted().join(", ")}`,
        )
      }
      if (consolidatedIdsByAction.CREATE !== undefined && logCommits) {
        console.log(
          `    CREATE: ${[...consolidatedIdsByAction.CREATE].toSorted().join(", ")}`,
        )
      }

      const t1 = performance.now()
      const currentArticleByNumber: Record<string, JorfArticle | LegiArticle> =
        {}
      for (const action of ["DELETE", "CREATE"] as Action[]) {
        for await (const { lienArticle } of walkTextelrLiensArticles(
          context,
          consolidatedTextelr,
        )) {
          await addLienArticleToCurrentArticles(
            context,
            consolidatedIdsByAction,
            currentArticleByNumber,
            action,
            lienArticle,
          )
        }
      }
      const tree: TextelrNode = {}
      for (const [, article] of Object.entries(currentArticleByNumber).toSorted(
        ([number1], [number2]) => sortArticlesNumbers(number1, number2),
      )) {
        await addArticleToTree(context, tree, date, article)
      }

      const t2 = performance.now()
      const treeOid = await generateTextGit(
        context,
        1,
        tree,
        consolidatedTexteVersion as LegiTexteVersion,
        date,
        modifyingTextId,
      )

      const t3 = performance.now()
      if (treeOid !== latestTreeOid) {
        let messageLines: string | undefined = undefined
        let summary: string | undefined = undefined
        if (modifyingTextId.startsWith("JORFTEXT")) {
          const jorfModifyingTexteVersion =
            modifyingTexteVersion as JorfTexteVersion
          messageLines = [
            [
              "Autorité",
              jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .AUTORITE,
            ],
            [
              "Ministère",
              jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .MINISTERE,
            ],
            ["Nature", jorfModifyingTexteVersion.META.META_COMMUN.NATURE],
            [
              "Date de début",
              jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .DATE_DEBUT,
            ],
            [
              "Date de fin",
              jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .DATE_FIN,
            ],
            ["Identifiant", jorfModifyingTexteVersion.META.META_COMMUN.ID],
            [
              "NOR",
              jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR,
            ],
            [
              "Ancien identifiant",
              jorfModifyingTexteVersion.META.META_COMMUN.ANCIEN_ID,
            ],
            // TODO: Mettre l'URL dans Légifrance et(?) le Git Tricoteuses
            ["URL", jorfModifyingTexteVersion.META.META_COMMUN.URL],
          ]
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
          summary = jorfModifyingTexteVersion.SM?.CONTENU?.replace(
            /<br\s*\/>/gi,
            "\n",
          )
        } else if (modifyingTextId.startsWith("LEGITEXT")) {
          const legiModifyingTexteVersion =
            modifyingTexteVersion as LegiTexteVersion
          messageLines = [
            [
              "État",
              legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.ETAT,
            ],
            ["Nature", legiModifyingTexteVersion.META.META_COMMUN.NATURE],
            [
              "Date de début",
              legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .DATE_DEBUT,
            ],
            [
              "Date de fin",
              legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                .DATE_FIN,
            ],
            ["Identifiant", legiModifyingTexteVersion.META.META_COMMUN.ID],
            [
              "NOR",
              legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR,
            ],
            [
              "Ancien identifiant",
              legiModifyingTexteVersion.META.META_COMMUN.ANCIEN_ID,
            ],
            // TODO: Mettre l'URL dans le Git Tricoteuses
            ["URL", legiModifyingTexteVersion.META.META_COMMUN.URL],
          ]
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        }
        if (date > today && !future) {
          await git.branch({
            checkout: true,
            gitdir,
            fs,
            ref: "futur",
          })
          future = true
        }
        commitOid = await git.writeCommit({
          commit: {
            author: {
              email: "republique@tricoteuses.fr",
              name: "République française",
              timestamp,
              timezoneOffset,
            },
            committer: {
              email: "republique@tricoteuses.fr",
              name: "République française",
              timestamp,
              timezoneOffset,
            },
            message: [modifyingTextTitle, summary, messageLines]
              .filter((block) => block !== undefined)
              .join("\n\n"),
            parent: [commitOid],
            tree: treeOid,
          },
          fs,
          gitdir,
        })
        await git.writeRef({
          force: true,
          fs,
          gitdir,
          ref: `refs/heads/${future ? "futur" : "main"}`,
          value: commitOid,
        })
        latestTreeOid = treeOid
      }
      if (modifyingTextIndex === modifyingTexteVersionArray.length - 1) {
        await git.writeRef({
          fs,
          gitdir,
          ref: `refs/tags/${
            date === "2222-02-22"
              ? "différé" // mise en vigueur différée à une date non précisée
              : date
          }`,
          value: commitOid,
        })
      }

      const t4 = performance.now()
      if (logCommits) {
        console.log(`Durations: ${t1 - t0} ${t2 - t1} ${t3 - t2} ${t4 - t3}`)
      }
    }
  }

  if (future) {
    // Return to main branch.
    await git.writeRef({
      fs,
      force: true,
      gitdir,
      ref: "HEAD",
      symbolic: true,
      value: "refs/heads/main",
    })
  }

  for await (const articleGitRows of db<ArticleGitDb[]>`
    SELECT * FROM article_git
    WHERE id in (
      SELECT id
      FROM article
      WHERE data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${consolidatedTextId}
    )
  `.cursor(100)) {
    for (const { id, date, path } of articleGitRows) {
      const articleGit = context.articleGitById[id]
      if (articleGit === undefined) {
        await db`
          DELETE FROM article_git
          WHERE id = ${id}
        `
      } else if (date === articleGit.date && path === articleGit.path) {
        delete context.articleGitById[id]
      }
    }
  }
  const articleGitArray = Object.entries(context.articleGitById).map(
    ([id, { date, path }]) => ({ id, date, path }),
  )
  if (articleGitArray.length !== 0) {
    // Split articleGitArray to avoid error:
    // MAX_PARAMETERS_EXCEEDED: Max number of parameters (65534) exceeded
    for (let i = 0; i < articleGitArray.length; i += 10_000) {
      await db`
        INSERT INTO article_git
        ${db(articleGitArray.slice(i, i + 10_000))}
        ON CONFLICT (id)
        DO UPDATE SET
          date = excluded.date,
          path = excluded.path
      `
    }
  }

  for await (const sectionTaGitRows of db<SectionTaGitDb[]>`
    SELECT * FROM section_ta_git
    WHERE id in (
      SELECT id
      FROM section_ta
      WHERE data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${consolidatedTextId}
    )
  `.cursor(100)) {
    for (const { id, date, path } of sectionTaGitRows) {
      const sectionTaGit = context.sectionTaGitById[id]
      if (sectionTaGit === undefined) {
        await db`
          DELETE FROM section_ta_git
          WHERE id = ${id}
        `
      } else if (date === sectionTaGit.date && path === sectionTaGit.path) {
        delete context.sectionTaGitById[id]
      }
    }
  }
  if (Object.keys(context.sectionTaGitById).length !== 0) {
    await db`
      INSERT INTO section_ta_git
      ${db(Object.entries(context.sectionTaGitById).map(([id, { date, path }]) => ({ id, date, path })))}
      ON CONFLICT (id)
      DO UPDATE SET
        date = excluded.date,
        path = excluded.path
    `
  }

  for (const { id, date, path } of await db<TexteVersionGitDb[]>`
    SELECT * FROM texte_version_git
    WHERE id = ${consolidatedTextId}
  `) {
    const texteVersionGit = context.texteVersionGitById[id]
    if (texteVersionGit === undefined) {
      await db`
        DELETE FROM texte_version_git
        WHERE id = ${id}
      `
    } else if (date === texteVersionGit.date && path === texteVersionGit.path) {
      delete context.texteVersionGitById[id]
    }
  }
  if (Object.keys(context.texteVersionGitById).length !== 0) {
    await db`
      INSERT INTO texte_version_git
      ${db(Object.entries(context.texteVersionGitById).map(([id, { date, path }]) => ({ id, date, path })))}
      ON CONFLICT (id)
      DO UPDATE SET
        date = excluded.date,
        path = excluded.path
    `
  }

  await db`
    INSERT INTO consolidated_texts_git_hashes (
      id,
      data_hash,
      source_code_commit_oid
    ) VALUES (
      ${consolidatedTextId},
      ${dataHash},
      ${currentSourceCodeCommitOid ?? ""}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      data_hash = ${dataHash},
      source_code_commit_oid = ${currentSourceCodeCommitOid ?? ""}
  `

  return 0
}

async function generateSectionTaGit(
  context: Context,
  depth: number,
  sectionTaNode: SectionTaNode,
  sectionTa: LegiSectionTa,
  date: string,
  parentRepositoryRelativeDir: string,
  modifyingTextId: string,
): Promise<TreeEntry> {
  const sectionTaDirName = sectionTaNode.slug
  const repositoryRelativeDir = path.join(
    parentRepositoryRelativeDir,
    sectionTaDirName,
  )

  const { readmeLinks, tree } = await generateArticlesGit(
    context,
    sectionTaNode.articles,
    date,
    repositoryRelativeDir,
  )

  const readmeFilename = "README.md"
  if (sectionTaNode.children !== undefined) {
    for (const child of sectionTaNode.children) {
      const sectionTa = await getOrLoadSectionTa(context, child.id)
      if (sectionTa !== null) {
        const sectionTaDirName = child.slug
        readmeLinks.push({
          href: path.join(sectionTaDirName, readmeFilename),
          title: child.title,
        })

        tree.push(
          await generateSectionTaGit(
            context,
            depth + 1,
            child,
            sectionTa,
            date,
            repositoryRelativeDir,
            modifyingTextId,
          ),
        )
      }
    }
  }

  const readmeLinksMarkdown = readmeLinks
    .map(({ href, title }) => `- [${title}](${href})`)
    .join("\n")
  const readmeRepositoryRelativeFilePath = path.join(
    repositoryRelativeDir,
    readmeFilename,
  )
  const readmeCache =
    context.textFileCacheByRepositoryRelativeFilePath[
      readmeRepositoryRelativeFilePath
    ]
  if (
    readmeCache === undefined ||
    readmeCache.id !== sectionTaNode.id ||
    readmeCache.custom !== readmeLinksMarkdown
  ) {
    const readmeMarkdown = dedent`
      ---
      ${[
        ["Commentaire", sectionTa.COMMENTAIRE],
        // ["État", lienSectionTa["@etat"]],
        ["Date de début", sectionTaNode.startDate],
        ["Date de fin", sectionTaNode.endDate],
        ["Identifiant", sectionTaNode.id],
        // TODO: Mettre l'URL dans le Git Tricoteuses
        // ["URL", lienSectionTa["@url"]],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---

      <h1>${escapeHtml(sectionTaNode.title)}</h1>

      ${readmeLinksMarkdown}
    `

    let referringArticlesLiensHtml: string | undefined
    const referringArticlesLiens =
      context.referringArticlesLiensById[sectionTaNode.id]
    if (referringArticlesLiens !== undefined) {
      referringArticlesLiensHtml = dedent`
        <h2>Articles faisant référence à la section</h2>

        ${await htmlFromReferringArticlesLiens(context, referringArticlesLiens)}
      `
    }

    let referringTextsLiensHtml: string | undefined
    const referringTextsLiens =
      context.referringTextsLiensById[sectionTaNode.id]
    if (referringTextsLiens !== undefined) {
      referringTextsLiensHtml = dedent`
        <h2>Textes faisant référence à la section</h2>

        ${await htmlFromReferringTextsLiens(context, referringTextsLiens)}
      `
    }

    const referencesHtml = [referringArticlesLiensHtml, referringTextsLiensHtml]
      .filter((block) => block !== undefined)
      .join("\n\n")
    const detailsHtml =
      referencesHtml === ""
        ? undefined
        : dedent`
            <details>
              <summary><em>Références</em></summary>

              ${referencesHtml.replaceAll("\n", "\n  ")}
            </details>
          `

    const treeEntry = await writeTextFileBlob(
      context.gitdir,
      readmeFilename,
      [readmeMarkdown, detailsHtml]
        .filter((block) => block !== undefined)
        .join("\n\n") + "\n",
    )
    tree.push(treeEntry)
    context.sectionTaGitById[sectionTaNode.id] ??= {
      date,
      path: readmeRepositoryRelativeFilePath,
    }
    context.textFileCacheByRepositoryRelativeFilePath[
      readmeRepositoryRelativeFilePath
    ] = {
      custom: readmeLinksMarkdown,
      id: sectionTaNode.id,
      treeEntry,
    }
  } else {
    tree.push(readmeCache.treeEntry)
  }

  const treeOid = await git.writeTree({
    fs,
    gitdir: context.gitdir,
    tree,
  })

  return {
    mode: "040000",
    path: sectionTaDirName,
    oid: treeOid,
    type: "tree",
  }
}

async function generateTextGit(
  context: Context,
  depth: number,
  textelrNode: TextelrNode,
  texteVersion: LegiTexteVersion,
  date: string,
  modifyingTextId: string,
): Promise<string> {
  const textId = texteVersion.META.META_COMMUN.ID
  const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
  const texteTitle = (
    metaTexteVersion.TITREFULL ??
    metaTexteVersion.TITRE ??
    textId
  )
    .replace(/\s+/g, " ")
    .trim()

  const { readmeLinks, tree } = await generateArticlesGit(
    context,
    textelrNode.articles,
    date,
    "",
  )

  const readmeFilename = "README.md"
  if (textelrNode.children !== undefined) {
    for (const child of textelrNode.children) {
      const sectionTa = await getOrLoadSectionTa(context, child.id)
      if (sectionTa !== null) {
        const sectionTaDirName = child.slug
        readmeLinks.push({
          href: path.join(sectionTaDirName, readmeFilename),
          title: child.title,
        })

        tree.push(
          await generateSectionTaGit(
            context,
            depth + 1,
            child,
            sectionTa,
            date,
            "",
            modifyingTextId,
          ),
        )
      }
    }
  }

  const readmeLinksMarkdown = readmeLinks
    .map(({ href, title }) => `- [${title}](${href})`)
    .join("\n")
  const readmeRepositoryRelativeFilePath = readmeFilename
  const readmeCache =
    context.textFileCacheByRepositoryRelativeFilePath[
      readmeRepositoryRelativeFilePath
    ]
  if (
    readmeCache === undefined ||
    readmeCache.id !== textId ||
    readmeCache.custom !== readmeLinksMarkdown
  ) {
    const readmeBlocks = [
      `<h1>${escapeHtml(texteTitle)}</h1>`,
      dedent`
          > **Avertissement** : Ce document fait partie du projet [Tricoteuses](https://tricoteuses.fr/)
          > de conversion à git des textes juridiques consolidés français.
          > **Il peut contenir des erreurs !**
        `,
      await cleanHtmlFragment(texteVersion.VISAS?.CONTENU),
      readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n"),
      await cleanHtmlFragment(texteVersion.SIGNATAIRES?.CONTENU),
    ].filter((block) => block != null)

    const readmeMarkdown = dedent`
      ---
      ${[
        ["État", metaTexteVersion.ETAT],
        ["Nature", texteVersion.META.META_COMMUN.NATURE],
        ["Date de début", metaTexteVersion.DATE_DEBUT],
        ["Date de fin", metaTexteVersion.DATE_FIN],
        ["Identifiant", textId],
        ["NOR", texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR],
        ["Ancien identifiant", texteVersion.META.META_COMMUN.ANCIEN_ID],
        // TODO: Mettre l'URL dans Légifrance et(?) le Git Tricoteuses
        ["URL", texteVersion.META.META_COMMUN.URL],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---

      ${readmeBlocks.join("\n\n")}
    `

    let referringArticlesLiensHtml: string | undefined
    const referringArticlesLiens = context.referringArticlesLiensById[textId]
    if (referringArticlesLiens !== undefined) {
      referringArticlesLiensHtml = dedent`
        <h2>Articles faisant référence au texte</h2>

        ${await htmlFromReferringArticlesLiens(context, referringArticlesLiens)}
      `
    }

    let referringTextsLiensHtml: string | undefined
    const referringTextsLiens = context.referringTextsLiensById[textId]
    if (referringTextsLiens !== undefined) {
      referringTextsLiensHtml = dedent`
        <h2>Textes faisant référence au texte</h2>

        ${await htmlFromReferringTextsLiens(context, referringTextsLiens)}
      `
    }

    let referredLiensHtml: string | undefined
    const referredLiens = metaTexteVersion.LIENS?.LIEN
    if (referredLiens !== undefined) {
      referredLiensHtml = dedent`
        <h2>Références faites par le texte</h2>

        ${await htmlFromReferredLiens(context, referredLiens)}
      `
    }

    const referencesHtml = [
      referringArticlesLiensHtml,
      referringTextsLiensHtml,
      referredLiensHtml,
    ]
      .filter((block) => block !== undefined)
      .join("\n\n")
    const detailsHtml =
      referencesHtml === ""
        ? undefined
        : dedent`
            <details>
              <summary><em>Références</em></summary>

              ${referencesHtml.replaceAll("\n", "\n  ")}
            </details>
          `

    const treeEntry = await writeTextFileBlob(
      context.gitdir,
      readmeFilename,
      [readmeMarkdown, detailsHtml]
        .filter((block) => block !== undefined)
        .join("\n\n") + "\n",
    )
    tree.push(treeEntry)
    context.texteVersionGitById[textId] ??= {
      date,
      path: readmeRepositoryRelativeFilePath,
    }
    context.textFileCacheByRepositoryRelativeFilePath[
      readmeRepositoryRelativeFilePath
    ] = {
      custom: readmeLinksMarkdown,
      id: texteVersion.META.META_COMMUN.ID,
      treeEntry,
    }
  } else {
    tree.push(readmeCache.treeEntry)
  }

  tree.push(
    context.textFileCacheByRepositoryRelativeFilePath["LICENCE.md"].treeEntry,
  )

  return await git.writeTree({
    fs,
    gitdir: context.gitdir,
    tree,
  })
}

async function htmlFromReferredLiens(
  context: Context,
  referredLiens: Array<
    LegiArticleLien | LegiTexteVersionLien | JorfTexteVersionLien
  >,
) {
  return dedent`
    <ul>
      ${(
        await Promise.all(
          referredLiens.map(async (referredLien) => {
            let referredA: string | undefined = undefined
            const referredId = referredLien["@id"] ?? referredLien["@cidtexte"]
            if (referredId !== undefined) {
              if (/^(JORF|LEGI)ARTI\d{12}$/.test(referredId)) {
                const referredArticle = await getOrLoadArticle(
                  context,
                  referredId,
                )
                if (referredArticle !== null) {
                  const referredMetaArticle =
                    referredArticle.META.META_SPEC.META_ARTICLE
                  const referredArticleTitleFragment =
                    "article" +
                    [
                      referredMetaArticle.NUM,
                      referredMetaArticle.TYPE,
                      (referredMetaArticle as LegiArticleMetaArticle).ETAT,
                    ]
                      .filter((value) => value !== undefined)
                      .map((value) => ` ${value}`)
                      .join("") +
                    (referredMetaArticle.DATE_DEBUT === "2999-01-01" &&
                    referredMetaArticle.DATE_FIN === "2999-01-01"
                      ? ""
                      : referredMetaArticle.DATE_FIN === "2999-01-01"
                        ? `, en vigueur depuis le ${referredMetaArticle.DATE_DEBUT}`
                        : `, en vigueur du ${referredMetaArticle.DATE_DEBUT} au ${referredMetaArticle.DATE_FIN}`)

                  const referredArticleTexte = referredArticle.CONTEXTE.TEXTE
                  const referredTextTitreTxt = bestItemForDate(
                    referredArticleTexte.TITRE_TXT,
                    referredMetaArticle.DATE_DEBUT,
                  )
                  const referredTextTitleFragment =
                    referredTextTitreTxt === undefined
                      ? `${referredArticleTexte["@nature"] ?? "Texte"} ${referredArticleTexte["@cid"]} manquant`
                      : (referredTextTitreTxt["#text"]
                          ?.replace(/\s+/g, " ")
                          .trim()
                          .replace(/\s+\(\d+\)$/, "") ??
                        referredTextTitreTxt["@c_titre_court"] ??
                        `${referredArticleTexte["@nature"] ?? "Texte"} ${referredArticleTexte["@cid"]} sans titre`)
                  referredA = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(referredArticleTitleFragment)}</a>`
                }
              }

              if (/^(JORF|LEGI)SCTA\d{12}$/.test(referredId)) {
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
                  referredA = dedent`<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitleFragment)} - ${escapeHtml(referredSectionTaTitleFragment)}</a>`
                }
              }

              if (/^(JORF|LEGI)TEXT\d{12}$/.test(referredId)) {
                const referredTexteVersion = await getOrLoadTexteVersion(
                  context,
                  referredId,
                )
                if (referredTexteVersion !== null) {
                  const referredMetaTexteVersion =
                    referredTexteVersion.META.META_SPEC.META_TEXTE_VERSION
                  const referredTextTitle =
                    (
                      referredMetaTexteVersion.TITREFULL ??
                      referredMetaTexteVersion.TITRE ??
                      referredId
                    )
                      .replace(/\s+/g, " ")
                      .trim()
                      .replace(/\s+\(\d+\)$/, "") +
                    ((referredMetaTexteVersion as LegiMetaTexteVersion).ETAT ===
                    undefined
                      ? ""
                      : ` ${(referredMetaTexteVersion as LegiMetaTexteVersion).ETAT}`) +
                    (((referredMetaTexteVersion.DATE_DEBUT === undefined ||
                      referredMetaTexteVersion.DATE_DEBUT === "2999-01-01") &&
                      referredMetaTexteVersion.DATE_FIN === undefined) ||
                    referredMetaTexteVersion.DATE_FIN === "2999-01-01"
                      ? ""
                      : referredMetaTexteVersion.DATE_FIN === undefined ||
                          referredMetaTexteVersion.DATE_FIN === "2999-01-01"
                        ? `, en vigueur depuis le ${referredMetaTexteVersion.DATE_DEBUT}`
                        : `, en vigueur du ${referredMetaTexteVersion.DATE_DEBUT} au ${referredMetaTexteVersion.DATE_FIN}`)
                  referredA = `<a href="${new URL(`redirection/${referredId}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referredTextTitle)}</a>`
                }
              }
            }
            return dedent`
              <li>
                ${[referredLien["@datesignatexte"], referredLien["@typelien"], referredLien["@sens"]].filter((item) => item !== undefined).join(" ")} ${referredA ?? escapeHtml(referredLien["#text"] ?? "lien sans titre")}
              </li>
            `
          }),
        )
      )
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

async function htmlFromReferringArticlesLiens(
  context: Context,
  referringArticlesLiens: ArticleLienDb[],
) {
  return dedent`
    <ul>
      ${(
        await Promise.all(
          referringArticlesLiens.map(async (referringArticleLien) => {
            let referringArticleA: string | undefined = undefined
            const referringArticle = await getOrLoadArticle(
              context,
              referringArticleLien.article_id,
            )
            if (referringArticle !== null) {
              const referringMetaArticle =
                referringArticle.META.META_SPEC.META_ARTICLE
              const referringArticleTitleFragment =
                "article" +
                [
                  referringMetaArticle.NUM,
                  referringMetaArticle.TYPE,
                  (referringMetaArticle as LegiArticleMetaArticle).ETAT,
                ]
                  .filter((value) => value !== undefined)
                  .map((value) => ` ${value}`)
                  .join("") +
                (referringMetaArticle.DATE_DEBUT === "2999-01-01" &&
                referringMetaArticle.DATE_FIN === "2999-01-01"
                  ? ""
                  : referringMetaArticle.DATE_FIN === "2999-01-01"
                    ? `, en vigueur depuis le ${referringMetaArticle.DATE_DEBUT}`
                    : `, en vigueur du ${referringMetaArticle.DATE_DEBUT} au ${referringMetaArticle.DATE_FIN}`)

              const referringArticleTexte = referringArticle.CONTEXTE.TEXTE
              const referringTextTitreTxt = bestItemForDate(
                referringArticleTexte.TITRE_TXT,
                referringMetaArticle.DATE_DEBUT,
              )
              const referringTextTitleFragment =
                referringTextTitreTxt === undefined
                  ? `${referringArticleTexte["@nature"] ?? "Texte"} ${referringArticleTexte["@cid"]} manquant`
                  : (referringTextTitreTxt["#text"]
                      ?.replace(/\s+/g, " ")
                      .trim()
                      .replace(/\s+\(\d+\)$/, "") ??
                    referringTextTitreTxt["@c_titre_court"] ??
                    `${referringArticleTexte["@nature"] ?? "Texte"} ${referringArticleTexte["@cid"]} sans titre`)
              referringArticleA = dedent`<a href="${new URL(`redirection/${referringArticleLien.article_id}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referringTextTitleFragment)} - ${escapeHtml(referringArticleTitleFragment)}</a>`
            }
            return dedent`
              <li>
                ${referringArticleA ?? `Article ${referringArticleLien.article_id} manquant`} ${referringArticleLien.typelien} ${referringArticleLien.cible ? "cible" : "source"}
              </li>
            `
          }),
        )
      )
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}

async function htmlFromReferringTextsLiens(
  context: Context,
  referringTextsLiens: TexteVersionLienDb[],
) {
  return dedent`
    <ul>
      ${(
        await Promise.all(
          referringTextsLiens.map(async (referringTextLien) => {
            let referringTextA: string | undefined = undefined
            const referringTexteVersion = await getOrLoadTexteVersion(
              context,
              referringTextLien.texte_version_id,
            )
            if (referringTexteVersion !== null) {
              const referringMetaTexteVersion =
                referringTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              const referringTextTitle =
                (
                  referringMetaTexteVersion.TITREFULL ??
                  referringMetaTexteVersion.TITRE ??
                  referringTextLien.texte_version_id
                )
                  .replace(/\s+/g, " ")
                  .trim()
                  .replace(/\s+\(\d+\)$/, "") +
                ((referringMetaTexteVersion as LegiMetaTexteVersion).ETAT ===
                undefined
                  ? ""
                  : ` ${(referringMetaTexteVersion as LegiMetaTexteVersion).ETAT}`) +
                ((referringMetaTexteVersion.DATE_DEBUT === undefined ||
                  referringMetaTexteVersion.DATE_DEBUT === "2999-01-01") &&
                (referringMetaTexteVersion.DATE_FIN === undefined ||
                  referringMetaTexteVersion.DATE_FIN === "2999-01-01")
                  ? ""
                  : referringMetaTexteVersion.DATE_FIN === undefined ||
                      referringMetaTexteVersion.DATE_FIN === "2999-01-01"
                    ? `, en vigueur depuis le ${referringMetaTexteVersion.DATE_DEBUT}`
                    : `, en vigueur du ${referringMetaTexteVersion.DATE_DEBUT} au ${referringMetaTexteVersion.DATE_FIN}`)
              referringTextA = `<a href="${new URL(`redirection/${referringTextLien.texte_version_id}?vers=git&vers=legifrance`, config.url).toString()}">${escapeHtml(referringTextTitle)}</a>`
            }
            return dedent`
              <li>
                ${referringTextA ?? `Texte ${referringTextLien.texte_version_id} manquant`} ${referringTextLien.typelien} ${referringTextLien.cible ? "cible" : "source"}
              </li>
            `
          }),
        )
      )
        .join("\n")
        .replaceAll("\n", "\n  ")}
    </ul>
  `
}
