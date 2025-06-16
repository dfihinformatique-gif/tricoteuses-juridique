import assert from "assert"
import nodegit from "nodegit"

import { idRegExp } from "$lib/legal/ids.js"

export type NodeBySplitPathTree = {
  childByKey?: Map<string, NodeBySplitPathTree>
  /**
   * Used only when `oid` is defined
   */
  isSymbolicLink?: boolean
  oid?: nodegit.Oid
}

export function getOidFromIdTree(
  nodeByIdTree: NodeBySplitPathTree,
  id: string,
): nodegit.Oid | undefined {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)
  return getOidFromSplitPathTree(nodeByIdTree, [...idMatch!.slice(1, -1), id])
}

export function getOidFromSplitPathTree(
  nodeBySplitPathTree: NodeBySplitPathTree,
  splitPath: string[],
): nodegit.Oid | undefined {
  let { childByKey } = nodeBySplitPathTree
  for (const key of splitPath.slice(0, -1)) {
    if (childByKey === undefined) {
      return undefined
    }
    childByKey = childByKey.get(key)?.childByKey
  }

  return childByKey?.get(splitPath.at(-1)!)?.oid
}

/**
 * Update an existing NodeBySplitPathTree or create a new one.
 */
export async function readNodeBySplitPathTree(
  repository: nodegit.Repository,
  tree: nodegit.Tree | undefined,
  extension: ".json" | ".md" | ".xml" | undefined,
  nodeBySplitPathTree?: NodeBySplitPathTree | undefined,
  { only }: { only?: Array<string[] | undefined> } = {},
): Promise<NodeBySplitPathTree> {
  if (nodeBySplitPathTree === undefined) {
    nodeBySplitPathTree = {}
  }
  if (tree === undefined) {
    return nodeBySplitPathTree
  }
  const oid = tree.id()
  if (
    nodeBySplitPathTree.oid !== undefined &&
    oid.equal(nodeBySplitPathTree.oid)
  ) {
    return nodeBySplitPathTree
  }
  const childByKey: Map<string, NodeBySplitPathTree> = new Map()
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
        await readNodeBySplitPathTree(
          repository,
          subTree,
          extension,
          nodeBySplitPathTree.childByKey?.get(key),
          { only: only?.slice(1) },
        ),
      )
    } else {
      const child: NodeBySplitPathTree = { oid: entry.id() }
      if ((entry.filemode() & 0o120000) === 0o120000) {
        // nodegit.TreeEntry.FILEMODE.LINK
        child.isSymbolicLink = true
      }
      let key = entry.name()
      if (extension !== undefined) {
        key = key.replace(extension, "")
      }
      childByKey.set(key, child)
    }
  }
  return {
    childByKey,
    oid,
  }
}

export function removeOidBySplitPathTreeEmptyNodes(
  nodeBySplitPathTree: NodeBySplitPathTree,
): void {
  const { childByKey } = nodeBySplitPathTree
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
  nodeByIdTree: NodeBySplitPathTree,
  id: string,
  oid: nodegit.Oid | undefined,
  options: { isSymbolicLink?: boolean } = {},
): boolean {
  const idMatch = id.match(idRegExp)
  assert.notStrictEqual(idMatch, null, `Unknown ID format: ${id}`)
  return setOidInSplitPathTree(
    nodeByIdTree,
    [...idMatch!.slice(1, -1), id],
    oid,
    options,
  )
}

export function setOidInSplitPathTree(
  nodeBySplitPathTree: NodeBySplitPathTree,
  splitPath: string[],
  oid: nodegit.Oid | undefined,
  { isSymbolicLink }: { isSymbolicLink?: boolean } = {},
): boolean {
  const levels: NodeBySplitPathTree[] = []
  let currentLevel = nodeBySplitPathTree
  for (const key of splitPath.slice(0, -1)) {
    levels.push(currentLevel)
    const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
      string,
      NodeBySplitPathTree
    >
    let subLevel = childByKey.get(key) as NodeBySplitPathTree
    if (subLevel === undefined) {
      subLevel = {}
      childByKey.set(key, subLevel)
    }
    currentLevel = subLevel
  }

  const childByKey = (currentLevel.childByKey ??= new Map()) as Map<
    string,
    NodeBySplitPathTree
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
  if (
    leaf?.oid !== undefined &&
    oid.equal(leaf.oid) &&
    isSymbolicLink === leaf.isSymbolicLink
  ) {
    return false
  }
  const child: NodeBySplitPathTree = { oid }
  if (isSymbolicLink) {
    child.isSymbolicLink = true
  }
  childByKey.set(leafKey, child)
  for (const level of levels) {
    delete level.oid
  }
  return true // changed
}

export function* walkPreviousAndCurrentNodeByIdTrees(
  previousNodeByIdTree: NodeBySplitPathTree | undefined,
  nodeByIdTree: NodeBySplitPathTree | undefined,
  key: string | undefined = undefined,
): Generator<
  { blobOid?: nodegit.Oid; id: string; previousBlobOid?: nodegit.Oid },
  void
> {
  if (
    nodeByIdTree?.childByKey !== undefined ||
    (nodeByIdTree === undefined &&
      previousNodeByIdTree?.childByKey !== undefined)
  ) {
    // Trees
    const keys = [
      ...new Set([
        ...(previousNodeByIdTree?.childByKey?.keys() ?? []),
        ...(nodeByIdTree?.childByKey?.keys() ?? []),
      ]),
    ].sort() as string[]
    for (const key of keys) {
      yield* walkPreviousAndCurrentNodeByIdTrees(
        previousNodeByIdTree?.childByKey?.get(key),
        nodeByIdTree?.childByKey?.get(key),
        key,
      )
    }
  } else {
    // Blobs
    yield {
      blobOid: nodeByIdTree?.oid,
      id: key!,
      previousBlobOid: previousNodeByIdTree?.oid,
    }
  }
}

export async function writeNodeBySplitPathTree(
  repository: nodegit.Repository,
  nodeBySplitPathTree: NodeBySplitPathTree,
  extension: ".json" | ".md" | ".xml" | undefined,
): Promise<nodegit.Oid> {
  if (nodeBySplitPathTree.oid === undefined) {
    const builder = await nodegit.Treebuilder.create(repository)
    const { childByKey } = nodeBySplitPathTree
    if (childByKey !== undefined) {
      for (const [key, child] of childByKey.entries()) {
        if (child.childByKey !== undefined) {
          // Child is a directory.
          const childOid = await writeNodeBySplitPathTree(
            repository,
            child,
            extension,
          )
          builder.insert(
            key,
            childOid,
            0o40000, // nodegit.TreeEntry.FILEMODE.TREE
          )
        } else if (child.isSymbolicLink) {
          const filename = extension === undefined ? key : key + extension
          builder.insert(
            filename,
            child.oid!,
            0o120000, // nodegit.TreeEntry.FILEMODE.LINK
          )
        } else {
          // Child is a blob and key is an ID.
          assert.notStrictEqual(child.oid, undefined)
          const filename = extension === undefined ? key : key + extension
          builder.insert(
            filename,
            child.oid!,
            0o100644, // nodegit.TreeEntry.FILEMODE.BLOB
          )
        }
      }
    }
    nodeBySplitPathTree.oid = await builder.write()
  }
  return nodeBySplitPathTree.oid
}
