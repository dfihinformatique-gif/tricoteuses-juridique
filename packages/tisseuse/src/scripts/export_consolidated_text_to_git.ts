import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import git from "isomorphic-git"
import path from "path"
import * as prettier from "prettier"
import sade from "sade"

import type {
  JorfArticle,
  JorfArticleTm,
  JorfSectionTa,
  JorfSectionTaLienArt,
  JorfSectionTaLienSectionTa,
  JorfSectionTaStructure,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleMetaArticle,
  LegiArticleTm,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTextelrLienArt,
  LegiTexteVersion,
} from "$lib/legal/legi"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"
import { db } from "$lib/server/databases"
import { slugify } from "$lib/strings"
import { walkDir } from "$lib/server/file_systems"
import { sortArticlesNumbers } from "$lib/articles"

type Action = (typeof actions)[number]

interface ArticleCache {
  id: string
  markdown: string
  repositoryRelativeFilePath: string
}

interface Context {
  articleById: Record<string, JorfArticle | LegiArticle>
  articleCacheByNumber: Record<string, ArticleCache>
  consolidatedIdsByActionByModifyingTextIdByDate: Record<
    string,
    Record<string, Partial<Record<Action, Set<string>>>>
  >
  consolidatedTextCid: string
  consolidatedTextInternalIds: Set<string>
  consolidatedTextModifyingTextsIdsByActionByPublicationDate: Record<
    string,
    Partial<Record<Action, Set<string>>>
  >
  // Current content of a text at a given date
  currentInternalIds: Set<string>
  hasModifyingTextIdByActionByConsolidatedArticleId: Record<
    string,
    Partial<Record<Action, boolean>>
  >
  // When a LEGI article, sectionTa or text has been created by the same JORF
  // article, sectionIa or text, ID of this JORF object
  jorfCreatorIdByConsolidatedId: Record<string, string>
  modifyingArticleIdByActionByConsolidatedId: Record<
    string,
    Partial<Record<Action, string>>
  >
  modifyingTextsIdsByArticleActionDate: Record<string, Set<string>>
  sectionTaById: Record<string, LegiSectionTa>
  targetDir: string
  texteManquantById: Record<string, TexteManquant>
  textelrById: Record<string, JorfTextelr | LegiTextelr | null>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion | null>
}

interface NodeBase {
  articles?: Array<JorfArticle | LegiArticle>
  children?: SectionTaNode[]
}

interface SectionTaNode extends NodeBase {
  endDate: string
  id: string
  slug: string
  startDate: string
  title: string
}

type TextelrNode = NodeBase

interface TexteManquant {
  publicationDate: string
}

const actions = ["CREATE", "DELETE"] as const
const minDateObject = new Date("1971-01-01")
const minDateTimestamp = Math.floor(minDateObject.getTime() / 1000)
const oneDay = 24 * 60 * 60 // hours * minutes * seconds

async function addArticleToTree(
  context: Context,
  tree: TextelrNode,
  publicationDate: string,
  article: JorfArticle | LegiArticle,
): Promise<void> {
  await addArticleToTreeNode(
    context,
    tree,
    publicationDate,
    article.CONTEXTE.TEXTE.TM,
    article,
  )
}

async function addArticleToTreeNode(
  context: Context,
  node: SectionTaNode | TextelrNode,
  publicationDate: string,
  tm: JorfArticleTm | LegiArticleTm | undefined,
  article: JorfArticle | LegiArticle,
): Promise<void> {
  const metaArticle = article.META.META_SPEC.META_ARTICLE
  if (tm === undefined) {
    // Article is directly in textelr.
    const articles = (node.articles ??= [])
    articles.push(article)
  } else {
    const articleNumber = metaArticle.NUM ?? ""
    const initialTextJorfId = article.CONTEXTE.TEXTE["@cid"]
    let foundTitreTm:
      | {
          "#text"?: string
          "@debut": string
          "@fin": string
          "@id": string
        }
      | undefined = undefined
    if (initialTextJorfId === "JORFTEXT000000571356") {
      // Constitution du 4 octobre 1958
      if (
        publicationDate >= "1992-06-26" &&
        publicationDate < "1993-07-28" &&
        articleNumber >= "88-1" &&
        articleNumber <= "88-4"
      ) {
        foundTitreTm = {
          "@id": "LEGISCTA000006095836",
          "@debut": "1992-06-26",
          "@fin": "1993-07-28",
          "#text":
            "Titre XIV : Des Communautés européennes et de l'Union européenne.",
        }
      } else if (
        publicationDate >= "1993-07-28" &&
        publicationDate < "2008-02-05" &&
        articleNumber >= "88-1" &&
        articleNumber <= "88-7"
      ) {
        foundTitreTm = {
          "@id": "LEGISCTA000006095837",
          "@debut": "1993-07-28",
          "@fin": "2008-02-06",
          "#text":
            "Titre XV : Des Communautés européennes et de l'Union européenne",
        }
      } else if (
        publicationDate >= "2008-02-05" &&
        publicationDate < "2999-01-01" &&
        articleNumber >= "88-1" &&
        articleNumber <= "88-7"
      ) {
        foundTitreTm = {
          "@id": "LEGISCTA000006095838",
          "@debut": "2008-02-05",
          "@fin": "2999-01-01",
          "#text": "Titre XV : De l'Union européenne",
        }
      }
    }
    if (foundTitreTm === undefined) {
      const startDate =
        metaArticle.DATE_DEBUT > publicationDate
          ? metaArticle.DATE_DEBUT
          : publicationDate
      if (Array.isArray(tm.TITRE_TM)) {
        // LegiArticleTm
        const sortedTitreTmArray = tm.TITRE_TM.toSorted((titreTm1, titreTm2) =>
          titreTm1["@debut"].localeCompare(titreTm2["@debut"]),
        )
        if (startDate < sortedTitreTmArray[0]["@debut"]) {
          // Assume that the @debut of the first TITRE_TM is wrong.
          foundTitreTm = sortedTitreTmArray[0]
        } else if (startDate >= sortedTitreTmArray.at(-1)!["@fin"]) {
          // Assume that the @fin of the last TITRE_TM is wrong.
          foundTitreTm = sortedTitreTmArray.at(-1)!
        } else {
          foundTitreTm = sortedTitreTmArray.find(
            (titreTm) => startDate < titreTm["@fin"],
          )!
        }
      } else {
        // JorfArticleTm
        foundTitreTm = tm.TITRE_TM
      }
    }
    const sectionTaTitle =
      foundTitreTm["#text"] ?? `Section sans titre ${foundTitreTm["@id"]}`
    let sectionTaSlug = slugify(sectionTaTitle.split(":")[0].trim(), "_")
    if (sectionTaSlug.length > 255) {
      sectionTaSlug = sectionTaSlug.slice(0, 254)
      if (sectionTaSlug.at(-1) !== "_") {
        sectionTaSlug += "_"
      }
    }

    const children = (node.children ??= [])
    const sameSlugChild = children.find((child) => child.slug === sectionTaSlug)
    let newChild: SectionTaNode | undefined = undefined
    if (sameSlugChild === undefined) {
      newChild = {
        endDate: foundTitreTm["@fin"],
        slug: sectionTaSlug,
        id: foundTitreTm["@id"],
        startDate: foundTitreTm["@debut"],
        title: sectionTaTitle,
      }
      children.push(newChild)
      addArticleToTreeNode(context, newChild, publicationDate, tm.TM, article)
    } else {
      // If the node has 2 children with the same slug, but different ids.
      // Keep the child whose dates are nearer the publication date.
      if (
        foundTitreTm["@id"] !== sameSlugChild.id &&
        ((sameSlugChild.startDate < foundTitreTm["@debut"] &&
          foundTitreTm["@debut"] <= publicationDate) ||
          (sameSlugChild.startDate > foundTitreTm["@debut"] &&
            sameSlugChild.startDate > publicationDate))
      ) {
        sameSlugChild.endDate = foundTitreTm["@fin"]
        sameSlugChild.id = foundTitreTm["@id"]
        sameSlugChild.startDate = foundTitreTm["@debut"]
        sameSlugChild.title = sectionTaTitle
      }
      addArticleToTreeNode(
        context,
        sameSlugChild,
        publicationDate,
        tm.TM,
        article,
      )
    }
  }
}

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
    throw new Error(`Article without number: ${articleId}`)
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

async function addModifyingArticleId(
  context: Context,
  modifyingArticleId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const modifyingArticle = await getOrLoadArticle(context, modifyingArticleId)
  const modifyingArticlePublicationDate =
    modifyingArticle.CONTEXTE.TEXTE["@date_publi"]
  if (modifyingArticlePublicationDate === undefined) {
    throw new Error(
      `Modifying article ${modifyingArticleId} of ${modifiedId} has no CONTEXTE.TEXTE["@date_publi"]`,
    )
  }
  // if (
  //   action === "CREATE" &&
  //   modifyingArticlePublicationDate !== "2999-01-01" &&
  //   modifyingArticlePublicationDate > modifiedDateDebut
  // ) {
  //   console.warn(
  //     `Ignoring creating article ${modifyingArticleId} because its publication date ${modifyingArticlePublicationDate} doesn't match start date ${modifiedDateDebut} of ${modifiedId}`,
  //   )
  //   return
  // }
  // if (
  //   action === "DELETE" &&
  //   modifyingArticlePublicationDate !== "2999-01-01" &&
  //   modifyingArticlePublicationDate > modifiedDateFin
  // ) {
  //   console.warn(
  //     `Ignoring deleting article ${modifyingArticleId} because its publication date ${modifyingArticlePublicationDate} doesn't match end date ${modifiedDateFin} of ${modifiedId}`,
  //   )
  //   return
  // }

  if (modifiedId.startsWith("LEGITEXT")) {
    // A consolidated text doesn't change. Only its content changes.
  } else {
    const modifyingArticleIdByAction =
      (context.modifyingArticleIdByActionByConsolidatedId[modifiedId] ??= {})
    const existingModifyingArticleId = modifyingArticleIdByAction[action]
    if (existingModifyingArticleId === undefined) {
      modifyingArticleIdByAction[action] = modifyingArticleId
    } else if (existingModifyingArticleId !== modifyingArticleId) {
      const existingModifyingArticle = await getOrLoadArticle(
        context,
        existingModifyingArticleId,
      )
      if (
        existingModifyingArticle.CONTEXTE.TEXTE["@date_publi"]! <
        modifyingArticlePublicationDate
      ) {
        modifyingArticleIdByAction[action] = modifyingArticleId
      }
    }
  }

  const modifyingTextId = modifyingArticle.CONTEXTE.TEXTE["@cid"]
  if (modifyingTextId !== undefined) {
    await addModifyingTextId(
      context,
      modifyingTextId,
      action,
      modifiedId,
      modifiedDateDebut,
      modifiedDateFin,
    )
  }
}

async function addModifyingTextId(
  context: Context,
  modifyingTextId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const modifyingTexteVersion = await getOrLoadTexteVersion(
    context,
    modifyingTextId,
  )
  if (modifyingTexteVersion === null) {
    return
  }
  const modifyingTextPublicationDate =
    modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI
  if (modifyingTextPublicationDate === undefined) {
    throw new Error(
      `Modifying text ${modifyingTextId} of ${modifiedId} has no META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI`,
    )
  }

  if (modifiedId.startsWith("JORFTEXT") || modifiedId.startsWith("LEGITEXT")) {
    // A consolidated text doesn't change. Only its content changes.
    const publicationDate =
      modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI
    const consolidatedTextModifyingTextsIdsByAction =
      (context.consolidatedTextModifyingTextsIdsByActionByPublicationDate[
        publicationDate
      ] ??= {})
    const consolidatedTextModifyingTextsIds =
      (consolidatedTextModifyingTextsIdsByAction[action] ??= new Set())
    consolidatedTextModifyingTextsIds.add(modifyingTextId)
  } else {
    // Modified object is an article.
    if (action === "CREATE" && modifiedDateDebut !== "2999-01-01") {
      ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
        modifiedDateDebut
      ] ??= {})[modifyingTextId] ??= {}).CREATE ??= new Set()).add(modifiedId)
      ;(context.hasModifyingTextIdByActionByConsolidatedArticleId[
        modifiedId
      ] ??= {}).CREATE = true
      ;(context.modifyingTextsIdsByArticleActionDate[modifiedDateDebut] ??=
        new Set()).add(modifyingTextId)
    } else if (action === "DELETE" && modifiedDateFin !== "2999-01-01") {
      ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
        modifiedDateFin
      ] ??= {})[modifyingTextId] ??= {}).DELETE ??= new Set()).add(modifiedId)
      ;(context.hasModifyingTextIdByActionByConsolidatedArticleId[
        modifiedId
      ] ??= {}).DELETE = true
      ;(context.modifyingTextsIdsByArticleActionDate[modifiedDateFin] ??=
        new Set()).add(modifyingTextId)
    }
  }
}

async function cleanHtmlFragment(
  fragment: string | undefined,
): Promise<string | undefined> {
  try {
    return fragment === undefined
      ? undefined
      : await prettier.format(
          fragment
            .replaceAll("<<", "«")
            .replaceAll(">>", "»")
            .replace(/<p>(.*?)<\/p>/gs, "$1<br />\n\n")
            .replace(/\s*(<br\s*\/>\s*)+/gs, "<br />\n\n")
            .replace(/^\s*(<br\s*\/>\s*)+/gs, "")
            .replace(/\s*(<br\s*\/>\s*)+$/gs, "")
            .trim(),
          {
            parser: "html",
          },
        )
  } catch (e) {
    console.trace(`Cleanup of following text failed:\n${fragment}`)
    console.error(e)
    return fragment
  }
}

async function exportConsolidatedTextToGit(
  consolidatedTextId: string,
  targetDir: string,
): Promise<void> {
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
    for await (const jorfCreatorLienArticle of walkTextelrLiensArticles(
      context,
      jorfCreatorTextelr,
    )) {
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

  for await (const lienArticle of walkTextelrLiensArticles(
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
    consolidatedTextelr,
    consolidatedTexteVersion,
  )

  for await (const lienArticle of walkTextelrLiensArticles(
    context,
    consolidatedTextelr,
  )) {
    const article = (await getOrLoadArticle(
      context,
      lienArticle["@id"],
    )) as LegiArticle
    await registerLegiArticleModifiers(context, article)
  }

  // Associate modified articles without modifying text with a modifying text that modified other articles at the same date.
  for await (const lienArticle of walkTextelrLiensArticles(
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
    dedent`
    # Textes juridiques consolidés français sous Git

    **Avertissement** : Ce projet est en cours de développement.
    **Il peut contenir des erreurs** ! En cas de doute, nous vous invitons
    à vous référer au site [Légifrance](https://www.legifrance.gouv.fr/).

    ## Licence

    Ce dépôt est constitué d'éléments provenant du projet
    [Tricoteuses](https://git.tricoteuses.fr/)
    et de données ouvertes (Open Data) mises à disposition sur le site Légifrance.

    ### Conditions de réutilisation des données originales du site Légifrance

    Les données originales sont produites par la
    [Direction de l'information légale et administrative
    (Dila)](https://dila.premier-ministre.gouv.fr/).
    Elles sont réutilisables gratuitement sous
    [licence ouverte v2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

    Les réutilisateurs s'obligent à mentionner :

    - la paternité des données (DILA) ;

    - les URL d'accès longues de téléchargement :

      - https://echanges.dila.gouv.fr/OPENDATA/JORF/
      - https://echanges.dila.gouv.fr/OPENDATA/LEGI/

    - le nom du fichier téléchargé ainsi que la date du fichier :
      dernières versions des fichiers des répertoires énumérés ci-dessus.

    Plus d'informations sur les données, provenant du site de la Dila :

    - https://echanges.dila.gouv.fr/OPENDATA/JORF/DILA_JORF_Presentation_20170824.pdf
    - https://echanges.dila.gouv.fr/OPENDATA/LEGI/DILA_LEGI_Presentation_20170824.pdf

    ### Éléments propres au projet Tricoteuses

    Les élements propres au projet Tricoteuses sont placés sous licence
    [CC-BY-SA-4.0](https://www.creativecommons.org/licenses/by-sa/4.0/deed.fr)

    ## Avertissement — Données à caractère personnel

    Dans le cadre de leurs missions de service public, les administrations
    produisent ou reçoivent des informations publiques qui peuvent être
    réutilisées par toute personne physique ou morale à d'autres fins que celles
    de la mission de service public.

    Lorsque ces informations contiennent des données à caractère personnel,
    c'est-à-dire des éléments qui permettent d'identifier, directement ou
    indirectement, une personne physique, leur réutilisation est étroitement
    encadrée par l'article L322-2 du code des relations entre le public et
    l'administration.

    Cet article prévoit que la réutilisation d'une information publique contenant
    des données à caractère personnel est subordonnée au respect de la loi n°
    78-17 du 6 janvier 1978, dite « Informatique et libertés ». Il en résulte
    notamment que lorsque les données personnelles que cette information
    publique contient ont, préalablement à leur diffusion, fait l'objet d'une
    anonymisation totale ou partielle, conformément à des dispositions légales ou
    aux recommandations de la Commission nationale de l'informatique et des
    libertés (CNIL), la réutilisation ne peut avoir pour objet ou pour effet de
    réidentifier les personnes concernées.
  ` + "\n",
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
        for await (const lienArticle of walkTextelrLiensArticles(
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
        })
      }
      if (modifyingTextIndex === modifyingTexteVersionArray.length - 1) {
        await git.tag({ dir: targetDir, fs, ref: date })
      }

      const t4 = performance.now()
      console.log(`Durations: ${t1 - t0} ${t2 - t1} ${t3 - t2} ${t4 - t3}`)
    }
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
      **Avertissement** : Ce document fait partie du projet [Tricoteuses](https://git.tricoteuses.fr/)
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

async function getOrLoadArticle(
  context: Context,
  articleId: string,
): Promise<JorfArticle | LegiArticle> {
  let article = context.articleById[articleId]
  if (article === undefined) {
    article = (
      await db<{ data: JorfArticle | LegiArticle }[]>`
        SELECT data FROM article WHERE id = ${articleId}
      `
    )[0]?.data
    assert.notStrictEqual(article, undefined)
    context.articleById[articleId] = article
  }
  return article
}

async function getOrLoadSectionTa(
  context: Context,
  sectionTaId: string,
): Promise<LegiSectionTa> {
  let sectionTa = context.sectionTaById[sectionTaId]
  if (sectionTa === undefined) {
    sectionTa = (
      await db<{ data: LegiSectionTa }[]>`
        SELECT data FROM section_ta WHERE id = ${sectionTaId}
      `
    )[0]?.data
    assert.notStrictEqual(sectionTa, undefined)
    context.sectionTaById[sectionTaId] = sectionTa
  }
  return sectionTa
}

async function getOrLoadTextelr(
  context: Context,
  texteId: string,
): Promise<JorfTextelr | LegiTextelr | null> {
  let textelr: JorfTextelr | LegiTextelr | null = context.textelrById[texteId]
  if (textelr === undefined) {
    textelr = (
      await db<{ data: JorfTextelr | LegiTextelr }[]>`
          SELECT data FROM textelr WHERE id = ${texteId}
        `
    )[0]?.data
    if (textelr === undefined) {
      console.warn(`Texte ${texteId} not found in table textelr`)
      textelr = null
    }
    context.textelrById[texteId] = textelr
  }
  return textelr
}

async function getOrLoadTexteVersion(
  context: Context,
  texteId: string,
): Promise<JorfTexteVersion | LegiTexteVersion | null> {
  let texteVersion: JorfTexteVersion | LegiTexteVersion | null =
    context.texteVersionById[texteId]
  if (texteVersion === undefined) {
    texteVersion = (
      await db<{ data: JorfTexteVersion | LegiTexteVersion }[]>`
          SELECT data FROM texte_version WHERE id = ${texteId}
        `
    )[0]?.data
    if (texteVersion === undefined) {
      console.warn(`Texte ${texteId} not found in table texte_version`)
      texteVersion = null
    }
    context.texteVersionById[texteId] = texteVersion
  }
  return texteVersion
}

async function registerLegiArticleModifiers(
  context: Context,
  article: LegiArticle,
): Promise<void> {
  const articleId = article.META.META_COMMUN.ID
  const articleIds = [
    articleId,
    context.jorfCreatorIdByConsolidatedId[articleId],
  ].filter((id) => id !== undefined)
  const articleMeta = article.META
  const metaArticle = articleMeta.META_SPEC.META_ARTICLE
  const articleDateDebut = metaArticle.DATE_DEBUT
  const articleDateFin = metaArticle.DATE_FIN
  // console.log(
  //   `${articleMeta.META_COMMUN.ID} ${"  ".repeat(depth)}Article ${metaArticle.NUM} (${articleDateDebut} — ${articleDateFin === "2999-01-01" ? "…" : articleDateFin}, ${metaArticle.ETAT})`,
  // )

  // if (jorfCreatorId !== undefined) {
  //   await addModifyingArticleId(
  //     context,
  //     jorfCreatorId,
  //     "CREATE",
  //     articleId,
  //     articleDateDebut,
  //     articleDateFin,
  //   )
  //   // Delete another version of the same article that existed before the newly created one.
  //   for (const articleVersion of article.VERSIONS.VERSION) {
  //     if (articleVersion.LIEN_ART["@id"] === articleId) {
  //       continue
  //     }
  //     if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
  //       await addModifyingArticleId(
  //         context,
  //         jorfCreatorId,
  //         "DELETE",
  //         articleVersion.LIEN_ART["@id"],
  //         articleVersion.LIEN_ART["@debut"],
  //         articleVersion.LIEN_ART["@fin"],
  //       )
  //     }
  //   }
  // }

  for (const articleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(articleIds)}
  `) {
    if (articleLien.article_id in context.consolidatedTextInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    // console.log(
    //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
    // )
    assert.strictEqual(articleLien.cidtexte, context.consolidatedTextCid)
    assert(articleLien.article_id.startsWith("LEGIARTI"))
    if (
      (articleLien.typelien === "ABROGATION" && articleLien.cible) ||
      (articleLien.typelien === "ABROGE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && !articleLien.cible) ||
      (articleLien.typelien === "DISJONCTION" && articleLien.cible) ||
      (articleLien.typelien === "PERIME" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERE" && !articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      articleLien.typelien === "CITATION" ||
      (articleLien.typelien === "HISTO" && articleLien.cible) ||
      (articleLien.typelien === "PEREMPTION" && articleLien.cible) ||
      (articleLien.typelien === "PILOTE_SUIVEUR" && !articleLien.cible) ||
      (articleLien.typelien === "SPEC_APPLI" && articleLien.cible) ||
      articleLien.typelien === "TXT_ASSOCIE" ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible) ||
      (articleLien.typelien === "CREATION" && articleLien.cible) ||
      (articleLien.typelien === "CREE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACEMENT" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "MODIFIE" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERT" && articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingArticleId(
            context,
            articleLien.article_id,
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      (articleLien.typelien === "CREATION" && !articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && !articleLien.cible)
    ) {
      // It seems to be errors.
      // Ignore link.
    } else {
      throw new Error(
        `Unexpected article_lien to article ${articleLien.id}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(articleIds)}
  `) {
    if (
      texteVersionLien.texte_version_id in context.consolidatedTextInternalIds
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    // console.log(
    //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    // )
    assert.strictEqual(texteVersionLien.cidtexte, context.consolidatedTextCid)
    assert(
      texteVersionLien.texte_version_id.startsWith("JORFTEXT") ||
        texteVersionLien.texte_version_id.startsWith("LEGITEXT"),
    )
    if (
      (texteVersionLien.typelien === "ABROGATION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "ANNULATION" && texteVersionLien.cible)
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      (texteVersionLien.typelien === "APPLICATION" &&
        !texteVersionLien.cible) ||
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "HISTO" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "PEREMPTION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "SPEC_APPLI" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_ASSOCIE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      (texteVersionLien.typelien === "CODIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CONCORDANCE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CREATION" && texteVersionLien.cible) ||
      // LEGIARTI000006527461 has an example of MODIFICATION with !cible
      texteVersionLien.typelien === "MODIFICATION" ||
      (texteVersionLien.typelien === "MODIFIE" && !texteVersionLien.cible) ||
      (texteVersionLien.typelien === "RECTIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TRANSFERT" && texteVersionLien.cible)
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingTextId(
            context,
            texteVersionLien.texte_version_id,
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected texte_version_lien to article ${texteVersionLien.id}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  const articleLiens = article.LIENS?.LIEN
  // Note: The (eventual) JORF version of article (with ID === context.jorfCreatorIdByConsolidatedId[articleId]]) never has LIENS.
  // => It is skipped.
  if (articleLiens !== undefined) {
    for (const articleLien of articleLiens) {
      if (articleLien["@cidtexte"] === undefined) {
        // Ignore link because it has no potential modifying text.
        continue
      }
      if (articleLien["@id"]! in context.consolidatedTextInternalIds) {
        // Ignore internal links because a LEGI texte can't modify itself.
        continue
      }

      // console.log(
      //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${articleLien["@sens"]} typelien: ${articleLien["@typelien"]} ${articleLien["@cidtexte"]} ${articleLien["@id"]}${articleLien["@nortexte"] === undefined ? "" : ` ${articleLien["@nortexte"]}`}${articleLien["@num"] === undefined ? "" : ` ${articleLien["@num"]}`} ${articleLien["@naturetexte"]} du ${articleLien["@datesignatexte"]} : ${articleLien["#text"]}`,
      // )
      if (
        (articleLien["@typelien"] === "ABROGATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "ABROGE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "ANNULATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DISJONCTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PERIME" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "TRANSFERE" &&
          articleLien["@sens"] === "cible")
      ) {
        await addModifyingTextId(
          context,
          articleLien["@cidtexte"],
          "DELETE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
      } else if (
        articleLien["@typelien"] === "CITATION" ||
        (articleLien["@typelien"] === "HISTO" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PEREMPTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PILOTE_SUIVEUR" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "SPEC_APPLI" &&
          articleLien["@sens"] === "source") ||
        articleLien["@typelien"] === "TXT_ASSOCIE" ||
        articleLien["@typelien"] === "TXT_SOURCE"
      ) {
        // Ignore link.
      } else if (
        (articleLien["@typelien"] === "CODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CREATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CREE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACEMENT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFIE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "RECTIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "TRANSFERT" &&
          articleLien["@sens"] === "source")
      ) {
        await addModifyingTextId(
          context,
          articleLien["@cidtexte"],
          "CREATE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
        // Delete another version of the same article that existed before the newly created one.
        for (const articleVersion of article.VERSIONS.VERSION) {
          if (articleVersion.LIEN_ART["@id"] === articleId) {
            continue
          }
          if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
            await addModifyingTextId(
              context,
              articleLien["@cidtexte"],
              "DELETE",
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@debut"],
              articleVersion.LIEN_ART["@fin"],
            )
          }
        }
      } else if (
        articleLien["@typelien"] === "CREATION" &&
        articleLien["@sens"] === "cible"
      ) {
        // It seems to be an error.
        // Ignore link.
      } else {
        throw new Error(
          `Unexpected LIEN in article ${articleId}: @typelien=${articleLien["@typelien"]}, @sens=${articleLien["@sens"]}`,
        )
      }
    }
  }

  if (article.CONTEXTE.TEXTE["@cid"]?.startsWith("JORFTEXT")) {
    if (articleDateDebut === article.CONTEXTE.TEXTE["@date_publi"]) {
      // If article belongs directly to a text published in JORF at the same date, then this JORF text is its creating text.
      await addModifyingTextId(
        context,
        article.CONTEXTE.TEXTE["@cid"],
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingTextId(
            context,
            article.CONTEXTE.TEXTE["@cid"],
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else {
      // If article belongs directly to a text published in JORF but at a later date than the JORF text,
      // then if article has no creating text, consider that it has been created by a modifying text having the same start
      // date as the article when such a text exists.
      const hasModifyingTextIdByAction =
        (context.hasModifyingTextIdByActionByConsolidatedArticleId[
          articleId
        ] ??= {})
      if (!hasModifyingTextIdByAction.CREATE) {
        const consolidatedTextModifyingTextsIds =
          context.consolidatedTextModifyingTextsIdsByActionByPublicationDate[
            articleDateDebut
          ]?.CREATE
        if (consolidatedTextModifyingTextsIds !== undefined) {
          if (consolidatedTextModifyingTextsIds.size === 1) {
            const modifyingTextId = [...consolidatedTextModifyingTextsIds][0]
            await addModifyingTextId(
              context,
              modifyingTextId,
              "CREATE",
              articleId,
              articleDateDebut,
              articleDateFin,
            )
            // Delete another version of the same article that existed before the newly created one.
            for (const articleVersion of article.VERSIONS.VERSION) {
              if (articleVersion.LIEN_ART["@id"] === articleId) {
                continue
              }
              if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
                await addModifyingTextId(
                  context,
                  modifyingTextId,
                  "DELETE",
                  articleVersion.LIEN_ART["@id"],
                  articleVersion.LIEN_ART["@debut"],
                  articleVersion.LIEN_ART["@fin"],
                )
              }
            }
          } else {
            console.log(
              `Can't attach modifying article ${articleId} to a modifying text`,
              `because there are several possibilities at the date ${articleDateDebut}:`,
              `${[...consolidatedTextModifyingTextsIds].join(", ")}`,
            )
          }
        }
      }
    }
  }

  // If article still has no creating/deleting text, then do nothing yet.
  // Another tentative to associate with modifying texts is done later.
}

async function registerLegiTextModifiers(
  context: Context,
  textelr: LegiTextelr,
  texteVersion: LegiTexteVersion,
): Promise<void> {
  const legiTextId = texteVersion.META.META_COMMUN.ID
  const textIds = [
    legiTextId,
    context.jorfCreatorIdByConsolidatedId[legiTextId],
  ].filter((id) => id !== undefined)
  const texteVersionMeta = texteVersion.META
  const texteVersionDateDebut =
    texteVersionMeta.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT
  const texteVersionDateFin =
    texteVersionMeta.META_SPEC.META_TEXTE_VERSION.DATE_FIN
  // console.log(
  //   `${legiTextId} ${"  ".repeat(depth)} ${(texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITREFULL ?? texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITRE ?? texteVersionMeta.META_COMMUN.ID).replace(/\s+/g, " ").trim()}`,
  // )

  for (const articleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(textIds)}
  `) {
    if (articleLien.article_id in context.consolidatedTextInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    // console.log(
    //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
    // )
    assert.strictEqual(articleLien.cidtexte, context.consolidatedTextCid)
    if (articleLien.typelien === "ABROGATION" && articleLien.cible) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "DELETE",
        legiTextId,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
    } else if (
      articleLien.typelien === "CITATION" ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CONCORDANCE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "CREATE",
        legiTextId,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
      // Delete another version of the same text that existed before the newly created one.
      for (const version of textelr.VERSIONS.VERSION) {
        if (version.LIEN_TXT["@id"] === legiTextId) {
          continue
        }
        if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
          await addModifyingArticleId(
            context,
            articleLien.article_id,
            "DELETE",
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected article_lien to text ${articleLien.id}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(textIds)}
  `) {
    if (
      texteVersionLien.texte_version_id in context.consolidatedTextInternalIds
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    // console.log(
    //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    // )
    assert.strictEqual(texteVersionLien.cidtexte, context.consolidatedTextCid)
    // if () {
    //   await addModifyingTextId(
    //     context,
    //     texteVersionLien.texte_version_id,
    //     "DELETE",
    //     legiTextId,
    //     texteVersionDateDebut ?? "2999-01-01",
    //     texteVersionDateFin ?? "2999-01-01",
    //   )
    // } else
    if (
      (texteVersionLien.typelien === "APPLICATION" &&
        !texteVersionLien.cible) ||
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      texteVersionLien.typelien === "MODIFIE" &&
      !texteVersionLien.cible
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        legiTextId,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
      // Delete another version of the same text that existed before the newly created one.
      for (const version of textelr.VERSIONS.VERSION) {
        if (version.LIEN_TXT["@id"] === legiTextId) {
          continue
        }
        if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
          await addModifyingTextId(
            context,
            texteVersionLien.texte_version_id,
            "DELETE",
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected texte_version_lien to text ${texteVersionLien.id}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  for (const textId of textIds) {
    const texteVersion = await getOrLoadTexteVersion(context, textId)
    const texteVersionLiens =
      texteVersion?.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
    if (texteVersionLiens !== undefined) {
      for (const texteVersionLien of texteVersionLiens) {
        if (texteVersionLien["@cidtexte"] === undefined) {
          // Ignore link because it has no potential modifying text.
          continue
        }
        if (texteVersionLien["@id"]! in context.consolidatedTextInternalIds) {
          // Ignore internal links because a LEGI texte can't modify itself.
          continue
        }

        // console.log(
        //   `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${texteVersionLien["@sens"]} typelien: ${texteVersionLien["@typelien"]} ${texteVersionLien["@cidtexte"]} ${texteVersionLien["@id"]}${texteVersionLien["@nortexte"] === undefined ? "" : ` ${texteVersionLien["@nortexte"]}`}${texteVersionLien["@num"] === undefined ? "" : ` ${texteVersionLien["@num"]}`} ${texteVersionLien["@naturetexte"]} du ${texteVersionLien["@datesignatexte"]} : ${texteVersionLien["#text"]}`,
        // )
        // if () {
        //   await addModifyingTextId(
        //     context,
        //     texteVersionLien["@cidtexte"],
        //     "DELETE",
        //     legiTextId,
        //     texteVersionDateDebut ?? "2999-01-01",
        //     texteVersionDateFin ?? "2999-01-01",
        //   )
        // } else
        if (
          (texteVersionLien["@typelien"] === "APPLICATION" &&
            texteVersionLien["@sens"] === "cible") ||
          texteVersionLien["@typelien"] === "CITATION"
        ) {
          // Ignore link.
        } else if (
          (texteVersionLien["@typelien"] === "MODIFICATION" &&
            texteVersionLien["@sens"] === "source") ||
          (texteVersionLien["@typelien"] === "MODIFIE" &&
            texteVersionLien["@sens"] === "cible")
        ) {
          await addModifyingTextId(
            context,
            texteVersionLien["@cidtexte"],
            "CREATE",
            legiTextId,
            texteVersionDateDebut ?? "2999-01-01",
            texteVersionDateFin ?? "2999-01-01",
          )
          // Delete another version of the same text that existed before the newly created one.
          const textelr = (await getOrLoadTextelr(context, textId)) as
            | JorfTextelr
            | LegiTextelr
          assert.notStrictEqual(textelr, null)
          for (const version of textelr.VERSIONS.VERSION) {
            if (version.LIEN_TXT["@id"] === textId) {
              continue
            }
            if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
              await addModifyingTextId(
                context,
                texteVersionLien["@cidtexte"],
                "DELETE",
                version.LIEN_TXT["@id"],
                version.LIEN_TXT["@debut"],
                version.LIEN_TXT["@fin"],
              )
            }
          }
        } else {
          throw new Error(
            `Unexpected LIEN in text ${textId}: @typelien=${texteVersionLien["@typelien"]}, @sens=${texteVersionLien["@sens"]}`,
          )
        }
      }
    }
  }
}

async function* walkStructureTree(
  context: Context,
  structure: JorfSectionTaStructure | LegiSectionTaStructure,
  parentsSectionTa: LegiSectionTa[] = [],
): AsyncGenerator<
  {
    lienSectionTa: JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    liensSectionTa: Array<
      JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    >
    parentsSectionTa: Array<JorfSectionTa | LegiSectionTa>
    sectionTa: JorfSectionTa | LegiSectionTa
  },
  void
> {
  const liensSectionTa = structure?.LIEN_SECTION_TA
  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const childSectionTa = await getOrLoadSectionTa(
        context,
        lienSectionTa["@id"],
      )
      context.consolidatedTextInternalIds.add(lienSectionTa["@id"])
      yield {
        lienSectionTa,
        liensSectionTa,
        parentsSectionTa,
        sectionTa: childSectionTa,
      }
      const childStructure = childSectionTa.STRUCTURE_TA
      if (childStructure !== undefined) {
        yield* walkStructureTree(context, childStructure, [
          ...parentsSectionTa,
          childSectionTa,
        ])
      }
    }
  }
}

async function* walkTextelrLiensArticles(
  context: Context,
  textelr: JorfTextelr | LegiTextelr,
): AsyncGenerator<JorfSectionTaLienArt | LegiSectionTaLienArt> {
  const structure = textelr.STRUCT
  const liensArticles = structure?.LIEN_ART
  if (liensArticles !== undefined) {
    yield* liensArticles
  }
  for await (const { sectionTa } of walkStructureTree(
    context,
    structure as JorfSectionTaStructure | LegiSectionTaStructure,
  )) {
    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      yield* liensArticles
    }
  }
}

async function writeTextFileIfChanged(
  filePath: string,
  text: string,
): Promise<boolean> {
  if (await fs.pathExists(filePath)) {
    const existingText = await fs.readFile(filePath, { encoding: "utf-8" })
    if (text === existingText) {
      return false
    }
  }
  await fs.writeFile(filePath, text, { encoding: "utf-8" })
  return true
}

sade("export_consolidated_text_to_git <consolidatedTextId> <targetDir>", true)
  .describe(
    "Convert a consolidated LEGI texte (Constitution, code, law, etc) to a Git repository",
  )
  .action(async (consolidatedTextId, targetDir) => {
    await exportConsolidatedTextToGit(consolidatedTextId, targetDir)
    process.exit(0)
  })
  .parse(process.argv)
