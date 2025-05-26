import assert from "assert"
import fs from "fs-extra"
import nodegit from "nodegit"
import path from "path"
import sade from "sade"
import opentelemetry from "@opentelemetry/api"
import { $, cd } from "zx"

import type { LegiTexteNature, LegiTexteVersion } from "$lib/legal/legi.js"
import config from "$lib/server/config.js"
import { db } from "$lib/server/databases/index.js"
import { generateConsolidatedTextGit } from "$lib/server/nodegit/generators.js"
import {
  organizationNameByTexteNature,
  repositoryNameFromTitle,
} from "$lib/urls.js"

const { forgejo } = config
const tracer = opentelemetry.trace.getTracer("export_consolidated_texts_to_git")

async function exportConsolidatedTextsToGit(
  targetDir: string,
  {
    force,
    "log-commits": logCommits,
    "log-references": logReferences,
    only,
    push,
    resume,
    silent,
  }: {
    force?: boolean
    "log-commits"?: boolean
    "log-references"?: boolean
    only?: string | string[]
    push?: boolean
    resume?: string
    silent?: boolean
  } = {},
): Promise<number> {
  return await tracer.startActiveSpan(
    `exportConsolidatedTextsToGit`,
    async (span) => {
      try {
        let exitCode = 0
        if (only !== undefined && typeof only === "string") {
          only = [only]
        }
        let skip = resume !== undefined

        const repo = await nodegit.Repository.open(".")
        const headCommit = await repo.getHeadCommit()
        const currentSourceCodeCommitOid = headCommit?.id().tostrS()

        for (const {
          data: consolidatedTexteVersion,
          id: consolidatedTextId,
        } of await db<{ data: LegiTexteVersion; id: string }[]>`
          SELECT data, id
          FROM texte_version
          WHERE
            nature IN ('CODE', 'CONSTITUTION', 'DECLARATION')
            and id LIKE 'LEGITEXT%'
        `) {
          if (skip) {
            if (consolidatedTextId === resume) {
              skip = false
              if (!silent) {
                console.log(
                  `Resuming at consolidated text ${consolidatedTextId} ${consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}...`,
                )
              }
            } else {
              continue
            }
          }
          if (only !== undefined && !only.includes(consolidatedTextId)) {
            continue
          }

          const consolidatedTextOrganizationName =
            organizationNameByTexteNature[
              consolidatedTexteVersion.META.META_COMMUN
                .NATURE as LegiTexteNature
            ] as string
          assert.notStrictEqual(consolidatedTextOrganizationName, undefined)
          const consolidatedTextTitle =
            consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .TITREFULL ??
            consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
            consolidatedTextId
          const consolidatedTextRepositoryName = repositoryNameFromTitle(
            consolidatedTextTitle,
          )
          const consolidatedTextRepositoryDir = path.join(
            targetDir,
            consolidatedTextOrganizationName,
            consolidatedTextRepositoryName,
          )

          const result = await generateConsolidatedTextGit(
            consolidatedTextId,
            consolidatedTextRepositoryDir + ".git",
            {
              currentSourceCodeCommitOid,
              force,
              "log-commits": logCommits,
              "log-references": logReferences,
            },
          )
          if (result !== 0) {
            // Note: When result === 10, the git repository has not been generated.
            if (result !== 10 && exitCode === 0) {
              exitCode = result
            }
            continue
          }
          if (push && forgejo !== undefined) {
            const response = await fetch(
              new URL(
                `/api/v1/repos/${consolidatedTextOrganizationName}/${consolidatedTextRepositoryName}`,
                forgejo.url,
              ),
              { headers: { Accept: "application/json" } },
            )
            if (response.status === 404) {
              // Create repository.
              const url = new URL(
                `/api/v1/orgs/${consolidatedTextOrganizationName}/repos`,
                forgejo.url,
              ).toString()
              const response = await fetch(url, {
                body: JSON.stringify(
                  {
                    default_branch: "main",
                    description: consolidatedTextTitle,
                    name: consolidatedTextRepositoryName,
                  },
                  null,
                  2,
                ),
                headers: {
                  Accept: "application/json",
                  Authorization: `token ${forgejo.token}`,
                  "Content-Type": "application/json",
                },
                method: "POST",
              })
              if (!response.ok) {
                console.error(
                  `Error while creating remote repository at ${url}:`,
                )
                console.error(`${response.status} ${response.statusText}`)
                console.error(await response.text())
                throw new Error("Error while creating remote repository")
              }
            } else {
              assert(response.ok)
            }
            cd(consolidatedTextRepositoryDir + ".git")
            const origin = `[${forgejo.sshAccount}:${forgejo.sshPort}]:${consolidatedTextOrganizationName}/${consolidatedTextRepositoryName}.git`
            await $`git remote add origin ${origin}`
            await $`git push --all --force --set-upstream origin`
            // Remove remote tags that are not present locally.
            await $`git ls-remote --tags origin | awk '{print $2}' | sed 's|refs/tags/||' | sort | comm -23 - <(git tag | sort) | xargs -I {} git push --delete origin {}`
            await $`git push --force --quiet --tags`
          }
        }
        return exitCode
      } finally {
        span.end()
      }
    },
  )
}

sade("export_consolidated_texts_to_git <targetDir>", true)
  .describe("Convert consolidated texts of laws to a git repositories")
  .option("-C, --log-commits", "Log commits")
  .option(
    "-f, --force",
    "Force generation of git repositories even if source data have not changed",
  )
  .option("-o, --only", "ID of consolidated text to generate")
  .option(
    "-p, --push",
    "Push generated consolidated texts to their Forgejo repositories",
  )
  .option(
    "-R, --log-references",
    "Log references of consolidated text and its articles",
  )
  .option("-r, --resume", "Resume generation at given consolidated text ID")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (targetDir, options) => {
    process.exit(await exportConsolidatedTextsToGit(targetDir, options))
  })
  .parse(process.argv)
