import {
  gitPathFromId,
  JorfArticle,
  JorfTexteVersion,
  LegiArticle,
  LegiTexteVersion,
} from "@tricoteuses/legifrance"
import assert from "node:assert"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import { legiDb } from "$lib/server/databases/index.js"
import { iterTextLinks } from "$lib/server/text_links.js"
import { TextParserContext } from "$lib/text_parsers/parsers.js"
import { simplifyHtml } from "$lib/text_parsers/simplifiers.js"
import { iterOriginalMergedPositionsFromTransformed } from "$lib/text_parsers/transformers.js"

const today = new Date().toISOString().split("T")[0]

async function addLinksToHtml(
  id: string,
  inputHtml: string,
  {
    date,
    defaultTextId,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
  }: {
    date: string
    defaultTextId: string
    logIgnoredReferencesTypes?: boolean
    logPartialReferences?: boolean
    logReferences?: boolean
  },
): Promise<string> {
  const transformation = simplifyHtml({ removeAWithHref: true })(inputHtml)
  const inputText = transformation.output
  const context = new TextParserContext(inputText)
  const originalPositionsFromTransformedIterator =
    iterOriginalMergedPositionsFromTransformed(transformation)
  // Initialize iterator by sending a dummy value and ignoring the result.
  originalPositionsFromTransformedIterator.next({ start: 0, stop: 0 })
  let output = inputHtml
  let outputOffset = 0

  for await (const link of iterTextLinks(context, {
    date,
    defaultTextId, // TODO: Replace with undefined,
    logIgnoredReferencesTypes,
    logPartialReferences,
    logReferences,
  })) {
    switch (link.type) {
      case "article_definition": {
        // Example: LEGIARTI000006312473
        // La gestion comptable et financière du fonds national de garantie des calamités agricoles est assurée selon les dispositions de l'article L. 431-11 du code des assurances ci-après reproduit :
        //
        // Art. L. 431-11 - La gestion comptable et financière du fonds national de garantie des calamités agricoles mentionné à l'article L. 442-1 est assurée par la caisse centrale de réassurance dans un compte distinct de ceux qui retracent les autres opérations pratiquées par cet établissement.
        //
        // => Ignore it.
        break
      }

      case "external_article": {
        const { articleId, position: articlePosition } = link
        if (articleId !== undefined) {
          const result =
            originalPositionsFromTransformedIterator.next(articlePosition)
          if (result.done) {
            throw new Error(
              `In ${id}, transformation of link to article ${articleId} position to HTML failed: ${articlePosition}`,
            )
          }
          const articleReverseTransformation = result.value
          const original =
            (articleReverseTransformation.innerPrefix ?? "") +
            output.slice(
              articleReverseTransformation.position.start + outputOffset,
              articleReverseTransformation.position.stop + outputOffset,
            ) +
            (articleReverseTransformation.innerSuffix ?? "")
          const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(articleId, ".md")}">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              articleReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              articleReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (articleReverseTransformation.position.stop -
              articleReverseTransformation.position.start)
        }
        break
      }

      case "external_division": {
        const { position: divisionPosition, sectionTaId } = link
        if (sectionTaId !== undefined) {
          const result =
            originalPositionsFromTransformedIterator.next(divisionPosition)
          if (result.done) {
            throw new Error(
              `In ${id}, transformation of division position to HTML failed: ${divisionPosition}`,
            )
          }
          const divisionReverseTransformation = result.value
          const original =
            (divisionReverseTransformation.innerPrefix ?? "") +
            output.slice(
              divisionReverseTransformation.position.start + outputOffset,
              divisionReverseTransformation.position.stop + outputOffset,
            ) +
            (divisionReverseTransformation.innerSuffix ?? "")
          const replacement = `${divisionReverseTransformation.outerPrefix ?? ""}<a class="lien_division_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(sectionTaId, ".md")}">${original}</a>${divisionReverseTransformation.outerSuffix ?? ""}`
          output =
            output.slice(
              0,
              divisionReverseTransformation.position.start + outputOffset,
            ) +
            replacement +
            output.slice(
              divisionReverseTransformation.position.stop + outputOffset,
            )
          outputOffset +=
            replacement.length -
            (divisionReverseTransformation.position.stop -
              divisionReverseTransformation.position.start)
        }
        break
      }

      case "external_text": {
        const { text, position: textPosition } = link
        if (text.cid === undefined) {
          if (text.relative !== 0) {
            // It is not "la présente loi".
            console.error(
              `In ${id}, link to text "${context.text(text.position)}" without CID: ${JSON.stringify(text, null, 2)}`,
            )
          }
          continue
        }

        const result =
          originalPositionsFromTransformedIterator.next(textPosition)
        if (result.done) {
          throw new Error(
            `In ${id}, transformation of text position to HTML failed: ${textPosition}`,
          )
        }
        const textReverseTransformation = result.value
        const original =
          (textReverseTransformation.innerPrefix ?? "") +
          output.slice(
            textReverseTransformation.position.start + outputOffset,
            textReverseTransformation.position.stop + outputOffset,
          ) +
          (textReverseTransformation.innerSuffix ?? "")
        const replacement = `${textReverseTransformation.outerPrefix ?? ""}<a class="lien_texte_externe" href="https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/${gitPathFromId(text.cid!, ".md")}">${original}</a>${textReverseTransformation.outerSuffix ?? ""}`
        output =
          output.slice(
            0,
            textReverseTransformation.position.start + outputOffset,
          ) +
          replacement +
          output.slice(textReverseTransformation.position.stop + outputOffset)
        outputOffset +=
          replacement.length -
          (textReverseTransformation.position.stop -
            textReverseTransformation.position.start)
        break
      }

      case "internal_article": {
        const { definition, position: articlePosition } = link
        const result =
          originalPositionsFromTransformedIterator.next(articlePosition)
        if (result.done) {
          throw new Error(
            `In ${id}, transformation of article position to HTML failed: ${articlePosition}`,
          )
        }
        const articleReverseTransformation = result.value
        const original =
          (articleReverseTransformation.innerPrefix ?? "") +
          output.slice(
            articleReverseTransformation.position.start + outputOffset,
            articleReverseTransformation.position.stop + outputOffset,
          ) +
          (articleReverseTransformation.innerSuffix ?? "")
        const replacement = `${articleReverseTransformation.outerPrefix ?? ""}<a class="lien_article_interne" href="#definition_article_${definition.textId}_${definition.article.num!}" style="background-color: #eae462">${original}</a>${articleReverseTransformation.outerSuffix ?? ""}`
        output =
          output.slice(
            0,
            articleReverseTransformation.position.start + outputOffset,
          ) +
          replacement +
          output.slice(
            articleReverseTransformation.position.stop + outputOffset,
          )
        outputOffset +=
          replacement.length -
          (articleReverseTransformation.position.stop -
            articleReverseTransformation.position.start)
        break
      }

      default: {
        assertNever("Link", link)
      }
    }
  }
  return output
}

async function addLinksToLegifrance(
  textCid: string,
  {
    "log-ignored": logIgnoredReferencesTypes,
    "log-partial": logPartialReferences,
    "log-references": logReferences,
  }: {
    "log-ignored"?: boolean
    "log-partial"?: boolean
    "log-references"?: boolean
  },
): Promise<number> {
  for (const { data: texteVersion, id } of await legiDb<
    Array<{ data: JorfTexteVersion | LegiTexteVersion; id: string }>
  >`
    SELECT data, id
    FROM texte_version
    WHERE data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'CID' = ${textCid}
  `) {
    // TODO: Improve date.
    const date = texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
    assert.notStrictEqual(date, undefined)
    const outputByFieldName: {
      abro?: string
      nota?: string
      notice?: string
      signataires?: string
      sm?: string
      tp?: string
      visas?: string
    } = {}
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
        const output = await addLinksToHtml(id, input, {
          date,
          defaultTextId: textCid,
          logIgnoredReferencesTypes,
          logPartialReferences,
          logReferences,
        })
        if (output !== input) {
          outputByFieldName[fieldName] = output
        }
      }
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

  for await (const articleRows of legiDb<
    Array<{ data: JorfArticle | LegiArticle; id: string }>
  >`
    SELECT data, id
    FROM article
    WHERE data -> 'CONTEXTE' -> 'TEXTE' ->> '@cid' = ${textCid}
  `.cursor(100)) {
    for (const { data: article, id } of articleRows) {
      // TODO: Improve date.
      const date = article.META.META_SPEC.META_ARTICLE.DATE_DEBUT
      const outputByFieldName: {
        bloc_textuel?: string
        nota?: string
      } = {}
      for (const [fieldName, input] of [
        ["bloc_textuel", article.BLOC_TEXTUEL?.CONTENU],
        ["nota", (article as LegiArticle).NOTA?.CONTENU],
      ] as Array<[keyof typeof outputByFieldName, string | undefined]>) {
        if (input !== undefined) {
          const output = await addLinksToHtml(id, input, {
            date,
            defaultTextId: textCid,
            logIgnoredReferencesTypes,
            logPartialReferences,
            logReferences,
          })
          if (output !== input) {
            outputByFieldName[fieldName] = output
          }
        }
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
            nota
          ) VALUES (
            ${id},
            ${outputByFieldName.bloc_textuel ?? null},
            ${today},
            ${outputByFieldName.nota ?? null}
          )
          ON CONFLICT (id)
          DO UPDATE SET
            bloc_textuel = excluded.bloc_textuel,
            date_extraction_liens = excluded.date_extraction_liens,
            nota = excluded.nota
        `
      }
    }
  }
  return 0
}

sade("add_links_to_legifrance <text_cid>", true)
  .describe("Add links to Légifrance texts and articles")
  .option("-I, --log-ignored", "Log ignored references types")
  .option("-P, --log-partial", "Log incomplete references")
  .option("-R, --log-references", "Log parsed references")
  .action(async (textCid, options) => {
    process.exit(await addLinksToLegifrance(textCid, options))
  })
  .parse(process.argv)
