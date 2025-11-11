import type {
  Document,
  DocumentFileInfos,
  DocumentFilesIndex,
} from "@tricoteuses/assemblee"
import type { TableOfContentsPositioned } from "@tricoteuses/tisseuse"

export interface DocumentPageInfos {
  document: Document
  documentFileInfos: DocumentFileInfos
  documentFilesIndex: DocumentFilesIndex
  documentHtml: string
  documentSegmentation?: TableOfContentsPositioned
}
