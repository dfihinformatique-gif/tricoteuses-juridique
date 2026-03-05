#!/usr/bin/env npx ts-node

/**
 * Script de fusion des corrections manuelles des images d'alinéa
 *
 * Ce script fusionne les corrections manuelles (`alineas_numbers_reviewed.json`)
 * avec le mapping existant (`alineas_numbers.ts`).
 *
 * ## Usage
 *
 * ```bash
 * npx tsx src/scripts/merge_reviewed_alineas_numbers.ts
 * ```
 *
 * @module merge_reviewed_alineas_numbers
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const ALINEA_IMAGE_HASHES_PATH = path.join(
  __dirname,
  "../lib/alineas/alineas_numbers.ts",
)

const MANUAL_CORRECTIONS_PATH = path.join(
  __dirname,
  "../lib/alineas/alineas_numbers_reviewed.json",
)

// ============================================================================
// Types pour les corrections manuelles
// ============================================================================

interface ManualCorrections {
  description?: string
  lastUpdated: string | null
  corrections: Record<string, number>
  notPastilles: string[]
}

// ============================================================================
// Fonctions de chargement
// ============================================================================

/**
 * Charge les corrections manuelles depuis le fichier JSON
 */
function loadManualCorrections(): ManualCorrections {
  if (!fs.existsSync(MANUAL_CORRECTIONS_PATH)) {
    return {
      lastUpdated: null,
      corrections: {},
      notPastilles: [],
    }
  }

  try {
    const content = fs.readFileSync(MANUAL_CORRECTIONS_PATH, "utf-8")
    return JSON.parse(content) as ManualCorrections
  } catch (error) {
    console.warn(
      `Avertissement: Impossible de lire ${MANUAL_CORRECTIONS_PATH}:`,
      error instanceof Error ? error.message : String(error),
    )
    return {
      lastUpdated: null,
      corrections: {},
      notPastilles: [],
    }
  }
}

/**
 * Parse le fichier alinea_image_hashes.ts existant
 */
function parseExistingHashes(filePath: string): Map<string, number> {
  const result = new Map<string, number>()

  if (!fs.existsSync(filePath)) {
    console.log(
      `Fichier ${filePath} non trouvé, création d'un nouveau fichier.`,
    )
    return result
  }

  const content = fs.readFileSync(filePath, "utf-8")
  const hashRegex = /"([a-f0-9]{32})":\s*(\d+)/g
  let match
  while ((match = hashRegex.exec(content)) !== null) {
    result.set(match[1], parseInt(match[2], 10))
  }

  return result
}

/**
 * Génère le contenu du fichier de mapping
 */
function generateMappingContent(hashes: Map<string, number>): string {
  const lines: string[] = [
    "/**",
    " * Mapping des hashes d'images d'alinéa vers les numéros d'alinéa",
    ` * Généré le: ${new Date().toISOString()}`,
    " */",
    "",
    "export const alineaNumberByImageHash: Record<string, number> = {",
  ]

  const entries = Array.from(hashes.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1]
    return a[0].localeCompare(b[0])
  })

  let currentAlinea = 0
  for (const [hash, alinea] of entries) {
    if (alinea !== currentAlinea) {
      currentAlinea = alinea
      lines.push(`  // Alinéa ${alinea}`)
    }
    lines.push(`  "${hash}": ${alinea},`)
  }

  lines.push("}")
  lines.push("")

  return lines.join("\n")
}

// ============================================================================
// Point d'entrée principal
// ============================================================================

async function main(): Promise<void> {
  // Charger les corrections manuelles
  const manualCorrections = loadManualCorrections()
  const manualCorrectionsCount = Object.keys(
    manualCorrections.corrections,
  ).length
  const notPastillesCount = manualCorrections.notPastilles.length

  console.log("Corrections manuelles chargées:")
  console.log(`  Corrections: ${manualCorrectionsCount}`)
  console.log(`  Non-pastilles: ${notPastillesCount}`)

  if (manualCorrectionsCount === 0 && notPastillesCount === 0) {
    console.log("\nAucune correction manuelle à appliquer.")
    console.log(
      "Utilisez la page de révision (alinea_review.html) pour créer des corrections.",
    )
    return
  }

  // Charger le mapping existant
  const existingHashes = parseExistingHashes(ALINEA_IMAGE_HASHES_PATH)
  console.log(`\nHashes existants: ${existingHashes.size}`)

  // Fusionner avec les corrections manuelles
  const merged = new Map<string, number>(existingHashes)
  let added = 0
  let updated = 0
  let removed = 0

  // Appliquer les corrections
  for (const [hash, alinea] of Object.entries(manualCorrections.corrections)) {
    if (alinea > 0) {
      if (merged.has(hash)) {
        if (merged.get(hash) !== alinea) {
          updated++
        }
      } else {
        added++
      }
      merged.set(hash, alinea)
    } else {
      // alinea = 0 signifie "pas une pastille", on le retire du mapping
      if (merged.has(hash)) {
        merged.delete(hash)
        removed++
      }
    }
  }

  // Retirer les non-pastilles
  for (const hash of manualCorrections.notPastilles) {
    if (merged.has(hash)) {
      merged.delete(hash)
      removed++
    }
  }

  // Générer le fichier de sortie
  const content = generateMappingContent(merged)
  fs.writeFileSync(ALINEA_IMAGE_HASHES_PATH, content)

  console.log("\nFusion terminée:")
  console.log(`  - Hashes ajoutés: ${added}`)
  console.log(`  - Hashes mis à jour: ${updated}`)
  console.log(`  - Hashes retirés (non-pastilles): ${removed}`)
  console.log(`  - Total: ${merged.size}`)
  console.log(`\nFichier mis à jour: ${ALINEA_IMAGE_HASHES_PATH}`)

  // Afficher un résumé par alinéa
  console.log("\n## Résumé des mappings:\n")

  const countByAlinea = new Map<number, number>()
  for (const alinea of merged.values()) {
    const count = countByAlinea.get(alinea) || 0
    countByAlinea.set(alinea, count + 1)
  }

  const sortedAlineas = Array.from(countByAlinea.entries()).sort(
    (a, b) => a[0] - b[0],
  )
  for (const [alinea, count] of sortedAlineas.slice(0, 30)) {
    console.log(`  Alinéa ${alinea}: ${count} hash(es)`)
  }

  if (sortedAlineas.length > 30) {
    console.log(`  ... et ${sortedAlineas.length - 30} autres alinéas`)
  }
}

main().catch(console.error)
