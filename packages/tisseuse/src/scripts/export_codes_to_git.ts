import assert from "assert"
import path from "path"
import sade from "sade"
import { $, cd } from "zx"

import type { LegiTexteVersion } from "$lib/legal/legi"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"
import { generateConsolidatedTextGit } from "$lib/server/gitify/generators"
import { slugify } from "$lib/strings"

const { forgejo } = config

async function exportCodesToGit(
  targetDir: string,
  {
    "log-references": logReferences,
    only,
    push,
    resume,
    silent,
  }: {
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
  for (const { data: codeTexteVersion, id: codeId } of await db<
    { data: LegiTexteVersion; id: string }[]
  >`
    SELECT data, id FROM texte_version WHERE nature = 'CODE' and id LIKE 'LEGITEXT%'
  `) {
    if (skip) {
      if (codeId === resume) {
        skip = false
        if (!silent) {
          console.log(
            `Resuming at code ${codeId} ${codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL}...`,
          )
        }
      } else {
        continue
      }
    }
    if (only !== undefined && !only.includes(codeId)) {
      continue
    }

    const codeTitle =
      codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
      codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
      codeId
    const codeSlug = slugify(codeTitle, "_")
    const codeRepositoryDir = path.join(targetDir, codeSlug)
    let codeRepositoryName = codeSlug
    if (codeRepositoryName.length > 100) {
      codeRepositoryName = codeRepositoryName
        .replaceAll("_de_", "_")
        .replaceAll("_des_", "_")
        .replaceAll("_l_", "_")
        .replaceAll("_la_", "_")
        .replaceAll("_le_", "_")
        .replaceAll("_les_", "_")
    }
    while (codeRepositoryName.length > 100) {
      codeRepositoryName = codeRepositoryName.replace(/_[^_]+$/, "")
    }

    const result = await generateConsolidatedTextGit(
      codeId,
      codeRepositoryDir,
      {
        "log-references": logReferences,
      },
    )
    if (result !== 0) {
      if (exitCode === 0) {
        exitCode = result
      }
      continue
    }
    if (push && forgejo !== undefined) {
      const response = await fetch(
        new URL(
          `/api/v1/repos/textes_consolides/${codeRepositoryName}`,
          forgejo.url,
        ),
        { headers: { Accept: "application/json" } },
      )
      if (response.status === 404) {
        // Create respository.
        const url = new URL(
          `/api/v1/orgs/textes_consolides/repos`,
          forgejo.url,
        ).toString()
        const response = await fetch(url, {
          body: JSON.stringify(
            {
              default_branch: "main",
              description: codeTitle,
              name: codeRepositoryName,
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
      cd(codeRepositoryDir)
      const origin = `[${forgejo.sshAccount}:${forgejo.sshPort}]:textes_consolides/${codeRepositoryName}.git`
      await $`git remote add origin ${origin}`
      await $`git push --all --force --set-upstream origin`
      await $`git push --tags`
    }
  }

  return exitCode
}

sade("export_codes_to_git <targetDir>", true)
  .describe("Convert codes of laws to a git repositories")
  .option("-o, --only", "ID of code to generate")
  .option("-p, --push", "Push generated code to their Forgejo repositories")
  .option(
    "-R, --log-references",
    "Log references of consolidated text and its articles",
  )
  .option("-r, --resume", "Resume generation at given code ID")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp/codes")
  .action(async (targetDir, options) => {
    process.exit(await exportCodesToGit(targetDir, options))
  })
  .parse(process.argv)
