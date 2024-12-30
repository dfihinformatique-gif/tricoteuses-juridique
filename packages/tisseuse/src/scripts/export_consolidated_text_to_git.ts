import sade from "sade"

import { generateConsolidatedTextGit } from "$lib/server/gitify/generators"

sade("export_consolidated_text_to_git <consolidatedTextId> <targetDir>", true)
  .describe(
    "Convert a consolidated LEGI texte (Constitution, code, law, etc) to a git repository",
  )
  .option(
    "-R, --log-references",
    "Log references of consolidated text and its articles",
  )
  .action(async (consolidatedTextId, targetDir, options) => {
    process.exit(
      await generateConsolidatedTextGit(consolidatedTextId, targetDir, options),
    )
  })
  .parse(process.argv)
