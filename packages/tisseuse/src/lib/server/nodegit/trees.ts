import assert from "assert"
import nodegit from "nodegit"

import { idRegExp } from "$lib/legal/ids.js"

export type OidBySplitPathTree = {
  childByKey?: Map<string, OidBySplitPathTree>
  oid?: nodegit.Oid
}

export function getOidFromIdTree(
  oidByIdTree: OidBySplitPathTree,
  id: string,
): nodegit.Oid | undefined {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)
  return getOidFromSplitPathTree(oidByIdTree, [...idMatch!.slice(1, -1), id])
}

export function getOidFromSplitPathTree(
  oidBySplitPathTree: OidBySplitPathTree,
  splitPath: string[],
): nodegit.Oid | undefined {
  let { childByKey } = oidBySplitPathTree
  for (const key of splitPath.slice(0, -1)) {
    if (childByKey === undefined) {
      return undefined
    }
    childByKey = childByKey.get(key)?.childByKey
  }

  return childByKey?.get(splitPath.at(-1)!)?.oid
}

/**
 * Update an existing OidBySplitPathTree or create a new one.
 */
export async function readOidBySplitPathTree(
  repository: nodegit.Repository,
  tree: nodegit.Tree | undefined,
  extension: ".json" | ".md",
  oidBySplitPathTree?: OidBySplitPathTree | undefined,
  { only }: { only?: Array<string[] | undefined> } = {},
): Promise<OidBySplitPathTree> {
  if (oidBySplitPathTree === undefined) {
    oidBySplitPathTree = {}
  }
  if (tree === undefined) {
    return oidBySplitPathTree
  }
  const oid = tree.id()
  if (
    oidBySplitPathTree.oid !== undefined &&
    oid.equal(oidBySplitPathTree.oid)
  ) {
    return oidBySplitPathTree
  }
  const childByKey: Map<string, OidBySplitPathTree> = new Map()
  const onlyKeys = only?.[0]
  for (const entry of tree.entries()) {
    if (entry.isTree()) {
      const key = entry.name()
      if (onlyKeys !== undefined && !onlyKeys.includes(key)) {
        continue
      }
      const subTree = await nodegit.Tree.lookup(repository, entry.id())
      childByKey.set(
        key,
        await readOidBySplitPathTree(
          repository,
          subTree,
          extension,
          oidBySplitPathTree.childByKey?.get(key),
          { only: only?.slice(1) },
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

export function removeOidBySplitPathTreeEmptyNodes(
  oidBySplitPathTree: OidBySplitPathTree,
): void {
  const { childByKey } = oidBySplitPathTree
  if (childByKey !== undefined) {
    for (const [key, child] of childByKey.entries()) {
      if (child.childByKey !== undefined) {
        removeOidBySplitPathTreeEmptyNodes(child)
        if (child.childByKey.size === 0) {
          childByKey!.delete(key)
        }
      }
    }
  }
}

export function setOidInIdTree(
  oidByIdTree: OidBySplitPathTree,
  id: string,
  oid: nodegit.Oid | undefined,
): boolean {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)
  return setOidInSplitPathTree(oidByIdTree, [...idMatch!.slice(1, -1), id], oid)
}

export function setOidInSplitPathTree(
  oidBySplitPathTree: OidBySplitPathTree,
  splitPath: string[],
  oid: nodegit.Oid | undefined,
): boolean {
  const levels: OidBySplitPathTree[] = []
  let currentLevel = oidBySplitPathTree
  for (const key of splitPath.slice(0, -1)) {
    levels.push(currentLevel)
    const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
      string,
      OidBySplitPathTree
    >
    let subLevel = childByKey.get(key) as OidBySplitPathTree
    if (subLevel === undefined) {
      subLevel = {}
      childByKey.set(key, subLevel)
    }
    currentLevel = subLevel
  }

  const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
    string,
    OidBySplitPathTree
  >
  const leafKey = splitPath.at(-1) as string
  const leaf = childByKey.get(leafKey)
  if (oid === undefined) {
    if (leaf !== undefined) {
      childByKey.delete(leafKey)
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
  childByKey.set(leafKey, { oid })
  for (const level of levels) {
    delete level.oid
  }
  return true // changed
}

export function* walkPreviousAndCurrentOidByIdTrees(
  previousOidByIdTree: OidBySplitPathTree | undefined,
  oidByIdTree: OidBySplitPathTree | undefined,
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

export async function writeOidBySplitPathTree(
  repository: nodegit.Repository,
  oidBySplitPathTree: OidBySplitPathTree,
  extension: ".json" | ".md",
): Promise<nodegit.Oid> {
  if (oidBySplitPathTree.oid === undefined) {
    const builder = await nodegit.Treebuilder.create(repository)
    const { childByKey } = oidBySplitPathTree
    if (childByKey !== undefined) {
      for (const [key, child] of childByKey.entries()) {
        if (child.childByKey === undefined) {
          // Child is a blob and key is an ID.
          assert.notStrictEqual(child.oid, undefined)
          const filename = key + extension
          builder.insert(filename, child.oid!, nodegit.TreeEntry.FILEMODE.BLOB) // 0o040000
        } else {
          const childOid = await writeOidBySplitPathTree(
            repository,
            child,
            extension,
          )
          builder.insert(key, childOid, nodegit.TreeEntry.FILEMODE.TREE) // 0o100644
        }
      }
    }
    oidBySplitPathTree.oid = await builder.write()
  }
  return oidBySplitPathTree.oid
}
