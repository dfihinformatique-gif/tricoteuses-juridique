import { configureDatabase } from "$lib/server/databases/configuration.js"

export async function configure(): Promise<void> {
  await configureDatabase()
}

configure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error.stack || error)
    process.exit(1)
  })
