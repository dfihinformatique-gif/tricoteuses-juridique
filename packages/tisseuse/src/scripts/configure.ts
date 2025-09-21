import { configureTisseuseDatabase } from "$lib/server/databases/tisseuse.js"

export async function configure(): Promise<void> {
  await configureTisseuseDatabase()
}

configure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error.stack || error)
    process.exit(1)
  })
