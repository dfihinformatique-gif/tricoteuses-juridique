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
    if (
      [
        "LEGITEXT000006074068", // Code des pensions militaires d'invalidité et des victimes de la guerre
        "LEGITEXT000006070302", // Code des pensions civiles et militaires de retraite
        "LEGITEXT000006069565", // Code de la consommation
        "LEGITEXT000006072665", // Code de la santé publique
        "LEGITEXT000006074234", // Code de l'aviation civile
        "LEGITEXT000023086525", // Code des transports
        "LEGITEXT000006070633", // Code général des collectivités territoriales
      ].includes(codeId)
    ) {
      continue
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
        new URL(`/api/v1/repos/textes_consolides/${codeSlug}`, forgejo.url),
        { headers: { Accept: "application/json" } },
      )
      if (response.status === 404) {
        // Create respository.
        const response = await fetch(
          new URL(`/api/v1/orgs/textes_consolides/repos`, forgejo.url),
          {
            body: JSON.stringify(
              {
                default_branch: "main",
                description: codeTitle,
                name: codeSlug,
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
          },
        )
        assert(response.ok)
      } else {
        assert(response.ok)
      }
      cd(codeRepositoryDir)
      const origin = `[${forgejo.sshAccount}:${forgejo.sshPort}]:textes_consolides/${codeSlug}.git`
      await $`git remote add origin ${origin}`
      await $`git push --force --tags --set-upstream origin main`
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
