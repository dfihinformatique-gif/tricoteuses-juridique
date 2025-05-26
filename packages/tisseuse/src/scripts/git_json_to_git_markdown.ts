import {
  auditChain,
  auditFunction,
  auditRequire,
  auditTest,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { assertNever } from "$lib/asserts.js"
import {
  extractOrigineFromId,
  extractTypeFromId,
  gitPathFromId,
  type IdType,
} from "$lib/legal/ids.js"
import { bestItemForDate, walkContexteTexteTm } from "$lib/legal/index.js"
import {
  walkJoTm,
  type Jo,
  type JoLienTxt,
  type JorfArticle,
  type JorfArticleTm,
  type JorfSectionTa,
  type JorfSectionTaLienSectionTa,
  type JorfSectionTaTm,
  type JorfTexte,
  type JoTm,
} from "$lib/legal/jorf.js"
import type {
  LegiArticle,
  LegiArticleMetaArticle,
  LegiArticleTm,
  LegiMetaTexteVersion,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaTm,
  LegiTexte,
  LegiTextelrLienArt,
} from "$lib/legal/legi.js"
import type { LegalObjectReferences } from "$lib/legal/references.js"
import {
  markdownVariantsBlockFromArticle,
  markdownVariantsBlockFromJo,
  markdownVariantsBlockFromSectionTa,
  markdownVariantsBlockFromTexteVersion,
} from "$lib/markdown/blocks.js"
import {
  escapeMarkdownLinkTitle,
  escapeMarkdownLinkUrl,
  escapeMarkdownText,
  escapeMarkdownTitle,
} from "$lib/markdown/escapes.js"
import config from "$lib/server/config.js"
import { licence } from "$lib/server/nodegit/repositories.js"
import {
  dilaDateRegExp,
  iterCommitsOids,
  iterSourceCommitsWithSameDilaDate,
  type Origine,
} from "$lib/server/nodegit/commits.js"
import {
  getOidFromIdTree,
  readOidBySplitPathTree,
  removeOidBySplitPathTreeEmptyNodes,
  setOidInIdTree,
  walkPreviousAndCurrentOidByIdTrees,
  writeOidBySplitPathTree,
  type OidBySplitPathTree,
} from "$lib/server/nodegit/trees.js"
import { cleanHtmlFragment } from "$lib/strings.js"

type ReferenceMarkdown =
  | {
      children?: undefined
      id?: string
      markdown: string
    }
  | {
      children: ReferenceMarkdown[]
      id?: string
      markdown: string
    }

type SourceRepositorySymbol = "references" | "json"

const { forgejo } = config

async function* convertArticleOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  origine: Origine,
  articleDir: string,
  article: JorfArticle | LegiArticle,
): AsyncGenerator<ReferenceMarkdown, void> {
  const texte = article.CONTEXTE.TEXTE
  yield* convertOutgoingReferenceToMarkdown(
    referenceById,
    jsonOidByIdTree,
    jsonRepository,
    articleDir,
    texte["@cid"],
    { label: "Texte" },
  )
  const titreTxtArray = texte.TITRE_TXT
  if (titreTxtArray !== undefined) {
    for (const titreTxt of titreTxtArray) {
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        articleDir,
        titreTxt["@id_txt"],
        { label: "Titre texte" },
      )
    }
  }
  const tm = texte.TM
  if (tm !== undefined) {
    yield* convertContexteTexteTmOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      articleDir,
      tm,
      { label: "Fil d'ariane" },
    )
  }
  const liens = (article as LegiArticle).LIENS
  if (liens !== undefined) {
    for (const lien of liens.LIEN) {
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        articleDir,
        lien["@id"],
        {
          label: ["Lien", lien["@typelien"], lien["@sens"]]
            .filter((item) => item !== undefined)
            .join(" "),
        },
      )
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        articleDir,
        lien["@cidtexte"],
        { label: "Lien texte" },
      )
    }
  }
  yield {
    children: (
      await Promise.all(
        article.VERSIONS.VERSION.map(
          async (version) =>
            await Array.fromAsync(
              convertOutgoingReferenceToMarkdown(
                referenceById,
                jsonOidByIdTree,
                jsonRepository,
                articleDir,
                version.LIEN_ART["@id"],
              ),
            ),
        ),
      )
    ).flat(),
    markdown: "Versions",
  }
}

async function convertArticleToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  origine: Origine,
  article: JorfArticle | LegiArticle,
): Promise<nodegit.Oid> {
  const metaArticle = article.META.META_SPEC.META_ARTICLE
  const metaCommun = article.META.META_COMMUN
  const articleId = metaCommun.ID
  const articleDir = path.dirname(gitPathFromId(articleId, ".md"))
  const referenceById = { ...referrerById }

  const articleNumber = metaArticle.NUM
  const texte = article.CONTEXTE.TEXTE
  const markdownContexteTexteTitleContentArray =
    markdownTitleContentArrayFromContexteTexte(articleDir, texte)
  const tm = texte.TM
  let tmBreadcrumb: string | undefined = undefined
  if (tm !== undefined) {
    switch (origine) {
      case "JORF": {
        tmBreadcrumb = markdownTreeFromTmWithSingleTitre(
          articleDir,
          tm as JorfArticleTm,
        )
        break
      }
      case "LEGI": {
        tmBreadcrumb = markdownTreeFromTmWithTitreArray(
          articleDir,
          tm as LegiArticleTm,
          metaArticle.DATE_DEBUT,
        )
        break
      }
      default: {
        assertNever("Symbol", origine)
      }
    }
  }

  const outgoingReferenceMarkdownArray = await Array.fromAsync(
    convertArticleOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      articleDir,
      article,
    ),
  )

  const nota = await cleanHtmlFragment((article as LegiArticle).NOTA?.CONTENU)
  const articleMarkdown = [
    dedent`
      ---
      ${[
        ["Nature", metaCommun.NATURE],
        ["Numéro", metaArticle.NUM],
        ["Type", metaArticle.TYPE],
        ["État", (metaArticle as LegiArticleMetaArticle).ETAT],
        ["Date de début", metaArticle.DATE_DEBUT],
        ["Date de fin", metaArticle.DATE_FIN],
        ["Identifiant", articleId],
        ["Origine", metaCommun.ORIGINE],
        ["Ancien identifiant", metaCommun.ANCIEN_ID],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---
    `,
    markdownContexteTexteTitleContentArray
      .map((title) => `## ${title}`)
      .join("\n"),
    tmBreadcrumb,
    articleNumber === undefined
      ? undefined
      : `# ${escapeMarkdownTitle(`Article ${articleNumber}`)}`,
    await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU),
    nota === undefined ? undefined : `### Nota`,
    nota,
    ...(await Array.fromAsync(
      markdownBlocksFromLegalObjectReferences(
        referrerById,
        outgoingReferenceMarkdownArray,
        "Références faites par l'article",
        {
          ARTI: "Articles faisant référence à l'article",
          CONT: "Journaux officiels faisant référence à l'article",
          SCTA: "Sections faisant référence à l'article",
          TEXT: "Textes faisant référence à l'article",
        },
        articleDir,
        articleId,
      ),
    )),
    markdownVariantsBlockFromArticle(article),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(articleMarkdown, "utf-8"),
  )
}

async function* convertContexteTexteTmOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  origine: Origine,
  articleDir: string,
  articleTm: JorfArticleTm | JorfSectionTaTm | LegiArticleTm | LegiSectionTaTm,
  {
    label,
  }: {
    label?: string
  } = {},
): AsyncGenerator<ReferenceMarkdown, void> {
  for (const tm of walkContexteTexteTm(articleTm)) {
    if (Array.isArray(tm.TITRE_TM)) {
      // LegiArticleTm
      if (tm.TITRE_TM.length === 1) {
        yield* convertOutgoingReferenceToMarkdown(
          referenceById,
          jsonOidByIdTree,
          jsonRepository,
          articleDir,
          tm.TITRE_TM[0]["@id"],
          {
            label,
          },
        )
      } else {
        yield {
          children: (
            await Promise.all(
              tm.TITRE_TM.map(
                async (titreTm) =>
                  await Array.fromAsync(
                    convertOutgoingReferenceToMarkdown(
                      referenceById,
                      jsonOidByIdTree,
                      jsonRepository,
                      articleDir,
                      titreTm["@id"],
                    ),
                  ),
              ),
            )
          ).flat(),
          markdown: label ?? "Sections alternatives",
        }
      }
    } else {
      // JorfArticleTm
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        articleDir,
        tm.TITRE_TM["@id"],
        {
          label,
        },
      )
    }
  }
}

async function convertIncomingArticleReferencesToMarkdown(
  articleId: string,
  article: JorfArticle | LegiArticle,
  referrentDir: string,
  referrentId: string,
): Promise<ReferenceMarkdown> {
  const children: ReferenceMarkdown[] = []

  const texte = article.CONTEXTE.TEXTE
  if (texte["@cid"] === referrentId) {
    children.push({ markdown: "Texte" })
  }
  const titreTxtArray = texte.TITRE_TXT
  if (titreTxtArray !== undefined) {
    for (const titreTxt of titreTxtArray) {
      if (titreTxt["@id_txt"] === referrentId) {
        children.push({ markdown: "Titre texte" })
      }
    }
  }
  if (texte.TM !== undefined) {
    for (const tm of walkContexteTexteTm(texte.TM)) {
      if (Array.isArray(tm.TITRE_TM)) {
        // LegiArticle
        for (const titreTm of tm.TITRE_TM) {
          if (titreTm["@id"] === referrentId) {
            children.push({ markdown: "Fil d'ariane" })
          }
        }
      } else if (tm.TITRE_TM["@id"] === referrentId) {
        children.push({ markdown: "Fil d'ariane" })
      }
    }
  }
  const liens = (article as LegiArticle).LIENS
  if (liens !== undefined) {
    for (const lien of liens.LIEN) {
      if (lien["@id"] === referrentId) {
        children.push({
          markdown: ["Lien", lien["@typelien"], lien["@sens"]]
            .filter((item) => item !== undefined)
            .join(" "),
        })
      }
      if (lien["@cidtexte"] === referrentId) {
        children.push({
          markdown: "Lien texte",
        })
      }
    }
  }
  for (const version of article.VERSIONS.VERSION) {
    if (version.LIEN_ART["@id"] === referrentId) {
      children.push({
        markdown: "Version",
      })
    }
  }

  return {
    children,
    id: articleId,
    markdown: markdownLinkFromIdAndTitle(
      referrentDir,
      articleId,
      markdownLinkTitleFromIdAndLegalObject(articleId, article),
    ),
  }
}

async function convertIncomingJoReferencesToMarkdown(
  joId: string,
  jo: Jo,
  referrentDir: string,
  referrentId: string,
): Promise<ReferenceMarkdown> {
  const children: ReferenceMarkdown[] = []

  const structureTxt = jo.STRUCTURE_TXT
  if (structureTxt !== undefined) {
    let referenceFound = false
    const lienTxtArray = structureTxt.LIEN_TXT
    if (lienTxtArray !== undefined) {
      for (const lienTxt of lienTxtArray) {
        if (lienTxt["@idtxt"] === referrentId) {
          referenceFound = true
          break
        }
      }
    }
    if (!referenceFound && structureTxt.TM !== undefined) {
      iterTms: for (const tm of walkJoTm(structureTxt.TM)) {
        const lienTxtArray = tm.LIEN_TXT
        if (lienTxtArray !== undefined) {
          for (const lienTxt of lienTxtArray) {
            if (lienTxt["@idtxt"] === referrentId) {
              referenceFound = true
              break iterTms
            }
          }
        }
      }
    }
    if (referenceFound) {
      children.push({ markdown: "Table des matières" })
    }
  }

  return {
    children,
    id: joId,
    markdown: markdownLinkFromIdAndTitle(
      referrentDir,
      joId,
      markdownLinkTitleFromIdAndLegalObject(joId, jo),
    ),
  }
}

async function convertIncomingReferencesToMarkdown(
  referrerById: Record<string, unknown>,
  referrentDir: string,
  referrentId: string,
): Promise<ReferenceMarkdown[]> {
  const incomingReferencesMarkdown: ReferenceMarkdown[] = []
  for (const [referrerId, referrer] of Object.entries(referrerById)) {
    const referrerIdType = extractTypeFromId(referrerId)
    switch (referrerIdType) {
      case "ARTI": {
        incomingReferencesMarkdown.push(
          await convertIncomingArticleReferencesToMarkdown(
            referrerId,
            referrer as JorfArticle | LegiArticle,
            referrentDir,
            referrentId,
          ),
        )
        break
      }
      case "CONT": {
        incomingReferencesMarkdown.push(
          await convertIncomingJoReferencesToMarkdown(
            referrerId,
            referrer as Jo,
            referrentDir,
            referrentId,
          ),
        )
        break
      }

      case "SCTA": {
        incomingReferencesMarkdown.push(
          await convertIncomingSectionTaReferencesToMarkdown(
            referrerId,
            referrer as JorfSectionTa | LegiSectionTa,
            referrentDir,
            referrentId,
          ),
        )
        break
      }

      case "TEXT": {
        incomingReferencesMarkdown.push(
          await convertIncomingTexteReferencesToMarkdown(
            referrerId,
            referrer as JorfTexte | LegiTexte,
            referrentDir,
            referrentId,
          ),
        )
        break
      }

      default: {
        assertNever("Referrer ID Type", referrerIdType)
      }
    }
  }
  // TODO: Sort incomingReferencesMarkdown.
  return incomingReferencesMarkdown
}

async function convertIncomingSectionTaReferencesToMarkdown(
  sectionTaId: string,
  sectionTa: JorfSectionTa | LegiSectionTa,
  referrentDir: string,
  referrentId: string,
): Promise<ReferenceMarkdown> {
  const children: ReferenceMarkdown[] = []

  const texte = sectionTa.CONTEXTE.TEXTE
  if (texte["@cid"] === referrentId) {
    children.push({ markdown: "Texte" })
  }
  const titreTxtArray = texte.TITRE_TXT
  if (titreTxtArray !== undefined) {
    for (const titreTxt of titreTxtArray) {
      if (titreTxt["@id_txt"] === referrentId) {
        children.push({ markdown: "Titre texte" })
      }
    }
  }
  if (texte.TM !== undefined) {
    for (const tm of walkContexteTexteTm(texte.TM)) {
      if (Array.isArray(tm.TITRE_TM)) {
        // LegiArticle
        for (const titreTm of tm.TITRE_TM) {
          if (titreTm["@id"] === referrentId) {
            children.push({ markdown: "Fil d'ariane" })
          }
        }
      } else if (tm.TITRE_TM["@id"] === referrentId) {
        children.push({ markdown: "Fil d'ariane" })
      }
    }
  }
  const structure = sectionTa.STRUCTURE_TA
  if (structure !== undefined) {
    const lienArtArray = structure.LIEN_ART
    if (lienArtArray !== undefined) {
      for (const lienArt of lienArtArray) {
        if (lienArt["@id"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
      }
    }
    const lienSectionTaArray = structure.LIEN_SECTION_TA
    if (lienSectionTaArray !== undefined) {
      for (const lienSectionTa of lienSectionTaArray) {
        if (lienSectionTa["@cid"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
        if (lienSectionTa["@id"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
      }
    }
  }
  return {
    children,
    id: sectionTaId,
    markdown: markdownLinkFromIdAndTitle(
      referrentDir,
      sectionTaId,
      markdownLinkTitleFromIdAndLegalObject(sectionTaId, sectionTa),
    ),
  }
}

async function convertIncomingTexteReferencesToMarkdown(
  texteId: string,
  texte: JorfTexte | LegiTexte,
  referrentDir: string,
  referrentId: string,
): Promise<ReferenceMarkdown> {
  const children: ReferenceMarkdown[] = []

  const structure = texte.STRUCT
  if (structure !== undefined) {
    const lienArtArray = structure.LIEN_ART
    if (lienArtArray !== undefined) {
      for (const lienArt of lienArtArray) {
        if (lienArt["@id"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
      }
    }
    const lienSectionTaArray = structure.LIEN_SECTION_TA
    if (lienSectionTaArray !== undefined) {
      for (const lienSectionTa of lienSectionTaArray) {
        if (lienSectionTa["@cid"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
        if (lienSectionTa["@id"] === referrentId) {
          children.push({ markdown: "Table des matières" })
          break
        }
      }
    }
  }
  const liens = texte.META.META_SPEC.META_TEXTE_VERSION.LIENS
  if (liens !== undefined) {
    for (const lien of liens.LIEN) {
      if (lien["@id"] === referrentId) {
        children.push({
          markdown: ["Lien", lien["@typelien"], lien["@sens"]]
            .filter((item) => item !== undefined)
            .join(" "),
        })
      }
      if (lien["@cidtexte"] === referrentId) {
        children.push({
          markdown: "Lien texte",
        })
      }
    }
  }
  const versions = texte.VERSIONS?.VERSION
  if (versions !== undefined) {
    for (const version of versions) {
      if (version.LIEN_TXT["@id"] === referrentId) {
        children.push({
          markdown: "Version",
        })
      }
    }
  }
  return {
    children,
    id: texteId,
    markdown: markdownLinkFromIdAndTitle(
      referrentDir,
      texteId,
      markdownLinkTitleFromIdAndLegalObject(texteId, texte),
    ),
  }
}

async function* convertJoOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  origine: Origine,
  joDir: string,
  jo: Jo,
): AsyncGenerator<ReferenceMarkdown, void> {
  const structureTxt = jo.STRUCTURE_TXT
  if (structureTxt?.TM !== undefined) {
    const children = [
      ...(
        await Array.fromAsync(
          structureTxt.LIEN_TXT ?? [],
          async (lienTxt: JoLienTxt) => {
            return await Array.fromAsync(
              convertOutgoingReferenceToMarkdown(
                referenceById,
                jsonOidByIdTree,
                jsonRepository,
                joDir,
                lienTxt["@idtxt"],
              ),
            )
          },
        )
      ).flat(),
      ...(await Array.fromAsync(
        convertJoTmOutgoingReferencesToMarkdown(
          referenceById,
          jsonOidByIdTree,
          jsonRepository,
          joDir,
          structureTxt?.TM,
          {
            useLinkTitle: false,
          },
        ),
      )),
    ]
    yield {
      children: children.length === 0 ? undefined : children,
      markdown: "Table des matières",
    }
  }
}

async function convertJorfObjectToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  id: string,
  legalObject: unknown,
): Promise<nodegit.Oid | undefined> {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      return await convertArticleToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "JORF",
        legalObject as JorfArticle,
      )
    }
    case "CONT": {
      return await convertJoToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "JORF",
        legalObject as Jo,
      )
    }

    case "SCTA": {
      return await convertSectionTaToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "JORF",
        legalObject as JorfSectionTa,
      )
    }

    case "TEXT": {
      return await convertTexteToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "JORF",
        legalObject as JorfTexte,
      )
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }

  return undefined
}

async function* convertJoTmOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  joDir: string,
  joTmArray: JoTm[],
  {
    useLinkTitle,
  }: {
    useLinkTitle: boolean
  },
): AsyncGenerator<ReferenceMarkdown, void> {
  for (const joTm of joTmArray) {
    const children: ReferenceMarkdown[] = []
    if (joTm.LIEN_TXT !== undefined) {
      for (const lienTxt of joTm.LIEN_TXT) {
        if (useLinkTitle) {
          children.push({
            id: lienTxt["@idtxt"],
            markdown: markdownLinkFromIdAndTitle(
              joDir,
              lienTxt["@idtxt"],
              lienTxt["@titretxt"] ?? "Texte sans titre",
            ),
          })
        } else {
          for await (const referenceMarkdown of convertOutgoingReferenceToMarkdown(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            joDir,
            lienTxt["@idtxt"],
          )) {
            children.push(referenceMarkdown)
          }
        }
      }
    }
    if (joTm.TM !== undefined) {
      for await (const referenceMarkdown of convertJoTmOutgoingReferencesToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        joDir,
        joTm.TM,
        {
          useLinkTitle,
        },
      )) {
        children.push(referenceMarkdown)
      }
    }
    yield {
      children: children.length === 0 ? undefined : children,
      markdown: escapeMarkdownText(joTm.TITRE_TM),
    }
  }
}

async function convertJoToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  origine: Origine,
  jo: Jo,
): Promise<nodegit.Oid> {
  const metaCommun = jo.META.META_COMMUN
  const metaConteneur = jo.META.META_SPEC.META_CONTENEUR
  const joId = metaCommun.ID
  const joDir = path.dirname(gitPathFromId(joId, ".md"))
  const referenceById = { ...referrerById }

  const structureTxt = jo.STRUCTURE_TXT
  let tmMarkdown: string | undefined = undefined
  if (structureTxt?.TM !== undefined) {
    const tmReferenceMarkdownArray = [
      ...(structureTxt.LIEN_TXT ?? []).map((lienTxt) => ({
        id: lienTxt["@idtxt"],
        markdown: markdownLinkFromIdAndTitle(
          joDir,
          lienTxt["@idtxt"],
          lienTxt["@titretxt"] ?? "Texte sans titre",
        ),
      })),
      ...(await Array.fromAsync(
        convertJoTmOutgoingReferencesToMarkdown(
          referenceById,
          jsonOidByIdTree,
          jsonRepository,
          joDir,
          structureTxt.TM,
          {
            useLinkTitle: true,
          },
        ),
      )),
    ]
    if (tmReferenceMarkdownArray.length !== 0) {
      tmMarkdown = markdownTreeFromReferenceMarkdownArray(
        tmReferenceMarkdownArray,
      )
    }
  }

  const outgoingReferenceMarkdownArray = await Array.fromAsync(
    convertJoOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      joDir,
      jo,
    ),
  )

  const joMarkdown = [
    dedent`
      ---
      ${[
        ["Nature", metaCommun.NATURE],
        ["Numéro", metaConteneur.NUM],
        ["Date de publication", metaConteneur.DATE_PUBLI],
        ["Identifiant", joId],
        ["Origine", metaCommun.ORIGINE],
        ["ELI", metaCommun.ID_ELI],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---
    `,
    `# ${metaConteneur.TITRE}`,
    tmMarkdown,
    ...(await Array.fromAsync(
      markdownBlocksFromLegalObjectReferences(
        referrerById,
        outgoingReferenceMarkdownArray,
        "Références faites par le Journal officiel",
        {
          ARTI: "Articles faisant référence au Journal officiel",
          CONT: "Journaux officiels faisant référence au Journal officiel",
          SCTA: "Sections faisant référence au Journal officiel",
          TEXT: "Textes faisant référence au Journal officiel",
        },
        joDir,
        joId,
      ),
    )),
    markdownVariantsBlockFromJo(jo),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(joMarkdown, "utf-8"),
  )
}

async function convertLegalObjectToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  id: string,
  legalObject: unknown,
): Promise<nodegit.Oid | undefined> {
  const origine = extractOrigineFromId(id)
  switch (origine) {
    case "CNIL":
    case "JORF": {
      return convertJorfObjectToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        id,
        legalObject,
      )
    }

    case "DOLE": {
      // TODO
      // return convertDoleObjectToMarkdown(
      //   id,
      //   legalObject
      //   referrerById,
      //   targetRepository,
      // )
      return undefined
    }

    case "KALI": {
      // TODO
      // return convertKaliObjectToMarkdown(
      //   id,
      //   legalObject
      //   referrerById,
      //   targetRepository,
      // )
      return undefined
    }

    case "LEGI": {
      return convertLegiObjectToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        id,
        legalObject,
      )
    }

    default: {
      assertNever("Origine", origine)
    }
  }
}

async function convertLegiObjectToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  id: string,
  legalObject: unknown,
): Promise<nodegit.Oid | undefined> {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      return await convertArticleToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "LEGI",
        legalObject as LegiArticle,
      )
    }

    case "SCTA": {
      return await convertSectionTaToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "LEGI",
        legalObject as LegiSectionTa,
      )
    }

    case "TEXT": {
      return await convertTexteToMarkdown(
        referrerById,
        jsonOidByIdTree,
        jsonRepository,
        targetRepository,
        "LEGI",
        legalObject as LegiTexte,
      )
    }

    default: {
      console.warn(`Unexpected ID type "${idType}" in ID "${id}" of JSON file`)
      break
    }
  }

  return undefined
}

async function convertJsonTreeToMarkdown(
  previousJsonOidByIdTree: OidBySplitPathTree,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  previousReferencesOidByIdTree: OidBySplitPathTree,
  referencesOidByIdTree: OidBySplitPathTree,
  referencesRepository: nodegit.Repository,
  targetOidByIdTree: OidBySplitPathTree,
  targetRepository: nodegit.Repository,
  {
    only,
    verbose,
  }: {
    only?: string
    verbose?: boolean
  } = {},
): Promise<boolean> {
  let changed = false
  for (const { blobOid, id, previousBlobOid } of only
    ? [
        {
          blobOid: getOidFromIdTree(jsonOidByIdTree, only),
          id: only,
          previousBlobOid: getOidFromIdTree(previousJsonOidByIdTree, only),
        },
      ]
    : walkPreviousAndCurrentOidByIdTrees(
        previousJsonOidByIdTree,
        jsonOidByIdTree,
      )) {
    const previousReferences = (
      await loadJsonObject<LegalObjectReferences>(
        previousReferencesOidByIdTree,
        referencesRepository,
        id,
      )
    )?.references
    const previousReferrerOidById = Object.fromEntries(
      await Promise.all(
        (previousReferences === undefined ? [] : previousReferences).map(
          async (referrerId) => [
            referrerId,
            getOidFromIdTree(jsonOidByIdTree, referrerId),
          ],
        ),
      ),
    ) as Record<string, nodegit.Oid | undefined>

    const references = (
      await loadJsonObject<LegalObjectReferences>(
        referencesOidByIdTree,
        referencesRepository,
        id,
      )
    )?.references
    const referrerOidById = Object.fromEntries(
      await Promise.all(
        (references === undefined ? [] : references).map(async (referrerId) => [
          referrerId,
          getOidFromIdTree(jsonOidByIdTree, referrerId),
        ]),
      ),
    ) as Record<string, nodegit.Oid | undefined>

    if (
      blobOid?.tostrS() === previousBlobOid?.tostrS() &&
      Object.keys(referrerOidById).length ===
        Object.keys(previousReferrerOidById).length &&
      Object.entries(referrerOidById).every(
        ([referrerId, referrerOid]) =>
          referrerOid?.tostrS() ===
          previousReferrerOidById[referrerId]?.tostrS(),
      )
    ) {
      // Neither object nor its referrers have changed.
      continue
    }

    if (verbose) {
      console.log(`Converting ID ${id} (blob OID: ${blobOid}) to Markdown…`)
    }
    const legalObject =
      blobOid === undefined
        ? undefined
        : JSON.parse(
            (await jsonRepository.getBlob(blobOid)).content().toString("utf-8"),
          )
    const referrerById = Object.fromEntries(
      (
        await Promise.all(
          Object.entries(referrerOidById).map(
            async ([referrerId, referrerOid]) => [
              referrerId,
              referrerOid === undefined
                ? undefined
                : JSON.parse(
                    (await jsonRepository.getBlob(referrerOid))
                      .content()
                      .toString("utf-8"),
                  ),
            ],
          ),
        )
      ).filter(([, referrer]) => referrer !== undefined),
    ) as Record<string, unknown>

    if (legalObject === undefined && Object.keys(referrerById).length === 0) {
      // Object is empty and has no referrers => delete it.
      if (setOidInIdTree(targetOidByIdTree, id, undefined)) {
        changed = true
      }
    } else if (
      setOidInIdTree(
        targetOidByIdTree,
        id,
        await convertLegalObjectToMarkdown(
          referrerById,
          jsonOidByIdTree,
          jsonRepository,
          targetRepository,
          id,
          legalObject,
        ),
      )
    ) {
      changed = true
    }
  }

  return changed
}

async function* convertOutgoingReferenceToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  referrerDir: string,
  referrentId: string | undefined,
  {
    label,
    prefix,
    suffix,
  }: {
    label?: string
    prefix?: string
    suffix?: string
  } = {},
): AsyncGenerator<ReferenceMarkdown, void> {
  if (referrentId !== undefined) {
    yield {
      id: referrentId,
      markdown: `${label === undefined ? "" : `${escapeMarkdownText(label)} : `}${await markdownLinkFromOutgoingReference(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        referrerDir,
        referrentId,
        {
          prefix,
          suffix,
        },
      )}`,
    }
  }
}

async function* convertSectionTaOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  origine: Origine,
  sectionTaDir: string,
  sectionTa: JorfSectionTa | LegiSectionTa,
): AsyncGenerator<ReferenceMarkdown, void> {
  const texte = sectionTa.CONTEXTE.TEXTE
  yield* convertOutgoingReferenceToMarkdown(
    referenceById,
    jsonOidByIdTree,
    jsonRepository,
    sectionTaDir,
    texte["@cid"],
    { label: "Texte" },
  )
  const titreTxtArray = texte.TITRE_TXT
  if (titreTxtArray !== undefined) {
    for (const titreTxt of titreTxtArray) {
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        sectionTaDir,
        titreTxt["@id_txt"],
        { label: "Titre texte" },
      )
    }
  }
  const tm = texte.TM
  if (tm !== undefined) {
    yield* convertContexteTexteTmOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      sectionTaDir,
      tm,
      { label: "Fil d'ariane" },
    )
  }
  const structure = sectionTa.STRUCTURE_TA
  if (structure !== undefined) {
    const children = [
      ...(await Array.fromAsync(
        (structure.LIEN_ART ??
          []) as /* JorfSectionTaLienArt[] | */ LegiSectionTaLienArt[],
        async (lienArt) => ({
          id: lienArt["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            sectionTaDir,
            lienArt["@id"],
          ),
        }),
      )),
      ...(await Array.fromAsync(
        (structure.LIEN_SECTION_TA ?? []) as
          | JorfSectionTaLienSectionTa[]
          | LegiSectionTaLienSectionTa[],
        async (lienSectionTa) => ({
          id: lienSectionTa["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            sectionTaDir,
            lienSectionTa["@id"],
          ),
        }),
      )),
    ]
    yield {
      children,
      markdown: "Table des matières",
    }
  }
}

async function convertSectionTaToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  origine: Origine,
  sectionTa: JorfSectionTa | LegiSectionTa,
): Promise<nodegit.Oid> {
  const sectionTaId = sectionTa.ID
  const sectionTaDir = path.dirname(gitPathFromId(sectionTaId, ".md"))
  const referenceById = { ...referrerById }

  const structure = sectionTa.STRUCTURE_TA
  const texte = sectionTa.CONTEXTE.TEXTE
  const markdownContexteTexteTitleContentArray =
    markdownTitleContentArrayFromContexteTexte(sectionTaDir, texte)
  const tm = texte.TM
  let tmBreadcrumb: string | undefined = undefined
  if (tm !== undefined) {
    switch (origine) {
      case "JORF": {
        tmBreadcrumb = markdownTreeFromTmWithSingleTitre(
          sectionTaDir,
          tm as JorfArticleTm,
        )
        break
      }
      case "LEGI": {
        // Since a SectionTa has no start date, use the minimum start date of its children.
        let startDate = "2999-01-01"
        if (structure?.LIEN_ART !== undefined) {
          for (const lienArt of structure.LIEN_ART) {
            if (lienArt["@debut"] < startDate) {
              startDate = lienArt["@debut"]
            }
          }
        }
        if (structure?.LIEN_SECTION_TA !== undefined) {
          for (const lienSectionTa of structure.LIEN_SECTION_TA) {
            if (lienSectionTa["@debut"] < startDate) {
              startDate = lienSectionTa["@debut"]
            }
          }
        }

        tmBreadcrumb = markdownTreeFromTmWithTitreArray(
          sectionTaDir,
          tm as LegiArticleTm,
          startDate,
        )
        break
      }
      default: {
        assertNever("Symbol", origine)
      }
    }
  }

  let structureMarkdown: string | undefined = undefined
  if (structure !== undefined) {
    const structureReferenceMarkdownArray = [
      ...(await Array.fromAsync(
        (structure.LIEN_ART ??
          []) as /* JorfSectionTaLienArt[] | */ LegiSectionTaLienArt[],
        async (lienArt) => ({
          id: lienArt["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            sectionTaDir,
            lienArt["@id"],
            {
              inParent: true,
              linkTitle:
                lienArt["@num"] === undefined
                  ? undefined
                  : `article ${lienArt["@num"]}`,
            },
          ),
        }),
      )),
      ...(await Array.fromAsync(
        structure.LIEN_SECTION_TA ?? [],
        async (lienSectionTa) => {
          let title = lienSectionTa["#text"] ?? "Section sans titre"
          if (
            lienSectionTa["@debut"] === "2999-01-01" &&
            lienSectionTa["@fin"] === "2999-01-01"
          ) {
            // pass
          } else if (lienSectionTa["@fin"] === "2999-01-01") {
            title += ` (depuis le ${lienSectionTa["@debut"]})`
          } else {
            title += ` (du ${lienSectionTa["@debut"]} au ${lienSectionTa["@fin"]})`
          }
          return {
            id: lienSectionTa["@id"],
            markdown: markdownLinkFromIdAndTitle(
              sectionTaDir,
              lienSectionTa["@id"],
              title,
            ),
          }
        },
      )),
    ]
    if (structureReferenceMarkdownArray.length !== 0) {
      structureMarkdown = markdownTreeFromReferenceMarkdownArray(
        structureReferenceMarkdownArray,
      )
    }
  }

  const outgoingReferenceMarkdownArray = await Array.fromAsync(
    convertSectionTaOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      sectionTaDir,
      sectionTa,
    ),
  )

  const sectionTaMarkdown = [
    dedent`
      ---
      ${[["Identifiant", sectionTaId]]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---
    `,
    markdownContexteTexteTitleContentArray
      .map((title) => `## ${title}`)
      .join("\n"),
    tmBreadcrumb,
    `# ${escapeMarkdownText(sectionTa.TITRE_TA) ?? "Section sans titre"}`,
    sectionTa.COMMENTAIRE === undefined
      ? undefined
      : await cleanHtmlFragment(sectionTa.COMMENTAIRE),
    structureMarkdown,
    ...(await Array.fromAsync(
      markdownBlocksFromLegalObjectReferences(
        referrerById,
        outgoingReferenceMarkdownArray,
        "Références faites par la section",
        {
          ARTI: "Articles faisant référence à la section",
          CONT: "Journaux officiels faisant référence à la section",
          SCTA: "Sections faisant référence à la section",
          TEXT: "Textes faisant référence à la section",
        },
        sectionTaDir,
        sectionTaId,
      ),
    )),
    markdownVariantsBlockFromSectionTa(sectionTa),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(sectionTaMarkdown, "utf-8"),
  )
}

async function* convertTexteOutgoingReferencesToMarkdown(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  origine: Origine,
  texteDir: string,
  texte: JorfTexte | LegiTexte,
): AsyncGenerator<ReferenceMarkdown, void> {
  const structure = texte.STRUCT
  if (structure !== undefined) {
    const children = [
      ...(await Array.fromAsync(
        (structure.LIEN_ART ??
          []) as /* JorfSectionTaLienArt[] | */ LegiSectionTaLienArt[],
        async (lienArt) => ({
          id: lienArt["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            texteDir,
            lienArt["@id"],
          ),
        }),
      )),
      ...(await Array.fromAsync(
        (structure.LIEN_SECTION_TA ?? []) as
          | JorfSectionTaLienSectionTa[]
          | LegiSectionTaLienSectionTa[],
        async (lienSectionTa) => ({
          id: lienSectionTa["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            texteDir,
            lienSectionTa["@id"],
          ),
        }),
      )),
    ]
    yield {
      children,
      markdown: "Table des matières",
    }
  }
  const liens = texte.META.META_SPEC.META_TEXTE_VERSION.LIENS
  if (liens !== undefined) {
    for (const lien of liens.LIEN) {
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        texteDir,
        lien["@id"],
        {
          label: ["Lien", lien["@typelien"], lien["@sens"]]
            .filter((item) => item !== undefined)
            .join(" "),
        },
      )
      yield* convertOutgoingReferenceToMarkdown(
        referenceById,
        jsonOidByIdTree,
        jsonRepository,
        texteDir,
        lien["@cidtexte"],
        { label: "Lien texte" },
      )
    }
  }
  const versions = texte.VERSIONS?.VERSION
  if (versions !== undefined) {
    yield {
      children: (
        await Promise.all(
          versions.map(
            async (version) =>
              await Array.fromAsync(
                convertOutgoingReferenceToMarkdown(
                  referenceById,
                  jsonOidByIdTree,
                  jsonRepository,
                  texteDir,
                  version.LIEN_TXT["@id"],
                ),
              ),
          ),
        )
      ).flat(),
      markdown: "Versions",
    }
  }
}

async function convertTexteToMarkdown(
  referrerById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  targetRepository: nodegit.Repository,
  origine: Origine,
  texte: JorfTexte | LegiTexte,
): Promise<nodegit.Oid> {
  const metaCommun = texte.META.META_COMMUN
  const metaTexteChronicle = texte.META.META_SPEC.META_TEXTE_CHRONICLE
  const metaTexteVersion = texte.META.META_SPEC.META_TEXTE_VERSION
  const texteId = metaCommun.ID
  const texteDir = path.dirname(gitPathFromId(texteId, ".md"))
  const referenceById = { ...referrerById }

  let titles = [metaTexteVersion.TITREFULL].filter(
    (title) => title !== undefined,
  )
  if (
    metaTexteVersion.TITRE !== undefined &&
    metaTexteVersion.TITRE !== metaTexteVersion.TITREFULL
  ) {
    titles.push(metaTexteVersion.TITRE)
  }
  if (titles.length === 0) {
    titles.push("Texte sans titre")
  }
  titles = titles.map((title) =>
    title
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s+\(\d+\)$/, ""),
  )

  let structureMarkdown: string | undefined = undefined
  const structure = texte.STRUCT
  if (structure !== undefined) {
    const structureReferenceMarkdownArray = [
      ...(await Array.fromAsync(
        (structure.LIEN_ART ??
          []) as /* JorfTextelrLienArt[] | */ LegiTextelrLienArt[],
        async (lienArt) => ({
          id: lienArt["@id"],
          markdown: await markdownLinkFromOutgoingReference(
            referenceById,
            jsonOidByIdTree,
            jsonRepository,
            texteDir,
            lienArt["@id"],
            {
              inParent: true,
              linkTitle:
                lienArt["@num"] === undefined
                  ? undefined
                  : `article ${lienArt["@num"]}`,
            },
          ),
        }),
      )),
      ...(await Array.fromAsync(
        structure.LIEN_SECTION_TA ?? [],
        async (lienSectionTa) => {
          let title = lienSectionTa["#text"] ?? "Section sans titre"
          if (
            lienSectionTa["@debut"] === "2999-01-01" &&
            lienSectionTa["@fin"] === "2999-01-01"
          ) {
            // pass
          } else if (lienSectionTa["@fin"] === "2999-01-01") {
            title += ` (depuis le ${lienSectionTa["@debut"]})`
          } else {
            title += ` (du ${lienSectionTa["@debut"]} au ${lienSectionTa["@fin"]})`
          }
          return {
            id: lienSectionTa["@id"],
            markdown: markdownLinkFromIdAndTitle(
              texteDir,
              lienSectionTa["@id"],
              title,
            ),
          }
        },
      )),
    ]
    if (structureReferenceMarkdownArray.length !== 0) {
      structureMarkdown = markdownTreeFromReferenceMarkdownArray(
        structureReferenceMarkdownArray,
      )
    }
  }

  const outgoingReferenceMarkdownArray = await Array.fromAsync(
    convertTexteOutgoingReferencesToMarkdown(
      referenceById,
      jsonOidByIdTree,
      jsonRepository,
      origine,
      texteDir,
      texte,
    ),
  )

  const nota = await cleanHtmlFragment((texte as LegiTexte).NOTA?.CONTENU)
  const sm = await cleanHtmlFragment((texte as JorfTexte).SM?.CONTENU)
  const texteMarkdown = [
    dedent`
      ---
      ${[
        ["Nature", metaCommun.NATURE],
        ["État", (metaTexteVersion as LegiMetaTexteVersion)?.ETAT],
        ["Date de début", metaTexteVersion.DATE_DEBUT],
        ["Date de fin", metaTexteVersion.DATE_FIN],
        ["Identifiant", texteId],
        ["NOR", metaTexteChronicle.NOR],
        ["Ancien identifiant", metaCommun.ANCIEN_ID],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---
    `,
    titles.map((title) => `## ${escapeMarkdownTitle(title)}`).join("\n"),
    // Note: ENTREPRISE seems to not be displayed on Légifrance.
    // TODO: Should ENTREPRISE be added?
    // Note: RECT seems to not be displayed on Légifrance.
    // TODO: Should RECT be added?
    // Note: ABRO seems to not be displayed on Légifrance
    await cleanHtmlFragment((texte as JorfTexte).ABRO?.CONTENU),
    await cleanHtmlFragment((texte as JorfTexte).NOTICE?.CONTENU),
    sm === undefined ? undefined : `### Résumé`,
    sm,
    await cleanHtmlFragment(texte.VISAS?.CONTENU),
    structureMarkdown,
    await cleanHtmlFragment(texte.SIGNATAIRES?.CONTENU),
    nota === undefined ? undefined : `### Nota`,
    nota,
    await cleanHtmlFragment((texte as LegiTexte).TP?.CONTENU),
    ...(await Array.fromAsync(
      markdownBlocksFromLegalObjectReferences(
        referrerById,
        outgoingReferenceMarkdownArray,
        "Références faites par le texte",
        {
          ARTI: "Articles faisant référence au texte",
          CONT: "Journaux officiels faisant référence au texte",
          SCTA: "Sections faisant référence au texte",
          TEXT: "Textes faisant référence au texte",
        },
        texteDir,
        texteId,
      ),
    )),
    markdownVariantsBlockFromTexteVersion(texte),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  return await targetRepository.createBlobFromBuffer(
    Buffer.from(texteMarkdown, "utf-8"),
  )
}

async function getOrLoadJsonObject<ObjectType>(
  jsonObjectByIdCache: Record<string, ObjectType | null>,
  oidByIdTree: OidBySplitPathTree,
  repository: nodegit.Repository,
  id: string,
): Promise<ObjectType | undefined> {
  let jsonObject: ObjectType | undefined | null = jsonObjectByIdCache[id]
  if (jsonObject !== undefined) {
    return (jsonObject as ObjectType) ?? undefined
  }
  jsonObject = await loadJsonObject<ObjectType>(oidByIdTree, repository, id)
  jsonObjectByIdCache[id] = jsonObject ?? null
  return jsonObject
}

async function gitJsonToGitMarkdown(
  dilaDir: string,
  {
    force,
    init,
    only,
    push,
    silent,
    verbose,
  }: {
    force?: boolean
    init?: string
    only?: string
    push?: boolean
    silent?: boolean
    verbose?: boolean
  } = {},
): Promise<number> {
  const exitCode = 0

  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  assert.notStrictEqual(
    silent && verbose,
    true,
    "Options --quiet and --verbose are incompatible.",
  )
  const [dilaStartDate, dilaStartDateError] = auditChain(
    auditTest(
      (value: string) => dilaDateRegExp.test(value),
      (value: string) => `Date not found in "${value}"`,
    ),
    auditFunction((value: string) => value.match(dilaDateRegExp)?.[0]),
    auditRequire,
  )(strictAudit, init) as [string, unknown]
  assert.strictEqual(
    dilaStartDateError,
    null,
    `Error in init option: ${JSON.stringify(dilaStartDate)}:\n${JSON.stringify(
      dilaStartDateError,
      null,
      2,
    )}`,
  )

  const jsonRepository = await nodegit.Repository.open(
    path.join(dilaDir, "donnees_juridiques.git"),
  )
  const referencesRepository = await nodegit.Repository.open(
    path.join(dilaDir, "references_donnees_juridiques.git"),
  )
  const sourceRepositoryBySymbol: Record<
    SourceRepositorySymbol,
    nodegit.Repository
  > = {
    json: jsonRepository,
    references: referencesRepository,
  }
  const targetGitDir = path.join(dilaDir, "textes_juridiques.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  let jsonOidByIdTree: OidBySplitPathTree = { childByKey: new Map() }
  let previousSourceCommitBySymbol:
    | Record<SourceRepositorySymbol, nodegit.Commit>
    | undefined = undefined
  let referencesOidByIdTree: OidBySplitPathTree = { childByKey: new Map() }
  let skip = true
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  let targetOidByIdTree: OidBySplitPathTree = { childByKey: new Map() }
  for await (const {
    dilaDate,
    sourceCommitByOrigine: sourceCommitBySymbol,
  } of iterSourceCommitsWithSameDilaDate(sourceRepositoryBySymbol, true)) {
    if (skip) {
      if (dilaDate >= dilaStartDate) {
        skip = false
      } else {
        continue
      }
    }

    // The first time that this part of the loop is reached,
    // find the commit of target to use as base for future
    // target commits.
    if (!targetBaseCommitFound) {
      let targetBaseCommitOid: nodegit.Oid | undefined
      for await (targetBaseCommitOid of iterCommitsOids(
        targetRepository,
        false,
      )) {
        const targetBaseCommit =
          await targetRepository.getCommit(targetBaseCommitOid)
        const targetBaseCommitMessage = targetBaseCommit.message()
        if (targetBaseCommitMessage === dilaDate) {
          targetBaseCommitFound = true
          targetBaseCommitOid = targetBaseCommit.parents()[0]
          break
        }
      }
      if (!targetBaseCommitFound) {
        targetBaseCommitFound = true
        targetBaseCommitOid = undefined
      }
      if (targetBaseCommitOid === undefined) {
        // Create initial commit.

        const builder = await nodegit.Treebuilder.create(targetRepository)

        const licenceOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(licence, "utf-8"),
        )
        builder.insert(
          "LICENCE.md",
          licenceOid,
          nodegit.TreeEntry.FILEMODE.BLOB,
        ) // 0o040000

        const readmeOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(
            dedent`
              # Textes juridiques

              > **Avertissement** : Ce dépôt fait partie du projet [Tricoteuses](https://tricoteuses.fr/)
              > de conversion à git des textes juridiques français.
              > **Il peut contenir des erreurs !**
            `,
            "utf-8",
          ),
        )
        builder.insert("README.md", readmeOid, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000

        const targetTreeOid = await builder.write()

        const headExists = await nodegit.Reference.lookup(
          targetRepository,
          "HEAD",
        )
          .then(() => true)
          .catch(() => false)
        if (headExists) {
          nodegit.Reference.remove(targetRepository, "HEAD")
        }

        targetCommitOid = await targetRepository.createCommit(
          "HEAD",
          nodegit.Signature.create(
            "Tricoteuses",
            "tricoteuses@tricoteuses.fr",
            0,
            0,
          ),
          nodegit.Signature.create(
            "Tricoteuses",
            "tricoteuses@tricoteuses.fr",
            0,
            0,
          ),
          "Création du dépôt git",
          targetTreeOid,
          [],
        )
        commitsChanged = true
      } else {
        // Start targetCommitsOidsIterator at targetBaseCommitOid.
        while (true) {
          const { done, value } = await targetCommitsOidsIterator.next()
          if (done) {
            break
          }
          targetCommitOid = value
          if (targetCommitOid.equal(targetBaseCommitOid)) {
            break
          }
        }
      }
    }

    const targetExistingCommitOid = targetCommitOid
    if (!force && !targetCommitsOidsIterationsDone) {
      // If a target commit already exists for this source commit, reuse it.
      const { done, value } = await targetCommitsOidsIterator.next()
      if (done) {
        targetCommitsOidsIterationsDone = true
      } else {
        targetCommitOid = value
        const targetCommit = await targetRepository.getCommit(targetCommitOid)
        const targetCommitMessage = targetCommit.message()
        if (targetCommitMessage !== dilaDate) {
          console.warn(
            `Unexpected target commit message "${targetCommitMessage}", not matching date of source commits ${dilaDate}`,
          )
          targetCommitsOidsIterationsDone = true
        } else {
          previousSourceCommitBySymbol = sourceCommitBySymbol
          continue
        }
      }
      if (!silent) {
        console.log(`Resuming conversion at date ${dilaDate}…`)
      }
      if (previousSourceCommitBySymbol !== undefined) {
        // Read the jsonOidByIdTree & referencesOidByIdTree of the previous commi
        // to ensure that the first call to convertJsonTreeToMarkdown will only
        // convert the changes.
        const previousJsonCommit = previousSourceCommitBySymbol.json
        const previousJsonTree = await previousJsonCommit.getTree()
        jsonOidByIdTree = await readOidBySplitPathTree(
          jsonRepository,
          previousJsonTree,
          ".json",
          jsonOidByIdTree,
        )

        const previousReferencesCommit = previousSourceCommitBySymbol.references
        const previousReferencesTree = await previousReferencesCommit.getTree()
        referencesOidByIdTree = await readOidBySplitPathTree(
          referencesRepository,
          previousReferencesTree,
          ".json",
          referencesOidByIdTree,
        )
      }
    }

    steps.push({
      label: "Read JSON oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const jsonCommit = sourceCommitBySymbol.json
    const jsonTree = await jsonCommit.getTree()
    const previousJsonOidByIdTree = jsonOidByIdTree
    jsonOidByIdTree = await readOidBySplitPathTree(
      jsonRepository,
      jsonTree,
      ".json",
      jsonOidByIdTree,
    )

    steps.push({
      label: "Read references oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const referencesCommit = sourceCommitBySymbol.references
    const referencesTree = await referencesCommit.getTree()
    const previousReferencesOidByIdTree = referencesOidByIdTree
    referencesOidByIdTree = await readOidBySplitPathTree(
      referencesRepository,
      referencesTree,
      ".json",
      referencesOidByIdTree,
    )

    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTree = await targetExistingCommit?.getTree()

    // Read target oidByIdTree if it has not been read yet.
    if (targetOidByIdTree.oid === undefined) {
      steps.push({
        label: "Read target oidByIdTree",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      targetOidByIdTree = await readOidBySplitPathTree(
        targetRepository,
        targetExistingTree,
        ".md",
        targetOidByIdTree,
      )
    }

    let commitChanged = false
    steps.push({
      label: "Convert JSON to Markdown",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    console.log("Converting JSON to Markdown")
    if (
      await convertJsonTreeToMarkdown(
        previousJsonOidByIdTree,
        jsonOidByIdTree,
        jsonRepository,
        previousReferencesOidByIdTree,
        referencesOidByIdTree,
        referencesRepository,
        targetOidByIdTree,
        targetRepository,
        { only, verbose },
      )
    ) {
      commitChanged = true
    }
    if (!commitChanged) {
      // No change to commit.
      continue
    }

    // Cleanup oidByIdTree.
    steps.push({
      label: "Cleanup oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    removeOidBySplitPathTreeEmptyNodes(targetOidByIdTree)

    // Write updated oidByIdTree.
    steps.push({
      label: "Write updated oidByIdTree",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const targetTreeOid = await writeOidBySplitPathTree(
      targetRepository,
      targetOidByIdTree,
      ".md",
    )
    if (targetTreeOid.tostrS() === targetExistingTree?.id().tostrS()) {
      // No change to commit.
      continue
    }

    if (commitChanged) {
      // Commit changes.
      const sourceAuthorWhen = jsonCommit.author().when()
      const sourceCommitterWhen = jsonCommit.committer().when()
      const targetCommitMessage = dilaDate
      if (!silent) {
        console.log(`New commit: ${targetCommitMessage}`)
      }
      targetCommitOid = await targetRepository.createCommit(
        "HEAD",
        nodegit.Signature.create(
          "Tricoteuses",
          "tricoteuses@tricoteuses.fr",
          sourceAuthorWhen.time(),
          sourceAuthorWhen.offset(),
        ),
        nodegit.Signature.create(
          "Tricoteuses",
          "tricoteuses@tricoteuses.fr",
          sourceCommitterWhen.time(),
          sourceCommitterWhen.offset(),
        ),
        targetCommitMessage,
        targetTreeOid!,
        [targetExistingCommitOid].filter(
          (oid) => oid !== undefined,
        ) as nodegit.Oid[],
      )
      await targetRepository.createBranch("main", targetCommitOid!, true)
      await targetRepository.setHead("refs/heads/main")
      commitsChanged = true
    }
  }

  assert.strictEqual(
    skip,
    false,
    `Date ${dilaStartDate} not found in commit messages`,
  )

  if (commitsChanged) {
    if (forgejo !== undefined && push) {
      steps.push({
        label: "Push new commits",
        start: performance.now(),
      })
      console.log(
        `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
      )
      let targetRemote: nodegit.Remote
      try {
        targetRemote = await targetRepository.getRemote("origin")
      } catch (error) {
        if (
          (error as Error).message.includes("remote 'origin' does not exist")
        ) {
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/textes_juridiques.git`
          targetRemote = await nodegit.Remote.create(
            targetRepository,
            "origin",
            targetRemoteUrl,
          )
        } else {
          throw error
        }
      }
      const targetBranch = await targetRepository.getCurrentBranch()
      const targetBranchName = targetBranch.shorthand()
      const refspec = `+HEAD:refs/heads/${targetBranchName}` // "+" => force push
      await targetRemote.push([refspec], {
        callbacks: {
          credentials: (_url: string, username: string) => {
            return nodegit.Credential.sshKeyFromAgent(username)
          },
        },
      })
      await nodegit.Branch.setUpstream(
        targetBranch,
        `origin/${targetBranchName}`,
      )
    }
  }

  // console.log("Performance: ")
  // for (const [index, step] of steps.entries()) {
  //   console.log(
  //     `  ${step.label}: ${(steps[index + 1]?.start ?? performance.now()) - step.start}`,
  //   )
  // }

  return exitCode
}

async function* markdownBlocksFromLegalObjectReferences(
  referrerById: Record<string, unknown>,
  outgoingReferenceMarkdownArray: ReferenceMarkdown[],
  outgoingDesignation: string,
  incomingReferencesDesignationByIdType: Partial<Record<IdType, string>>,
  referrentDir: string,
  referrentId: string,
): AsyncGenerator<string, void> {
  yield dedent`
    <details>
      <summary><h2>Références</h2></summary>

  `
  if (outgoingReferenceMarkdownArray.length !== 0) {
    yield dedent`
      ### ${escapeMarkdownTitle(outgoingDesignation)}

      ${markdownTreeFromReferenceMarkdownArray(outgoingReferenceMarkdownArray)}
    `
  }

  const incomingReferenceMarkdownArrayByIdType: Partial<
    Record<IdType, ReferenceMarkdown[]>
  > = {}
  for (const incomingReferenceMarkdown of await convertIncomingReferencesToMarkdown(
    referrerById,
    referrentDir,
    referrentId,
  )) {
    ;(incomingReferenceMarkdownArrayByIdType[
      extractTypeFromId(incomingReferenceMarkdown.id!)
    ] ??= []).push(incomingReferenceMarkdown)
  }

  if (incomingReferenceMarkdownArrayByIdType.CONT !== undefined) {
    yield dedent`
      ### ${escapeMarkdownTitle(incomingReferencesDesignationByIdType.CONT)}

      ${markdownTreeFromReferenceMarkdownArray(incomingReferenceMarkdownArrayByIdType.CONT)}
    `
  }
  if (incomingReferenceMarkdownArrayByIdType.TEXT !== undefined) {
    yield dedent`
      ### ${escapeMarkdownTitle(incomingReferencesDesignationByIdType.TEXT)}

      ${markdownTreeFromReferenceMarkdownArray(incomingReferenceMarkdownArrayByIdType.TEXT)}
    `
  }
  if (incomingReferenceMarkdownArrayByIdType.SCTA !== undefined) {
    yield dedent`
      ### ${escapeMarkdownTitle(incomingReferencesDesignationByIdType.SCTA)}

      ${markdownTreeFromReferenceMarkdownArray(incomingReferenceMarkdownArrayByIdType.SCTA)}
    `
  }
  if (incomingReferenceMarkdownArrayByIdType.ARTI !== undefined) {
    yield dedent`
      ### ${escapeMarkdownTitle(incomingReferencesDesignationByIdType.ARTI)}

      ${markdownTreeFromReferenceMarkdownArray(incomingReferenceMarkdownArrayByIdType.ARTI)}
    `
  }
  yield dedent`
    </details>
  `
}

function markdownLinkFromIdAndTitle(
  referrerDir: string,
  id: string,
  title: string,
): string {
  return `[${escapeMarkdownLinkTitle(title)}](${escapeMarkdownLinkUrl(path.relative(referrerDir, gitPathFromId(id, ".md")))})`
}

async function markdownLinkFromOutgoingReference(
  referenceById: Record<string, unknown>,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  referrerDir: string,
  referrentId: string,
  {
    inParent,
    linkTitle,
    prefix,
    suffix,
  }: {
    inParent?: boolean
    linkTitle?: string
    prefix?: string
    suffix?: string
  } = {},
): Promise<string> {
  const referrent = await getOrLoadJsonObject(
    referenceById,
    jsonOidByIdTree,
    jsonRepository,
    referrentId,
  )
  return markdownLinkFromIdAndTitle(
    referrerDir,
    referrentId,
    `${prefix === undefined ? "" : `${escapeMarkdownText(prefix)} `}${referrent === undefined ? `Objet ${referrentId} manquant` : markdownLinkTitleFromIdAndLegalObject(referrentId, referrent, { inParent, linkTitle })}${suffix === undefined ? "" : ` ${escapeMarkdownText(suffix)}`}`,
  )
}

function markdownLinkTitleFromIdAndLegalObject(
  id: string,
  legalObject: unknown,
  { inParent, linkTitle }: { inParent?: boolean; linkTitle?: string } = {},
): string {
  const idType = extractTypeFromId(id)
  switch (idType) {
    case "ARTI": {
      const article = legalObject as JorfArticle | LegiArticle
      const articleNumber = article.META.META_SPEC.META_ARTICLE.NUM
      const texte = article.CONTEXTE.TEXTE
      const titresTexte = texte.TITRE_TXT
      const texteTitle = inParent
        ? undefined
        : titresTexte === undefined
          ? "Texte sans titre"
          : titresTexte.length === 1
            ? (
                titresTexte[0]["#text"] ??
                titresTexte[0]["@c_titre_court"] ??
                "Texte sans titre"
              )
                .replace(/\s+/g, " ")
                .trim()
            : titresTexte
                .map(
                  (titreTexte) =>
                    `${(
                      titreTexte["#text"] ??
                      titreTexte["@c_titre_court"] ??
                      "Texte sans titre"
                    )
                      .replace(/\s+/g, " ")
                      .trim()}${
                      titreTexte["@debut"] === "2999-01-01" &&
                      titreTexte["@fin"] === "2999-01-01"
                        ? ""
                        : titreTexte["@fin"] === "2999-01-01"
                          ? ` (depuis le ${titreTexte["@debut"]})`
                          : ` (du ${titreTexte["@debut"]} au ${titreTexte["@debut"]})`
                    }`,
                )
                .join(", ")
      // Note some articles don't have a article.META.META_SPEC.META_ARTICLE.NUM, but their number
      // is in the first line of BLOC_TEXTUEL.
      // In this case the number may be found in link to article (and should be given in linkTitle).
      // For example, every articles of "LOI organique n° 2001-692 du 1er août 2001 relative aux
      // lois de finances" (JORFTEXT000000394028)
      return [
        texteTitle,
        articleNumber === undefined
          ? linkTitle === undefined
            ? article.BLOC_TEXTUEL === undefined
              ? "_article vide_"
              : "_article sans numéro_"
            : linkTitle
          : `article ${articleNumber}`,
      ]
        .filter((fragment) => fragment !== undefined)
        .join(", ")
    }

    case "CONT": {
      const jo = legalObject as Jo
      return jo.META.META_SPEC.META_CONTENEUR.TITRE
    }

    case "SCTA": {
      const sectionTa = legalObject as JorfSectionTa | LegiSectionTa
      const texte = sectionTa.CONTEXTE.TEXTE
      const titresTexte = texte.TITRE_TXT
      const texteTitle = inParent
        ? undefined
        : titresTexte === undefined
          ? "Texte sans titre"
          : titresTexte.length === 1
            ? (
                titresTexte[0]["#text"] ??
                titresTexte[0]["@c_titre_court"] ??
                "Texte sans titre"
              )
                .replace(/\s+/g, " ")
                .trim()
            : titresTexte
                .map(
                  (titreTexte) =>
                    `${(
                      titreTexte["#text"] ??
                      titreTexte["@c_titre_court"] ??
                      "Texte sans titre"
                    )
                      .replace(/\s+/g, " ")
                      .trim()}${
                      titreTexte["@debut"] === "2999-01-01" &&
                      titreTexte["@fin"] === "2999-01-01"
                        ? ""
                        : titreTexte["@fin"] === "2999-01-01"
                          ? ` (depuis le ${titreTexte["@debut"]})`
                          : ` (du ${titreTexte["@debut"]} au ${titreTexte["@debut"]})`
                    }`,
                )
                .join(", ")
      return [
        texteTitle,
        // TODO: Add title of each section in CONTEXTE.TEXTE.TM
        sectionTa.TITRE_TA ?? "Section sans titre",
      ]
        .filter((fragment) => fragment !== undefined)
        .join(", ")
    }

    case "TEXT": {
      const texte = legalObject as JorfTexte | LegiTexte
      const metaTexteVersion = texte.META.META_SPEC.META_TEXTE_VERSION
      return (
        metaTexteVersion.TITREFULL ??
        metaTexteVersion.TITRE ??
        "Texte sans titre"
      )
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\s+\(\d+\)$/, "")
    }

    default: {
      assertNever("ID Type", idType)
    }
  }
}

function markdownTitleContentArrayFromContexteTexte(
  referrerDir: string,
  texte:
    | JorfArticle["CONTEXTE"]["TEXTE"]
    | JorfSectionTa["CONTEXTE"]["TEXTE"]
    | LegiSectionTa["CONTEXTE"]["TEXTE"]
    | LegiArticle["CONTEXTE"]["TEXTE"],
): string[] {
  const titresTexte = texte.TITRE_TXT
  return titresTexte === undefined
    ? ["Texte sans titre"]
    : titresTexte.length === 1
      ? titresTexte.map((titreTexte) =>
          markdownLinkFromIdAndTitle(
            referrerDir,
            titreTexte["@id_txt"],
            (
              titreTexte["#text"] ??
              titreTexte["@c_titre_court"] ??
              "Texte sans titre"
            )
              .replace(/\s+/g, " ")
              .trim(),
          ),
        )
      : titresTexte.map((titreTexte) =>
          markdownLinkFromIdAndTitle(
            referrerDir,
            titreTexte["@id_txt"],
            `${(
              titreTexte["#text"] ??
              titreTexte["@c_titre_court"] ??
              "Texte sans titre"
            )
              .replace(/\s+/g, " ")
              .trim()}${
              titreTexte["@debut"] === "2999-01-01" &&
              titreTexte["@fin"] === "2999-01-01"
                ? ""
                : titreTexte["@fin"] === "2999-01-01"
                  ? ` (depuis le ${titreTexte["@debut"]})`
                  : ` (du ${titreTexte["@debut"]} au ${titreTexte["@debut"]})`
            }`,
          ),
        )
}

function markdownTreeFromReferenceMarkdownArray(
  referenceMarkdownArray: ReferenceMarkdown[],
  {
    indent,
  }: {
    indent?: number
  } = {},
): string {
  return referenceMarkdownArray
    .map((referenceMarkdown) =>
      [
        dedent`
            ${"  ".repeat(indent ?? 0)}* ${referenceMarkdown.markdown}
          `,
        referenceMarkdown.children === undefined
          ? undefined
          : markdownTreeFromReferenceMarkdownArray(referenceMarkdown.children, {
              indent: (indent ?? 0) + 1,
            }),
      ]
        .filter((fragment) => fragment !== undefined)
        .join("\n"),
    )
    .join("\n")
}

function markdownTreeFromTmWithSingleTitre(
  referrerDir: string,
  tm: JorfArticleTm | JorfSectionTaTm,
  {
    indent,
  }: {
    indent?: number
  } = {},
): string {
  return [
    dedent`
      ${"  ".repeat(indent ?? 0)}* ${markdownLinkFromIdAndTitle(
        referrerDir,
        tm.TITRE_TM["@id"],
        tm.TITRE_TM["#text"] ?? "Section sans titre",
      )}
    `,
    tm.TM === undefined
      ? undefined
      : markdownTreeFromTmWithSingleTitre(referrerDir, tm.TM, {
          indent: (indent ?? 0) + 1,
        }),
  ]
    .filter((fragment) => fragment !== undefined)
    .join("\n")
}

function markdownTreeFromTmWithTitreArray(
  referrerDir: string,
  tm: LegiArticleTm | LegiSectionTaTm,
  dateDebutArticle: string,
  {
    indent,
  }: {
    indent?: number
  } = {},
): string {
  const titreTm = bestItemForDate(tm.TITRE_TM, dateDebutArticle)!
  return [
    dedent`
      ${"  ".repeat(indent ?? 0)}* ${markdownLinkFromIdAndTitle(
        referrerDir,
        titreTm["@id"],
        titreTm["#text"] ?? "Section sans titre",
      )}
    `,
    tm.TM === undefined
      ? undefined
      : markdownTreeFromTmWithTitreArray(referrerDir, tm.TM, dateDebutArticle, {
          indent: (indent ?? 0) + 1,
        }),
  ]
    .filter((fragment) => fragment !== undefined)
    .join("\n")
}

async function loadJsonObject<ObjectType>(
  oidByIdTree: OidBySplitPathTree,
  repository: nodegit.Repository,
  id: string,
): Promise<ObjectType | undefined> {
  const oid = getOidFromIdTree(oidByIdTree, id)
  if (oid === undefined) {
    return undefined
  }

  return JSON.parse(
    (await repository.getBlob(oid)).content().toString("utf-8"),
  ) as ObjectType
}

sade("git_json_to_git_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing latest commits of JORF & LEGI data converted to Markdown",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-o, --only", "Convert only the legal object whose ID is given")
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .option("-v, --verbose", "Show more log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await gitJsonToGitMarkdown(dilaDir, options))
  })
  .parse(process.argv)
