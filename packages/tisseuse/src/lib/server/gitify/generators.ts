import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import objectHash from "object-hash"
import git from "isomorphic-git"
import path from "path"
import * as prettier from "prettier"

import { sortArticlesNumbers } from "$lib/articles"
import type {
  JorfArticle,
  JorfSectionTaLienArt,
  JorfSectionTaStructure,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleMetaArticle,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTextelrLienArt,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { db } from "$lib/server/databases"
import { writeTextFileIfChanged } from "$lib/server/files"
import { walkDir } from "$lib/server/file_systems"
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
  registerLegiArticleModifiers,
  registerLegiTextModifiers,
} from "./modifiers"
import { licence } from "./repositories"
import { addArticleToTree, type SectionTaNode, type TextelrNode } from "./trees"

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

async function generateArticlesGit(
  context: Context,
  articles: Array<JorfArticle | LegiArticle> | undefined,
  repositoryRelativeDir: string,
  obsoleteRepositoryRelativeFilesPaths: Set<string>,
): Promise<{
  changedFilesCount: number
  readmeLinks: Array<{ href: string; title: string }>
}> {
  let changedFilesCount = 0
  const readmeLinks: Array<{ href: string; title: string }> = []

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
        articleNumber === undefined
          ? undefined
          : context.articleCacheByNumber[articleNumber]
      if (
        articleCache === undefined ||
        articleId !== articleCache.id ||
        articleRepositoryRelativeFilePath !==
          articleCache.repositoryRelativeFilePath
      ) {
        const articleMarkdown = dedent`
            ---
            ${[
              [
                "État",
                (article as LegiArticle).META.META_SPEC.META_ARTICLE.ETAT,
              ],
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

            ###### ${articleTitle}

            ${await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU)}
          `
        if (articleNumber !== undefined) {
          context.articleCacheByNumber[articleNumber] = {
            id: articleId,
            markdown: articleMarkdown,
            repositoryRelativeFilePath: articleRepositoryRelativeFilePath,
          }
        }
        const fileChanged = await writeTextFileIfChanged(
          path.join(context.targetDir, articleRepositoryRelativeFilePath),
          articleMarkdown,
        )
        if (fileChanged) {
          await git.add({
            dir: context.targetDir,
            filepath: articleRepositoryRelativeFilePath,
            fs,
          })
          changedFilesCount++
        }
      }
      obsoleteRepositoryRelativeFilesPaths.delete(
        articleRepositoryRelativeFilePath,
      )
      readmeLinks.push({ href: articleFilename, title: articleTitle })
    }
  }
  return {
    changedFilesCount,
    readmeLinks,
  }
}

export async function generateConsolidatedTextGit(
  consolidatedTextId: string,
  targetDir: string,
  {
    currentSourceCodeCommitOid,
    force,
    "log-references": logReferences,
  }: {
    currentSourceCodeCommitOid?: string
    force?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  const context: Context = {
    articleById: {},
    articleCacheByNumber: {},
    consolidatedIdsByActionByModifyingTextIdByDate: {},
    consolidatedTextCid: consolidatedTextId, // Temporary value, overrided below
    consolidatedTextInternalIds: new Set([consolidatedTextId]),
    consolidatedTextModifyingTextsIdsByActionByPublicationDate: {},
    currentInternalIds: new Set(),
    hasModifyingTextIdByActionByConsolidatedArticleId: {},
    jorfCreatorIdByConsolidatedId: {},
    logReferences,
    modifyingArticleIdByActionByConsolidatedId: {},
    modifyingTextsIdsByArticleActionDate: {},
    sectionTaById: {},
    targetDir,
    textelrById: {},
    texteManquantById: {},
    texteVersionById: {},
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

  await registerLegiTextModifiers(
    context,
    0,
    consolidatedTextelr,
    consolidatedTexteVersion,
  )

  for await (const {
    lienArticle,
    parentsSectionTa,
  } of walkTextelrLiensArticles(context, consolidatedTextelr)) {
    const article = (await getOrLoadArticle(
      context,
      lienArticle["@id"],
    )) as LegiArticle
    if (article !== null) {
      await registerLegiArticleModifiers(
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
    // if (consolidatedTextGitHashes !== undefined) {
    // if (
    //   currentSourceCodeCommitOid ===
    //   consolidatedTextGitHashes.source_code_commit_oid
    // ) {
    if (dataHash === consolidatedTextGitHashes.data_hash) {
      return 10
    }
    // }
    // }
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

  const repositoryDir = targetDir
  await fs.remove(repositoryDir)
  await fs.mkdir(repositoryDir, { recursive: true })
  await git.init({
    defaultBranch: "main",
    dir: repositoryDir,
    fs,
  })

  // Generate LICENCE.md file.
  const licenceRepositoryRelativeFilePath = "LICENCE.md"
  await writeTextFileIfChanged(
    path.join(repositoryDir, licenceRepositoryRelativeFilePath),
    licence,
  )
  await git.add({
    dir: repositoryDir,
    filepath: licenceRepositoryRelativeFilePath,
    fs,
  })

  // First commit of repository
  await git.commit({
    dir: targetDir,
    fs,
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
  })

  let future = false
  for (const [date, consolidatedIdsByActionByModifyingTextId] of Object.entries(
    context.consolidatedIdsByActionByModifyingTextIdByDate,
  ).toSorted(([date1], [date2]) => date1.localeCompare(date2))) {
    console.log(date)
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
      console.log(`  ${modifyingTextId} ${modifyingTextTitle}`)
      const consolidatedIdsByAction =
        consolidatedIdsByActionByModifyingTextId[modifyingTextId]
      if (consolidatedIdsByAction.DELETE !== undefined) {
        console.log(
          `    DELETE: ${[...consolidatedIdsByAction.DELETE].toSorted().join(", ")}`,
        )
      }
      if (consolidatedIdsByAction.CREATE !== undefined) {
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
      const changedFilesCount = await generateTextGit(
        context,
        1,
        tree,
        consolidatedTexteVersion as LegiTexteVersion,
        modifyingTextId,
      )

      const t3 = performance.now()
      if (changedFilesCount > 0) {
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
            dir: targetDir,
            fs,
            ref: "futur",
          })
          future = true
        }
        await git.commit({
          dir: targetDir,
          fs,
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
          ref: future ? "refs/heads/futur" : undefined,
        })
      }
      if (modifyingTextIndex === modifyingTexteVersionArray.length - 1) {
        await git.tag({
          dir: targetDir,
          fs,
          ref:
            date === "2222-02-22"
              ? "différé" // mise en vigueur différée à une date non précisée
              : date,
        })
      }

      const t4 = performance.now()
      console.log(`Durations: ${t1 - t0} ${t2 - t1} ${t3 - t2} ${t4 - t3}`)
    }
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
  parentRepositoryRelativeDir: string,
  modifyingTextId: string,
  obsoleteRepositoryRelativeFilesPaths: Set<string>,
): Promise<number> {
  const sectionTaDirName = sectionTaNode.slug
  const repositoryRelativeDir = path.join(
    parentRepositoryRelativeDir,
    sectionTaDirName,
  )
  await fs.ensureDir(path.join(context.targetDir, repositoryRelativeDir))

  const articlesGitGeneration = await generateArticlesGit(
    context,
    sectionTaNode.articles,
    repositoryRelativeDir,
    obsoleteRepositoryRelativeFilesPaths,
  )
  let { changedFilesCount } = articlesGitGeneration
  const { readmeLinks } = articlesGitGeneration

  if (sectionTaNode.children !== undefined) {
    for (const child of sectionTaNode.children) {
      const sectionTa = (await getOrLoadSectionTa(
        context,
        child.id,
      )) as LegiSectionTa
      const sectionTaDirName = child.slug
      readmeLinks.push({ href: sectionTaDirName, title: child.title })

      changedFilesCount += await generateSectionTaGit(
        context,
        depth + 1,
        child,
        sectionTa,
        repositoryRelativeDir,
        modifyingTextId,
        obsoleteRepositoryRelativeFilesPaths,
      )
    }
  }

  const readmeRepositoryRelativeFilePath = path.join(
    repositoryRelativeDir,
    "README.md",
  )
  const fileChanged = await writeTextFileIfChanged(
    path.join(context.targetDir, readmeRepositoryRelativeFilePath),
    dedent`
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

      ${"#".repeat(Math.min(depth, 6))} ${sectionTaNode.title}

      ${readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n")}
    ` + "\n",
  )
  if (fileChanged) {
    await git.add({
      dir: context.targetDir,
      filepath: readmeRepositoryRelativeFilePath,
      fs,
    })
    changedFilesCount++
  }
  obsoleteRepositoryRelativeFilesPaths.delete(readmeRepositoryRelativeFilePath)

  return changedFilesCount
}

async function generateTextGit(
  context: Context,
  depth: number,
  tree: TextelrNode,
  texteVersion: LegiTexteVersion,
  modifyingTextId: string,
): Promise<number> {
  const texteTitle = (
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
    texteVersion.META.META_COMMUN.ID
  )
    .replace(/\s+/g, " ")
    .trim()
  const repositoryDir = context.targetDir
  await fs.ensureDir(repositoryDir)
  const obsoleteRepositoryRelativeFilesPaths = new Set(
    walkDir(repositoryDir).map((repositoryRelativeFileSplitPath) =>
      path.join(...repositoryRelativeFileSplitPath),
    ),
  )
  obsoleteRepositoryRelativeFilesPaths.delete("LICENCE.md")

  const articlesGitGeneration = await generateArticlesGit(
    context,
    tree.articles,
    "",
    obsoleteRepositoryRelativeFilesPaths,
  )
  let { changedFilesCount } = articlesGitGeneration
  const { readmeLinks } = articlesGitGeneration

  if (tree.children !== undefined) {
    for (const child of tree.children) {
      const sectionTa = (await getOrLoadSectionTa(
        context,
        child.id,
      )) as LegiSectionTa
      const sectionTaDirName = child.slug
      readmeLinks.push({ href: sectionTaDirName, title: child.title })

      changedFilesCount += await generateSectionTaGit(
        context,
        depth + 1,
        child,
        sectionTa,
        "",
        modifyingTextId,
        obsoleteRepositoryRelativeFilesPaths,
      )
    }
  }

  const readmeBlocks = [
    `${"#".repeat(Math.min(depth, 6))} ${texteTitle}`,
    dedent`
      **Avertissement** : Ce document fait partie du projet [Tricoteuses](https://tricoteuses.fr/)
      de conversion à git des textes juridiques consolidés français.
      **Il peut contenir des erreurs !**
    `,
    await cleanHtmlFragment(texteVersion.VISAS?.CONTENU),
    readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n"),
    await cleanHtmlFragment(texteVersion.SIGNATAIRES?.CONTENU),
  ].filter((block) => block != null)
  const readmeRepositoryRelativeFilePath = "README.md"

  const fileChanged = await writeTextFileIfChanged(
    path.join(repositoryDir, readmeRepositoryRelativeFilePath),
    dedent`
    ---
    ${[
      ["État", texteVersion.META.META_SPEC.META_TEXTE_VERSION.ETAT],
      ["Nature", texteVersion.META.META_COMMUN.NATURE],
      [
        "Date de début",
        texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT,
      ],
      ["Date de fin", texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_FIN],
      ["Identifiant", texteVersion.META.META_COMMUN.ID],
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
  ` + "\n",
  )
  if (fileChanged) {
    await git.add({
      dir: repositoryDir,
      filepath: readmeRepositoryRelativeFilePath,
      fs,
    })
    changedFilesCount++
  }
  obsoleteRepositoryRelativeFilesPaths.delete(readmeRepositoryRelativeFilePath)

  // Delete obsolete files and directories.
  for (const obsoleteRepositoryRelativeFilePath of obsoleteRepositoryRelativeFilesPaths) {
    await fs.remove(
      path.join(repositoryDir, obsoleteRepositoryRelativeFilePath),
    )
    await git.remove({
      dir: repositoryDir,
      filepath: obsoleteRepositoryRelativeFilePath,
      fs,
    })
    changedFilesCount++
    if (
      obsoleteRepositoryRelativeFilePath === "README.md" ||
      obsoleteRepositoryRelativeFilePath.endsWith("/README.md")
    ) {
      await fs.remove(
        path.dirname(
          path.join(repositoryDir, obsoleteRepositoryRelativeFilePath),
        ),
      )
    }
  }

  return changedFilesCount
}
