import type { JorfArticle, JorfArticleTm } from "$lib/legal/jorf.js"
import type { LegiArticle, LegiArticleTm } from "$lib/legal/legi.js"
import { slugify } from "$lib/strings.js"

import type { Context } from "./contexts.js"

export interface NodeBase {
  articles?: Array<JorfArticle | LegiArticle>
  children?: SectionTaNode[]
}

export interface SectionTaNode extends NodeBase {
  endDate: string
  id: string
  slug: string
  startDate: string
  title: string
}

export type TextelrNode = NodeBase

export async function addArticleToTree(
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
    let foundTitreTm:
      | {
          "#text"?: string
          "@debut": string
          "@fin": string
          "@id": string
        }
      | undefined = undefined
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
