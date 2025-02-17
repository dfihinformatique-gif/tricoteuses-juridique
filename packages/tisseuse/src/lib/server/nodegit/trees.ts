import assert from "assert"
import nodegit from "nodegit"

import { idRegExp } from "$lib/legal/ids"

export type OidByIdTree = Map<string, OidByIdTree | nodegit.Oid>

export function getOidFromIdTree(
  oidByIdTree: OidByIdTree,
  id: string,
): nodegit.Oid | undefined {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)

  let currentLevel = oidByIdTree
  for (const targetDirName of idMatch!.slice(1, -1)) {
    currentLevel = currentLevel.get(targetDirName) as OidByIdTree
    if (currentLevel === undefined) {
      return undefined
    }
  }

  return currentLevel.get(id) as nodegit.Oid | undefined
}

export async function readOidByIdTree(
  repository: nodegit.Repository,
  tree: nodegit.Tree | undefined,
): Promise<OidByIdTree> {
  const oidByIdTree: OidByIdTree = new Map()
  if (tree !== undefined) {
    const entries = tree.entries()

    for (const entry of entries) {
      if (entry.isTree()) {
        const subtree = await nodegit.Tree.lookup(repository, entry.oid())
        oidByIdTree.set(
          entry.name(),
          await readOidByIdTree(repository, subtree),
        )
      } else {
        oidByIdTree.set(entry.name(), entry.id())
      }
    }
  }
  return oidByIdTree
}

export function removeOidByIdTreeEmptyNodes(oidByIdTree: OidByIdTree): void {
  for (const [name, entry] of oidByIdTree.entries()) {
    if (!(entry instanceof nodegit.Oid)) {
      removeOidByIdTreeEmptyNodes(entry)
      if (entry.size === 0) {
        oidByIdTree.delete(name)
      }
    }
  }
}

export function setOidInIdTree(
  oidByIdTree: OidByIdTree,
  id: string,
  oid: nodegit.Oid | undefined,
): boolean {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)

  let currentLevel = oidByIdTree
  for (const targetDirName of idMatch!.slice(1, -1)) {
    let subLevel = currentLevel.get(targetDirName) as OidByIdTree
    if (subLevel === undefined) {
      subLevel = new Map()
      currentLevel.set(targetDirName, subLevel)
    }
    currentLevel = subLevel
  }

  const existingOid = currentLevel.get(id)
  if (oid === existingOid) {
    return false // Not changed
  }
  if (oid === undefined) {
    currentLevel.delete(id)
  } else {
    currentLevel.set(id, oid)
  }
  return true // changed
}

export async function writeOidByIdTree(
  repository: nodegit.Repository,
  oidByIdTree: OidByIdTree,
  extension: ".json" | ".md",
): Promise<nodegit.Oid> {
  const builder = await nodegit.Treebuilder.create(repository)

  for (const [key, entry] of oidByIdTree.entries()) {
    if (entry instanceof nodegit.Oid) {
      // `key` is a Légifrance ID.
      const filename = key + extension
      builder.insert(filename, entry, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000
    } else {
      // `key` is a fragment of a Légifrance ID.
      const subtreeOid = await writeOidByIdTree(repository, entry, extension)
      builder.insert(key, subtreeOid, nodegit.TreeEntry.FILEMODE.TREE) // 0o100644
    }
  }

  return builder.write()
}
