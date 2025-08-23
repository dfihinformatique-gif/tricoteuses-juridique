import assert from "assert"

import type {
  JorfTextelr,
  JorfSectionTa,
  JorfSectionTaLienSectionTa,
  JorfTextelrVersion,
  JorfArticleVersion,
} from "$lib/legal/jorf.js"
import type {
  LegiArticle,
  LegiArticleVersion,
  LegiSectionTa,
  LegiSectionTaLienSectionTa,
  LegiTextelr,
  LegiTextelrVersion,
  LegiTexteVersion,
} from "$lib/legal/legi.js"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared.js"
import { db } from "$lib/server/databases/index.js"

import {
  getOrLoadArticle,
  getOrLoadTextelr,
  getOrLoadTexteVersion,
  type Action,
  type Context,
} from "./contexts.js"

async function addModifyingArticleId(
  context: Context,
  modifyingArticleId: string,
  action: Action,
  priority: number,
  modifiedId: string,
  modifiedRealId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const modifyingArticle = await getOrLoadArticle(context, modifyingArticleId)
  if (modifyingArticle === null) {
    return
  }

  const modifyingTextId = modifyingArticle.CONTEXTE.TEXTE["@cid"]
  if (modifyingTextId !== undefined) {
    await addModifyingTextId(
      context,
      modifyingTextId,
      action,
      priority,
      modifiedId,
      modifiedRealId,
      modifiedDateDebut,
      modifiedDateFin,
    )
  }
}

async function addModifyingTextId(
  context: Context,
  modifyingTextId: string,
  action: Action,
  priority: number,
  modifiedId: string,
  modifiedRealId: string,
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
  const modifyingTextelr = await getOrLoadTextelr(context, modifyingTextId)
  if (action === "CREATE") {
    if (modifiedRealId.startsWith("JORF")) {
      // When the realModifiedId is a JORF id, then consider that it is a referencing
      // error, because a JORF can't be created by others. A LEGI id should have been
      // used, so find the LEGI version of that JORF object whose start date is equal
      // to or just after start date of modifying text.
      modifiedDateDebut =
        modifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT ??
        modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI ??
        "2999-01-01"
      if (modifiedDateDebut !== "2999-01-01") {
        if (
          modifiedId.startsWith("JORF") &&
          context.firstConsolidatedIdByJorfCreatorId[modifiedId] !== undefined
        ) {
          // Some JORF objects, for examples, the articles  of the Constitution have no
          // version other than themselves in VERSIONS.VERSION (but the other LEGI versions
          // are linked together in VERSIONS.VERSION), so don't use JORF version to retrieve
          // the othere versions.
          modifiedId = context.firstConsolidatedIdByJorfCreatorId[modifiedId]
        }
        if (
          modifiedId.startsWith("JORFTEXT") ||
          modifiedId.startsWith("LEGITEXT")
        ) {
          const modifiedTextelr = await getOrLoadTextelr(context, modifiedId)
          if (modifiedTextelr !== null) {
            const bestModifiedVersion = modifiedTextelr.VERSIONS.VERSION.reduce(
              (
                bestModifiedVersion:
                  | JorfTextelrVersion
                  | LegiTextelrVersion
                  | undefined,
                version,
              ) => {
                const versionDebut = version.LIEN_TXT["@debut"]
                return versionDebut >= modifiedDateDebut &&
                  (bestModifiedVersion === undefined ||
                    versionDebut < bestModifiedVersion.LIEN_TXT["@debut"])
                  ? version
                  : bestModifiedVersion
              },
              undefined,
            )
            if (bestModifiedVersion !== undefined) {
              modifiedId = bestModifiedVersion.LIEN_TXT["@id"]
              modifiedDateDebut = bestModifiedVersion.LIEN_TXT["@debut"]
              modifiedDateFin = bestModifiedVersion.LIEN_TXT["@fin"]
            }
          }
        } else {
          // Modified object is an article.
          const modifiedArticle = await getOrLoadArticle(context, modifiedId)
          if (modifiedArticle !== null) {
            const bestModifiedVersion = modifiedArticle.VERSIONS.VERSION.reduce(
              (
                bestModifiedVersion:
                  | JorfArticleVersion
                  | LegiArticleVersion
                  | undefined,
                version,
              ) => {
                const versionDebut = version.LIEN_ART["@debut"]
                return versionDebut >= modifiedDateDebut &&
                  (bestModifiedVersion === undefined ||
                    versionDebut < bestModifiedVersion.LIEN_ART["@debut"])
                  ? version
                  : bestModifiedVersion
              },
              undefined,
            )
            if (bestModifiedVersion !== undefined) {
              modifiedId = bestModifiedVersion.LIEN_ART["@id"]
              modifiedDateDebut = bestModifiedVersion.LIEN_ART["@debut"]
              modifiedDateFin = bestModifiedVersion.LIEN_ART["@fin"]
            }
          }
        }
      }
    }
    if (modifiedDateDebut === "2999-01-01") {
      // When modifiedDateDebut is not known (ie = 2999-01-01), assume that the
      // date is the start date of modifying text (otherwise modifiedDateDebut
      // should have been set to a valid date).
      modifiedDateDebut =
        modifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT ??
        modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI ??
        "2999-01-01"
      if (modifiedDateDebut === "2999-01-01") {
        if (modifyingTextelr !== null) {
          modifiedDateDebut = modifyingTextelr.VERSIONS.VERSION.reduce(
            (minDateDebut, version) =>
              version.LIEN_TXT["@debut"] < minDateDebut
                ? version.LIEN_TXT["@debut"]
                : minDateDebut,
            "2999-01-01",
          )
        }
      }
    }
  }

  if (modifiedId.startsWith("JORFTEXT") || modifiedId.startsWith("LEGITEXT")) {
    // A consolidated text doesn't change. Only its content changes.
    const actionDate = action === "CREATE" ? modifiedDateDebut : modifiedDateFin
    if (actionDate !== "2999-01-01") {
      const consolidatedTextModifyingTextsIdsByAction =
        // Remember that the the modifiying text had this action at this action date,
        // In order to reuse this modifying text when a modifying article is without text
        // at the same date.
        (context.consolidatedTextModifyingTextsIdsByActionByDate[actionDate] ??=
          {})
      const consolidatedTextModifyingTextsIds =
        (consolidatedTextModifyingTextsIdsByAction[action] ??= new Set())
      consolidatedTextModifyingTextsIds.add(modifyingTextId)
    }
  } else {
    // Modified object is an article.
    const actionDate = action === "CREATE" ? modifiedDateDebut : modifiedDateFin
    if (actionDate !== "2999-01-01") {
      const modifier =
        context.modifierByActionByConsolidatedArticleId[modifiedId]?.[action]
      if (priority > (modifier?.priority ?? -1)) {
        if (modifier !== undefined) {
          // Remove previous modifier of article because its priority is lower.

          const consolidatedIdsByActionByModifyingTextId =
            context.consolidatedIdsByActionByModifyingTextIdByDate[
              modifier.date
            ]
          const consolidatedIdsByAction =
            consolidatedIdsByActionByModifyingTextId[modifier.textId]
          const consolidatedIds = consolidatedIdsByAction[action]
          if (consolidatedIds !== undefined) {
            consolidatedIds.delete(modifiedId)
            if (consolidatedIds.size === 0) {
              delete consolidatedIdsByAction[action]
              if (Object.keys(consolidatedIdsByAction).length === 0) {
                delete consolidatedIdsByActionByModifyingTextId[modifier.textId]
                if (
                  Object.keys(consolidatedIdsByActionByModifyingTextId)
                    .length === 0
                ) {
                  delete context.consolidatedIdsByActionByModifyingTextIdByDate[
                    modifier.date
                  ]
                }
              }
            }
          }

          const modifyingTextsIds =
            context.modifyingTextsIdsByArticleActionDate[modifier.date]
          modifyingTextsIds.delete(modifier.textId)
          if (modifyingTextsIds.size === 0) {
            delete context.modifyingTextsIdsByArticleActionDate[modifier.date]
          }
        }

        // Add article as a modifier.
        ;(((context.consolidatedIdsByActionByModifyingTextIdByDate[
          actionDate
        ] ??= {})[modifyingTextId] ??= {})[action] ??= new Set()).add(
          modifiedId,
        )
        ;(context.modifierByActionByConsolidatedArticleId[modifiedId] ??= {})[
          action
        ] = {
          date: actionDate,
          priority,
          textId: modifyingTextId,
        }
        ;(context.modifyingTextsIdsByArticleActionDate[actionDate] ??=
          new Set()).add(modifyingTextId)
      }
    }
  }
}

export async function registerLegiArticleModifiersAndReferences(
  context: Context,
  depth: number,
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
  if (context.logReferences) {
    console.log(
      `${articleMeta.META_COMMUN.ID} ${"  ".repeat(depth)}Article ${metaArticle.NUM} (${articleDateDebut} — ${articleDateFin === "2999-01-01" ? "…" : articleDateFin}, ${metaArticle.ETAT})`,
    )
  }

  if (metaArticle.ETAT === "MODIFIE_MORT_NE") {
    return
  }

  for (const referringArticleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(articleIds)}
  `) {
    const referringArticlesLiens = (context.referringArticlesLiensById[
      articleId
    ] ??= [])
    if (
      referringArticlesLiens.every(
        (lien) =>
          lien.article_id !== referringArticleLien.article_id ||
          lien.cible !== referringArticleLien.cible ||
          lien.typelien !== referringArticleLien.typelien,
      )
    ) {
      referringArticlesLiens.push(referringArticleLien)
    }

    if (
      context.consolidatedTextInternalIds.has(referringArticleLien.article_id)
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    if (context.logReferences) {
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${referringArticleLien.article_id} cible: ${referringArticleLien.cible} typelien: ${referringArticleLien.typelien}`,
      )
    }
    if (referringArticleLien.cidtexte !== context.consolidatedTextCid) {
      console.warn(
        `Ignoring article_lien ${JSON.stringify(referringArticleLien)} with unexpected cidtexte: ${referringArticleLien.cidtexte} instead of ${context.consolidatedTextCid}`,
      )
      continue
    }
    assert(referringArticleLien.article_id.startsWith("LEGIARTI"))
    if (
      (referringArticleLien.typelien === "ABROGATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "ABROGE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDANCE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDE" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "DISJOINT" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "DISJONCTION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "PERIME" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "TRANSFERE" &&
        !referringArticleLien.cible)
    ) {
      // TODO: Decrease priority of some typelien?
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "DELETE",
        1,
        articleId,
        referringArticleLien.id,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      (referringArticleLien.typelien === "ABROGATION" &&
        !referringArticleLien.cible) ||
      referringArticleLien.typelien === "CITATION" ||
      referringArticleLien.typelien === "CODIFIE" ||
      (referringArticleLien.typelien === "HISTO" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "PEREMPTION" &&
        referringArticleLien.cible) ||
      referringArticleLien.typelien === "PILOTE_SUIVEUR" ||
      (referringArticleLien.typelien === "SPEC_APPLI" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "SPEC_APPLI" &&
        !referringArticleLien.cible) || // LEGIARTI000006794309
      referringArticleLien.typelien === "TXT_ASSOCIE" ||
      referringArticleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (referringArticleLien.typelien === "CREATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CREE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "DEPLACE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "DEPLACEMENT" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFICATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFIE" &&
        !referringArticleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "CREATE",
        1,
        articleId,
        referringArticleLien.id,
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
            referringArticleLien.article_id,
            "DELETE",
            1,
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      (referringArticleLien.typelien === "CODIFICATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDANCE" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "DISJOINT" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "TRANSFERT" &&
        referringArticleLien.cible)
    ) {
      // TOOD: Increase priority of "CONCORDANCE", "CONCORDE", "DISJOINT", "TRANSFERT"?
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "CREATE",
        0,
        articleId,
        referringArticleLien.id,
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
            referringArticleLien.article_id,
            "DELETE",
            0,
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      (referringArticleLien.typelien === "CREATION" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFICATION" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFIE" &&
        referringArticleLien.cible) // LEGIARTI000045468013
    ) {
      // It seems to be errors.
      // Ignore link.
    } else {
      throw new Error(
        `Unexpected article_lien to article ${referringArticleLien.id}: typelien=${referringArticleLien.typelien}, cible=${referringArticleLien.cible}`,
      )
    }
  }

  for (const referringTextLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(articleIds)}
  `) {
    const referringTextsLiens = (context.referringTextsLiensById[articleId] ??=
      [])
    if (
      referringTextsLiens.every(
        (lien) =>
          lien.texte_version_id !== referringTextLien.texte_version_id ||
          lien.cible !== referringTextLien.cible ||
          lien.typelien !== referringTextLien.typelien,
      )
    ) {
      referringTextsLiens.push(referringTextLien)
    }

    if (
      context.consolidatedTextInternalIds.has(
        referringTextLien.texte_version_id,
      )
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    if (context.logReferences) {
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${referringTextLien.texte_version_id} cible: ${referringTextLien.cible} typelien: ${referringTextLien.typelien}`,
      )
    }
    if (referringTextLien.cidtexte !== context.consolidatedTextCid) {
      console.warn(
        `Ignoring texte_version_lien ${JSON.stringify(referringTextLien)} with unexpected cidtexte: ${referringTextLien.cidtexte} instead of ${context.consolidatedTextCid}`,
      )
      continue
    }
    assert(
      referringTextLien.texte_version_id.startsWith("JORFTEXT") ||
        referringTextLien.texte_version_id.startsWith("LEGITEXT"),
    )
    if (
      (referringTextLien.typelien === "ABROGATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "ANNULATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "DISJONCTION" && referringTextLien.cible)
    ) {
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "DELETE",
        1,
        articleId,
        referringTextLien.id,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      (referringTextLien.typelien === "APPLICATION" &&
        !referringTextLien.cible) ||
      referringTextLien.typelien === "CITATION" ||
      (referringTextLien.typelien === "HISTO" && referringTextLien.cible) ||
      (referringTextLien.typelien === "PEREMPTION" &&
        referringTextLien.cible) ||
      referringTextLien.typelien === "SPEC_APPLI" ||
      (referringTextLien.typelien === "TXT_ASSOCIE" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "TXT_ASSOCIE" &&
        !referringTextLien.cible) || // Example: LEGITEXT000006074068
      referringTextLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (referringTextLien.typelien === "CREATION" && referringTextLien.cible) ||
      (referringTextLien.typelien === "CREE" && !referringTextLien.cible) ||
      (referringTextLien.typelien === "MODIFICATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "MODIFIE" && !referringTextLien.cible)
    ) {
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "CREATE",
        1,
        articleId,
        referringTextLien.id,
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
            referringTextLien.texte_version_id,
            "DELETE",
            1,
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      (referringTextLien.typelien === "CODIFICATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "CODIFIE" && !referringTextLien.cible) ||
      (referringTextLien.typelien === "CONCORDANCE" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "CONCORDE" && !referringTextLien.cible) ||
      (referringTextLien.typelien === "RECTIFICATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "TRANSFERT" && referringTextLien.cible)
    ) {
      // TODO: Increase priority of "CONCORDANCE", "CONCORDE", "RECTIFICATION", "TRANSFERT"?
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "CREATE",
        0,
        articleId,
        referringTextLien.id,
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
            referringTextLien.texte_version_id,
            "DELETE",
            0,
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      // LEGIARTI000018508754
      (referringTextLien.typelien === "CONCORDE" && referringTextLien.cible) ||
      // LEGIARTI000006527461 has an example of MODIFICATION with !cible
      (referringTextLien.typelien === "MODIFICATION" &&
        !referringTextLien.cible)
    ) {
      // It seems to be errors.
      // Ignore link.
    } else {
      throw new Error(
        `Unexpected texte_version_lien to article ${referringTextLien.id}: typelien=${referringTextLien.typelien}, cible=${referringTextLien.cible}`,
      )
    }
  }

  const articleReferredLiens = article.LIENS?.LIEN
  // Note: The (eventual) JORF version of article (with ID === context.jorfCreatorIdByConsolidatedId[articleId]]) never has LIENS.
  // => It is skipped.
  if (articleReferredLiens !== undefined) {
    for (const articleReferredLien of articleReferredLiens) {
      if (articleReferredLien["@cidtexte"] === undefined) {
        // Ignore link because it has no potential modifying text.
        continue
      }
      if (
        context.consolidatedTextInternalIds.has(articleReferredLien["@id"]!)
      ) {
        // Ignore internal links because a LEGI texte can't modify itself.
        continue
      }

      if (context.logReferences) {
        console.log(
          `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${articleReferredLien["@sens"]} typelien: ${articleReferredLien["@typelien"]} ${articleReferredLien["@cidtexte"]} ${articleReferredLien["@id"]}${articleReferredLien["@nortexte"] === undefined ? "" : ` ${articleReferredLien["@nortexte"]}`}${articleReferredLien["@num"] === undefined ? "" : ` ${articleReferredLien["@num"]}`} ${articleReferredLien["@naturetexte"]} du ${articleReferredLien["@datesignatexte"]} : ${articleReferredLien["#text"]}`,
        )
      }
      if (
        (articleReferredLien["@typelien"] === "ABROGATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "ABROGE" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "ANNULATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "CONCORDANCE" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "CONCORDE" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "DISJOINT" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "DISJONCTION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "PERIME" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "TRANSFERE" &&
          articleReferredLien["@sens"] === "cible")
      ) {
        // TODO: Decrease priority of some @typelien?
        await addModifyingTextId(
          context,
          articleReferredLien["@cidtexte"],
          "DELETE",
          1,
          articleId,
          articleId,
          articleDateDebut,
          articleDateFin,
        )
      } else if (
        (articleReferredLien["@typelien"] === "ABROGATION" &&
          articleReferredLien["@sens"] === "cible") ||
        articleReferredLien["@typelien"] === "CITATION" ||
        articleReferredLien["@typelien"] === "CODIFIE" ||
        (articleReferredLien["@typelien"] === "HISTO" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "PEREMPTION" &&
          articleReferredLien["@sens"] === "source") ||
        articleReferredLien["@typelien"] === "PILOTE_SUIVEUR" ||
        (articleReferredLien["@typelien"] === "SPEC_APPLI" &&
          articleReferredLien["@sens"] === "source") ||
        articleReferredLien["@typelien"] === "TXT_ASSOCIE" ||
        (articleReferredLien["@typelien"] === "SPEC_APPLI" &&
          articleReferredLien["@sens"] === "cible") || // LEGIARTI000006794309
        articleReferredLien["@typelien"] === "TXT_SOURCE"
      ) {
        // Ignore link.
      } else if (
        (articleReferredLien["@typelien"] === "CREATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "CREE" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "DEPLACE" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "DEPLACEMENT" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "MODIFICATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "MODIFIE" &&
          articleReferredLien["@sens"] === "cible")
      ) {
        await addModifyingTextId(
          context,
          articleReferredLien["@cidtexte"],
          "CREATE",
          1,
          articleId,
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
              articleReferredLien["@cidtexte"],
              "DELETE",
              1,
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@debut"],
              articleVersion.LIEN_ART["@fin"],
            )
          }
        }
      } else if (
        (articleReferredLien["@typelien"] === "CODIFICATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "CONCORDANCE" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "CONCORDE" &&
          articleReferredLien["@sens"] === "cible") ||
        (articleReferredLien["@typelien"] === "DISJOINT" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "RECTIFICATION" &&
          articleReferredLien["@sens"] === "source") ||
        (articleReferredLien["@typelien"] === "TRANSFERT" &&
          articleReferredLien["@sens"] === "source")
      ) {
        // TODO: Increase priority of "CONCORDANCE", "CONCORDE", "DISJOINT", "RECTIFICATION", "TRANSFERT"?
        await addModifyingTextId(
          context,
          articleReferredLien["@cidtexte"],
          "CREATE",
          0,
          articleId,
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
              articleReferredLien["@cidtexte"],
              "DELETE",
              0,
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@debut"],
              articleVersion.LIEN_ART["@fin"],
            )
          }
        }
      } else if (
        (articleReferredLien["@typelien"] === "CREATION" &&
          articleReferredLien["@sens"] === "cible") ||
        // Occurs for LEGIARTI000028043722
        (articleReferredLien["@typelien"] === "MODIFICATION" &&
          articleReferredLien["@sens"] === "cible") ||
        // LEGIARTI000045468013
        (articleReferredLien["@typelien"] === "MODIFIE" &&
          articleReferredLien["@sens"] === "source")
      ) {
        // It seems to be an error.
        // Ignore link.
      } else {
        throw new Error(
          `Unexpected LIEN in article ${articleId}: @typelien=${articleReferredLien["@typelien"]}, @sens=${articleReferredLien["@sens"]}`,
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
        1,
        articleId,
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
            1,
            articleVersion.LIEN_ART["@id"],
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
      const modifierByAction =
        context.modifierByActionByConsolidatedArticleId[articleId] ?? {}
      if (modifierByAction.CREATE === undefined) {
        const consolidatedTextModifyingTextsIds =
          context.consolidatedTextModifyingTextsIdsByActionByDate[
            articleDateDebut
          ]?.CREATE
        if (consolidatedTextModifyingTextsIds !== undefined) {
          if (consolidatedTextModifyingTextsIds.size === 1) {
            const modifyingTextId = [...consolidatedTextModifyingTextsIds][0]
            await addModifyingTextId(
              context,
              modifyingTextId,
              "CREATE",
              0,
              articleId,
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
                  0,
                  articleVersion.LIEN_ART["@id"],
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

export async function registerLegiSectionTaModifiersAndReferences(
  context: Context,
  depth: number,
  lienSectionTa: JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa,
  sectionTa: JorfSectionTa | LegiSectionTa,
): Promise<void> {
  // Note: Currently, SectionTA modifiers are not registered. Only references are registered.

  const sectionTaId = sectionTa.ID
  const sectionTaIds = [
    sectionTaId,
    // context.jorfCreatorIdByConsolidatedId[sectionTaId],
  ].filter((id) => id !== undefined)
  const sectionTaDateDebut = lienSectionTa["@debut"]
  const sectionTaDateFin = lienSectionTa["@fin"]
  if (context.logReferences) {
    console.log(
      `${sectionTaId} ${"  ".repeat(depth)}SectionTA ${sectionTa.TITRE_TA} (${sectionTaDateDebut} — ${sectionTaDateFin === "2999-01-01" ? "…" : sectionTaDateFin})`,
    )
  }

  for (const referringArticleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(sectionTaIds)}
  `) {
    const referringArticlesLiens = (context.referringArticlesLiensById[
      sectionTaId
    ] ??= [])
    if (
      referringArticlesLiens.every(
        (lien) =>
          lien.article_id !== referringArticleLien.article_id ||
          lien.cible !== referringArticleLien.cible ||
          lien.typelien !== referringArticleLien.typelien,
      )
    ) {
      referringArticlesLiens.push(referringArticleLien)
    }
  }

  for (const referringTextLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(sectionTaIds)}
  `) {
    const referringTextsLiens = (context.referringTextsLiensById[
      sectionTaId
    ] ??= [])
    if (
      referringTextsLiens.every(
        (lien) =>
          lien.texte_version_id !== referringTextLien.texte_version_id ||
          lien.cible !== referringTextLien.cible ||
          lien.typelien !== referringTextLien.typelien,
      )
    ) {
      referringTextsLiens.push(referringTextLien)
    }
  }
}

export async function registerLegiTextModifiersAndReferences(
  context: Context,
  depth: number,
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
  if (context.logReferences) {
    console.log(
      `${legiTextId} ${"  ".repeat(depth)} ${(texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITREFULL ?? texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITRE ?? texteVersionMeta.META_COMMUN.ID).replace(/\s+/g, " ").trim()}`,
    )
  }

  for (const referringArticleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(textIds)}
  `) {
    const referringArticlesLiens = (context.referringArticlesLiensById[
      legiTextId
    ] ??= [])
    if (
      referringArticlesLiens.every(
        (lien) =>
          lien.article_id !== referringArticleLien.article_id ||
          lien.cible !== referringArticleLien.cible ||
          lien.typelien !== referringArticleLien.typelien,
      )
    ) {
      referringArticlesLiens.push(referringArticleLien)
    }

    if (
      context.consolidatedTextInternalIds.has(referringArticleLien.article_id)
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    if (context.logReferences) {
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${referringArticleLien.article_id} cible: ${referringArticleLien.cible} typelien: ${referringArticleLien.typelien}`,
      )
    }
    if (referringArticleLien.cidtexte !== context.consolidatedTextCid) {
      console.warn(
        `Ignoring article_lien ${JSON.stringify(referringArticleLien)} with unexpected cidtexte: ${referringArticleLien.cidtexte} instead of ${context.consolidatedTextCid}`,
      )
      continue
    }
    if (
      (referringArticleLien.typelien === "ABROGATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "ABROGE" &&
        !referringArticleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "DELETE",
        1,
        legiTextId,
        referringArticleLien.id,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
    } else if (
      referringArticleLien.typelien === "CITATION" ||
      (referringArticleLien.typelien === "SPEC_APPLI" &&
        !referringArticleLien.cible) || // Example: LEGITEXT000006074068
      (referringArticleLien.typelien === "TXT_ASSOCIE" &&
        !referringArticleLien.cible) || // Example: LEGITEXT000006074068
      referringArticleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (referringArticleLien.typelien === "CREE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFICATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "MODIFIE" &&
        !referringArticleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "CREATE",
        1,
        legiTextId,
        referringArticleLien.id,
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
            referringArticleLien.article_id,
            "DELETE",
            1,
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else if (
      (referringArticleLien.typelien === "CODIFICATION" &&
        referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDANCE" &&
        !referringArticleLien.cible) ||
      (referringArticleLien.typelien === "CONCORDE" &&
        !referringArticleLien.cible)
    ) {
      // TODO: Increase priority of "CONCORDANCE" & "CONCORDE"?
      await addModifyingArticleId(
        context,
        referringArticleLien.article_id,
        "CREATE",
        0,
        legiTextId,
        referringArticleLien.id,
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
            referringArticleLien.article_id,
            "DELETE",
            0,
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected article_lien to text ${referringArticleLien.id}: typelien=${referringArticleLien.typelien}, cible=${referringArticleLien.cible}`,
      )
    }
  }

  for (const referringTextLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(textIds)}
  `) {
    const referringTextsLiens = (context.referringTextsLiensById[legiTextId] ??=
      [])
    if (
      referringTextsLiens.every(
        (lien) =>
          lien.texte_version_id !== referringTextLien.texte_version_id ||
          lien.cible !== referringTextLien.cible ||
          lien.typelien !== referringTextLien.typelien,
      )
    ) {
      referringTextsLiens.push(referringTextLien)
    }

    if (
      context.consolidatedTextInternalIds.has(
        referringTextLien.texte_version_id,
      )
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    if (context.logReferences) {
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${referringTextLien.texte_version_id} cible: ${referringTextLien.cible} typelien: ${referringTextLien.typelien}`,
      )
    }
    if (referringTextLien.cidtexte !== context.consolidatedTextCid) {
      console.warn(
        `Ignoring texte_version_lien ${JSON.stringify(referringTextLien)} with unexpected cidtexte: ${referringTextLien.cidtexte} instead of ${context.consolidatedTextCid}`,
      )
      continue
    }
    if (
      (referringTextLien.typelien === "ABROGATION" &&
        referringTextLien.cible) ||
      (referringTextLien.typelien === "ANNULATION" && referringTextLien.cible)
    ) {
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "DELETE",
        1,
        legiTextId,
        referringTextLien.id,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
    } else if (
      (referringTextLien.typelien === "APPLICATION" &&
        !referringTextLien.cible) ||
      referringTextLien.typelien === "CITATION" ||
      (referringTextLien.typelien === "SPEC_APPLI" &&
        !referringTextLien.cible) || // LEGITEXT000006074096
      (referringTextLien.typelien === "TXT_ASSOCIE" &&
        !referringTextLien.cible) || // Example: LEGITEXT000006074068
      (referringTextLien.typelien === "TXT_SOURCE" && !referringTextLien.cible)
    ) {
      // Ignore link.
    } else if (
      referringTextLien.typelien === "MODIFIE" &&
      !referringTextLien.cible
    ) {
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "CREATE",
        1,
        legiTextId,
        referringTextLien.id,
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
            referringTextLien.texte_version_id,
            "DELETE",
            1,
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else if (
      referringTextLien.typelien === "CODIFICATION" &&
      referringTextLien.cible
    ) {
      await addModifyingTextId(
        context,
        referringTextLien.texte_version_id,
        "CREATE",
        0,
        legiTextId,
        referringTextLien.id,
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
            referringTextLien.texte_version_id,
            "DELETE",
            0,
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected texte_version_lien to text ${referringTextLien.id}: typelien=${referringTextLien.typelien}, cible=${referringTextLien.cible}`,
      )
    }
  }

  for (const textId of textIds) {
    const texteVersion = await getOrLoadTexteVersion(context, textId)
    const textReferredLiens =
      texteVersion?.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
    if (textReferredLiens !== undefined) {
      for (const textReferredLien of textReferredLiens) {
        if (textReferredLien["@cidtexte"] === undefined) {
          // Ignore link because it has no potential modifying text.
          continue
        }
        if (context.consolidatedTextInternalIds.has(textReferredLien["@id"]!)) {
          // Ignore internal links because a LEGI texte can't modify itself.
          continue
        }

        if (context.logReferences) {
          console.log(
            `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${textReferredLien["@sens"]} typelien: ${textReferredLien["@typelien"]} ${textReferredLien["@cidtexte"]} ${textReferredLien["@id"]}${textReferredLien["@nortexte"] === undefined ? "" : ` ${textReferredLien["@nortexte"]}`}${textReferredLien["@num"] === undefined ? "" : ` ${textReferredLien["@num"]}`} ${textReferredLien["@naturetexte"]} du ${textReferredLien["@datesignatexte"]} : ${textReferredLien["#text"]}`,
          )
        }
        if (
          (textReferredLien["@typelien"] === "APPLICATION" &&
            textReferredLien["@sens"] === "cible") ||
          textReferredLien["@typelien"] === "CITATION"
        ) {
          // Ignore link.
        } else if (
          (textReferredLien["@typelien"] === "MODIFICATION" &&
            textReferredLien["@sens"] === "source") ||
          (textReferredLien["@typelien"] === "MODIFIE" &&
            textReferredLien["@sens"] === "cible")
        ) {
          await addModifyingTextId(
            context,
            textReferredLien["@cidtexte"],
            "CREATE",
            1,
            legiTextId,
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
                textReferredLien["@cidtexte"],
                "DELETE",
                1,
                version.LIEN_TXT["@id"],
                version.LIEN_TXT["@id"],
                version.LIEN_TXT["@debut"],
                version.LIEN_TXT["@fin"],
              )
            }
          }
        } else {
          throw new Error(
            `Unexpected LIEN in text ${textId}: @typelien=${textReferredLien["@typelien"]}, @sens=${textReferredLien["@sens"]}`,
          )
        }
      }
    }
  }
}
