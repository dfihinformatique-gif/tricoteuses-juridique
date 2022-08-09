import fs from "fs-extra"
import path from "path"

export function* walkDir(
  rootDir: string,
  relativeSplitDir: string[] = [],
): Generator<string[]> {
  const dir = path.join(rootDir, ...relativeSplitDir)
  for (const filename of fs.readdirSync(dir)) {
    if (filename[0] === ".") {
      continue
    }
    const filePath = path.join(dir, filename)
    const relativeSplitPath = [...relativeSplitDir, filename]
    if (fs.statSync(filePath).isDirectory()) {
      yield* walkDir(rootDir, relativeSplitPath)
    } else {
      yield relativeSplitPath
    }
  }
}
