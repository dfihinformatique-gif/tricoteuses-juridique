import type {
  Document,
  DocumentFileInfos,
  DocumentFilesIndex,
} from "@tricoteuses/assemblee"

export interface DocumentPageInfos {
  document: Document
  documentFileInfos: DocumentFileInfos
  documentFilesIndex: DocumentFilesIndex
  documentHtml: string
}
