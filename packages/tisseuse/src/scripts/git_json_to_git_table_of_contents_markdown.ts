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

import { extractTypeFromId, gitPathFromId } from "$lib/legal/ids.js"
import type { Jo, JorfTexte } from "$lib/legal/jorf.js"
import type { LegiTexte } from "$lib/legal/legi.js"
import {
  escapeMarkdownLinkTitle,
  escapeMarkdownLinkUrl,
  escapeMarkdownText,
  escapeMarkdownTitle,
} from "$lib/markdown/escapes.js"
import config from "$lib/server/config.js"
import { licence } from "$lib/server/nodegit/repositories.js"
import { dilaDateRegExp, iterCommitsOids } from "$lib/server/nodegit/commits.js"
import {
  readOidBySplitPathTree,
  walkPreviousAndCurrentOidByIdTrees,
  type OidBySplitPathTree,
} from "$lib/server/nodegit/trees.js"
import { capitalizeFirstLetter, slugify } from "$lib/strings.js"

interface Description {
  date: string
  id: string
  nature?: string
  title: string
}
type DescriptionById = Map<string, Description>

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

async function convertJsonTreeToDescriptionById(
  previousJsonOidByIdTree: OidBySplitPathTree,
  jsonOidByIdTree: OidBySplitPathTree,
  jsonRepository: nodegit.Repository,
  descriptionById: DescriptionById,
  {
    verbose,
  }: {
    verbose?: boolean
  } = {},
): Promise<boolean> {
  let changed = false
  for (const {
    blobOid,
    id,
    previousBlobOid,
  } of walkPreviousAndCurrentOidByIdTrees(
    previousJsonOidByIdTree,
    jsonOidByIdTree,
  )) {
    if (blobOid?.tostrS() === previousBlobOid?.tostrS()) {
      continue
    }
    if (verbose) {
      console.log(
        blobOid === undefined
          ? `Removing title of ID ${id} (blob OID: ${previousBlobOid}) from table of contents…`
          : previousBlobOid === undefined
            ? `Adding title of ID ${id} (blob OID: ${blobOid}) to table of contents…`
            : `Updating title of ID ${id} (blob OID: ${blobOid}) in table of contents…`,
      )
    }

    if (blobOid === undefined) {
      // Remove object from table of contents.
      descriptionById.delete(id)
    } else {
      const legalObject = JSON.parse(
        (await jsonRepository.getBlob(blobOid)).content().toString("utf-8"),
      )
      let description: Description
      const idType = extractTypeFromId(id)
      switch (idType) {
        case "CONT": {
          const metaConteneur = (legalObject as Jo).META.META_SPEC
            .META_CONTENEUR
          description = {
            date: metaConteneur.DATE_PUBLI,
            id,
            nature: "Journal officiel",
            title: metaConteneur.TITRE,
          }
          break
        }

        case "TEXT": {
          const texte = legalObject as JorfTexte | LegiTexte
          const metaTexteVersion = texte.META.META_SPEC.META_TEXTE_VERSION
          description = {
            date: texte.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI,
            id,
            nature: texte.META.META_COMMUN.NATURE,
            title: (
              metaTexteVersion.TITREFULL ??
              metaTexteVersion.TITRE ??
              "Texte sans titre"
            )
              .replace(/\s+/g, " ")
              .trim()
              .replace(/\s+\(\d+\)$/, ""),
          }
          break
        }

        default: {
          throw new Error(`Unexpected type ${idType} in ID ${id}`)
        }
      }
      const oldDescription = descriptionById.get(id)
      if (
        description.date !== oldDescription?.date ||
        description.nature !== oldDescription?.nature ||
        description.title !== oldDescription?.title
      ) {
        descriptionById.set(id, description)
        changed = true
      }
    }
  }

  return changed
}

async function gitJsonToGitTableOfContentsMarkdown(
  dilaDir: string,
  {
    force,
    init,
    push,
    silent,
    textes: textesJuridiquesRepositoryUrl,
    verbose,
  }: {
    force?: boolean
    init?: string
    push?: boolean
    silent?: boolean
    textes: string
    verbose?: boolean
  },
): Promise<number> {
  const exitCode = 0

  const steps: Array<{ label: string; start: number }> = []
  steps.push({ label: "Resuming", start: performance.now() })

  assert.notStrictEqual(
    silent && verbose,
    true,
    "Options --quiet and --verbose are incompatible.",
  )
  assert.notStrictEqual(
    textesJuridiquesRepositoryUrl,
    undefined,
    "Options --textes is required.",
  )

  const [dilaStartDate, dilaStartDateError] = auditChain(
    auditTest(
      (value: string) => dilaDateRegExp.test(value),
      (value) => `Date not found in "${value}"`,
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
  const targetGitDir = path.join(
    dilaDir,
    "table_des_matieres_textes_juridiques.git",
  )
  const targetRepository = (await fs.pathExists(targetGitDir))
    ? await nodegit.Repository.open(targetGitDir)
    : await nodegit.Repository.init(targetGitDir, 1 /* bare */)

  let commitsChanged = false
  const descriptionById: DescriptionById = new Map()
  let jsonOidByIdTree: OidBySplitPathTree = { childByKey: new Map() }
  let previousJsonCommit: nodegit.Commit | undefined = undefined
  let skip = true
  let targetBaseCommitFound = false
  let targetCommitOid: nodegit.Oid | undefined = undefined
  let targetCommitsOidsIterationsDone = false
  const targetCommitsOidsIterator = iterCommitsOids(targetRepository, true)
  for await (const jsonCommitOid of iterCommitsOids(jsonRepository, true)) {
    const jsonCommit = await jsonRepository.getCommit(jsonCommitOid)
    const sourceMessage = jsonCommit.message()
    const dilaDate = sourceMessage.match(dilaDateRegExp)?.[0] ?? null
    if (dilaDate === null) {
      if (!silent) {
        console.warn(
          `Ignoring commit with message "${sourceMessage}" that doesn't match a Dila date.`,
        )
      }
      continue
    }

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
          previousJsonCommit = jsonCommit
          continue
        }
      }
      if (!silent) {
        console.log(`Resuming conversion at date ${dilaDate}…`)
      }
      if (previousJsonCommit !== undefined) {
        // Read the jsonOidByIdTree of the previous commi
        // to ensure that the first call to convertJsonTreeToMarkdown will only
        // convert the changes.
        const previousJsonTree = await jsonCommit.getTree()
        jsonOidByIdTree = await readOidBySplitPathTree(
          jsonRepository,
          previousJsonTree,
          ".json",
          jsonOidByIdTree,
          { only: [undefined, ["CONT", "TEXT"]] },
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
    const jsonTree = await jsonCommit.getTree()
    const previousJsonOidByIdTree = jsonOidByIdTree
    jsonOidByIdTree = await readOidBySplitPathTree(
      jsonRepository,
      jsonTree,
      ".json",
      jsonOidByIdTree,
      { only: [undefined, ["CONT", "TEXT"]] },
    )

    steps.push({
      label: "Generate/update descriptionById from JOs & texts",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    let descriptionByIdChanged = false
    if (
      await convertJsonTreeToDescriptionById(
        previousJsonOidByIdTree,
        jsonOidByIdTree,
        jsonRepository,
        descriptionById,
        { verbose },
      )
    ) {
      descriptionByIdChanged = true
    }
    if (!descriptionByIdChanged) {
      // No change to commit.
      continue
    }

    steps.push({
      label: "Group JOs & texts descriptions by nature & year",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const descriptionsByMonthByYearByNatureSlug = new Map<
      string | undefined,
      Map<number, Map<number, Description[]>>
    >()
    const naturesBySlug: Map<
      string | undefined,
      Set<string | undefined>
    > = new Map()
    for (const description of descriptionById.values()) {
      const natureSlug =
        description.nature === undefined
          ? undefined
          : slugify(description.nature)

      let natures = naturesBySlug.get(natureSlug)
      if (natures === undefined) {
        natures = new Set()
        naturesBySlug.set(natureSlug, natures)
      }
      natures.add(description.nature)

      let descriptionsByMonthByYear =
        descriptionsByMonthByYearByNatureSlug.get(natureSlug)
      if (descriptionsByMonthByYear === undefined) {
        descriptionsByMonthByYear = new Map()
        descriptionsByMonthByYearByNatureSlug.set(
          natureSlug,
          descriptionsByMonthByYear,
        )
      }
      const [year, month /* , day */] = description.date
        .split("-")
        .map((s) => parseInt(s))
      let descriptionsByMonth = descriptionsByMonthByYear.get(year)
      if (descriptionsByMonth === undefined) {
        descriptionsByMonth = new Map()
        descriptionsByMonthByYear.set(year, descriptionsByMonth)
      }
      let descriptions = descriptionsByMonth.get(month)
      if (descriptions === undefined) {
        descriptions = []
        descriptionsByMonth.set(month, descriptions)
      }
      descriptions.push(description)
    }

    steps.push({
      label: "Generate table of contents pages",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
    const tableOfContentsBuilder =
      await nodegit.Treebuilder.create(targetRepository)
    const tableOfContentsSummaryMarkdownArray: SummaryMarkdown[] = []
    for (const [natureSlug, descriptionsByMonthByYear] of [
      ...descriptionsByMonthByYearByNatureSlug.entries(),
    ].sort(([natureSlug1], [natureSlug2]) =>
      natureSlug1 === undefined
        ? -1
        : natureSlug2 === undefined
          ? 1
          : natureSlug1.localeCompare(natureSlug2),
    )) {
      const natureBuilder = await nodegit.Treebuilder.create(targetRepository)
      const natureDir = natureSlug ?? "textes_sans_nature"
      const natures = [...naturesBySlug.get(natureSlug)!].sort()
      const natureSummaryMarkdownArray: SummaryMarkdown[] = []
      const natureTitle =
        natureSlug === undefined ? "_Textes sans nature_" : natures.join(", ")
      for (const [year, descriptionsByMonth] of [
        ...descriptionsByMonthByYear.entries(),
      ].sort(([year1], [year2]) => year2 - year1)) {
        const yearSummaryMarkdownArray: SummaryMarkdown[] = []
        for (const [month, descriptions] of [
          ...descriptionsByMonth.entries(),
        ].sort(([month1], [month2]) => month2 - month1)) {
          const monthSummaryMarkdown = {
            children: descriptions
              .sort(({ date: date1 }, { date: date2 }) =>
                date2.localeCompare(date1),
              )
              .map(({ id, title }) => ({
                markdown: markdownLinkFromIdAndTitle(
                  textesJuridiquesRepositoryUrl,
                  id,
                  escapeMarkdownText(title),
                ),
              })),
            markdown: capitalizeFirstLetter(
              monthYearFormatter.format(new Date(year, month - 1, 1)),
            ),
          }
          yearSummaryMarkdownArray.push(monthSummaryMarkdown)
        }
        const yearMarkdown = [
          `# ${escapeMarkdownTitle(`${natureTitle} — ${year}`)}`,
          markdownTreeFromSummaryMarkdownArray(yearSummaryMarkdownArray),
        ]
          .filter((block) => block !== undefined)
          .join("\n\n")
        const yearOid = await targetRepository.createBlobFromBuffer(
          Buffer.from(yearMarkdown, "utf-8"),
        )
        natureBuilder.insert(
          year.toString() + ".md",
          yearOid,
          nodegit.TreeEntry.FILEMODE.BLOB, // 0o040000
        )

        natureSummaryMarkdownArray.push({
          markdown: `[${year}](${year}.md)`,
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
        markdown: `[${natureTitle}](${natureSlug ?? "textes_sans_nature"}/README.md)`,
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
    const targetExistingCommit =
      targetExistingCommitOid === undefined
        ? undefined
        : await targetRepository.getCommit(targetExistingCommitOid)
    const targetExistingTreeOid = targetExistingCommit?.treeId()
    if (
      targetExistingTreeOid !== undefined &&
      targetTreeOid.equal(targetExistingTreeOid)
    ) {
      continue
    }

    steps.push({
      label: "Commit",
      start: performance.now(),
    })
    console.log(
      `${steps.at(-2)!.label}: ${steps.at(-1)!.start - steps.at(-2)!.start}`,
    )
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
          const targetRemoteUrl = `ssh://${forgejo.sshAccount}:${forgejo.sshPort}/dila/table_des_matieres_.git`
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

sade("git_json_to_git_table_of_contents_markdown <dilaDir>", true)
  .describe(
    "Generate a git repository containing a Markdown table of contents of JORF & LEGI texts",
  )
  .option("-f, --force", "Force regeneration of every existing commits")
  .option(
    "-i, --init",
    "Start conversion at given Dila export date (YYYYMMDD-HHMMSS format",
  )
  .option("-p, --push", "Push generated repository")
  .option("-s, --silent", "Hide log messages")
  .option("-t, --textes", 'URL of "textes juridiques" repository')
  .option("-v, --verbose", "Show more log messages")
  .example("/var/tmp")
  .action(async (dilaDir, options) => {
    process.exit(await gitJsonToGitTableOfContentsMarkdown(dilaDir, options))
  })
  .parse(process.argv)
