import {
  auditChain,
  auditOptions,
  auditRequire,
  strictAudit,
} from "@auditors/core"
import assert from "assert"
import dedent from "dedent-js"
import { XMLParser } from "fast-xml-parser"
import fs from "fs-extra"
import he from "he"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import {
  auditJo,
  auditJorfArticle,
  auditJorfSectionTa,
  auditJorfTextelr,
  auditJorfTexteVersion,
} from "$lib/auditors/jorf"
import { auditId, auditVersions } from "$lib/auditors/legal"
import type { Versions, XmlHeader } from "$lib/legal"
import type {
  Jo,
  JorfArticle,
  JorfSectionTa,
  JorfTextelr,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import { cleanHtmlFragment, escapeHtml } from "$lib/strings"

type CategoryTag = (typeof allCategoriesCode)[number]

const allCategoriesCode = [
  "ARTICLE",
  "ID",
  "JO",
  "SECTION_TA",
  "TEXTE_VERSION",
  "TEXTELR",
  "VERSIONS",
] as const

const xmlParser = new XMLParser({
  attributeNamePrefix: "@",
  ignoreAttributes: false,
  stopNodes: [
    "ARTICLE.BLOC_TEXTUEL.CONTENU",
    "ARTICLE.NOTA.CONTENU",
    "ARTICLE.SM.CONTENU",
    "TEXTE_VERSION.ABRO.CONTENU",
    "TEXTE_VERSION.NOTA.CONTENU",
    "TEXTE_VERSION.NOTICE.CONTENU",
    "TEXTE_VERSION.RECT.CONTENU",
    "TEXTE_VERSION.SIGNATAIRES.CONTENU",
    "TEXTE_VERSION.SM.CONTENU",
    "TEXTE_VERSION.TP.CONTENU",
    "TEXTE_VERSION.VISAS.CONTENU",
  ],
  tagValueProcessor: (_tagName, tagValue) => he.decode(tagValue),
})

async function convertGitTree(
  sourceTree: nodegit.Tree,
  targetRepository: nodegit.Repository,
): Promise<nodegit.Oid> {
  const targetTreeBuilder = await nodegit.Treebuilder.create(targetRepository)
  for (const sourceEntry of sourceTree.entries()) {
    if (sourceEntry.isTree()) {
      await targetTreeBuilder.insert(
        sourceEntry.name(),
        await convertGitTree(await sourceEntry.getTree(), targetRepository),
        sourceEntry.filemode(),
      )
    } else {
      const sourceEntryName = sourceEntry.name()
      const targetEntryName = sourceEntryName.replace(/\.xml$/, ".md")
      const xmlData = xmlParser.parse((await sourceEntry.getBlob()).content())
      for (const [tag, element] of Object.entries(xmlData) as [
        CategoryTag | "?xml",
        (
          | Jo
          | JorfArticle
          | JorfSectionTa
          | JorfTextelr
          | JorfTexteVersion
          | Versions
          | XmlHeader
        ),
      ][]) {
        switch (tag) {
          case "?xml": {
            break
          }

          case "ARTICLE": {
            const [article, error] = auditChain(auditJorfArticle, auditRequire)(
              strictAudit,
              element,
            ) as [JorfArticle, unknown]
            assert.strictEqual(
              error,
              null,
              `Unexpected format for ARTICLE:\n${JSON.stringify(
                article,
                null,
                2,
              )}\nError:\n${JSON.stringify(error, null, 2)}`,
            )
            const articleId = article.META.META_COMMUN.ID
            const articleNumber = article.META.META_SPEC.META_ARTICLE.NUM
            const articleMarkdown = [
              dedent`
              ---
              ${[
                // ["État", (article as LegiArticle).META.META_SPEC.META_ARTICLE.ETAT],
                ["Type", article.META.META_SPEC.META_ARTICLE.TYPE],
                [
                  "Date de début",
                  article.META.META_SPEC.META_ARTICLE.DATE_DEBUT,
                ],
                ["Date de fin", article.META.META_SPEC.META_ARTICLE.DATE_FIN],
                ["Identifiant", articleId],
                ["Ancien identifiant", article.META.META_COMMUN.ANCIEN_ID],
                // TODO: Mettre l'URL dans le Git Tricoteuses
                ["URL", article.META.META_COMMUN.URL],
              ]
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => `${key}: ${value}`)
                .join("\n")}
              ---
            `,
              articleNumber === undefined
                ? undefined
                : `<h1>${escapeHtml(`Article ${articleNumber}`)}</h1>`,

              await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU),
            ]
              .filter((block) => block !== undefined)
              .join("\n\n")
            // console.log(articleMarkdown)
            // console.log("\n", "=".repeat(100), "\n")
            const targetBlobOid = await targetRepository.createBlobFromBuffer(
              Buffer.from(articleMarkdown, "utf-8"),
            )
            targetTreeBuilder.insert(
              targetEntryName,
              targetBlobOid,
              sourceEntry.filemode(),
            )
            break
          }
          case "ID": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     assert.strictEqual(relativeSplitPath[0], "global")
            //     assert.strictEqual(relativeSplitPath[1], "eli")
            //     const eli = relativeSplitPath.slice(2, -1).join("/")
            //     const [id, idError] = auditChain(auditId, auditRequire)(
            //       strictAudit,
            //       element,
            //     )
            //     assert.strictEqual(
            //       idError,
            //       null,
            //       `Unexpected format for ID:\n${JSON.stringify(
            //         id,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(idError, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO id (
            //         eli,
            //         id
            //       ) VALUES (
            //         ${eli},
            //         ${id}
            //       )
            //       ON CONFLICT (eli)
            //       DO UPDATE SET
            //         id = ${id}
            //     `
            //     idRemainingElis.delete(eli)
            //   }
            break
          }
          case "JO": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     const [jo, error] = auditChain(auditJo, auditRequire)(
            //       strictAudit,
            //       element,
            //     ) as [Jo, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for JO:\n${JSON.stringify(
            //         jo,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO jo (
            //         id,
            //         data
            //       ) VALUES (
            //         ${jo.META.META_COMMUN.ID},
            //         ${db.json(jo as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(jo as unknown as JSONValue)}
            //     `
            //     joRemainingIds.delete(jo.META.META_COMMUN.ID)
            //   }
            break
          }
          case "SECTION_TA": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     const [section, error] = auditChain(
            //       auditJorfSectionTa,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfSectionTa, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for SECTION_TA:\n${JSON.stringify(
            //         section,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO section_ta (
            //         id,
            //         data
            //       ) VALUES (
            //         ${section.ID},
            //         ${db.json(section as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(section as unknown as JSONValue)}
            //     `
            //     sectionTaRemainingIds.delete(section.ID)
            //   }
            break
          }
          case "TEXTE_VERSION": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     const [texteVersion, error] = auditChain(
            //       auditJorfTexteVersion,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfTexteVersion, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for TEXTE_VERSION:\n${JSON.stringify(
            //         texteVersion,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     const textAFragments = [
            //       texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE,
            //       texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL,
            //     ].filter((text) => text !== undefined)
            //     const natureEtNum =
            //       texteVersion.META.META_COMMUN.NATURE !== undefined &&
            //         texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM !==
            //         undefined
            //         ? `${texteVersion.META.META_COMMUN.NATURE.toUpperCase()}.${texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NUM}`
            //         : null
            //     await db`
            //       INSERT INTO texte_version (
            //         id,
            //         data,
            //         nature,
            //         nature_et_num,
            //         text_search
            //       ) VALUES (
            //         ${texteVersion.META.META_COMMUN.ID},
            //         ${db.json(texteVersion as unknown as JSONValue)},
            //         ${texteVersion.META.META_COMMUN.NATURE ?? null},
            //         ${natureEtNum},
            //         setweight(to_tsvector('french', ${textAFragments.join(
            //       " ",
            //     )}), 'A')
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(texteVersion as unknown as JSONValue)},
            //         nature = ${texteVersion.META.META_COMMUN.NATURE ?? null},
            //         nature_et_num = ${natureEtNum},
            //         text_search = setweight(to_tsvector('french', ${textAFragments.join(
            //       " ",
            //     )}), 'A')
            //     `
            //     texteVersionRemainingIds.delete(texteVersion.META.META_COMMUN.ID)
            //   }
            break
          }
          case "TEXTELR": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     const [textelr, error] = auditChain(
            //       auditJorfTextelr,
            //       auditRequire,
            //     )(strictAudit, element) as [JorfTextelr, unknown]
            //     assert.strictEqual(
            //       error,
            //       null,
            //       `Unexpected format for TEXTELR:\n${JSON.stringify(
            //         textelr,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(error, null, 2)}`,
            //     )
            //     await db`
            //       INSERT INTO textelr (
            //         id,
            //         data
            //       ) VALUES (
            //         ${textelr.META.META_COMMUN.ID},
            //         ${db.json(textelr as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (id)
            //       DO UPDATE SET
            //         data = ${db.json(textelr as unknown as JSONValue)}
            //     `
            //     textelrRemainingIds.delete(textelr.META.META_COMMUN.ID)
            //   }
            break
          }
          case "VERSIONS": {
            //   if (categoryTag === undefined || categoryTag === tag) {
            //     assert.strictEqual(relativeSplitPath[0], "global")
            //     assert.strictEqual(relativeSplitPath[1], "eli")
            //     const eli = relativeSplitPath.slice(2, -1).join("/")
            //     const [versions, versionsError] = auditChain(
            //       auditVersions,
            //       auditRequire,
            //     )(strictAudit, element)
            //     assert.strictEqual(
            //       versionsError,
            //       null,
            //       `Unexpected format for VERSIONS:\n${JSON.stringify(
            //         versions,
            //         null,
            //         2,
            //       )}\nError:\n${JSON.stringify(versionsError, null, 2)}`,
            //     )
            //     const id = versions.VERSION["@id"]
            //     await db`
            //       INSERT INTO versions (
            //         eli,
            //         id,
            //         data
            //       ) VALUES (
            //         ${eli},
            //         ${id},
            //         ${db.json(versions as unknown as JSONValue)}
            //       )
            //       ON CONFLICT (eli)
            //       DO UPDATE SET
            //         id = ${id},
            //         data = ${db.json(versions as unknown as JSONValue)}
            //     `
            //     versionsRemainingElis.delete(id)
            //   }
            break
          }
          default: {
            console.warn(
              `Unexpected root element "${tag}" in XML file: ${sourceEntryName}`,
            )
            break
          }
        }
      }
    }
  }
  return await targetTreeBuilder.write()
}

async function* iterCommitsOids(
  repository: nodegit.Repository,
): AsyncGenerator<nodegit.Oid, void> {
  const revisionWalker = repository.createRevWalk()
  revisionWalker.pushHead()
  revisionWalker.sorting(nodegit.Revwalk.SORT.REVERSE)
  while (true) {
    try {
      const commitOid = await revisionWalker.next()
      yield commitOid
    } catch (err) {
      if (
        (err as Error)?.message.includes("Method next has thrown an error.")
      ) {
        break
      }
      throw err
    }
  }
}

async function jorfToGitMarkdown(
  dilaDir: string,
  {
    category,
    force,
    // push,
    silent,
  }: {
    category?: string
    force?: boolean
    push?: boolean
    silent?: boolean
  } = {},
): Promise<number> {
  const [categoryTag, categoryError] = auditOptions([
    ...[...allCategoriesCode],
  ])(strictAudit, category) as [CategoryTag | undefined, unknown]
  assert.strictEqual(
    categoryError,
    null,
    `Error for category ${JSON.stringify(categoryTag)}:\n${JSON.stringify(
      categoryError,
      null,
      2,
    )}`,
  )
  let exitCode = 0
  const sourceGitDir = path.join(dilaDir, "jorf", ".git")
  const sourceRepository = await nodegit.Repository.open(sourceGitDir)
  const targetGitDir = path.join(dilaDir, "jorf_simple.git")
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository)
  for await (const sourceCommitOid of iterCommitsOids(sourceRepository)) {
    const sourceCommitOidString = sourceCommitOid.tostrS()
    const targetPreviousCommitOid = targetCommitOid
    if (!force && !targetCommitsOidsIterationsDone) {
      const { done, value } = await targetCommitsOidsIterator.next()
      if (done) {
        targetCommitsOidsIterationsDone = true
      } else {
        targetCommitOid = value
        const targetCommit = await targetRepository.getCommit(targetCommitOid)
        const targetCommitMessage = targetCommit.message()
        const targetCommitMessageMatch =
          targetCommitMessage.match(/\(([\da-f]{40})\)$/)
        if (
          targetCommitMessageMatch === null ||
          targetCommitMessageMatch[1] !== sourceCommitOidString
        ) {
          console.warn(
            `Unexpected target commit message "${targetCommitMessage}", not matching source commit ${sourceCommitOidString}`,
          )
          targetCommitsOidsIterationsDone = true
        } else {
          continue
        }
      }
      if (!silent) {
        console.log(
          `Resuming conversion at source commit ${sourceCommitOidString}, previous target commit ${targetPreviousCommitOid?.tostrS() ?? "none"}…`,
        )
      }
    }

    const sourceCommit = await sourceRepository.getCommit(sourceCommitOid)
    const sourceTree = await sourceCommit.getTree()
    const targetTreeOid = await convertGitTree(sourceTree, targetRepository)
    const sourceAuthorWhen = sourceCommit.author().when()
    const sourceCommitterWhen = sourceCommit.committer().when()
    const targetCommitMessage = `${sourceCommit.message().trim()} (${sourceCommitOidString})`
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
      targetTreeOid,
      [targetPreviousCommitOid].filter(
        (oid) => oid !== undefined,
      ) as nodegit.Oid[],
    )
  }

  return exitCode
}

sade("jorf_to_git_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing JORF data converted to Markdown (instead of XML)",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option("-k, --category", "Convert only given type of data")
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await jorfToGitMarkdown(dilaDir, options))
  })
  .parse(process.argv)
