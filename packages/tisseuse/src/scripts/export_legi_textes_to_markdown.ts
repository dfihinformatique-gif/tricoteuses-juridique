import assert from "assert"
import fs from "fs-extra"
import sade from "sade"

import type {
  JorfArticle,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"
import { db } from "$lib/server/databases"

interface Context {
  articleById: Record<string, JorfArticle | LegiArticle>
  causeIdById: Record<string, string>
  legiTexteInternalIds: Set<string>
  sectionTaById: Record<string, LegiSectionTa>
  textelrById: Record<string, JorfTextelr | LegiTextelr>
  texteVersionIdByArticleId: Record<string, string>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion>
}

function addCause(context: Context, causedId: string, causeId: string) {
  // const existingCauseId = context.causeIdById[causedId]
  // if (existingCauseId !== undefined) {
  //   assert.strictEqual(existingCauseId, causeId)
  // } else {
  context.causeIdById[causedId] = causeId
  // }
}

async function exportLegiArticle(
  context: Context,
  legiTexteId: string,
  depth: number,
  lienArticle: LegiSectionTaLienArt,
  article: LegiArticle,
): Promise<void> {
  console.log(
    `${lienArticle["@id"]} ${"  ".repeat(depth)}Article ${lienArticle["@num"]} (${lienArticle["@debut"]} — ${lienArticle["@fin"] === "2999-01-01" ? "…" : lienArticle["@fin"]}, ${lienArticle["@etat"]})`,
  )

  let startCauseFound = false

  for (const articleLien of await db<ArticleLienDb[]>`
        SELECT * FROM article_lien WHERE id = ${lienArticle["@id"]}
      `) {
    assert.strictEqual(articleLien.cidtexte, legiTexteId)
    if (articleLien.article_id in context.legiTexteInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
    )
    if (
      (articleLien.typelien === "ABROGATION" && articleLien.cible) ||
      (articleLien.typelien === "ABROGE" && !articleLien.cible)
    ) {
      addCause(context, articleLien.id, articleLien.article_id)
      // stopCauseFound = true
    } else if (
      articleLien.typelien === "CITATION" ||
      (articleLien.typelien === "CODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "SPEC_APPLI" && articleLien.cible) ||
      (articleLien.typelien === "PILOTE_SUIVEUR" && !articleLien.cible) ||
      (articleLien.typelien === "TXT_ASSOCIE" && !articleLien.cible) ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CONCORDANCE" &&
        !articleLien.cible) /* le sens est étrange ?  Ignorer ce lien ? */ ||
      (articleLien.typelien === "CONCORDANCE" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible)
    ) {
      // L'article est créé par le déplacement d'un article existant dans une loi.
      addCause(context, articleLien.id, articleLien.article_id)
      startCauseFound = true
    } else if (articleLien.typelien === "CONCORDE" && articleLien.cible) {
      // L'article est déplacé ailleurs.
      addCause(context, articleLien.id, articleLien.article_id)
      // stopCauseFound = true
    } else if (
      (articleLien.typelien === "CREATION" && articleLien.cible) ||
      (articleLien.typelien === "CREE" && !articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "MODIFIE" && !articleLien.cible)
    ) {
      addCause(context, articleLien.id, articleLien.article_id)
      startCauseFound = true
    } else if (articleLien.typelien === "CREATION" && !articleLien.cible) {
      // Quand un article est TRANSFERE cela s'accompation de la
      // CREATION d'un autre article.
      addCause(context, articleLien.id, articleLien.article_id)
      // stopCauseFound = true
    } else if (
      (articleLien.typelien === "DEPLACE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACEMENT" && articleLien.cible)
    ) {
      // L'article est créé par le déplacement d'un article existant.
      addCause(context, articleLien.id, articleLien.article_id)
      startCauseFound = true
    } else if (articleLien.typelien === "TRANSFERE" && !articleLien.cible) {
      // L'article est transféré ailleurs.
      addCause(context, articleLien.id, articleLien.article_id)
      // stopCauseFound = true
    } else if (articleLien.typelien === "TRANSFERT" && articleLien.cible) {
      // L'article provient d'un transfert.
      addCause(context, articleLien.id, articleLien.article_id)
      startCauseFound = true
    } else {
      throw new Error(
        `Unexpected article_lien to article ${lienArticle["@id"]}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
        SELECT * FROM texte_version_lien WHERE id = ${lienArticle["@id"]}
      `) {
    assert.strictEqual(texteVersionLien.cidtexte, legiTexteId)
    if (texteVersionLien.texte_version_id in context.legiTexteInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    )
    if (
      (texteVersionLien.typelien === "ABROGATION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "ANNULATION" && texteVersionLien.cible)
    ) {
      addCause(context, texteVersionLien.id, texteVersionLien.texte_version_id)
      // stopCauseFound = true
    } else if (
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "CODIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "SPEC_APPLI" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      texteVersionLien.typelien === "CONCORDANCE" &&
      texteVersionLien.cible
    ) {
      // L'article est créé par le déplacement d'un article existant dans une loi.
      addCause(context, texteVersionLien.id, texteVersionLien.texte_version_id)
      startCauseFound = true
    } else if (
      (texteVersionLien.typelien === "CREATION" && texteVersionLien.cible) ||
      // || (texteVersionLien.typelien === "CREE" && !texteVersionLien.cible)
      (texteVersionLien.typelien === "MODIFICATION" &&
        texteVersionLien.cible) ||
      //  || (texteVersionLien.typelien === "MODIFIE" && !texteVersionLien.cible)
      (texteVersionLien.typelien === "RECTIFICATION" && texteVersionLien.cible)
    ) {
      addCause(context, texteVersionLien.id, texteVersionLien.texte_version_id)
      startCauseFound = true
    } else if (
      texteVersionLien.typelien === "TRANSFERT" &&
      texteVersionLien.cible
    ) {
      // L'article provient d'un transfert.
      addCause(context, texteVersionLien.id, texteVersionLien.texte_version_id)
      startCauseFound = true
    } else {
      throw new Error(
        `Unexpected texte_version_lien to article ${lienArticle["@id"]}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  const articleLiens = article.LIENS?.LIEN
  if (articleLiens !== undefined) {
    for (const articleLien of articleLiens) {
      if (articleLien["@id"]! in context.legiTexteInternalIds) {
        // Ignore internal links because a LEGI texte can't modify itself.
        continue
      }

      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${articleLien["@sens"]} typelien: ${articleLien["@typelien"]} ${articleLien["@cidtexte"]} ${articleLien["@id"]}${articleLien["@nortexte"] === undefined ? "" : ` ${articleLien["@nortexte"]}`}${articleLien["@num"] === undefined ? "" : ` ${articleLien["@num"]}`} ${articleLien["@naturetexte"]} du ${articleLien["@datesignatexte"]} : ${articleLien["#text"]}`,
      )
      if (
        (articleLien["@typelien"] === "ABROGATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "ABROGE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "ANNULATION" &&
          articleLien["@sens"] === "source")
      ) {
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        // stopCauseFound = true
      } else if (
        articleLien["@typelien"] === "CITATION" ||
        (articleLien["@typelien"] === "CODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "HISTO" &&
          articleLien["@sens"] ===
            "source") /* Au moins sur un exemple, le lien est vide à part ces 2 champs */ ||
        (articleLien["@typelien"] === "PILOTE_SUIVEUR" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "SPEC_APPLI" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "TXT_ASSOCIE" &&
          articleLien["@sens"] === "cible") ||
        articleLien["@typelien"] === "TXT_SOURCE"
      ) {
        // Ignore link.
      } else if (
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] ===
            "cible") /* Le sens est étrange ? Ignorer ce lien ? */ ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "cible")
      ) {
        // L'article est créé par le déplacement d'un article existant dans une loi.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        startCauseFound = true
      } else if (
        articleLien["@typelien"] === "CONCORDE" &&
        articleLien["@sens"] === "source"
      ) {
        // L'article est déplacé aiileurs.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        // stopCauseFound = true
      } else if (
        (articleLien["@typelien"] === "CREATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CREE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "MODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFIE" &&
          articleLien["@sens"] === "cible")
      ) {
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        startCauseFound = true
      } else if (
        articleLien["@typelien"] === "CREATION" &&
        articleLien["@sens"] === "cible"
      ) {
        // Quand un article est TRANSFERE cela s'accompation de la
        // CREATION d'un autre article.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        // stopCauseFound = true
      } else if (
        (articleLien["@typelien"] === "DEPLACE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACEMENT" &&
          articleLien["@sens"] === "source")
      ) {
        // L'article est créé par le déplacement d'un article existant.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        startCauseFound = true
      } else if (
        articleLien["@typelien"] === "RECTIFICATION" &&
        articleLien["@sens"] === "source"
      ) {
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        startCauseFound = true
      } else if (
        articleLien["@typelien"] === "TRANSFERE" &&
        articleLien["@sens"] === "cible"
      ) {
        // L'article est transféré ailleurs.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        // stopCauseFound = true
      } else if (
        articleLien["@typelien"] === "TRANSFERT" &&
        articleLien["@sens"] === "source"
      ) {
        // L'article provient d'un transfert.
        addCause(context, article.META.META_COMMUN.ID, articleLien["@id"]!)
        startCauseFound = true
      } else {
        throw new Error(
          `Unexpected LIEN in article ${article.META.META_COMMUN.ID}: @typelien=${articleLien["@typelien"]}, @sens=${articleLien["@sens"]}`,
        )
      }
    }
  }
}

async function exportLegiTexteToMarkdown(
  legiTexteId: string,
  targetDir: string,
): Promise<void> {
  const context: Context = {
    articleById: {},
    causeIdById: {},
    legiTexteInternalIds: new Set(),
    sectionTaById: {},
    textelrById: {},
    texteVersionIdByArticleId: {},
    texteVersionById: {},
  }
  context.legiTexteInternalIds.add(legiTexteId)

  const texteVersion = (
    await db<{ data: LegiTexteVersion }[]>`
    SELECT data FROM texte_version WHERE id = ${legiTexteId}
  `
  )[0]?.data
  assert.notStrictEqual(texteVersion, undefined)
  context.texteVersionById[legiTexteId] = texteVersion

  const textelr = (
    await db<{ data: LegiTextelr }[]>`
    SELECT data FROM textelr WHERE id = ${legiTexteId}
  `
  )[0]?.data
  assert.notStrictEqual(textelr, undefined)
  context.textelrById[legiTexteId] = textelr

  const meta = texteVersion.META
  const metaTexteVersion = meta.META_SPEC.META_TEXTE_VERSION
  console.log(
    `${meta.META_COMMUN.ID} ${metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? meta.META_COMMUN.ID} (${metaTexteVersion.DATE_DEBUT ?? ""} — ${metaTexteVersion.DATE_FIN === "2999-01-01" ? "…" : (metaTexteVersion.DATE_FIN ?? "")}, ${metaTexteVersion.ETAT})`,
  )

  // First Pass: Register IDs of internal objects

  const textelrStructure = textelr.STRUCT
  const liensArticles = textelrStructure?.LIEN_ART
  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      context.legiTexteInternalIds.add(lienArticle["@id"])
    }
  }

  for await (const { sectionTa } of walkStructureTree(
    context,
    textelrStructure as LegiSectionTaStructure,
  )) {
    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        context.legiTexteInternalIds.add(lienArticle["@id"])
      }
    }
  }

  // Second Pass

  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      const article = (await getOrLoadArticle(
        context,
        lienArticle["@id"],
      )) as LegiArticle
      await exportLegiArticle(context, legiTexteId, 0, lienArticle, article)
    }
  }

  for await (const {
    lienSectionTa,
    parentsSectionTa,
    sectionTa,
  } of walkStructureTree(context, textelrStructure as LegiSectionTaStructure)) {
    console.log(
      `${sectionTa.ID} ${"  ".repeat(parentsSectionTa.length + 1)}${sectionTa.TITRE_TA?.replace(/\s+/g, " ") ?? sectionTa.ID} (${lienSectionTa["@debut"]} — ${lienSectionTa["@fin"] === "2999-01-01" ? "…" : lienSectionTa["@fin"]}, ${lienSectionTa["@etat"]})`,
    )

    for (const articleLien of await db<ArticleLienDb[]>`
      SELECT * FROM article_lien WHERE id = ${lienSectionTa["@id"]}
    `) {
      assert.strictEqual(articleLien.cidtexte, legiTexteId)
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(parentsSectionTa.length + 1)}  ${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
      )
    }
    for (const texteVersionLien of await db<TexteVersionLienDb[]>`
      SELECT * FROM texte_version_lien WHERE id = ${lienSectionTa["@id"]}
    `) {
      assert.strictEqual(texteVersionLien.cidtexte, legiTexteId)
      console.log(
        `${" ".repeat(20)} ${"  ".repeat(parentsSectionTa.length + 1)}  ${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
      )
    }

    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        const article = (await getOrLoadArticle(
          context,
          lienArticle["@id"],
        )) as LegiArticle
        await exportLegiArticle(
          context,
          legiTexteId,
          parentsSectionTa.length + 2,
          lienArticle,
          article,
        )
      }
    }
  }
}

async function* walkStructureTree(
  context: Context,
  structure: LegiSectionTaStructure,
  parentsSectionTa: LegiSectionTa[] = [],
): AsyncGenerator<
  {
    lienSectionTa: LegiSectionTaLienSectionTa
    parentsSectionTa: LegiSectionTa[]
    sectionTa: LegiSectionTa
  },
  void
> {
  const liensSectionTa = structure?.LIEN_SECTION_TA
  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      let childSectionTa = context.sectionTaById[lienSectionTa["@id"]]
      if (childSectionTa === undefined) {
        childSectionTa = (
          await db<{ data: LegiSectionTa }[]>`
            SELECT data FROM section_ta WHERE id = ${lienSectionTa["@id"]}
        `
        )[0]?.data
        assert.notStrictEqual(childSectionTa, undefined)
        context.sectionTaById[lienSectionTa["@id"]] = childSectionTa
        context.legiTexteInternalIds.add(lienSectionTa["@id"])
      }
      yield { lienSectionTa, parentsSectionTa, sectionTa: childSectionTa }
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

async function getOrLoadArticle(
  context: Context,
  articleId: string,
): Promise<JorfArticle | LegiArticle> {
  let article = context.articleById[articleId]
  if (article === undefined) {
    article = (
      await db<{ data: LegiArticle }[]>`
          SELECT data FROM article WHERE id = ${articleId}
        `
    )[0]?.data
    assert.notStrictEqual(article, undefined)
    context.articleById[articleId] = article
  }
  return article
}

sade("export_legi_texte_to_markdown <legiTexteId> <targetDir>", true)
  .describe(
    "Convert a LEGI texte (code, law, etc) to a markdown tree in a directory",
  )
  .action(async (legiTexteId, targetDir) => {
    await exportLegiTexteToMarkdown(legiTexteId, targetDir)
    process.exit(0)
  })
  .parse(process.argv)
