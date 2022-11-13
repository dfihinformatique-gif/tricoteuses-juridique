import { configureDatabase } from "$lib/server/database/configuration"

export async function configure(): Promise<void> {
  await configureDatabase()
}

configure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error.stack || error)
    process.exit(1)
  })
