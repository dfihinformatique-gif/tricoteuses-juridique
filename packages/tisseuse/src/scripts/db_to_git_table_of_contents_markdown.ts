import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"

import { gitPathFromId } from "$lib/legal/ids"
import type { Jo, JorfTexteVersion } from "$lib/legal/jorf"
import type { LegiTexteVersion } from "$lib/legal/legi"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"
import {
  escapeMarkdownLinkTitle,
  escapeMarkdownLinkUrl,
  escapeMarkdownText,
  escapeMarkdownTitle,
  slugify,
} from "$lib/strings"

type SummaryMarkdown =
  | {
      children?: undefined
      markdown: string
    }
  | {
      children: SummaryMarkdown[]
      markdown: string
    }

const { forgejo } = config
const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
})

async function dbToGitTableOfContentsMarkdown(
  dilaDir: string,
  {
    push,
    // silent,
    textes: textesJuridiquesRepositoryUrl,
  }: {
    push?: boolean
    silent?: boolean
    textes: string
  },
): Promise<number> {
  const exitCode = 0

  assert.notStrictEqual(
    textesJuridiquesRepositoryUrl,
    undefined,
    "Options --textes is required.",
  )

  const targetGitDir = path.join(
    dilaDir,
    "table_des_matieres_textes_juridiques.git",
  )
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  const tableOfContentsBuilder =
    await nodegit.Treebuilder.create(targetRepository)
  const tableOfContentsSummaryMarkdownArray: SummaryMarkdown[] = []

  // Generate Journal officiel pages.

  let currentMonth = 13
  let currentYear = 9999
  const joBuilder = await nodegit.Treebuilder.create(targetRepository)
  const joDir = "journal_officiel"
  const joSummaryMarkdownArray: SummaryMarkdown[] = []
  let monthSummaryMarkdown: SummaryMarkdown = {
    children: [],
    markdown: "Empty",
  }
  let yearSummaryMarkdownArray: SummaryMarkdown[] = []
  for await (const rows of db<Array<{ data: Jo; id: string }>>`
    SELECT data, id
    FROM jo
    ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_CONTENEUR' ->> 'DATE_PUBLI' DESC
  `.cursor(100)) {
    for (const { data: jo, id } of rows) {
      const metaConteneur = jo.META.META_SPEC.META_CONTENEUR
      const datePubli = metaConteneur.DATE_PUBLI
      const [year, month /* , day */] = datePubli
        .split("-")
        .map((s) => parseInt(s))
      if (year < currentYear) {
        // New year => Write page of current year.
        if (yearSummaryMarkdownArray.length !== 0) {
          const yearMarkdown = [
            `# ${escapeMarkdownTitle(`Journal officiel de l'année ${currentYear}`)}`,
            markdownTreeFromSummaryMarkdownArray(yearSummaryMarkdownArray),
          ]
            .filter((block) => block !== undefined)
            .join("\n\n")
          const yearOid = await targetRepository.createBlobFromBuffer(
            Buffer.from(yearMarkdown, "utf-8"),
          )
          joBuilder.insert(
            currentYear.toString() + ".md",
            yearOid,
            nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
          )

          joSummaryMarkdownArray.push({
            markdown: `[${currentYear}](${currentYear}.md)`,
          })
        }

        currentMonth = 13
        currentYear = year
        yearSummaryMarkdownArray = []
      }
      if (month < currentMonth) {
        currentMonth = month
        monthSummaryMarkdown = {
          children: [],
          markdown: monthYearFormatter.format(
            new Date(currentYear, currentMonth - 1, 1),
          ),
        }
        yearSummaryMarkdownArray.push(monthSummaryMarkdown)
      }
      monthSummaryMarkdown.children.push({
        markdown: markdownLinkFromIdAndTitle(
          textesJuridiquesRepositoryUrl,
          id,
          escapeMarkdownText(metaConteneur.TITRE),
        ),
      })
    }
  }
  if (yearSummaryMarkdownArray.length !== 0) {
    const yearMarkdown = [
      `# ${escapeMarkdownTitle(`Journal officiel de l'année ${currentYear}`)}`,
      markdownTreeFromSummaryMarkdownArray(yearSummaryMarkdownArray),
    ]
      .filter((block) => block !== undefined)
      .join("\n\n")
    const yearOid = await targetRepository.createBlobFromBuffer(
      Buffer.from(yearMarkdown, "utf-8"),
    )
    joBuilder.insert(
      currentYear.toString() + ".md",
      yearOid,
      nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
    )

    joSummaryMarkdownArray.push({
      markdown: `[${currentYear}](${currentYear}.md)`,
    })
  }

  const joMarkdown = [
    "# Journal officiel",
    markdownTreeFromSummaryMarkdownArray(joSummaryMarkdownArray),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  const joOid = await targetRepository.createBlobFromBuffer(
    Buffer.from(joMarkdown, "utf-8"),
  )
  joBuilder.insert(
    "README.md",
    joOid,
    nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
  )

  const joTreeOid = await joBuilder.write()
  tableOfContentsBuilder.insert(
    joDir,
    joTreeOid,
    nodegit.TreeEntry.FILEMODE.TREE, // 0o100644
  )

  tableOfContentsSummaryMarkdownArray.push({
    markdown: `[Journal officiel](journal_officiel/README.md)`,
  })

  // Generate pages for each nature of texts.

  const natures = (
    await db<{ nature: string | null }[]>`
      SELECT distinct nature
      FROM texte_version
      WHERE id LIKE 'JORF%' OR id LIKE 'LEGI%'
      ORDER BY nature
    `
  ).map(({ nature }) => nature)
  const naturesBySlug: Record<string, Array<string | null>> = {}
  for (const nature of natures) {
    ;(naturesBySlug[slugify(nature || "Textes sans nature", "_")] ??= []).push(
      nature,
    )
  }

  for (const [natureSlug, sameSlugNatures] of Object.entries(naturesBySlug)) {
    let currentMonth = 13
    let currentYear = 9999
    const natureBuilder = await nodegit.Treebuilder.create(targetRepository)
    const natureDir = natureSlug
    const natureSummaryMarkdownArray: SummaryMarkdown[] = []
    let monthSummaryMarkdown: SummaryMarkdown = {
      children: [],
      markdown: "Empty",
    }
    let yearSummaryMarkdownArray: SummaryMarkdown[] = []
    const query = sameSlugNatures.includes(null)
      ? db<Array<{ data: JorfTexteVersion | LegiTexteVersion; id: string }>>`
          SELECT data, id
          FROM texte_version
          WHERE
            nature IS NULL
            AND (id LIKE 'JORF%' OR id LIKE 'LEGI%')
          ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'DATE_TEXTE' DESC
        `
      : db<Array<{ data: JorfTexteVersion | LegiTexteVersion; id: string }>>`
          SELECT data, id
          FROM texte_version
          WHERE
            nature IN ${db(sameSlugNatures)}
            AND (id LIKE 'JORF%' OR id LIKE 'LEGI%')
          ORDER BY data -> 'META' -> 'META_SPEC' -> 'META_TEXTE_CHRONICLE' ->> 'DATE_TEXTE' DESC
        `
    const natureTitle = sameSlugNatures.includes(null)
      ? "Textes sans nature"
      : sameSlugNatures.join(", ")
    for await (const rows of query.cursor(100)) {
      for (const { data: texteVersion, id } of rows) {
        const metaTextChronicle =
          texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE
        const metaTexteVersion = texteVersion.META.META_SPEC.META_TEXTE_VERSION
        const dateTexte = metaTextChronicle.DATE_TEXTE
        const [year, month /* , day */] = dateTexte
          .split("-")
          .map((s) => parseInt(s))
        if (year < currentYear) {
          // New year => Write page of current year.
          if (yearSummaryMarkdownArray.length !== 0) {
            const yearMarkdown = [
              `# ${escapeMarkdownTitle(`${natureTitle} — ${currentYear}`)}`,
              markdownTreeFromSummaryMarkdownArray(yearSummaryMarkdownArray),
            ]
              .filter((block) => block !== undefined)
              .join("\n\n")
            const yearOid = await targetRepository.createBlobFromBuffer(
              Buffer.from(yearMarkdown, "utf-8"),
            )
            natureBuilder.insert(
              currentYear.toString() + ".md",
              yearOid,
              nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
            )

            natureSummaryMarkdownArray.push({
              markdown: `[${currentYear}](${currentYear}.md)`,
            })
          }

          currentMonth = 13
          currentYear = year
          yearSummaryMarkdownArray = []
        }
        if (month < currentMonth) {
          currentMonth = month
          monthSummaryMarkdown = {
            children: [],
            markdown: monthYearFormatter.format(
              new Date(currentYear, currentMonth - 1, 1),
            ),
          }
          yearSummaryMarkdownArray.push(monthSummaryMarkdown)
        }
        const title = (
          metaTexteVersion.TITREFULL ??
          metaTexteVersion.TITRE ??
          "Texte sans titre"
        )
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\s+\(\d+\)$/, "")
        monthSummaryMarkdown.children.push({
          markdown: markdownLinkFromIdAndTitle(
            textesJuridiquesRepositoryUrl,
            id,
            escapeMarkdownText(title),
          ),
        })
      }
    }
    if (yearSummaryMarkdownArray.length !== 0) {
      const yearMarkdown = [
        `# ${escapeMarkdownTitle(`${natureTitle} — ${currentYear}`)}`,
        markdownTreeFromSummaryMarkdownArray(yearSummaryMarkdownArray),
      ]
        .filter((block) => block !== undefined)
        .join("\n\n")
      const yearOid = await targetRepository.createBlobFromBuffer(
        Buffer.from(yearMarkdown, "utf-8"),
      )
      natureBuilder.insert(
        currentYear.toString() + ".md",
        yearOid,
        nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
      )

      natureSummaryMarkdownArray.push({
        markdown: `[${currentYear}](${currentYear}.md)`,
      })
    }

    const natureMarkdown = [
      `# ${escapeMarkdownTitle(`${natureTitle}`)}`,
      markdownTreeFromSummaryMarkdownArray(natureSummaryMarkdownArray),
    ]
      .filter((block) => block !== undefined)
      .join("\n\n")
    const natureOid = await targetRepository.createBlobFromBuffer(
      Buffer.from(natureMarkdown, "utf-8"),
    )
    natureBuilder.insert(
      "README.md",
      natureOid,
      nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
    )

    const natureTreeOid = await natureBuilder.write()
    tableOfContentsBuilder.insert(
      natureDir,
      natureTreeOid,
      nodegit.TreeEntry.FILEMODE.TREE, // 0o100644
    )

    tableOfContentsSummaryMarkdownArray.push({
      markdown: `[${natureTitle}](${natureSlug}/README.md)`,
    })
  }

  // Generate main README.

  const tableOfContentsMarkdown = [
    "# Table des matières des textes juridiques",
    markdownTreeFromSummaryMarkdownArray(tableOfContentsSummaryMarkdownArray),
  ]
    .filter((block) => block !== undefined)
    .join("\n\n")
  const tableOfContentsOid = await targetRepository.createBlobFromBuffer(
    Buffer.from(tableOfContentsMarkdown, "utf-8"),
  )
  tableOfContentsBuilder.insert(
    "README.md",
    tableOfContentsOid,
    nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
  )

  const targetTreeOid = await tableOfContentsBuilder.write()

  const headExists = await nodegit.Reference.lookup(targetRepository, "HEAD")
    .then(() => true)
    .catch(() => false)
  if (headExists) {
    nodegit.Reference.remove(targetRepository, "HEAD")
  }

  const targetCommitOid = await targetRepository.createCommit(
    "HEAD",
    nodegit.Signature.create("Tricoteuses", "tricoteuses@tricoteuses.fr", 0, 0),
    nodegit.Signature.create("Tricoteuses", "tricoteuses@tricoteuses.fr", 0, 0),
    "Génération de la table des matières",
    targetTreeOid,
    [],
  )
  await targetRepository.createBranch("main", targetCommitOid!, true)
  await targetRepository.setHead("refs/heads/main")

  if (forgejo !== undefined && push) {
    let targetRemote: nodegit.Remote
    try {
      targetRemote = await targetRepository.getRemote("origin")
    } catch (error) {
      if ((error as Error).message.includes("remote 'origin' does not exist")) {
        const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/table_des_matieres_textes_juridiques.git`
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
    await nodegit.Branch.setUpstream(targetBranch, `origin/${targetBranchName}`)
  }

  return exitCode
}

function markdownLinkFromIdAndTitle(
  textesJuridiquesRepositoryUrl: string,
  id: string,
  title: string,
): string {
  return `[${escapeMarkdownLinkTitle(title)}](${escapeMarkdownLinkUrl(new URL(gitPathFromId(id, ".md"), textesJuridiquesRepositoryUrl).toString())})`
}

function markdownTreeFromSummaryMarkdownArray(
  summaryMarkdownArray: SummaryMarkdown[],
  {
    indent,
  }: {
    indent?: number
  } = {},
): string {
  return summaryMarkdownArray
    .map((summaryMarkdown) =>
      [
        dedent`
            ${"  ".repeat(indent ?? 0)}* ${summaryMarkdown.markdown}
          `,
        summaryMarkdown.children === undefined
          ? undefined
          : markdownTreeFromSummaryMarkdownArray(summaryMarkdown.children, {
              indent: (indent ?? 0) + 1,
            }),
      ]
        .filter((fragment) => fragment !== undefined)
        .join("\n"),
    )
    .join("\n")
}

sade("git_json_to_git_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing latest commits of JORF & LEGI data converted to Markdown",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .option("-t, --textes", 'URL of repository of "textes juridiques"')
  .option("-v, --verbose", "Show more log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await dbToGitTableOfContentsMarkdown(dilaDir, options))
  })
  .parse(process.argv)
