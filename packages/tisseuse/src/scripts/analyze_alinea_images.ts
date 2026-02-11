#!/usr/bin/env npx ts-node

/**
 * Script d'analyse statistique des images d'alinéa
 *
 * Ce script lit le fichier JSON généré par `extract_alinea_images.ts` et calcule
 * les numéros d'alinéa pour chaque hash d'image en utilisant un algorithme de propagation.
 *
 * ## Approche algorithmique
 *
 * L'algorithme utilise plusieurs stratégies complémentaires pour assigner les numéros d'alinéa :
 *
 * ### 1. Détection des têtes de chaîne (alinéa 1)
 *
 * - Hashes avec > 80% d'apparitions en première position **d'article** (pas du document)
 * - Hashes avec >= 1 apparition en première position ET dont le successeur principal
 *   apparaît rarement en première position (< 10%)
 *
 * ### 2. Propagation avant (majorité relative)
 *
 * - Pour chaque hash non assigné, on agrège les prédécesseurs par alinéa
 * - L'alinéa le plus fréquent parmi les prédécesseurs assignés détermine le numéro :
 *   alinéa = majoritaire + 1
 *
 * ### 3. Propagation arrière (majorité relative)
 *
 * - Même principe avec les successeurs : l'alinéa le plus fréquent parmi les successeurs
 *   assignés détermine le numéro
 * - alinéa = majoritaire - 1 (si > 1)
 *
 * ### 4. Propagation des chaînes non assignées
 *
 * - Pour les hashes non encore assignés avec >= 50% en première position, on les marque
 *   comme alinéa 1
 * - On propage ensuite le long de leur chaîne de successeurs
 *
 * ## Usage
 *
 * ```bash
 * npx tsx src/scripts/analyze_alinea_images.ts [fichier_extrait.json] [--merge]
 * ```
 *
 * Par défaut, le script lit `./alinea_images_extracted.json`.
 *
 * ## Options
 *
 * - `--merge` : Fusionne les hashes générés avec le fichier `alinea_image_hashes.ts` existant.
 *   Les correspondances existantes sont préservées, seuls les nouveaux hashes sont ajoutés.
 *
 * ## Fichiers générés
 *
 * - `alinea_mapping_generated.ts` : Mapping TypeScript exportable avec tous les hashes assignés
 * - `alinea_analysis_report.md` : Rapport détaillé avec statistiques par alinéa et hashes non assignés
 *
 * @module analyze_alinea_images
 */

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

import type {
  ExtractedData,
  TransitionStats as ExtractedTransitionStats,
} from "./extract_alinea_images.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_INPUT_PATH = "./alinea_images_extracted.json"

const ALINEA_IMAGE_HASHES_PATH = path.join(
  __dirname,
  "../lib/server/alinea_image_hashes.ts",
)

const MANUAL_CORRECTIONS_PATH = path.join(
  __dirname,
  "../lib/server/alinea_manual_corrections.json",
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
// Types
// ============================================================================

interface TransitionStats {
  firstPositionCount: number
  followedBy: Map<string, number>
  precededBy: Map<string, number>
  totalCount: number
}

// ============================================================================
// Fonctions de chargement
// ============================================================================

/**
 * Charge les données extraites depuis le fichier JSON
 */
function loadExtractedData(inputPath: string): ExtractedData {
  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier non trouvé: ${inputPath}`)
    console.error(
      "Exécutez d'abord: npx tsx src/scripts/extract_alinea_images.ts",
    )
    process.exit(1)
  }

  const content = fs.readFileSync(inputPath, "utf-8")
  return JSON.parse(content) as ExtractedData
}

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
 * Convertit les statistiques de transition du format JSON vers le format Map
 */
function convertTransitions(
  jsonTransitions: Record<string, ExtractedTransitionStats>,
): Map<string, TransitionStats> {
  const transitions = new Map<string, TransitionStats>()

  for (const [hash, stats] of Object.entries(jsonTransitions)) {
    transitions.set(hash, {
      firstPositionCount: stats.firstInArticleCount,
      totalCount: stats.totalCount,
      followedBy: new Map(Object.entries(stats.successors)),
      precededBy: new Map(Object.entries(stats.predecessors)),
    })
  }

  return transitions
}

// ============================================================================
// Algorithme de calcul des numéros d'alinéa
// ============================================================================

/**
 * Détermine le numéro d'alinéa pour chaque hash en utilisant les statistiques de transition
 */
function computeAlineaNumbers(
  transitions: Map<string, TransitionStats>,
): Map<string, { alinea: number; confidence: number }> {
  const result = new Map<string, { alinea: number; confidence: number }>()

  // Étape 1: Trouver les "têtes de chaîne"
  const headScores: Array<{
    hash: string
    score: number
    stats: TransitionStats
  }> = []

  for (const [hash, stats] of transitions) {
    const firstPosRatio = stats.firstPositionCount / stats.totalCount

    // Critère 1: Hash avec > 80% en première position
    if (firstPosRatio >= 0.8 && stats.firstPositionCount >= 1) {
      headScores.push({
        hash,
        score: stats.firstPositionCount * 2,
        stats,
      })
      continue
    }

    // Critère 2: Score basé sur le nombre en première position ET successeur rarement en première
    if (stats.firstPositionCount >= 1) {
      let mainSuccessor: string | null = null
      let mainSuccessorCount = 0
      for (const [succHash, count] of stats.followedBy) {
        if (count > mainSuccessorCount) {
          mainSuccessorCount = count
          mainSuccessor = succHash
        }
      }

      if (mainSuccessor) {
        const succStats = transitions.get(mainSuccessor)
        if (succStats) {
          const succFirstPosRatio =
            succStats.firstPositionCount / succStats.totalCount
          if (succFirstPosRatio < 0.1) {
            headScores.push({
              hash,
              score: stats.firstPositionCount,
              stats,
            })
          }
        }
      }
    }
  }

  // Trier par score décroissant et assigner le numéro 1
  headScores.sort((a, b) => b.score - a.score)

  for (const { hash, stats } of headScores) {
    const confidence = stats.firstPositionCount / stats.totalCount
    result.set(hash, { alinea: 1, confidence: Math.max(confidence, 0.5) })
  }

  console.log(`  Têtes de chaîne identifiées (alinéa 1): ${result.size}`)

  // Étape 2: Propagation itérative
  let changed = true
  let iterations = 0
  const maxIterations = 1000

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    // Propagation avant (basée sur les prédécesseurs)
    for (const [hash, stats] of transitions) {
      if (result.has(hash)) continue

      let totalAssignedPredCount = 0
      const predAlineas = new Map<number, number>()

      for (const [predHash, count] of stats.precededBy) {
        const predAlinea = result.get(predHash)
        if (predAlinea) {
          totalAssignedPredCount += count
          const currentCount = predAlineas.get(predAlinea.alinea) || 0
          predAlineas.set(predAlinea.alinea, currentCount + count)
        }
      }

      if (totalAssignedPredCount > 0) {
        let bestAlinea = 0
        let bestAlineaCount = 0
        for (const [alinea, count] of predAlineas) {
          if (count > bestAlineaCount) {
            bestAlineaCount = count
            bestAlinea = alinea
          }
        }

        if (bestAlinea > 0) {
          const confidence = bestAlineaCount / totalAssignedPredCount
          result.set(hash, { alinea: bestAlinea + 1, confidence })
          changed = true
        }
      }
    }

    // Propagation arrière (basée sur les successeurs)
    for (const [hash, stats] of transitions) {
      if (result.has(hash)) continue

      let totalAssignedSuccCount = 0
      const succAlineas = new Map<number, number>()

      for (const [succHash, count] of stats.followedBy) {
        const succAlinea = result.get(succHash)
        if (succAlinea) {
          totalAssignedSuccCount += count
          const currentCount = succAlineas.get(succAlinea.alinea) || 0
          succAlineas.set(succAlinea.alinea, currentCount + count)
        }
      }

      if (totalAssignedSuccCount > 0) {
        let bestAlinea = 0
        let bestAlineaCount = 0
        for (const [alinea, count] of succAlineas) {
          if (count > bestAlineaCount) {
            bestAlineaCount = count
            bestAlinea = alinea
          }
        }

        if (bestAlinea > 1) {
          const confidence = bestAlineaCount / totalAssignedSuccCount
          result.set(hash, { alinea: bestAlinea - 1, confidence })
          changed = true
        }
      }
    }
  }

  console.log(`  Après propagation: ${result.size} hashes assignés`)

  // Étape 3: Propagation des chaînes non assignées
  const unassignedHeads = Array.from(transitions.entries())
    .filter(
      ([hash, stats]) =>
        !result.has(hash) && stats.firstPositionCount / stats.totalCount >= 0.5,
    )
    .sort((a, b) => b[1].firstPositionCount - a[1].firstPositionCount)

  for (const [hash, stats] of unassignedHeads) {
    const firstPosRatio = stats.firstPositionCount / stats.totalCount
    if (firstPosRatio >= 0.5) {
      result.set(hash, { alinea: 1, confidence: firstPosRatio })

      let currentHash: string | null = hash
      let currentAlinea = 1

      while (currentHash) {
        const currentStats = transitions.get(currentHash)
        if (!currentStats) break

        let bestSuccessor: string | null = null
        let bestSuccessorCount = 0
        let totalFollowed = 0

        for (const [succHash, count] of currentStats.followedBy) {
          totalFollowed += count
          if (count > bestSuccessorCount && !result.has(succHash)) {
            bestSuccessorCount = count
            bestSuccessor = succHash
          }
        }

        if (bestSuccessor && totalFollowed > 0) {
          const confidence = bestSuccessorCount / totalFollowed
          result.set(bestSuccessor, { alinea: currentAlinea + 1, confidence })
          currentAlinea++
          currentHash = bestSuccessor
        } else {
          currentHash = null
        }
      }
    }
  }

  console.log(`  Après propagation des chaînes: ${result.size} hashes assignés`)

  return result
}

// ============================================================================
// Génération des fichiers de sortie
// ============================================================================

/**
 * Génère le code TypeScript pour le mapping
 */
function generateMapping(
  alineaNumbers: Map<string, { alinea: number; confidence: number }>,
  transitions: Map<string, TransitionStats>,
  metadata: ExtractedData["metadata"],
  minConfidence: number = 0.6,
): string {
  const lines: string[] = [
    "/**",
    " * Mapping automatiquement généré des hashes d'images d'alinéa vers les numéros d'alinéa",
    " *",
    ` * Généré le: ${new Date().toISOString()}`,
    ` * Documents analysés: ${metadata.documentsAnalyzed}`,
    ` * Articles analysés: ${metadata.articlesAnalyzed}`,
    ` * Occurrences trouvées: ${metadata.totalOccurrences}`,
    ` * Hashes uniques: ${metadata.uniqueHashes}`,
    ` * Hashes mappés: ${alineaNumbers.size}`,
    ` * Confiance minimum: ${minConfidence}`,
    " */",
    "",
    "export const alineaImageHashes: Record<string, number> = {",
  ]

  const entries = Array.from(alineaNumbers.entries())
    .filter(([hash, { confidence }]) => {
      const stats = transitions.get(hash)
      return confidence >= minConfidence && stats
    })
    .sort((a, b) => {
      if (a[1].alinea !== b[1].alinea) return a[1].alinea - b[1].alinea
      return a[0].localeCompare(b[0])
    })

  let currentAlinea = 0
  for (const [hash, { alinea, confidence }] of entries) {
    const stats = transitions.get(hash)!

    if (alinea !== currentAlinea) {
      currentAlinea = alinea
      lines.push(`  // Alinéa ${alinea}`)
    }

    lines.push(
      `  "${hash}": ${alinea}, // conf=${confidence.toFixed(2)}, n=${stats.totalCount}`,
    )
  }

  lines.push("}")
  lines.push("")

  // Ajouter des statistiques
  const countByAlinea = new Map<number, number>()
  for (const [, { alinea }] of entries) {
    const count = countByAlinea.get(alinea) || 0
    countByAlinea.set(alinea, count + 1)
  }

  lines.push("/**")
  lines.push(" * Statistiques par alinéa:")
  const sortedAlineas = Array.from(countByAlinea.entries()).sort(
    (a, b) => a[0] - b[0],
  )
  for (const [alinea, count] of sortedAlineas.slice(0, 30)) {
    lines.push(` *   Alinéa ${alinea}: ${count} hash(es)`)
  }
  if (sortedAlineas.length > 30) {
    lines.push(` *   ... et ${sortedAlineas.length - 30} autres alinéas`)
  }
  lines.push(" */")

  return lines.join("\n")
}

/**
 * Génère un rapport Markdown détaillé
 */
function generateReport(
  alineaNumbers: Map<string, { alinea: number; confidence: number }>,
  transitions: Map<string, TransitionStats>,
  metadata: ExtractedData["metadata"],
): string {
  const lines: string[] = [
    "# Rapport d'analyse des images d'alinéa",
    "",
    `Généré le: ${new Date().toISOString()}`,
    "",
    "## Métadonnées",
    "",
    `- Documents analysés: ${metadata.documentsAnalyzed}`,
    `- Documents avec images: ${metadata.documentsWithImages}`,
    `- Articles analysés: ${metadata.articlesAnalyzed}`,
    `- Occurrences totales: ${metadata.totalOccurrences}`,
    `- Hashes uniques: ${metadata.uniqueHashes}`,
    `- Hashes mappés: ${alineaNumbers.size}`,
    "",
  ]

  // Statistiques par alinéa
  const countByAlinea = new Map<number, number>()
  for (const { alinea } of alineaNumbers.values()) {
    const count = countByAlinea.get(alinea) || 0
    countByAlinea.set(alinea, count + 1)
  }

  lines.push("## Statistiques par alinéa")
  lines.push("")

  const sortedAlineas = Array.from(countByAlinea.entries()).sort(
    (a, b) => a[0] - b[0],
  )
  for (const [alinea, count] of sortedAlineas) {
    lines.push(`- Alinéa ${alinea}: ${count} hash(es)`)
  }

  // Hashes non assignés
  const unassigned = Array.from(transitions.entries())
    .filter(([hash]) => !alineaNumbers.has(hash))
    .sort((a, b) => b[1].totalCount - a[1].totalCount)

  lines.push("")
  lines.push(`## Hashes non assignés (${unassigned.length} total)`)
  lines.push("")

  for (const [hash, stats] of unassigned.slice(0, 20)) {
    lines.push(`### Hash: \`${hash}\``)
    lines.push(`- Total: ${stats.totalCount} occurrences`)
    lines.push(
      `- Première position: ${stats.firstPositionCount} fois (${((stats.firstPositionCount / stats.totalCount) * 100).toFixed(1)}%)`,
    )
    lines.push("- Précédé par:")
    const sortedPred = Array.from(stats.precededBy.entries()).sort(
      (a, b) => b[1] - a[1],
    )
    for (const [predHash, count] of sortedPred.slice(0, 3)) {
      const predAlinea = alineaNumbers.get(predHash)
      const alineaInfo = predAlinea ? ` (alinéa ${predAlinea.alinea})` : ""
      lines.push(`  - \`${predHash}\`: ${count} fois${alineaInfo}`)
    }
    lines.push("")
  }

  return lines.join("\n")
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
 * Génère le mapping fusionné
 */
function generateMergedMapping(
  existingHashes: Map<string, number>,
  newHashes: Map<string, { alinea: number; confidence: number }>,
): { content: string; added: number; kept: number } {
  const merged = new Map<string, number>()
  let kept = 0
  let added = 0

  for (const [hash, alinea] of existingHashes) {
    merged.set(hash, alinea)
    kept++
  }

  for (const [hash, { alinea }] of newHashes) {
    if (!merged.has(hash)) {
      merged.set(hash, alinea)
      added++
    }
  }

  const lines: string[] = [
    "/**",
    " * Mapping des hashes d'images d'alinéa vers les numéros d'alinéa",
    ` * Généré le: ${new Date().toISOString()}`,
    " */",
    "",
    "export const alineaImageHashes: Record<string, number> = {",
  ]

  const entries = Array.from(merged.entries()).sort((a, b) => {
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

  return { content: lines.join("\n"), added, kept }
}

// ============================================================================
// Point d'entrée principal
// ============================================================================

async function main(): Promise<void> {
  // Parser les arguments
  const args = process.argv.slice(2)
  const mergeMode = args.includes("--merge")
  const inputPath =
    args.find((arg) => !arg.startsWith("--")) || DEFAULT_INPUT_PATH

  console.log(`Chargement des données depuis: ${inputPath}`)

  // Charger les données extraites
  const extractedData = loadExtractedData(inputPath)

  // Charger les corrections manuelles
  const manualCorrections = loadManualCorrections()
  const manualCorrectionsCount = Object.keys(
    manualCorrections.corrections,
  ).length
  const notPastillesCount = manualCorrections.notPastilles.length

  if (manualCorrectionsCount > 0 || notPastillesCount > 0) {
    console.log(`\nCorrections manuelles chargées:`)
    console.log(`  Corrections: ${manualCorrectionsCount}`)
    console.log(`  Non-pastilles: ${notPastillesCount}`)
  }

  console.log(`\nMétadonnées:`)
  console.log(
    `  Documents analysés: ${extractedData.metadata.documentsAnalyzed}`,
  )
  console.log(
    `  Documents avec images: ${extractedData.metadata.documentsWithImages}`,
  )
  console.log(`  Articles analysés: ${extractedData.metadata.articlesAnalyzed}`)
  console.log(
    `  Occurrences totales: ${extractedData.metadata.totalOccurrences}`,
  )
  console.log(`  Hashes uniques: ${extractedData.metadata.uniqueHashes}`)

  // Convertir les transitions
  const transitions = convertTransitions(extractedData.transitions)

  // Calculer les numéros d'alinéa
  console.log("\nCalcul des numéros d'alinéa par propagation...")
  const alineaNumbers = computeAlineaNumbers(transitions)
  console.log(`Hashes avec numéro assigné: ${alineaNumbers.size}`)

  // Appliquer les corrections manuelles (priorité sur les valeurs calculées)
  let manualApplied = 0
  for (const [hash, alinea] of Object.entries(manualCorrections.corrections)) {
    if (alinea > 0) {
      alineaNumbers.set(hash, { alinea, confidence: 1.0 })
      manualApplied++
    } else {
      // alinea = 0 signifie "pas une pastille", on le retire du mapping
      alineaNumbers.delete(hash)
    }
  }

  // Retirer les non-pastilles du mapping
  for (const hash of manualCorrections.notPastilles) {
    alineaNumbers.delete(hash)
  }

  if (manualApplied > 0 || notPastillesCount > 0) {
    console.log(`Corrections manuelles appliquées: ${manualApplied}`)
    console.log(`Non-pastilles retirées: ${notPastillesCount}`)
    console.log(`Hashes finaux: ${alineaNumbers.size}`)
  }

  // Générer les fichiers de sortie
  const mapping = generateMapping(
    alineaNumbers,
    transitions,
    extractedData.metadata,
    0.6,
  )
  fs.writeFileSync("alinea_mapping_generated.ts", mapping)
  console.log("\nMapping généré dans: alinea_mapping_generated.ts")

  const report = generateReport(
    alineaNumbers,
    transitions,
    extractedData.metadata,
  )
  fs.writeFileSync("alinea_analysis_report.md", report)
  console.log("Rapport généré dans: alinea_analysis_report.md")

  // Afficher un résumé
  console.log("\n## Résumé des mappings:\n")

  const countByAlinea = new Map<number, number>()
  for (const { alinea } of alineaNumbers.values()) {
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

  // Mode fusion
  if (mergeMode) {
    console.log("\n## Mode fusion activé\n")

    const existingHashes = parseExistingHashes(ALINEA_IMAGE_HASHES_PATH)
    console.log(
      `Hashes existants dans alinea_image_hashes.ts: ${existingHashes.size}`,
    )

    const { content, added, kept } = generateMergedMapping(
      existingHashes,
      alineaNumbers,
    )

    fs.writeFileSync(ALINEA_IMAGE_HASHES_PATH, content)
    console.log(`\nFusion terminée:`)
    console.log(`  - Hashes conservés: ${kept}`)
    console.log(`  - Nouveaux hashes ajoutés: ${added}`)
    console.log(`  - Total: ${kept + added}`)
    console.log(`\nFichier mis à jour: ${ALINEA_IMAGE_HASHES_PATH}`)
  }
}

main().catch(console.error)
