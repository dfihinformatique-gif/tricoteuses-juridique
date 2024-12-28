import path from "path"
import sade from "sade"

import type { LegiTexteVersion } from "$lib/legal/legi"
import { db } from "$lib/server/databases"
import { generateConsolidatedTextGit } from "$lib/server/gitify/generators"
import { slugify } from "$lib/strings"

async function exportCodesToGit(
  targetDir: string,
  {
    only,
    push,
    resume,
    silent,
  }: {
    only?: string | string[]
    push?: boolean
    resume?: string
    silent?: boolean
  } = {},
): Promise<number> {
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

    const codeSlug = slugify(
      codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
        codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
        codeId,
      "_",
    )
    await generateConsolidatedTextGit(codeId, path.join(targetDir, codeSlug))
  }

  return 0
}

sade("export_codes_to_git <targetDir>", true)
  .describe("Convert codes of laws to a git repositories")
  .option("-o, --only", "ID of code to generate")
  .option("-p, --push", "Push generated code to their Forgejo repositories")
  .option("-r, --resume", "Resume generation at given code ID")
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp/codes")
  .action(async (targetDir, options) => {
    process.exit(await exportCodesToGit(targetDir, options))
  })
  .parse(process.argv)
