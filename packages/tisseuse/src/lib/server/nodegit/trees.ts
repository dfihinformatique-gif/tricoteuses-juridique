import assert from "assert"
import nodegit from "nodegit"

import { idRegExp } from "$lib/legal/ids"

export type OidByIdTree = {
  childByKey?: Map<string, OidByIdTree>
  oid?: nodegit.Oid
}

export function getOidFromIdTree(
  oidByIdTree: OidByIdTree,
  id: string,
): nodegit.Oid | undefined {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)

  let { childByKey } = oidByIdTree
  for (const key of idMatch!.slice(1, -1)) {
    if (childByKey === undefined) {
      return undefined
    }
    childByKey = childByKey.get(key)?.childByKey
  }

  return childByKey?.get(id)?.oid
}

/**
 * Update an existing OidByIdTree or create a new one.
 */
export async function readOidByIdTree(
  repository: nodegit.Repository,
  tree: nodegit.Tree | undefined,
  extension: ".json" | ".md",
  oidByTree?: OidByIdTree | undefined,
): Promise<OidByIdTree> {
  if (oidByTree === undefined) {
    oidByTree = {}
  }
  if (tree === undefined) {
    return oidByTree
  }
  const oid = tree.id()
  if (oidByTree.oid !== undefined && oid.equal(oidByTree.oid)) {
    return oidByTree
  }
  const childByKey: Map<string, OidByIdTree> = new Map()
  for (const entry of tree.entries()) {
    if (entry.isTree()) {
      const key = entry.name()
      const subTree = await nodegit.Tree.lookup(repository, entry.id())
      childByKey.set(
        key,
        await readOidByIdTree(
          repository,
          subTree,
          extension,
          oidByTree.childByKey?.get(key),
        ),
      )
    } else {
      childByKey.set(entry.name().replace(extension, ""), { oid: entry.id() })
    }
  }
  return {
    childByKey,
    oid,
  }
}

export function removeOidByIdTreeEmptyNodes(oidByIdTree: OidByIdTree): void {
  const { childByKey } = oidByIdTree
  if (childByKey !== undefined) {
    for (const [key, child] of childByKey.entries()) {
      if (child.childByKey !== undefined) {
        removeOidByIdTreeEmptyNodes(child)
        if (child.childByKey.size === 0) {
          childByKey!.delete(key)
        }
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

  const levels: OidByIdTree[] = []
  let currentLevel = oidByIdTree
  for (const key of idMatch!.slice(1, -1)) {
    levels.push(currentLevel)
    const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
      string,
      OidByIdTree
    >
    let subLevel = childByKey.get(key) as OidByIdTree
    if (subLevel === undefined) {
      subLevel = {}
      childByKey.set(key, subLevel)
    }
    currentLevel = subLevel
  }

  const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
    string,
    OidByIdTree
  >
  const leaf = childByKey.get(id)
  if (oid === undefined) {
    if (leaf !== undefined) {
      childByKey.delete(id)
      for (const level of levels) {
        delete level.oid
      }
      return true // changed
    }
    return false
  }
  if (leaf?.oid !== undefined && oid.equal(leaf.oid)) {
    return false
  }
  childByKey.set(id, { oid })
  for (const level of levels) {
    delete level.oid
  }
  return true // changed
}

export async function writeOidByIdTree(
  repository: nodegit.Repository,
  oidByIdTree: OidByIdTree,
  extension: ".json" | ".md",
): Promise<nodegit.Oid> {
  if (oidByIdTree.oid === undefined) {
    const builder = await nodegit.Treebuilder.create(repository)
    const { childByKey } = oidByIdTree
    if (childByKey !== undefined) {
      for (const [key, child] of childByKey.entries()) {
        if (child.childByKey === undefined) {
          // Child is a blob and key is an ID.
          assert.notStrictEqual(child.oid, undefined)
          const filename = key + extension
          builder.insert(filename, child.oid!, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000
        } else {
          const childOid = await writeOidByIdTree(repository, child, extension)
          builder.insert(key, childOid, nodegit.TreeEntry.FILEMODE.TREE) // 0o100644
        }
      }
    }
    oidByIdTree.oid = await builder.write()
  }
  return oidByIdTree.oid
}

export function* walkPreviousAndCurrentOidByIdTrees(
  previousOidByIdTree: OidByIdTree | undefined,
  oidByIdTree: OidByIdTree | undefined,
  key: string | undefined = undefined,
): Generator<
  { blobOid?: nodegit.Oid; id: string; previousBlobOid?: nodegit.Oid },
  void
> {
  if (
    oidByIdTree?.childByKey !== undefined ||
    (oidByIdTree === undefined && previousOidByIdTree?.childByKey !== undefined)
  ) {
    // Trees
    const keys = [
      ...new Set([
        ...(previousOidByIdTree?.childByKey?.keys() ?? []),
        ...(oidByIdTree?.childByKey?.keys() ?? []),
      ]),
    ].sort() as string[]
    for (const key of keys) {
      yield* walkPreviousAndCurrentOidByIdTrees(
        previousOidByIdTree?.childByKey?.get(key),
        oidByIdTree?.childByKey?.get(key),
        key,
      )
    }
  } else {
    // Blobs
    yield {
      blobOid: oidByIdTree?.oid,
      id: key!,
      previousBlobOid: previousOidByIdTree?.oid,
    }
  }
}
