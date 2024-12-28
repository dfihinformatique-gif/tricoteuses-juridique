import assert from "assert"

import type { JorfTextelr } from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"
import { db } from "$lib/server/databases"

import {
  getOrLoadArticle,
  getOrLoadTextelr,
  getOrLoadTexteVersion,
  type Action,
  type Context,
} from "./contexts"

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

export async function registerLegiArticleModifiers(
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
      (articleLien.typelien === "SPEC_APPLI" && !articleLien.cible) || // LEGIARTI000006794309
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
      (texteVersionLien.typelien === "TXT_ASSOCIE" &&
        !texteVersionLien.cible) || // Example: LEGITEXT000006074068
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
        (articleLien["@typelien"] === "SPEC_APPLI" &&
          articleLien["@sens"] === "cible") || // LEGIARTI000006794309
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

export async function registerLegiTextModifiers(
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
      (articleLien.typelien === "SPEC_APPLI" && !articleLien.cible) || // Example: LEGITEXT000006074068
      (articleLien.typelien === "TXT_ASSOCIE" && !articleLien.cible) || // Example: LEGITEXT000006074068
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
      (texteVersionLien.typelien === "TXT_ASSOCIE" &&
        !texteVersionLien.cible) || // Example: LEGITEXT000006074068
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
