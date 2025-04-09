import dedent from "dedent-js"

import { bestItemForDate, walkContexteTexteTm } from "$lib/legal/index.js"
import { gitPathFromId } from "$lib/legal/ids.js"
import type {
  Jo,
  JorfArticle,
  JorfSectionTa,
  JorfTexteVersion,
} from "$lib/legal/jorf.js"
import type {
  LegiArticle,
  LegiSectionTa,
  LegiTexteNature,
  LegiTexteVersion,
} from "$lib/legal/legi.js"
import { slugify } from "$lib/strings.js"
import {
  organizationNameByTexteNature,
  repositoryNameFromTitle,
} from "$lib/urls.js"

const today = new Date().toISOString().split("T")[0]

export function markdownVariantsBlockFromArticle(
  article: JorfArticle | LegiArticle,
): string {
  const metaArticle = article.META.META_SPEC.META_ARTICLE
  const metaCommun = article.META.META_COMMUN
  const articleId = metaCommun.ID
  const articleNumber = metaArticle.NUM
  const texte = article.CONTEXTE.TEXTE
  const foundTitreTxt = bestItemForDate(texte.TITRE_TXT, today)
  return dedent`
    <details>
      <summary><h2>Variantes</h2></summary>

    ${[
      [
        "JSON dans git",
        new URL(
          gitPathFromId(articleId, ".json"),
          "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Références JSON dans git",
        new URL(
          gitPathFromId(articleId, ".json"),
          "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Markdown dans git",
        new URL(
          gitPathFromId(articleId, ".md"),
          "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
        ).toString(),
      ],
      ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")
        ? [
            "Markdown chronologique dans git",
            new URL(
              [
                ...(texte.TM === undefined
                  ? []
                  : walkContexteTexteTm(texte.TM)
                ).map((tm) => {
                  const titreTm = tm.TITRE_TM
                  const foundTitreTm = Array.isArray(titreTm)
                    ? bestItemForDate(titreTm, today)!
                    : titreTm
                  const sectionTaTitle =
                    foundTitreTm["#text"]?.replace(/\s+/g, " ").trim() ??
                    `Section sans titre ${foundTitreTm["@id"]}`
                  let sectionTaSlug = slugify(
                    sectionTaTitle.split(":")[0].trim(),
                    "_",
                  )
                  if (sectionTaSlug.length > 255) {
                    sectionTaSlug = sectionTaSlug.slice(0, 254)
                    if (sectionTaSlug.at(-1) !== "_") {
                      sectionTaSlug += "_"
                    }
                  }
                  return sectionTaSlug
                }),
                (() => {
                  const articleTitle = `Article ${articleNumber ?? articleId}`
                  let articleSlug = slugify(articleTitle, "_")
                  if (articleSlug.length > 252) {
                    articleSlug = articleSlug.slice(0, 251)
                    if (articleSlug.at(-1) !== "_") {
                      articleSlug += "_"
                    }
                  }
                  return `${articleSlug}.md`
                })(),
              ].join("/"),
              `https://git.tricoteuses.fr/${organizationNameByTexteNature[texte["@nature"] as LegiTexteNature]}/${repositoryNameFromTitle(foundTitreTxt?.["#text"] ?? foundTitreTxt?.["@c_titre_court"] ?? texte["@cid"]!)}/src/branch/main/`,
            ).toString(),
          ]
        : undefined,
      [
        "Légifrance",
        texte["@nature"] === "CODE"
          ? `https://www.legifrance.gouv.fr/codes/article_lc/${articleId}`
          : // Show article inside full text:
            // `https://www.legifrance.gouv.fr/loda/id/${articleId}/`
            // Show article alone:
            `https://www.legifrance.gouv.fr/loda/article_lc/${articleId}/`,
      ],
    ]
      .filter((labelAndUrl) => labelAndUrl !== undefined)
      .map(([label, url]) => `* [${label}](${url})`)
      .join("\n")}
    </details>
  `
}

export function markdownVariantsBlockFromJo(jo: Jo): string {
  const metaCommun = jo.META.META_COMMUN
  const metaConteneur = jo.META.META_SPEC.META_CONTENEUR
  const joId = metaCommun.ID
  return dedent`
    <details>
      <summary><h2>Variantes</h2></summary>

    ${[
      [
        "JSON dans git",
        new URL(
          gitPathFromId(joId, ".json"),
          "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Références JSON dans git",
        new URL(
          gitPathFromId(joId, ".json"),
          "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Markdown dans git",
        new URL(
          gitPathFromId(joId, ".md"),
          "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
        ).toString(),
      ],
      metaConteneur.NUM === undefined
        ? undefined
        : [
            "Légifrance",
            `https://www.legifrance.gouv.fr/jorf/jo/${metaConteneur.DATE_PUBLI.replaceAll("-", "/")}/${`0000${metaConteneur.NUM}`.slice(-4)}`,
          ],
    ]
      .filter((labelAndUrl) => labelAndUrl !== undefined)
      .map(([label, url]) => `* [${label}](${url})`)
      .join("\n")}
    </details>
  `
}

export function markdownVariantsBlockFromSectionTa(
  sectionTa: JorfSectionTa | LegiSectionTa,
): string {
  const sectionTaId = sectionTa.ID
  const texte = sectionTa.CONTEXTE.TEXTE
  const foundTitreTxt = bestItemForDate(texte.TITRE_TXT, today)
  return dedent`
    <details>
      <summary><h2>Variantes</h2></summary>

    ${[
      [
        "JSON dans git",
        new URL(
          gitPathFromId(sectionTaId, ".json"),
          "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Références JSON dans git",
        new URL(
          gitPathFromId(sectionTaId, ".json"),
          "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Markdown dans git",
        new URL(
          gitPathFromId(sectionTaId, ".md"),
          "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
        ).toString(),
      ],
      ["CODE", "CONSTITUTION", "DECLARATION"].includes(texte["@nature"] ?? "")
        ? [
            "Markdown chronologique dans git",
            new URL(
              [
                ...(texte.TM === undefined
                  ? []
                  : walkContexteTexteTm(texte.TM)
                ).map((tm) => {
                  const titreTm = tm.TITRE_TM
                  const foundTitreTm = Array.isArray(titreTm)
                    ? bestItemForDate(titreTm, today)!
                    : titreTm
                  const sectionTaTitle =
                    foundTitreTm["#text"]?.replace(/\s+/g, " ").trim() ??
                    `Section sans titre ${foundTitreTm["@id"]}`
                  let sectionTaSlug = slugify(
                    sectionTaTitle.split(":")[0].trim(),
                    "_",
                  )
                  if (sectionTaSlug.length > 255) {
                    sectionTaSlug = sectionTaSlug.slice(0, 254)
                    if (sectionTaSlug.at(-1) !== "_") {
                      sectionTaSlug += "_"
                    }
                  }
                }),
                (() => {
                  const sectionTaTitle =
                    sectionTa.TITRE_TA?.replace(/\s+/g, " ").trim() ??
                    "Section sans titre"
                  let sectionTaSlug = slugify(
                    sectionTaTitle.split(":")[0].trim(),
                    "_",
                  )
                  if (sectionTaSlug.length > 255) {
                    sectionTaSlug = sectionTaSlug.slice(0, 254)
                    if (sectionTaSlug.at(-1) !== "_") {
                      sectionTaSlug += "_"
                    }
                  }
                  return sectionTaSlug
                })(),
                "README.md",
              ].join("/"),
              `https://git.tricoteuses.fr/${organizationNameByTexteNature[texte["@nature"] as LegiTexteNature]}/${repositoryNameFromTitle(foundTitreTxt?.["#text"] ?? foundTitreTxt?.["@c_titre_court"] ?? texte["@cid"]!)}/src/branch/main/`,
            ).toString(),
          ]
        : undefined,
      [
        "Légifrance",
        texte["@nature"] === "CODE"
          ? `https://www.legifrance.gouv.fr/codes/section_lc/${texte["@cid"]}/${sectionTaId}`
          : `https://www.legifrance.gouv.fr/loda/id/${sectionTaId}/`,
      ],
    ]
      .filter((labelAndUrl) => labelAndUrl !== undefined)
      .map(([label, url]) => `* [${label}](${url})`)
      .join("\n")}
    </details>
  `
}

export function markdownVariantsBlockFromTexteVersion(
  texteVersion: JorfTexteVersion | LegiTexteVersion,
): string {
  const metaCommun = texteVersion.META.META_COMMUN
  const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
  const texteId = metaCommun.ID
  return dedent`
    <details>
      <summary><h2>Variantes</h2></summary>

    ${[
      [
        "JSON dans git",
        new URL(
          gitPathFromId(texteId, ".json"),
          "https://git.tricoteuses.fr/dila/donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Références JSON dans git",
        new URL(
          gitPathFromId(texteId, ".json"),
          "https://git.tricoteuses.fr/dila/references_donnees_juridiques/src/branch/main/",
        ).toString(),
      ],
      [
        "Markdown dans git",
        new URL(
          gitPathFromId(texteId, ".md"),
          "https://git.tricoteuses.fr/dila/textes_juridiques/src/branch/main/",
        ).toString(),
      ],
      ["CODE", "CONSTITUTION", "DECLARATION"].includes(metaCommun.NATURE ?? "")
        ? [
            "Markdown chronologique dans git",
            new URL(
              "README.md",
              `https://git.tricoteuses.fr/${organizationNameByTexteNature[metaCommun.NATURE as LegiTexteNature]}/${repositoryNameFromTitle(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? metaCommun.ID)}/src/branch/main/`,
            ).toString(),
          ]
        : undefined,
      [
        "Légifrance",
        metaCommun.NATURE === "CODE"
          ? `https://www.legifrance.gouv.fr/codes/texte_lc/${texteId}`
          : `https://www.legifrance.gouv.fr/loda/id/${texteId}/`,
      ],
    ]
      .filter((labelAndUrl) => labelAndUrl !== undefined)
      .map(([label, url]) => `* [${label}](${url})`)
      .join("\n")}
    </details>
  `
}
