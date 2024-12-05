import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import git from "isomorphic-git"
import path from "path"
import sade from "sade"

import type { JorfArticle, JorfTexteVersion } from "$lib/legal/jorf"
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
import { slugify } from "$lib/strings"

type Action = "CREATE" | "DELETE"

interface Context {
  articleById: Record<string, JorfArticle | LegiArticle>
  currentInternalIds: Set<string>
  infosArticleModificateurById: Record<
    string,
    Record<Action, string | undefined>
  >
  infosTexteModificateurById: Record<string, Record<Action, string | undefined>>
  legiTexteInternalIds: Set<string>
  sectionTaById: Record<string, LegiSectionTa>
  targetDir: string
  texteManquantById: Record<string, TexteManquant>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion | null>
}

interface TexteManquant {
  date: string
}

async function addArticleModificateurId(
  context: Context,
  articleModificateurId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const articleModificateur = await getOrLoadArticle(
    context,
    articleModificateurId,
  )
  const articleModificateurDateSignature =
    articleModificateur.CONTEXTE.TEXTE["@date_signature"]
  if (articleModificateurDateSignature === undefined) {
    throw new Error(
      `Article modificateur ${articleModificateurId} of ${modifiedId} has no CONTEXTE.TEXTE["@date_signature"]`,
    )
  }
  if (
    action === "CREATE" &&
    articleModificateurDateSignature > modifiedDateDebut
  ) {
    console.warn(
      `Ignoring article créateur ${articleModificateurId} because its date signature ${articleModificateurDateSignature} doesn't match date début ${modifiedDateDebut} of ${modifiedId}`,
    )
    return
  }
  if (
    action === "DELETE" &&
    articleModificateurDateSignature > modifiedDateFin
  ) {
    console.warn(
      `Ignoring article suppresseur ${articleModificateurId} because its date signature ${articleModificateurDateSignature} doesn't match date fin ${modifiedDateFin} of ${modifiedId}`,
    )
    return
  }

  let infosArticleModificateur =
    context.infosArticleModificateurById[modifiedId]
  if (infosArticleModificateur === undefined) {
    infosArticleModificateur = context.infosArticleModificateurById[
      modifiedId
    ] = { CREATE: undefined, DELETE: undefined }
  }
  const existingArticleModificateurId = infosArticleModificateur[action]
  if (existingArticleModificateurId === undefined) {
    infosArticleModificateur[action] = articleModificateurId
  } else if (existingArticleModificateurId !== articleModificateurId) {
    const existingArticleModificateur = await getOrLoadArticle(
      context,
      existingArticleModificateurId,
    )
    if (
      existingArticleModificateur.CONTEXTE.TEXTE["@date_signature"]! <
      articleModificateurDateSignature
    ) {
      infosArticleModificateur[action] = articleModificateurId
    }
  }

  const texteModificateurId = articleModificateur.CONTEXTE.TEXTE["@cid"]
  if (texteModificateurId !== undefined) {
    await addTexteModificateurId(
      context,
      texteModificateurId,
      action,
      modifiedId,
      modifiedDateDebut,
      modifiedDateFin,
    )
  }
}

async function addTexteModificateurId(
  context: Context,
  texteModificateurId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const texteVersionModificateur = await getOrLoadTexteVersion(
    context,
    texteModificateurId,
  )
  if (texteVersionModificateur === null) {
    return
  }
  const texteModificateurDateSignature =
    texteVersionModificateur.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
  if (texteModificateurDateSignature === undefined) {
    throw new Error(
      `Texte modificateur ${texteModificateurId} of ${modifiedId} has no META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE`,
    )
  }
  if (
    action === "CREATE" &&
    texteModificateurDateSignature > modifiedDateDebut
  ) {
    console.warn(
      `Ignoring texte créateur ${texteModificateurId} because its date signature ${texteModificateurDateSignature} doesn't match date début ${modifiedDateDebut} of ${modifiedId}`,
    )
    return
  }
  if (action === "DELETE" && texteModificateurDateSignature > modifiedDateFin) {
    console.warn(
      `Ignoring texte suppresseur ${texteModificateurId} because its date signature ${texteModificateurDateSignature} doesn't match date fin ${modifiedDateFin} of ${modifiedId}`,
    )
    return
  }

  let infosTexteModificateur = context.infosTexteModificateurById[modifiedId]
  if (infosTexteModificateur === undefined) {
    infosTexteModificateur = context.infosTexteModificateurById[modifiedId] = {
      CREATE: undefined,
      DELETE: undefined,
    }
  }
  const existingTexteModificateurId = infosTexteModificateur[action]
  if (existingTexteModificateurId === undefined) {
    infosTexteModificateur[action] = texteModificateurId
  } else if (existingTexteModificateurId !== texteModificateurId) {
    const existingTexteVersionModificateur = (await getOrLoadTexteVersion(
      context,
      existingTexteModificateurId,
    ))!
    if (
      existingTexteVersionModificateur.META.META_SPEC.META_TEXTE_CHRONICLE
        .DATE_TEXTE! < texteModificateurDateSignature
    ) {
      infosTexteModificateur[action] = texteModificateurId
    }
  }
}

async function exportLegiTexteToMarkdown(
  legiTexteId: string,
  targetDir: string,
): Promise<void> {
  const context: Context = {
    articleById: {},
    currentInternalIds: new Set(),
    infosArticleModificateurById: {},
    infosTexteModificateurById: {},
    legiTexteInternalIds: new Set(),
    sectionTaById: {},
    targetDir,
    texteManquantById: {},
    texteVersionById: {},
  }
  context.legiTexteInternalIds.add(legiTexteId)

  const texteVersion = (await getOrLoadTexteVersion(context, legiTexteId)) as
    | JorfTexteVersion
    | LegiTexteVersion
  assert.notStrictEqual(texteVersion, null)

  const textelr = (
    await db<{ data: LegiTextelr }[]>`
    SELECT data FROM textelr WHERE id = ${legiTexteId}
  `
  )[0]?.data
  assert.notStrictEqual(textelr, undefined)

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

  // Second Pass : Register texts & articles that modify parts (aka SectionTA & Article) of the code.

  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      const article = (await getOrLoadArticle(
        context,
        lienArticle["@id"],
      )) as LegiArticle
      await registerLegiArticleModifiers(
        context,
        legiTexteId,
        0,
        lienArticle,
        article,
      )
    }
  }

  for await (const {
    lienSectionTa,
    parentsSectionTa,
    sectionTa,
  } of walkStructureTree(context, textelrStructure as LegiSectionTaStructure)) {
    await registerLegiSectionTaModifiers(
      context,
      legiTexteId,
      parentsSectionTa.length + 1,
      lienSectionTa,
      sectionTa,
    )

    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        const article = (await getOrLoadArticle(
          context,
          lienArticle["@id"],
        )) as LegiArticle
        await registerLegiArticleModifiers(
          context,
          legiTexteId,
          parentsSectionTa.length + 2,
          lienArticle,
          article,
        )
      }
    }
  }

  // Sort of textes modificateurs by date

  const textesModificateursIds = new Set<string>()
  for (const infosTexteModificateur of Object.values(
    context.infosTexteModificateurById,
  )) {
    if (infosTexteModificateur.CREATE !== undefined) {
      textesModificateursIds.add(infosTexteModificateur.CREATE)
    }
    if (infosTexteModificateur.DELETE !== undefined) {
      textesModificateursIds.add(infosTexteModificateur.DELETE)
    }
  }

  const textesModificateursIdByDate: Record<string, string[]> = {}
  for (const texteModificateurId of textesModificateursIds) {
    let date: string
    let texteVersionModificateur:
      | JorfTexteVersion
      | LegiTexteVersion
      | TexteManquant = context.texteManquantById[
      texteModificateurId
    ] as TexteManquant
    if (texteVersionModificateur === undefined) {
      texteVersionModificateur = (await getOrLoadTexteVersion(
        context,
        texteModificateurId,
      )) as JorfTexteVersion | LegiTexteVersion
      date =
        texteVersionModificateur.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
    } else {
      date = texteVersionModificateur.date
    }
    let textesModificateursId = textesModificateursIdByDate[date]
    if (textesModificateursId === undefined) {
      textesModificateursId = textesModificateursIdByDate[date] = []
    }
    textesModificateursId.push(texteModificateurId)
  }

  // Generation of Git repository

  await fs.remove(targetDir)
  await fs.mkdir(targetDir, { recursive: true })
  await git.init({
    defaultBranch: "main",
    dir: targetDir,
    fs,
  })

  const codeTitle =
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
    texteVersion.META.META_COMMUN.ID
  const codeDirName = slugify(codeTitle, "_")
  const codeRepositoryRelativeDir = codeDirName
  await fs.writeFile(
    path.join(targetDir, "README.md"),
    dedent`
      # Codes juridiques français en Git et Markdown

      - [${codeTitle}](${codeDirName})
    `,
  )
  await git.add({
    dir: targetDir,
    filepath: "README.md",
    fs,
  })
  await git.commit({
    dir: targetDir,
    fs,
    author: {
      email: "codes_juridiques@tricoteuses.fr",
      name: "République française",
    },
    message: "Création du README.md",
  })

  for (const [date, textesModificateursId] of Object.entries(
    textesModificateursIdByDate,
  ).toSorted(([date1], [date2]) => date1.localeCompare(date2))) {
    console.log(date)
    for (const texteModificateurId of textesModificateursId.toSorted()) {
      let texteVersionModificateur:
        | JorfTexteVersion
        | LegiTexteVersion
        | TexteManquant = context.texteManquantById[
        texteModificateurId
      ] as TexteManquant
      let texteModificateurTitle: string
      if (texteVersionModificateur === undefined) {
        texteVersionModificateur = (await getOrLoadTexteVersion(
          context,
          texteModificateurId,
        )) as JorfTexteVersion | LegiTexteVersion
        texteModificateurTitle =
          texteVersionModificateur.META.META_SPEC.META_TEXTE_VERSION
            .TITREFULL ??
          texteVersionModificateur.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
          texteVersionModificateur.META.META_COMMUN.ID
      } else {
        texteModificateurTitle = `!!! Texte non trouvé ${date} !!!`
      }
      console.log(`  ${texteModificateurId} ${texteModificateurTitle}`)

      await generateGitDirectory(
        context,
        2,
        codeTitle,
        liensArticles,
        textelrStructure?.LIEN_SECTION_TA,
        codeRepositoryRelativeDir,
        texteModificateurId,
      )
      await git.commit({
        dir: targetDir,
        fs,
        author: {
          email: "codes_juridiques@tricoteuses.fr",
          name: "République française",
        },
        message: texteModificateurTitle,
      })
    }
  }
}

async function generateGitDirectory(
  context: Context,
  depth: number,
  id: string,
  title: string,
  liensArticles: LegiSectionTaLienArt[] | undefined,
  liensSectionTa: LegiSectionTaLienSectionTa[] | undefined,
  repositoryRelativeDir: string,
  texteModificateurId: string,
) {
  await fs.ensureDir(path.join(context.targetDir, repositoryRelativeDir))
  const readmeLinks: Array<{ href: string; title: string }> = []

  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      const articleId = lienArticle["@id"]
      const article = (await getOrLoadArticle(
        context,
        articleId,
      )) as LegiArticle
      const articleTitle = `Article ${article.META.META_SPEC.META_ARTICLE.NUM ?? articleId}`
      const articleFilename = `${slugify(articleTitle, "_")}.md`
      const articleRepositoryRelativeFilePath = path.join(
        repositoryRelativeDir,
        articleFilename,
      )
      const infosTextModificateur =
        context.infosTexteModificateurById[articleId]
      if (context.currentInternalIds.has(articleId)) {
        if (infosTextModificateur.DELETE === texteModificateurId) {
          await fs.remove(
            path.join(context.targetDir, articleRepositoryRelativeFilePath),
          )
          context.currentInternalIds.delete(articleId)
          continue
        }
      } else {
        if (infosTextModificateur.CREATE === texteModificateurId) {
          context.currentInternalIds.add(articleId)
        } else {
          continue
        }
      }
      await fs.writeFile(
        path.join(context.targetDir, articleRepositoryRelativeFilePath),
        dedent`
          ---
          ID: ${articleId}
          ---

          ###### ${articleTitle}

          ${article.BLOC_TEXTUEL?.CONTENU}
        `,
      )
      await git.add({
        dir: context.targetDir,
        filepath: articleRepositoryRelativeFilePath,
        fs,
      })
      readmeLinks.push({ href: articleFilename, title: articleTitle })
    }
  }

  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const sectionTaId = lienSectionTa["@id"]
      const sectionTa = (await getOrLoadSectionTa(
        context,
        sectionTaId,
      )) as LegiSectionTa
      const sectionTaTitle = sectionTa.TITRE_TA ?? sectionTaId
      const sectionTaDirName = slugify(sectionTaTitle.split(":")[0].trim(), "_")
      const sectionTaRepositoryRelativeDir = path.join(
        repositoryRelativeDir,
        sectionTaDirName,
      )
      const infosTextModificateur =
        context.infosTexteModificateurById[sectionTaId]
      if (context.currentInternalIds.has(sectionTaId)) {
        if (infosTextModificateur.DELETE === texteModificateurId) {
          await fs.remove(
            path.join(context.targetDir, sectionTaRepositoryRelativeDir),
          )
          context.currentInternalIds.delete(sectionTaId)
          continue
        }
      } else {
        if (infosTextModificateur.CREATE === texteModificateurId) {
          context.currentInternalIds.add(sectionTaId)
        } else {
          continue
        }
      }
      readmeLinks.push({ href: sectionTaDirName, title: sectionTaTitle })
    }
  }

  const readmeRepositoryRelativeFilePath = path.join(
    repositoryRelativeDir,
    "README.md",
  )
  await fs.writeFile(
    path.join(context.targetDir, readmeRepositoryRelativeFilePath),
    dedent`
      ---
      ID: ${id}
      ---

      ${"#".repeat(Math.min(depth, 6))} ${title}

      ${readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n")}
    `,
  )
  await git.add({
    dir: context.targetDir,
    filepath: readmeRepositoryRelativeFilePath,
    fs,
  })

  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const sectionTaId = lienSectionTa["@id"]
      if (context.currentInternalIds.has(sectionTaId)) {
        const sectionTa = (await getOrLoadSectionTa(
          context,
          sectionTaId,
        )) as LegiSectionTa
        const sectionTaTitle = sectionTa.TITRE_TA ?? sectionTaId
        const sectionTaDirName = slugify(
          sectionTaTitle.split(":")[0].trim(),
          "_",
        )
        const sectionTaRepositoryRelativeDir = path.join(
          repositoryRelativeDir,
          sectionTaDirName,
        )
        await generateGitDirectory(
          context,
          depth + 1,
          sectionTaId,
          sectionTaTitle,
          sectionTa?.STRUCTURE_TA?.LIEN_ART,
          sectionTa?.STRUCTURE_TA?.LIEN_SECTION_TA,
          sectionTaRepositoryRelativeDir,
          texteModificateurId,
        )
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
      await db<{ data: JorfArticle | LegiArticle }[]>`
        SELECT data FROM article WHERE id = ${articleId}
      `
    )[0]?.data
    assert.notStrictEqual(article, undefined)
    context.articleById[articleId] = article
  }
  return article
}

async function getOrLoadSectionTa(
  context: Context,
  sectionTaId: string,
): Promise<LegiSectionTa> {
  let sectionTa = context.sectionTaById[sectionTaId]
  if (sectionTa === undefined) {
    sectionTa = (
      await db<{ data: LegiSectionTa }[]>`
        SELECT data FROM section_ta WHERE id = ${sectionTaId}
      `
    )[0]?.data
    assert.notStrictEqual(sectionTa, undefined)
    context.sectionTaById[sectionTaId] = sectionTa
  }
  return sectionTa
}

async function getOrLoadTexteVersion(
  context: Context,
  texteId: string,
): Promise<JorfTexteVersion | LegiTexteVersion | null> {
  let texteVersion: JorfTexteVersion | LegiTexteVersion | null =
    context.texteVersionById[texteId]
  if (texteVersion === undefined) {
    texteVersion = (
      await db<{ data: JorfTexteVersion | LegiTexteVersion }[]>`
          SELECT data FROM texte_version WHERE id = ${texteId}
        `
    )[0]?.data
    if (texteVersion === undefined) {
      console.warn(`Texte ${texteId} not found in table texte_version`)
      texteVersion = null
    }
    context.texteVersionById[texteId] = texteVersion
  }
  return texteVersion
}

async function registerLegiArticleModifiers(
  context: Context,
  legiTexteId: string,
  depth: number,
  lienArticle: LegiSectionTaLienArt,
  article: LegiArticle,
): Promise<void> {
  const articleId = article.META.META_COMMUN.ID
  const articleDateDebut = article.META.META_SPEC.META_ARTICLE.DATE_DEBUT
  const articleDateFin = article.META.META_SPEC.META_ARTICLE.DATE_FIN
  console.log(
    `${lienArticle["@id"]} ${"  ".repeat(depth)}Article ${lienArticle["@num"]} (${lienArticle["@debut"]} — ${lienArticle["@fin"] === "2999-01-01" ? "…" : lienArticle["@fin"]}, ${lienArticle["@etat"]})`,
  )

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
      (articleLien.typelien === "ABROGE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && !articleLien.cible) ||
      (articleLien.typelien === "DISJONCTION" && articleLien.cible) ||
      (articleLien.typelien === "PERIME" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERE" && !articleLien.cible)
    ) {
      await addArticleModificateurId(
        context,
        articleLien.article_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      articleLien.typelien === "CITATION" ||
      (articleLien.typelien === "HISTO" && articleLien.cible) ||
      (articleLien.typelien === "PEREMPTION" && articleLien.cible) ||
      (articleLien.typelien === "PILOTE_SUIVEUR" && !articleLien.cible) ||
      (articleLien.typelien === "SPEC_APPLI" && articleLien.cible) ||
      articleLien.typelien === "TXT_ASSOCIE" ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "CREATION" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible) ||
      (articleLien.typelien === "CREE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACEMENT" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "MODIFIE" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERT" && articleLien.cible)
    ) {
      await addArticleModificateurId(
        context,
        articleLien.article_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      (articleLien.typelien === "CREATION" && !articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && !articleLien.cible)
    ) {
      // It seems to be errors.
      // Ignore link.
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
      await addTexteModificateurId(
        context,
        texteVersionLien.texte_version_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "HISTO" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "PEREMPTION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "SPEC_APPLI" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_ASSOCIE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      (texteVersionLien.typelien === "CODIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CONCORDANCE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CREATION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "MODIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "MODIFIE" && !texteVersionLien.cible) ||
      (texteVersionLien.typelien === "RECTIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TRANSFERT" && texteVersionLien.cible)
    ) {
      await addTexteModificateurId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else {
      throw new Error(
        `Unexpected texte_version_lien to article ${lienArticle["@id"]}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  const articleLiens = article.LIENS?.LIEN
  if (articleLiens !== undefined) {
    for (const articleLien of articleLiens) {
      if (articleLien["@cidtexte"] === undefined) {
        // Ignore link because it has no potential "texte modificateur".
        continue
      }
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
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DISJONCTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PERIME" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "TRANSFERE" &&
          articleLien["@sens"] === "cible")
      ) {
        await addTexteModificateurId(
          context,
          articleLien["@cidtexte"],
          "DELETE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
      } else if (
        articleLien["@typelien"] === "CITATION" ||
        (articleLien["@typelien"] === "HISTO" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PEREMPTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PILOTE_SUIVEUR" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "SPEC_APPLI" &&
          articleLien["@sens"] === "source") ||
        articleLien["@typelien"] === "TXT_ASSOCIE" ||
        articleLien["@typelien"] === "TXT_SOURCE"
      ) {
        // Ignore link.
      } else if (
        (articleLien["@typelien"] === "CODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CREATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CREE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACEMENT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFIE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "RECTIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "TRANSFERT" &&
          articleLien["@sens"] === "source")
      ) {
        await addTexteModificateurId(
          context,
          articleLien["@cidtexte"],
          "CREATE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
      } else if (
        articleLien["@typelien"] === "CREATION" &&
        articleLien["@sens"] === "cible"
      ) {
        // It seems to be an error.
        // Ignore link.
      } else {
        throw new Error(
          `Unexpected LIEN in article ${articleId}: @typelien=${articleLien["@typelien"]}, @sens=${articleLien["@sens"]}`,
        )
      }
    }
  }

  // If article has no texte créateur at all, then create a fake one.
  let infosTexteModificateur = context.infosTexteModificateurById[articleId]
  if (infosTexteModificateur === undefined) {
    infosTexteModificateur = context.infosTexteModificateurById[articleId] = {
      CREATE: undefined,
      DELETE: undefined,
    }
  }
  if (infosTexteModificateur.CREATE === undefined) {
    const texteManquantId = `ZZZZ TEXTE MANQUANT ${articleDateDebut}`
    let texteManquant = context.texteManquantById[texteManquantId]
    if (texteManquant === undefined) {
      texteManquant = context.texteManquantById[texteManquantId] = {
        date: articleDateDebut,
      }
    }
    infosTexteModificateur.CREATE = texteManquantId
  }
}

async function registerLegiSectionTaModifiers(
  context: Context,
  legiTexteId: string,
  depth: number,
  lienSectionTa: LegiSectionTaLienSectionTa,
  sectionTa: LegiSectionTa,
): Promise<void> {
  const sectionTaId = sectionTa.ID
  const sectionTaDateDebut = lienSectionTa["@debut"]
  const sectionTaDateFin = lienSectionTa["@fin"]
  console.log(
    `${sectionTa.ID} ${"  ".repeat(depth)}${sectionTa.TITRE_TA?.replace(/\s+/g, " ") ?? sectionTa.ID} (${sectionTaDateDebut} — ${sectionTaDateFin === "2999-01-01" ? "…" : lienSectionTa["@fin"]}, ${lienSectionTa["@etat"]})`,
  )

  for (const articleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id = ${lienSectionTa["@id"]}
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
      (articleLien.typelien === "ABROGE" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERE" && !articleLien.cible)
    ) {
      await addArticleModificateurId(
        context,
        articleLien.article_id,
        "DELETE",
        sectionTaId,
        sectionTaDateDebut,
        sectionTaDateFin,
      )
    } else if (
      (articleLien.typelien === "CITATION" && !articleLien.cible) ||
      (articleLien.typelien === "PEREMPTION" && articleLien.cible)
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CREATION" && articleLien.cible) ||
      (articleLien.typelien === "CREE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACE" && !articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "MODIFIE" && !articleLien.cible)
    ) {
      await addArticleModificateurId(
        context,
        articleLien.article_id,
        "CREATE",
        sectionTaId,
        sectionTaDateDebut,
        sectionTaDateFin,
      )
    } else {
      throw new Error(
        `Unexpected article_lien to Section Texte Article ${lienSectionTa["@id"]}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id = ${lienSectionTa["@id"]}
  `) {
    assert.strictEqual(texteVersionLien.cidtexte, legiTexteId)
    if (texteVersionLien.texte_version_id in context.legiTexteInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    )
    if (texteVersionLien.typelien === "ANNULATION" && texteVersionLien.cible) {
      await addTexteModificateurId(
        context,
        texteVersionLien.texte_version_id,
        "DELETE",
        sectionTaId,
        sectionTaDateDebut,
        sectionTaDateFin,
      )
    } else if (
      texteVersionLien.typelien === "CITATION" &&
      !texteVersionLien.cible
    ) {
      // Ignore link.
    } else if (
      texteVersionLien.typelien === "RECTIFICATION" &&
      texteVersionLien.cible
    ) {
      await addTexteModificateurId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        sectionTaId,
        sectionTaDateDebut,
        sectionTaDateFin,
      )
    } else {
      throw new Error(
        `Unexpected texte_version_lien to Section Texte Article ${lienSectionTa["@id"]}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  // If article has no texte créateur at all, then create a fake one.
  let infosTexteModificateur = context.infosTexteModificateurById[sectionTaId]
  if (infosTexteModificateur === undefined) {
    infosTexteModificateur = context.infosTexteModificateurById[sectionTaId] = {
      CREATE: undefined,
      DELETE: undefined,
    }
  }
  if (infosTexteModificateur.CREATE === undefined) {
    const texteManquantId = `ZZZZ TEXTE MANQUANT ${sectionTaDateDebut}`
    let texteManquant = context.texteManquantById[texteManquantId]
    if (texteManquant === undefined) {
      texteManquant = context.texteManquantById[texteManquantId] = {
        date: sectionTaDateDebut,
      }
    }
    infosTexteModificateur.CREATE = texteManquantId
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
      const childSectionTa = await getOrLoadSectionTa(
        context,
        lienSectionTa["@id"],
      )
      context.legiTexteInternalIds.add(lienSectionTa["@id"])
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

sade("export_legi_texte_to_markdown <legiTexteId> <targetDir>", true)
  .describe(
    "Convert a LEGI texte (code, law, etc) to a markdown tree in a directory",
  )
  .action(async (legiTexteId, targetDir) => {
    await exportLegiTexteToMarkdown(legiTexteId, targetDir)
    process.exit(0)
  })
  .parse(process.argv)
