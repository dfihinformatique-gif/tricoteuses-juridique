import fs from "fs-extra"
import path from "node:path"
import * as prettier from "prettier"
import sade from "sade"

import {
  simplifyWordHtml,
  simplifyWordHtmlToDocument,
} from "$lib/server/html_simplifier.js"

async function simplifyWordHtmlFile(
  inputPath: string,
  {
    output,
    "full-document": fullDocument,
    "convert-nbsp": convertNbsp,
    "keep-alignment": keepAlignment,
    "keep-empty": keepEmpty,
    format,
    verbose,
  }: {
    output?: string
    "full-document"?: boolean
    "convert-nbsp"?: boolean
    "keep-alignment"?: boolean
    "keep-empty"?: boolean
    format?: boolean
    verbose?: boolean
  },
): Promise<number> {
  // Check input file exists
  if (!(await fs.pathExists(inputPath))) {
    console.error(`Error: Input file "${inputPath}" does not exist`)
    return 1
  }

  // Read input file
  if (verbose) {
    console.log(`Reading ${inputPath}...`)
  }
  const inputHtml = await fs.readFile(inputPath, { encoding: "utf-8" })

  // Simplify HTML
  if (verbose) {
    console.log("Simplifying HTML...")
  }

  const options = {
    keepAlignment: keepAlignment ?? true,
    convertNbsp: convertNbsp ?? false,
    removeEmptyParagraphs: !keepEmpty,
  }

  let simplifiedHtml = fullDocument
    ? simplifyWordHtmlToDocument(inputHtml, options)
    : simplifyWordHtml(inputHtml, options)

  // Format with Prettier if requested
  if (format) {
    if (verbose) {
      console.log("Formatting HTML with Prettier...")
    }
    simplifiedHtml = await prettier.format(simplifiedHtml, {
      parser: "html",
      printWidth: 120,
      tabWidth: 2,
      useTabs: false,
      htmlWhitespaceSensitivity: "ignore",
    })
  }

  // Determine output path
  let outputPath: string
  if (output) {
    outputPath = output
  } else {
    const dir = path.dirname(inputPath)
    const ext = path.extname(inputPath)
    const base = path.basename(inputPath, ext)
    outputPath = path.join(dir, `${base}_simplified${ext}`)
  }

  // Write output file
  if (verbose) {
    console.log(`Writing to ${outputPath}...`)
  }
  await fs.ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, simplifiedHtml, { encoding: "utf-8" })

  if (verbose) {
    const inputSize = Buffer.byteLength(inputHtml, "utf-8")
    const outputSize = Buffer.byteLength(simplifiedHtml, "utf-8")
    const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1)
    console.log(
      `Done! Size reduced from ${inputSize} to ${outputSize} bytes (${reduction}% reduction)`,
    )
  }

  return 0
}

async function simplifyWordHtmlDirectory(
  inputDir: string,
  {
    output: outputDir,
    "full-document": fullDocument,
    "convert-nbsp": convertNbsp,
    "keep-alignment": keepAlignment,
    "keep-empty": keepEmpty,
    format,
    recursive,
    pattern,
    verbose,
  }: {
    output?: string
    "full-document"?: boolean
    "convert-nbsp"?: boolean
    "keep-alignment"?: boolean
    "keep-empty"?: boolean
    format?: boolean
    recursive?: boolean
    pattern?: string
    verbose?: boolean
  },
): Promise<number> {
  // Check input directory exists
  if (!(await fs.pathExists(inputDir))) {
    console.error(`Error: Input directory "${inputDir}" does not exist`)
    return 1
  }

  const filePattern = pattern || "dyn-opendata.html"
  const files: string[] = []

  // Find HTML files
  async function findFiles(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && recursive) {
        await findFiles(fullPath)
      } else if (entry.isFile() && entry.name === filePattern) {
        files.push(fullPath)
      }
    }
  }

  await findFiles(inputDir)

  if (files.length === 0) {
    console.log(`No files matching "${filePattern}" found in ${inputDir}`)
    return 0
  }

  if (verbose) {
    console.log(`Found ${files.length} files to process`)
  }

  const options = {
    keepAlignment: keepAlignment ?? true,
    convertNbsp: convertNbsp ?? false,
    removeEmptyParagraphs: !keepEmpty,
  }

  let processed = 0
  let errors = 0

  for (const inputPath of files) {
    try {
      const inputHtml = await fs.readFile(inputPath, { encoding: "utf-8" })

      let simplifiedHtml = fullDocument
        ? simplifyWordHtmlToDocument(inputHtml, options)
        : simplifyWordHtml(inputHtml, options)

      // Format with Prettier if requested
      if (format) {
        simplifiedHtml = await prettier.format(simplifiedHtml, {
          parser: "html",
          printWidth: 120,
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: "ignore",
        })
      }

      // Determine output path
      let outputPath: string
      if (outputDir) {
        const relativePath = path.relative(inputDir, inputPath)
        const dir = path.dirname(relativePath)
        const ext = path.extname(relativePath)
        const base = path.basename(relativePath, ext)
        outputPath = path.join(outputDir, dir, `${base}_simplified${ext}`)
      } else {
        const dir = path.dirname(inputPath)
        const ext = path.extname(inputPath)
        const base = path.basename(inputPath, ext)
        outputPath = path.join(dir, `${base}_simplified${ext}`)
      }

      await fs.ensureDir(path.dirname(outputPath))
      await fs.writeFile(outputPath, simplifiedHtml, { encoding: "utf-8" })

      processed++
      if (verbose) {
        console.log(`Processed: ${inputPath} -> ${outputPath}`)
      }
    } catch (error) {
      errors++
      console.error(`Error processing ${inputPath}:`, error)
    }
  }

  console.log(
    `Processed ${processed} files${errors > 0 ? `, ${errors} errors` : ""}`,
  )

  return errors > 0 ? 1 : 0
}

const prog = sade("simplify_word_html")

prog
  .command("file <input>", "Simplify a single Word-generated HTML file", {
    default: true,
  })
  .describe("Simplify a Word-generated HTML document to clean semantic HTML")
  .option("-o, --output", "Output file path (default: input_simplified.html)")
  .option("-f, --full-document", "Output a complete HTML document with doctype")
  .option("-n, --convert-nbsp", "Convert &nbsp; to regular spaces")
  .option(
    "-a, --keep-alignment",
    "Keep alignment attributes on paragraphs (default: true)",
  )
  .option("-e, --keep-empty", "Keep empty paragraphs")
  .option("-F, --format", "Format output HTML with Prettier")
  .option("-v, --verbose", "Verbose output")
  .action(async (input, options) => {
    process.exit(await simplifyWordHtmlFile(input, options))
  })

prog
  .command("dir <input>", "Simplify all HTML files in a directory")
  .describe("Simplify all Word-generated HTML documents in a directory")
  .option("-o, --output", "Output directory (default: same as input)")
  .option("-f, --full-document", "Output complete HTML documents with doctype")
  .option("-n, --convert-nbsp", "Convert &nbsp; to regular spaces")
  .option(
    "-a, --keep-alignment",
    "Keep alignment attributes on paragraphs (default: true)",
  )
  .option("-e, --keep-empty", "Keep empty paragraphs")
  .option("-F, --format", "Format output HTML with Prettier")
  .option("-R, --recursive", "Process subdirectories recursively")
  .option(
    "-p, --pattern",
    'File name pattern to match (default: "dyn-opendata.html")',
  )
  .option("-v, --verbose", "Verbose output")
  .action(async (input, options) => {
    process.exit(await simplifyWordHtmlDirectory(input, options))
  })

prog.parse(process.argv)
