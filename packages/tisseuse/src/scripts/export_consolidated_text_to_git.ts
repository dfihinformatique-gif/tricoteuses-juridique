import fs from "fs-extra"
import nodegit from "nodegit"
import sade from "sade"

import { generateConsolidatedTextGit } from "$lib/server/nodegit/generators.js"

sade("export_consolidated_text_to_git <consolidatedTextId> <targetDir>", true)
  .describe(
    "Convert a consolidated LEGI texte (Constitution, code, law, etc) to a bare git repository",
  )
  .option("-C, --log-commits", "Log commits")
  .option(
    "-f, --force",
    "Force generation of git repository even if source code and source data have not changed",
  )
  .option(
    "-R, --log-references",
    "Log references of consolidated text and its articles",
  )
  .action(async (consolidatedTextId, targetDir, options) => {
    const repo = await nodegit.Repository.open(".")
    const headCommit = await repo.getHeadCommit()
    const currentSourceCodeCommitOid = headCommit?.id().tostrS()

    process.exit(
      await generateConsolidatedTextGit(consolidatedTextId, targetDir, {
        ...options,
        currentSourceCodeCommitOid,
      }),
    )
  })
  .parse(process.argv)
