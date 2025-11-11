import fs from "fs-extra"
import sade from "sade"

import {
  definitionArticleDansProjetOuPropositionLoi,
  definitionDivision,
  isTextAstDivision,
  TextParserContext,
  type TableOfContents,
  type TableOfContentsDivision,
  type TextAstArticle,
  type TextAstDivision,
} from "$lib"
import { readTransformation } from "$lib/server/text_parsers/transformers"
import assert from "node:assert"

function* parseBillDefinitions(
  context: TextParserContext,
): Generator<TextAstArticle | TextAstDivision, void, unknown> {
  let candidate: RegExpExecArray | null
  const candidateRegExp = /^/gm
  while ((candidate = candidateRegExp.exec(context.input)) !== null) {
    const index = candidate.index
    context.offset = index

    const definitionArticleAst = definitionArticleDansProjetOuPropositionLoi(
      context,
    ) as TextAstArticle | undefined
    if (definitionArticleAst !== undefined) {
      yield definitionArticleAst
      candidateRegExp.lastIndex = definitionArticleAst.position.stop
    }

    const definitionDivisionAst = definitionDivision(context) as
      | TextAstDivision
      | undefined
    if (definitionDivisionAst !== undefined) {
      yield definitionDivisionAst
      candidateRegExp.lastIndex = definitionDivisionAst.position.stop
    }

    // Increment candidateRegExp.lastIndex, because regexp has zero length.
    candidateRegExp.lastIndex++
    continue
  }
}

async function simplifiedHtmlBillToTableOfContents(
  htmlBillPath: string,
  transformationDir: string,
  tableOfContentsPath: string,
): Promise<number> {
  const htmlBill = await fs.readFile(htmlBillPath, { encoding: "utf-8" })
  const transformation = readTransformation(htmlBill, transformationDir)
  const textBill = transformation.output
  const context = new TextParserContext(textBill)

  const tableOfContents: TableOfContents = {}
  const tableOfContentsStack: TableOfContentsDivision[] = []
  for await (const definition of parseBillDefinitions(context)) {
    if (isTextAstDivision(definition)) {
      const divisionIndex = tableOfContentsStack.findIndex(
        ({ type }) => type === definition.type,
      )
      if (divisionIndex !== -1) {
        tableOfContentsStack.splice(divisionIndex)
      }
      const currentTableOfContentsLevel:
        | TableOfContents
        | TableOfContentsDivision =
        tableOfContentsStack.at(-1) ?? tableOfContents
      if (currentTableOfContentsLevel.divisions === undefined) {
        currentTableOfContentsLevel.divisions = []
      }
      const tableOfContentsDivision = {
        line:
          context.text(definition.position) +
          (definition.definitionSuffix ?? ""),
        type: definition.type,
      }
      currentTableOfContentsLevel.divisions.push(tableOfContentsDivision)
      tableOfContentsStack.push(tableOfContentsDivision)
    } else {
      assert.strictEqual(definition.type, "article")
      const currentTableOfContentsLevel:
        | TableOfContents
        | TableOfContentsDivision =
        tableOfContentsStack.at(-1) ?? tableOfContents
      if (currentTableOfContentsLevel.articles === undefined) {
        currentTableOfContentsLevel.articles = []
      }
      currentTableOfContentsLevel.articles.push({
        line:
          context.text(definition.position) +
          (definition.definitionSuffix ?? ""),
        type: "article",
      })
    }
  }

  await fs.writeJson(tableOfContentsPath, tableOfContents, {
    encoding: "utf-8",
    spaces: 2,
  })

  return 0
}

sade(
  "simplified_html_bill_to_table_of_contents <html_bill> <transformation_dir> <table_of_contents>",
  true,
)
  .describe("Extract the table of contents from a HTML bill simplified to text")
  .action(async (htmlBillPath, transformationDir, tableOfContentsPath) => {
    process.exit(
      await simplifiedHtmlBillToTableOfContents(
        htmlBillPath,
        transformationDir,
        tableOfContentsPath,
      ),
    )
  })
  .parse(process.argv)
