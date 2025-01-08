import assert from "assert"
import fs from "fs-extra"
import git from "isomorphic-git"
import path from "path"
import sade from "sade"
import { $, cd } from "zx"

import type { LegiTexteNature, LegiTexteVersion } from "$lib/legal/legi"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"
import { generateConsolidatedTextGit } from "$lib/server/gitify/generators"
import { repositoryNameFromTitle } from "$lib/server/gitify/repositories"

const { forgejo } = config

const dirNameByNature: Partial<Record<LegiTexteNature, string>> = {
  CODE: "codes",
  CONSTITUTION: "constitution",
  DECLARATION: "declarations",
}

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
  let exitCode = 0
  if (only !== undefined && typeof only === "string") {
    only = [only]
  }
  let skip = resume !== undefined

  const currentSourceCodeCommitOid = (
    await git.log({
      depth: 1,
      dir: ".",
      fs,
    })
  )[0]?.oid

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

    const consolidatedTextNatureDirName = dirNameByNature[
      consolidatedTexteVersion.META.META_COMMUN.NATURE as LegiTexteNature
    ] as string
    assert.notStrictEqual(consolidatedTextNatureDirName, undefined)
    const consolidatedTextTitle =
      consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
      consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
      consolidatedTextId
    const consolidatedTextRepositoryName = repositoryNameFromTitle(
      consolidatedTextTitle,
    )
    const consolidatedTextRepositoryDir = path.join(
      targetDir,
      consolidatedTextNatureDirName,
      consolidatedTextRepositoryName,
    )

    const result = await generateConsolidatedTextGit(
      consolidatedTextId,
      consolidatedTextRepositoryDir,
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
          `/api/v1/repos/${consolidatedTextNatureDirName}/${consolidatedTextRepositoryName}`,
          forgejo.url,
        ),
        { headers: { Accept: "application/json" } },
      )
      if (response.status === 404) {
        // Create respository.
        const url = new URL(
          `/api/v1/orgs/${consolidatedTextNatureDirName}/repos`,
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
          console.error(`Error while creating remote repository at ${url}:`)
          console.error(`${response.status} ${response.statusText}`)
          console.error(await response.text())
          throw new Error("Error while creating remote repository")
        }
      } else {
        assert(response.ok)
      }
      cd(consolidatedTextRepositoryDir)
      const origin = `[${forgejo.sshAccount}:${forgejo.sshPort}]:${consolidatedTextNatureDirName}/${consolidatedTextRepositoryName}.git`
      await $`git remote add origin ${origin}`
      await $`git push --all --force --set-upstream origin`
      await $`git push --force --tags`
    }
  }

  return exitCode
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
