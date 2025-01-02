import fs from "fs-extra"
import * as tsj from "ts-json-schema-generator"

const config: tsj.Config = {
  path: "src/lib/legal/{dole,jorf,legi,shared}.ts",
  tsconfig: "tsconfig.json",
  type: "*",
}
const schema = tsj.createGenerator(config).createSchema(config.type)
await fs.writeJson("static/schemas.json", schema, { spaces: 2 })
