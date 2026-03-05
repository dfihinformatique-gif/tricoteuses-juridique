import {
  sortArticlesNumbers,
  type JorfArticle,
  type JorfTexteVersion,
  type LegiArticle,
  type LegiTexteVersion,
} from "@tricoteuses/legifrance"
import fs from "fs-extra"
import assert from "node:assert"
import type { JSONValue } from "postgres"
import sade from "sade"

import {
  extendLoadedArticle,
  getArticleDateSignature,
  getTexteVersionDateSignature,
  type DefinitionOrLink,
  type ExtractedLinkDb,
  type JorfArticleExtended,
  type LegiArticleExtended,
  type TextLinksParserState,
} from "$lib"
import { addLinksToHtml } from "$lib/linkers/html.js"
import config from "$lib/server/config.js"
import { europeDb, legiDb } from "$lib/server/databases/index.js"

const { linkBaseUrl, linkType } = config
const today = new Date().toISOString().split("T")[0]

async function addLinksToLegifrance({
  cid: textCid,
  "cid-list": cidListFilePath,
  "log-ignored": logIgnoredReferencesTypes,
  "log-partial": logPartialReferences,
  "log-references": logReferences,
}: {
  cid?: string
  "cid-list"?: string
  "log-ignored"?: boolean
  "log-partial"?: boolean
  "log-references"?: boolean
}): Promise<number> {
  if (textCid !== undefined) {
    try {
      await addLinksToLegifranceText({
        textCid,
        logIgnoredReferencesTypes,
        logPartialReferences,
        logReferences: logReferences,
      })
    } catch (e) {
      console.error(`An error occured while adding links to ${textCid}:`)
      throw e
    }
  }

  if (cidListFilePath !== undefined) {
    const countByCid = (await fs.readJson(cidListFilePath, {
      encoding: "utf-8",
    })) as Record<string, number>
    for (const textCid of Object.keys(countByCid)) {
      try {
        await addLinksToLegifranceText({
          textCid,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences: logReferences,
        })
      } catch (e) {
        console.error(`An error occured while adding links to ${textCid}:`)
        throw e
      }
    }
  }
  return 0
}

async function addLinksToLegifranceText({
  textCid,
  logIgnoredReferencesTypes,
  logPartialReferences,
  logReferences: logReferences,
}: {
  textCid: string
  logIgnoredReferencesTypes?: boolean
  logPartialReferences?: boolean
  logReferences?: boolean
}): Promise<number> {
  for (const { data: texteVersion, id } of await legiDb<
    Array<{ data: JorfTexteVersion | LegiTexteVersion; id: string }>
  >`
    SELECT data, id
    FROM texte_version
    WHERE data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'CID' = ${textCid}
  `) {
    // TODO: Improve date.
    const date = getTexteVersionDateSignature(texteVersion)
    const outputByFieldName: {
      abro?: string
      nota?: string
      notice?: string
      signataires?: string
      sm?: string
      tp?: string
      visas?: string
    } = {}
    const existingLinksKeys = new Set(
      (
        await legiDb<
          Array<{ field_name: string; index: number; source_id: string }>
        >`
          SELECT
            field_name,
            index,
            source_id
          FROM texte_lien_extrait
          WHERE
            source_id = ${id}
        `
      ).map(({ field_name, index, source_id }) =>
        JSON.stringify([source_id, field_name, index]),
      ),
    )
    for (const [fieldName, input] of [
      ["abro", texteVersion.ABRO?.CONTENU],
      ["nota", (texteVersion as LegiTexteVersion).NOTA?.CONTENU],
      ["notice", (texteVersion as JorfTexteVersion).NOTICE?.CONTENU],
      ["signataires", (texteVersion as LegiTexteVersion).SIGNATAIRES?.CONTENU],
      ["sm", (texteVersion as JorfTexteVersion).SM?.CONTENU],
      ["tp", texteVersion.TP?.CONTENU],
      ["visas", (texteVersion as LegiTexteVersion).VISAS?.CONTENU],
    ] as Array<[keyof typeof outputByFieldName, string | undefined]>) {
      if (input !== undefined) {
        const { output } = await addLinksToHtml({
          date,
          europeDb,
          html: input,
          legiDb,
          linkBaseUrl,
          linkType,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences,
          onLink: makeOnLink(existingLinksKeys, fieldName, id),
          state: {
            defaultTextId: textCid,
          },
        })
        if (output !== null) {
          outputByFieldName[fieldName] = output
        }
      }
    }
    for (const obsoleteLinkKey of existingLinksKeys) {
      const [sourceId, fieldName, index] = JSON.parse(obsoleteLinkKey) as [
        string,
        string,
        number,
      ]
      await legiDb`
        DELETE FROM texte_lien_extrait
        WHERE
          field_name = ${fieldName}
          AND index = ${index}
          AND source_id = ${sourceId}
      `
    }
    if (
      Object.values(outputByFieldName).every((output) => output === undefined)
    ) {
      await legiDb`
        DELETE FROM texte_contenu_avec_liens
        WHERE id = ${id}
      `
    } else {
      await legiDb`
        INSERT INTO texte_contenu_avec_liens (
          id,
          abro,
          date_extraction_liens,
          nota,
          notice,
          signataires,
          sm,
          tp,
          visas
        ) VALUES (
          ${id},
          ${outputByFieldName.abro ?? null},
          ${today},
          ${outputByFieldName.nota ?? null},
          ${outputByFieldName.notice ?? null},
          ${outputByFieldName.signataires ?? null},
          ${outputByFieldName.sm ?? null},
          ${outputByFieldName.tp ?? null},
          ${outputByFieldName.visas ?? null}
        )
        ON CONFLICT (id)
        DO UPDATE SET
          abro = excluded.abro,
          date_extraction_liens = excluded.date_extraction_liens,
          nota = excluded.nota,
          notice = excluded.notice,
          signataires = excluded.signataires,
          sm = excluded.sm,
          tp = excluded.tp,
          visas = excluded.visas
      `
    }
  }

  const articlesByNum = new Map<
    string | undefined,
    Array<JorfArticleExtended | LegiArticleExtended>
  >()
  for await (const articleRows of legiDb<
    Array<{ data: JorfArticle | LegiArticle; num: string | null }>
  >`
    SELECT data, num
    FROM article
    WHERE data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${textCid}
  `.cursor(100)) {
    for (const articleRow of articleRows) {
      const article = extendLoadedArticle(articleRow)
      let articles = articlesByNum.get(article.num)
      if (articles === undefined) {
        articles = []
        articlesByNum.set(article.num, articles)
      }
      articles.push(article)
    }
  }
  const articlesSortedByDateSortedByNum = articlesByNum
    .keys()
    .toArray()
    .sort((num1, num2) => sortArticlesNumbers(num1 ?? "", num2 ?? ""))
    .map((num) =>
      articlesByNum.get(num)!.sort((article1, article2) => {
        const date1 = getArticleDateSignature(article1)
        const date2 = getArticleDateSignature(article2)
        if (date1 !== date2) {
          return date1.localeCompare(date2)
        }
        const metaCommun1 = article1.META.META_COMMUN
        const metaCommun2 = article2.META.META_COMMUN
        const nature1 = metaCommun1.ORIGINE
        const nature2 = metaCommun2.ORIGINE
        if (nature1 === "JORF" && nature2 !== "JORF") {
          // Put JORF article after LEGI article with the same date,
          // because we assume that the LEGI article is an "article
          // de versement" that must be hidden when looking for the
          // most recent article created before a given date.
          return 1
        }
        if (nature1 !== "JORF" && nature2 === "JORF") {
          // Put JORF article after LEGI article with the same date,
          // because we assume that the LEGI article is an "article
          // de versement" that must be hidden when looking for the
          // most recent article created before a given date.
          return -1
        }

        // Assume that in VERSIONS.VERSION, articles are sorted by date
        // (except for the JORF one that is always last).
        const id1 = metaCommun1.ID
        const id2 = metaCommun2.ID
        if (id1 === id2) {
          return 0
        }
        const version1Index = article1.VERSIONS.VERSION.findIndex(
          (version) => version.LIEN_ART["@id"] === id1,
        )
        assert.notStrictEqual(version1Index, -1)
        const version1 = article1.VERSIONS.VERSION[version1Index]
        const version2Index = article2.VERSIONS.VERSION.findIndex(
          (version) => version.LIEN_ART["@id"] === id2,
        )
        assert.notStrictEqual(version2Index, -1)
        const version2 = article2.VERSIONS.VERSION[version2Index]
        if (
          version1["@etat"] === "MODIFIE_MORT_NE" &&
          version2["@etat"] !== "MODIFIE_MORT_NE"
        ) {
          // A MODIFIE_MORT_NE article is put first to be hidden when looking for the most recent
          // article created before a given date.
          return -1
        }
        if (
          version1["@etat"] !== "MODIFIE_MORT_NE" &&
          version2["@etat"] === "MODIFIE_MORT_NE"
        ) {
          // A MODIFIE_MORT_NE article is put first to be hidden when looking for the most recent
          // article created before a given date.
          return 1
        }
        if (
          nature1 === "JORF" &&
          version1Index === article1.VERSIONS.VERSION.length - 1
        ) {
          return -1
        }
        if (
          nature2 === "JORF" &&
          version2Index === article2.VERSIONS.VERSION.length - 1
        ) {
          return -1
        }
        return version1Index - version2Index
      }),
    )

  const defaultArticleContext: TextLinksParserState = {
    defaultTextId: textCid,
  }
  for (const [
    numIndex,
    articlesSortedByDate,
  ] of articlesSortedByDateSortedByNum.entries()) {
    for (const article of articlesSortedByDate) {
      const id = article.META.META_COMMUN.ID
      // TODO: Improve date.
      const date = getArticleDateSignature(article)
      const previousArticle = getPreviousArticle(
        articlesSortedByDateSortedByNum,
        numIndex,
        date,
      )
      const articleBlocTextuelContext =
        previousArticle === undefined
          ? structuredClone(defaultArticleContext)
          : ((
              await legiDb<
                Array<{ next_article_context: TextLinksParserState }>
              >`
                SELECT next_article_context
                FROM article_contenu_avec_liens
                WHERE id = ${previousArticle.META.META_COMMUN.ID}
              `
            )[0]?.next_article_context ??
            structuredClone(defaultArticleContext))
      const outputByFieldName: {
        bloc_textuel?: string
        nota?: string
      } = {}
      const existingLinksKeys = new Set(
        (
          await legiDb<
            Array<{ field_name: string; index: number; source_id: string }>
          >`
            SELECT
              field_name,
              index,
              source_id
            FROM article_lien_extrait
            WHERE
              source_id = ${id}
          `
        ).map(({ field_name, index, source_id }) =>
          JSON.stringify([source_id, field_name, index]),
        ),
      )

      const blocTextuelContenu = article.BLOC_TEXTUEL?.CONTENU
      if (blocTextuelContenu !== undefined) {
        const { output } = await addLinksToHtml({
          date,
          europeDb,
          html: blocTextuelContenu,
          legiDb,
          linkBaseUrl,
          linkType,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences,
          onLink: makeOnLink(existingLinksKeys, "bloc_textuel", id),
          state: articleBlocTextuelContext,
        })
        if (output !== null) {
          outputByFieldName.bloc_textuel = output
        }
      }

      const notaContenu = (article as LegiArticle).NOTA?.CONTENU
      if (notaContenu !== undefined) {
        const { output } = await addLinksToHtml({
          date,
          europeDb,
          html: notaContenu,
          legiDb,
          linkBaseUrl,
          linkType,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences,
          onLink: makeOnLink(existingLinksKeys, "bloc_textuel", id),
          state: structuredClone(defaultArticleContext),
        })
        if (output !== null) {
          outputByFieldName.nota = output
        }
      }

      for (const obsoleteLinkKey of existingLinksKeys) {
        const [sourceId, fieldName, index] = JSON.parse(obsoleteLinkKey) as [
          string,
          string,
          number,
        ]
        await legiDb`
          DELETE FROM article_lien_extrait
          WHERE
            field_name = ${fieldName}
            AND index = ${index}
            AND source_id = ${sourceId}
        `
      }
      if (
        Object.values(outputByFieldName).every((output) => output === undefined)
      ) {
        await legiDb`
          DELETE FROM article_contenu_avec_liens
          WHERE id = ${id}
        `
      } else {
        await legiDb`
          INSERT INTO article_contenu_avec_liens (
            id,
            bloc_textuel,
            date_extraction_liens,
            next_article_context,
            nota
          ) VALUES (
            ${id},
            ${outputByFieldName.bloc_textuel ?? null},
            ${today},
            ${legiDb.json((articleBlocTextuelContext as unknown as JSONValue) ?? null)},
            ${outputByFieldName.nota ?? null}
          )
          ON CONFLICT (id)
          DO UPDATE SET
            bloc_textuel = excluded.bloc_textuel,
            date_extraction_liens = excluded.date_extraction_liens,
            next_article_context = excluded.next_article_context,
            nota = excluded.nota
        `
      }
    }
  }
  return 0
}

function getPreviousArticle(
  articlesSortedByDateSortedByNum: (JorfArticle | LegiArticle)[][],
  numIndex: number,
  date: string,
): JorfArticle | LegiArticle | undefined {
  for (
    let previousNumIndex = numIndex - 1;
    previousNumIndex >= 0;
    previousNumIndex--
  ) {
    const articlesSortedByDate =
      articlesSortedByDateSortedByNum[previousNumIndex]
    for (const article of articlesSortedByDate.toReversed()) {
      if (getArticleDateSignature(article) <= date) {
        return article
      }
    }
  }
  return undefined
}

function makeOnLink(
  existingLinksKeys: Set<string>,
  fieldName: string,
  id: string,
): (link: DefinitionOrLink, index: number) => Promise<boolean | void> {
  return async (link, index) => {
    switch (link.type) {
      case "article_definition": {
        // Ignore article definitions in Legifrance context.
        return true
      }

      case "external_article": {
        await upsertExtractedLink(existingLinksKeys, {
          field_name: fieldName,
          index,
          link,
          source_id: id,
          target_id: link.articleId ?? null,
        })
        break
      }

      case "external_division": {
        await upsertExtractedLink(existingLinksKeys, {
          field_name: fieldName,
          index,
          link,
          source_id: id,
          target_id: link.sectionTaId ?? null,
        })
        break
      }

      case "european_text": {
        await upsertExtractedLink(existingLinksKeys, {
          field_name: fieldName,
          index,
          link,
          source_id: id,
          target_id: link.titleId ?? null,
        })
        break
      }

      case "external_text": {
        await upsertExtractedLink(existingLinksKeys, {
          field_name: fieldName,
          index,
          link,
          source_id: id,
          target_id: link.text.cid ?? null,
        })
        break
      }

      case "internal_article": {
        // No DB upsert for internal article links.
        break
      }
    }
    return false
  }
}

async function upsertExtractedLink(
  existingLinksKeys: Set<string>,
  { field_name, index, link, source_id, target_id }: ExtractedLinkDb,
): Promise<void> {
  existingLinksKeys.delete(JSON.stringify([source_id, field_name, index]))
  await legiDb`
    INSERT INTO ${legiDb(source_id.slice(4, 8) === "ARTI" ? "article_lien_extrait" : "texte_lien_extrait")} (
      field_name,
      index,
      link,
      source_id,
      target_id
    ) VALUES (
      ${field_name},
      ${index},
      ${legiDb.json(link as unknown as JSONValue)},
      ${source_id},
      ${target_id}
    )
    ON CONFLICT (source_id, field_name, index)
    DO UPDATE SET
      link = excluded.link,
      target_id = excluded.target_id
  `
}

sade("add_links_to_legifrance", true)
  .describe("Add links to Légifrance texts and articles")
  .option("-c, --cid", "Common ID of a Légifrance text")
  .option("-I, --log-ignored", "Log ignored references types")
  .option(
    "-l, --cid-list",
    "File containing a list of Common IDs of Légifrance texts",
  )
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .action(async (options) => {
    process.exit(await addLinksToLegifrance(options))
  })
  .parse(process.argv)
