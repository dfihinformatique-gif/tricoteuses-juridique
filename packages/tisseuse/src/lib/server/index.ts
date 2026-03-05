export {
  simplifyWordHtml,
  simplifyWordHtmlToDocument,
  type SimplifyHtmlOptions,
} from "./html_simplifier.js"

export { addLinksOrReferencesToHtmlFile } from "./linkers/html.js"

export {
  addPositionsToTableOfContentsFile,
  simplifiedHtmlBillFileToTableOfContentsFile,
} from "./tables_of_contents.js"

export {
  readTransformation,
  writeTransformation,
} from "./text_parsers/transformers.js"
