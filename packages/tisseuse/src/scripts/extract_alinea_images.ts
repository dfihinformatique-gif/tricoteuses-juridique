#!/usr/bin/env npx ts-node

/**
 * Script d'extraction des images d'alinéa depuis les documents de l'Assemblée nationale
 *
 * Ce script parcourt tous les fichiers HTML des documents et extrait toutes les
 * informations sur les pastilles d'alinéa dans un fichier JSON intermédiaire.
 *
 * Ce fichier JSON est ensuite utilisé par :
 * - `analyze_alinea_images.ts` : pour calculer les numéros d'alinéa par propagation
 * - `generate_alinea_review.ts` : pour générer la page HTML de révision
 *
 * ## Usage
 *
 * ```bash
 * npx tsx src/scripts/extract_alinea_images.ts [chemin_vers_documents] [--output fichier.json]
 * ```
 *
 * Par défaut :
 * - Analyse `/home/eraviart/Projects/tricoteuses/assemblee-data/Documents`
 * - Génère `alinea_images_extracted.json`
 *
 * ## Données extraites
 *
 * Pour chaque image unique (par hash) :
 * - hash MD5, données base64, dimensions
 * - Liste de toutes les occurrences avec contexte (document, article, position, voisins)
 *
 * Statistiques pré-calculées :
 * - Nombre d'occurrences, positions en tête d'article
 * - Transitions (prédécesseurs/successeurs)
 *
 * @module extract_alinea_images
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
  extractAlineaImages,
  getImageDimensions,
  extractBase64Data,
} from "../lib/server/alinea_image_utils.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_DOCUMENTS_PATH =
  "/home/eraviart/Projects/tricoteuses/assemblee-data/Documents"
const DEFAULT_OUTPUT_PATH = "./alinea_images_extracted.json"

// Regex pour détecter les marqueurs d'article
const ARTICLE_CSS_CLASS_REGEX =
  /<p[^>]*class="[^"]*assnat9ArticleNum[^"]*"[^>]*>\s*(?:<[^>]*>)*\s*Article\s+(\d+|liminaire|premier|unique)/gi
const ARTICLE_SPANS_REGEX =
  /<span[^>]*>ARTICLE<\/span>\s*<span[^>]*>(\d+|liminaire|premier|unique)<\/span>/gi
const ARTICLE_COLOR_REGEX =
  /<span[^>]*color:[^>]*>ARTICLE<\/span>\s*<span[^>]*>(\d+|liminaire|premier|unique)<\/span>/gi
const ARTICLE_SIMPLE_REGEX = /Article\s+(\d+|liminaire|premier|unique)\b/gi

// ============================================================================
// Types pour les données extraites
// ============================================================================

/**
 * Une occurrence d'une image dans un document
 */
export interface ImageOccurrence {
  documentPath: string
  zIndex: number
  position: number
  articleId: string | null
  indexInArticle: number
  previousHash: string | null
  nextHash: string | null
}

/**
 * Données complètes d'une image unique (par hash)
 */
export interface ImageData {
  hash: string
  base64Src: string
  dimensions: { width: number; height: number } | null
  occurrences: ImageOccurrence[]
}

/**
 * Statistiques de transition pré-calculées
 */
export interface TransitionStats {
  totalCount: number
  firstInArticleCount: number
  predecessors: Record<string, number>
  successors: Record<string, number>
}

/**
 * Structure complète du fichier JSON extrait
 */
export interface ExtractedData {
  metadata: {
    extractionDate: string
    documentsPath: string
    documentsAnalyzed: number
    documentsWithImages: number
    articlesAnalyzed: number
    totalOccurrences: number
    uniqueHashes: number
  }
  images: Record<string, ImageData>
  transitions: Record<string, TransitionStats>
}

// ============================================================================
// Fonctions d'extraction
// ============================================================================

/**
 * Extrait les positions des marqueurs d'article dans le HTML
 */
function extractArticlePositions(
  htmlContent: string,
): Array<{ id: string; position: number }> {
  const articles: Array<{ id: string; position: number }> = []

  let match: RegExpExecArray | null

  // Pattern 1: classe CSS assnat9ArticleNum
  const regex0 = new RegExp(ARTICLE_CSS_CLASS_REGEX.source, "gi")
  while ((match = regex0.exec(htmlContent)) !== null) {
    const pos = match.index
    const isDuplicate = articles.some((a) => Math.abs(a.position - pos) < 100)
    if (!isDuplicate) {
      articles.push({
        id: `article_${match[1]}`,
        position: pos,
      })
    }
  }

  // Pattern 2: ARTICLE dans spans
  const regex1 = new RegExp(ARTICLE_SPANS_REGEX.source, "gi")
  while ((match = regex1.exec(htmlContent)) !== null) {
    const pos = match.index
    const isDuplicate = articles.some((a) => Math.abs(a.position - pos) < 100)
    if (!isDuplicate) {
      articles.push({
        id: `article_${match[1]}`,
        position: pos,
      })
    }
  }

  // Pattern 3: ARTICLE avec couleur
  const regex2 = new RegExp(ARTICLE_COLOR_REGEX.source, "gi")
  while ((match = regex2.exec(htmlContent)) !== null) {
    const pos = match.index
    const isDuplicate = articles.some((a) => Math.abs(a.position - pos) < 100)
    if (!isDuplicate) {
      articles.push({
        id: `article_${match[1]}`,
        position: pos,
      })
    }
  }

  // Pattern 4 (fallback): si aucun article trouvé avec patterns stricts
  if (articles.length === 0) {
    const regex3 = new RegExp(ARTICLE_SIMPLE_REGEX.source, "gi")
    while ((match = regex3.exec(htmlContent)) !== null) {
      const pos = match.index
      const isDuplicate = articles.some((a) => Math.abs(a.position - pos) < 100)
      if (!isDuplicate) {
        articles.push({
          id: `article_${match[1]}`,
          position: pos,
        })
      }
    }
  }

  return articles.sort((a, b) => a.position - b.position)
}

/**
 * Extrait toutes les images d'un document avec leurs informations contextuelles
 */
function extractImagesFromDocument(
  htmlContent: string,
  documentPath: string,
): {
  occurrencesByHash: Map<string, ImageOccurrence[]>
  imageDataByHash: Map<
    string,
    { base64Src: string; dimensions: { width: number; height: number } | null }
  >
  articlesCount: number
} {
  const occurrencesByHash = new Map<string, ImageOccurrence[]>()
  const imageDataByHash = new Map<
    string,
    { base64Src: string; dimensions: { width: number; height: number } | null }
  >()

  // Extraire les positions des articles
  const articlePositions = extractArticlePositions(htmlContent)
  const articlesCount = Math.max(articlePositions.length, 1)

  // Extraire toutes les images
  const extractedImages = extractAlineaImages(htmlContent)

  // Grouper les images par article
  type ExtractedImageType = (typeof extractedImages)[number]
  const imagesByArticle = new Map<string, ExtractedImageType[]>()

  for (const img of extractedImages) {
    // Déterminer l'article de cette image
    let articleId: string | null = null
    for (let i = articlePositions.length - 1; i >= 0; i--) {
      if (img.position >= articlePositions[i].position) {
        articleId = articlePositions[i].id
        break
      }
    }
    if (articleId === null && articlePositions.length > 0) {
      articleId = "before_first_article"
    } else if (articleId === null) {
      articleId = "no_article"
    }

    if (!imagesByArticle.has(articleId)) {
      imagesByArticle.set(articleId, [])
    }
    imagesByArticle.get(articleId)!.push(img)
  }

  // Traiter chaque article pour calculer les relations
  for (const [articleId, images] of imagesByArticle) {
    // Trier par z-index
    const sortedImages = [...images].sort((a, b) => a.zIndex - b.zIndex)

    for (let i = 0; i < sortedImages.length; i++) {
      const img = sortedImages[i]
      const previousHash = i > 0 ? sortedImages[i - 1].hash : null
      const nextHash =
        i < sortedImages.length - 1 ? sortedImages[i + 1].hash : null

      // Stocker les données de l'image
      if (!imageDataByHash.has(img.hash)) {
        const base64Data = extractBase64Data(img.base64Src)
        imageDataByHash.set(img.hash, {
          base64Src: img.base64Src,
          dimensions: getImageDimensions(base64Data),
        })
      }

      // Stocker l'occurrence
      const occurrence: ImageOccurrence = {
        documentPath,
        zIndex: img.zIndex,
        position: img.position,
        articleId,
        indexInArticle: i,
        previousHash,
        nextHash,
      }

      if (!occurrencesByHash.has(img.hash)) {
        occurrencesByHash.set(img.hash, [])
      }
      occurrencesByHash.get(img.hash)!.push(occurrence)
    }
  }

  return { occurrencesByHash, imageDataByHash, articlesCount }
}

/**
 * Trouve tous les fichiers HTML dans un répertoire
 */
function findHtmlFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    console.error(`Répertoire non trouvé: ${dir}`)
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...findHtmlFiles(fullPath))
    } else if (entry.name === "dyn-opendata.html") {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Calcule les statistiques de transition à partir des occurrences
 */
function computeTransitionStats(
  images: Record<string, ImageData>,
): Record<string, TransitionStats> {
  const stats: Record<string, TransitionStats> = {}

  for (const [hash, imageData] of Object.entries(images)) {
    const predecessors: Record<string, number> = {}
    const successors: Record<string, number> = {}
    let firstInArticleCount = 0

    for (const occ of imageData.occurrences) {
      if (occ.indexInArticle === 0) {
        firstInArticleCount++
      }

      if (occ.previousHash) {
        predecessors[occ.previousHash] =
          (predecessors[occ.previousHash] || 0) + 1
      }

      if (occ.nextHash) {
        successors[occ.nextHash] = (successors[occ.nextHash] || 0) + 1
      }
    }

    stats[hash] = {
      totalCount: imageData.occurrences.length,
      firstInArticleCount,
      predecessors,
      successors,
    }
  }

  return stats
}

// ============================================================================
// Point d'entrée principal
// ============================================================================

async function main(): Promise<void> {
  // Parser les arguments
  const args = process.argv.slice(2)
  let documentsPath = DEFAULT_DOCUMENTS_PATH
  let outputPath = DEFAULT_OUTPUT_PATH

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1]
      i++
    } else if (!args[i].startsWith("--")) {
      documentsPath = args[i]
    }
  }

  console.log(`Recherche des fichiers HTML dans: ${documentsPath}`)
  console.log(`Sortie: ${outputPath}`)
  console.log("Cette opération peut prendre plusieurs minutes...\n")

  // Trouver tous les fichiers
  const htmlFiles = findHtmlFiles(documentsPath)
  console.log(`Fichiers trouvés: ${htmlFiles.length}\n`)

  if (htmlFiles.length === 0) {
    console.error("Aucun fichier dyn-opendata.html trouvé!")
    process.exit(1)
  }

  // Données globales
  const allImages: Record<string, ImageData> = {}
  let documentsWithImages = 0
  let totalArticles = 0
  let totalOccurrences = 0

  // Traiter chaque fichier
  console.log("Extraction des images...")
  let processed = 0
  for (const filePath of htmlFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const relativePath = path.relative(documentsPath, filePath)

      const { occurrencesByHash, imageDataByHash, articlesCount } =
        extractImagesFromDocument(content, relativePath)

      if (occurrencesByHash.size > 0) {
        documentsWithImages++
        totalArticles += articlesCount

        // Fusionner les données
        for (const [hash, occurrences] of occurrencesByHash) {
          if (!allImages[hash]) {
            const imgData = imageDataByHash.get(hash)!
            allImages[hash] = {
              hash,
              base64Src: imgData.base64Src,
              dimensions: imgData.dimensions,
              occurrences: [],
            }
          }
          allImages[hash].occurrences.push(...occurrences)
          totalOccurrences += occurrences.length
        }
      }
    } catch (error) {
      console.error(
        `Erreur sur ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    processed++
    if (processed % 500 === 0) {
      process.stdout.write(
        `\rExtrait: ${processed}/${htmlFiles.length} (${((processed / htmlFiles.length) * 100).toFixed(1)}%)`,
      )
    }
  }

  console.log(`\n\nExtraction terminée!`)
  console.log(`Documents avec images: ${documentsWithImages}`)
  console.log(`Articles analysés: ${totalArticles}`)
  console.log(`Occurrences totales: ${totalOccurrences}`)
  console.log(`Hashes uniques: ${Object.keys(allImages).length}`)

  // Calculer les statistiques de transition
  console.log("\nCalcul des statistiques de transition...")
  const transitions = computeTransitionStats(allImages)

  // Construire le fichier de sortie
  const extractedData: ExtractedData = {
    metadata: {
      extractionDate: new Date().toISOString(),
      documentsPath,
      documentsAnalyzed: htmlFiles.length,
      documentsWithImages,
      articlesAnalyzed: totalArticles,
      totalOccurrences,
      uniqueHashes: Object.keys(allImages).length,
    },
    images: allImages,
    transitions,
  }

  // Écrire le fichier JSON
  console.log(`\nÉcriture de ${outputPath}...`)
  fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2))

  const fileSizeBytes = fs.statSync(outputPath).size
  const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2)
  console.log(`Fichier généré: ${outputPath} (${fileSizeMB} MB)`)
}

main().catch(console.error)
