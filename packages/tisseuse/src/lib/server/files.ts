import fs from "fs-extra"

export async function writeTextFileIfChanged(
  filePath: string,
  text: string,
): Promise<boolean> {
  if (await fs.pathExists(filePath)) {
    const existingText = await fs.readFile(filePath, { encoding: "utf-8" })
    if (text === existingText) {
      return false
    }
  }
  await fs.writeFile(filePath, text, { encoding: "utf-8" })
  return true
}
