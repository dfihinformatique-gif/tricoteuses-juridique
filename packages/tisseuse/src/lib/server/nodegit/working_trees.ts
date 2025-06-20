import { assertNever } from "$lib/asserts.js"
import assert from "assert"
import nodegit from "nodegit"

export class WorkingTree {
  directoriesBreadcrumb: WorkingTreeDirectory[]
  keysBreadcrumb: string[]
  root: WorkingTreeDirectory

  constructor(
    public repository: nodegit.Repository,
    tree: nodegit.Tree | undefined,
    public mode: "full" | "incremental",
    public extension: ".json" | ".md" | ".xml" | undefined = undefined,
  ) {
    this.keysBreadcrumb = []
    this.root = { type: "directory" }
    if (mode === "incremental" && tree !== undefined) {
      this.root.childByKey = this.readTree(tree)
      this.root.oid = tree.id()
    } else {
      this.root.childByKey = new Map()
    }
    this.directoriesBreadcrumb = [this.root]
  }

  async changeWorkingDirectory(
    splitDir: string[],
  ): Promise<WorkingTreeDirectory> {
    const directoriesBreadcrumb = this.directoriesBreadcrumb
    let directory: WorkingTreeDirectory = directoriesBreadcrumb.at(-1)!
    const keysBreadcrumb = this.keysBreadcrumb

    // Climb the directories until they match the start of splitPath.
    while (
      keysBreadcrumb.length > splitDir.length ||
      keysBreadcrumb.some((key, index) => key !== splitDir[index])
    ) {
      if (directory.childByKey!.size === 0) {
        // Directory is empty => Remove it from its parent directory.
        const parentDirectory = directoriesBreadcrumb.at(-2)!
        parentDirectory.childByKey!.delete(keysBreadcrumb.at(-1)!)
      } else {
        await this.writeWorkingDirectory(directory)
      }

      // Move to parent directory.
      directoriesBreadcrumb.pop()
      directory = directoriesBreadcrumb.at(-1)!
      keysBreadcrumb.pop()
    }

    // Climb down the directories until they match splitPath.
    while (keysBreadcrumb.length < splitDir.length) {
      const parentDirectory = directory
      const key = splitDir[keysBreadcrumb.length]
      if (this.mode === "incremental") {
        assert.notStrictEqual(directory.childByKey, undefined)
        directory = directory.childByKey!.get(key) as WorkingTreeDirectory
        if (directory === undefined) {
          directory = {
            childByKey: new Map(),
            type: "directory",
          }
        } else {
          assert.strictEqual(directory.type, "directory")
          assert.notStrictEqual(directory.oid, undefined)
          if (directory.childByKey === undefined) {
            const tree = await nodegit.Tree.lookup(
              this.repository,
              directory.oid!,
            )
            directory.childByKey = this.readTree(tree)
          }
        }
      } else {
        directory = {
          childByKey: new Map(),
          type: "directory",
        }
      }
      parentDirectory.childByKey!.set(key, directory)
      directoriesBreadcrumb.push(directory)
      keysBreadcrumb.push(key)
    }

    return directory
  }

  readTree(tree: nodegit.Tree): Map<string, WorkingTreeNode> {
    return new Map(
      tree.entries().map((entry) => [
        entry.name(),
        {
          oid: entry.id(),
          type: entry.isTree()
            ? "directory"
            : (entry.filemode() & 0o120000) === 0o120000
              ? "symbolic_link"
              : "file",
        },
      ]),
    )
  }

  async setItemAtSplitPath(
    splitPath: string[],
    item: WorkingTreeFile | WorkingTreeSymbolicLink | undefined,
  ): Promise<boolean> {
    const directory = await this.changeWorkingDirectory(splitPath.slice(0, -1))
    const key = splitPath.at(-1)!
    const existingItem = directory.childByKey!.get(key)
    if (item === undefined) {
      if (existingItem === undefined) {
        return false // No change
      } else {
        directory.childByKey!.delete(key)
        return true // Item changed
      }
    } else {
      assert.notStrictEqual(item.oid, undefined)
      if (
        existingItem === undefined ||
        item.type !== existingItem.type ||
        existingItem.oid === undefined ||
        !item.oid!.equal(existingItem.oid)
      ) {
        directory.childByKey!.set(key, item)
        return true // Item changed
      } else {
        return false // No change
      }
    }
  }

  async write(): Promise<nodegit.Oid> {
    await this.changeWorkingDirectory([])
    await this.writeWorkingDirectory(this.root)
    return this.root.oid!
  }

  async writeWorkingDirectory(directory: WorkingTreeDirectory): Promise<void> {
    const builder = await nodegit.Treebuilder.create(this.repository)
    for (const [key, child] of directory.childByKey!.entries()) {
      assert.notStrictEqual(child.oid, undefined)
      switch (child.type) {
        case "directory": {
          builder.insert(
            key,
            child.oid!,
            0o40000, // nodegit.TreeEntry.FILEMODE.TREE
          )
          break
        }
        case "file": {
          const filename =
            this.extension === undefined ? key : key + this.extension
          builder.insert(
            filename,
            child.oid!,
            0o100644, // nodegit.TreeEntry.FILEMODE.BLOB
          )
          break
        }
        case "symbolic_link": {
          const filename =
            this.extension === undefined ? key : key + this.extension
          builder.insert(
            filename,
            child.oid!,
            0o120000, // nodegit.TreeEntry.FILEMODE.LINK
          )
          break
        }
        default: {
          assertNever("WorkingTreeNode", child)
        }
      }
    }
    directory.oid = await builder.write()
  }
}

export type WorkingTreeNode =
  | WorkingTreeDirectory
  | WorkingTreeFile
  | WorkingTreeSymbolicLink

export interface WorkingTreeBase {
  type: "directory" | "file" | "symbolic_link"
  oid?: nodegit.Oid
}

export interface WorkingTreeDirectory extends WorkingTreeBase {
  /**
   * Exists only when directory is open
   */
  childByKey?: Map<string, WorkingTreeNode>
  type: "directory"
}

export interface WorkingTreeFile extends WorkingTreeBase {
  type: "file"
}

export interface WorkingTreeSymbolicLink extends WorkingTreeBase {
  type: "symbolic_link"
}
