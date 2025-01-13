import sade from "sade"

import type { LegiTexteVersion } from "$lib/legal/legi"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"

const { forgejo } = config

async function exportConsolidatedTextsToGit({
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
  only?: string
  push?: boolean
  resume?: string
  silent?: boolean
} = {}): Promise<number> {
  if (forgejo === undefined) {
    console.error("Missing Forgejo configuration.")
    return 1
  }

  let skip = resume !== undefined

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
    if (only !== undefined && only !== consolidatedTextId) {
      continue
    }

    const url = new URL(
      `v1/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/gitify.yaml/dispatches`,
      process.env.GITHUB_API_URL,
    ).toString()
    const response = await fetch(url, {
      body: JSON.stringify(
        {
          inputs: {
            force,
            "log-commits": logCommits,
            "log-references": logReferences,
            only: consolidatedTextId,
            push,
          },
          ref: "main",
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
        `Error while launching action to export consolidated text to git at ${url}:`,
      )
      console.error(`${response.status} ${response.statusText}`)
      console.error(await response.text())
      throw new Error(
        "Error while launching action to export consolidated text to git",
      )
    }
  }

  return 0
}

sade("run_actions_to_export_consolidated_texts_to_git", true)
  .describe(
    "Launch Forgejo actions to convert consolidated texts of laws to a git repositories",
  )
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
  .action(async (options) => {
    process.exit(await exportConsolidatedTextsToGit(options))
  })
  .parse(process.argv)
