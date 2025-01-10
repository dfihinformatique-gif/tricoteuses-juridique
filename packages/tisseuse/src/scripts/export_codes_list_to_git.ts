import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import path from "path"
import sade from "sade"
import { $, cd } from "zx"

import type {
  LegiTexteEtat,
  LegiTexteNature,
  LegiTexteVersion,
} from "$lib/legal/legi"
import config from "$lib/server/config"
import { db } from "$lib/server/databases"
import {
  licence,
  repositoryNameFromTitle,
} from "$lib/server/gitify/repositories"
import { writeTextFileIfChanged } from "$lib/server/files"

const { forgejo } = config

async function exportCodesListToGit(
  targetDir: string,
  {
    push,
    silent,
  }: {
    push?: boolean
    silent?: boolean
  } = {},
): Promise<number> {
  const repositoryDir = path.join(targetDir, "codes", "codes")
  await fs.remove(repositoryDir)
  await fs.ensureDir(repositoryDir)
  cd(repositoryDir)
  await $`git init`

  await writeTextFileIfChanged(path.join(repositoryDir, "LICENCE.md"), licence)
  await $`git add LICENCE.md`

  const codesLinks: Array<{
    etat?: LegiTexteEtat
    href: string
    title: string
  }> = []
  for (const { data: codeTexteVersion, id: codeId } of await db<
    { data: LegiTexteVersion; id: string }[]
  >`
    SELECT data, id
    FROM texte_version
    WHERE
      nature = 'CODE'
      and id LIKE 'LEGITEXT%'
  `) {
    const codeMetaTexteVersion =
      codeTexteVersion.META.META_SPEC.META_TEXTE_VERSION
    const codeTitle =
      codeMetaTexteVersion.TITREFULL ?? codeMetaTexteVersion.TITRE ?? codeId
    const codeRepositoryName = repositoryNameFromTitle(codeTitle)
    const codeRepositoryUrl = new URL(
      `codes/${codeRepositoryName}.git`,
      forgejo?.url,
    ).toString()
    await $`git submodule add ${codeRepositoryUrl}`
    codesLinks.push({
      etat: codeMetaTexteVersion.ETAT,
      href: `/codes/${codeRepositoryName}`,
      title: codeTitle,
    })
  }

  await writeTextFileIfChanged(
    path.join(repositoryDir, "README.md"),
    dedent`
      # Codes juridiques

      Ce dépôt contient tous les codes juridiques sous forme de sous-modules git.

      ## Utilisation

      Pour récupérer l'ensemble des codes juridiques, il suffit de cloner ce dépôt
      en exécutant la commande :

      \`\`\`sh
      git clone --recurse-submodules ${new URL(`codes/codes`, forgejo?.url)}
      \`\`\`

      L'ensemble occupe moins de 2 Go.

      ## Liste des codes juridiques

      ${codesLinks
        .sort(({ title: title1 }, { title: title2 }) =>
          title1.localeCompare(title2),
        )
        .map(
          ({ etat, href, title }) =>
            `- [${etat === "VIGUEUR" ? "" : "~~"}${title} (${etat})${etat === "VIGUEUR" ? "" : "~~"}](${href})`,
        )
        .join("\n")}
    `,
  )
  await $`git add README.md`

  await $`git commit -am "Création de la liste des codes juridiques"`

  if (push && forgejo !== undefined) {
    const response = await fetch(
      new URL(`/api/v1/repos/codes/codes`, forgejo.url),
      { headers: { Accept: "application/json" } },
    )
    if (response.status === 404) {
      // Create repository.
      const url = new URL(`/api/v1/orgs/codes/repos`, forgejo.url).toString()
      const response = await fetch(url, {
        body: JSON.stringify(
          {
            default_branch: "main",
            description: "Codes juridiques",
            name: "codes",
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
    const origin = `[${forgejo.sshAccount}:${forgejo.sshPort}]:codes/codes.git`
    await $`git remote add origin ${origin}`
    await $`git push --force --set-upstream origin main`
  }

  return 0
}

sade("export_codes_list_to_git <targetDir>", true)
  .describe("Generate a git repository containing legal codes")
  .option(
    "-p, --push",
    "Push generated consolidated texts to their Forgejo repositories",
  )
  .option("-s, --silent", "Hide log messages")
  .example("/var/tmp")
  .action(async (targetDir, options) => {
    process.exit(await exportCodesListToGit(targetDir, options))
  })
  .parse(process.argv)
