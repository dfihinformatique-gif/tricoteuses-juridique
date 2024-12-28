import sade from "sade"

import { generateConsolidatedTextGit } from "$lib/server/gitify/generators"

sade("export_consolidated_text_to_git <consolidatedTextId> <targetDir>", true)
  .describe(
    "Convert a consolidated LEGI texte (Constitution, code, law, etc) to a git repository",
  )
  .action(async (consolidatedTextId, targetDir) => {
    process.exit(
      await generateConsolidatedTextGit(consolidatedTextId, targetDir),
    )
  })
  .parse(process.argv)
