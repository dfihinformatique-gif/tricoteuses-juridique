/**
 * Module utilitaire commun pour la détection et l'analyse des images d'alinéa
 *
 * Ce module contient les fonctions partagées entre :
 * - analyze_alinea_images.ts : analyse statistique des images
 * - generate_alinea_review.ts : génération de la page de révision
 *
 * @module alinea_image_utils
 */

import * as crypto from "crypto"

// ============================================================================
// Regex pour la détection des images d'alinéa
// ============================================================================

/**
 * Regex pour extraire les spans avec z-index contenant une image
 * Capture: [1] = z-index, [2] = src base64 complet (avec préfixe data:image/...)
 */
export const SPAN_WITH_IMAGE_REGEX =
  /<span[^>]*style="[^"]*z-index:\s*(-?\d+)[^"]*"[^>]*><img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/gi

/**
 * Regex alternative : image avec z-index dans son propre style
 * Capture: [1] = src base64 complet, [2] = z-index
 */
export const IMAGE_WITH_ZINDEX_REGEX =
  /<img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*style="[^"]*z-index:\s*(-?\d+)[^"]*"[^>]*>/gi

/**
 * Regex pour les images positionnées absolument avec margin-left négatif
 * Ces images n'ont pas de z-index mais sont positionnées en absolu avec un margin négatif
 * Capture: [1] = src base64 complet
 */
export const IMAGE_POSITIONED_REGEX =
  /<span[^>]*style="[^"]*position:\s*absolute[^"]*"[^>]*><img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*style="[^"]*margin-left:\s*-[^"]*position:\s*absolute[^"]*"[^>]*>/gi

// ============================================================================
// Fonctions de calcul de hash
// ============================================================================

/**
 * Extrait les données base64 pures d'un src d'image (sans le préfixe data:image/...)
 */
export function extractBase64Data(base64Src: string): string {
  return base64Src.replace(/^data:image\/[^;]+;base64,/, "")
}

/**
 * Calcule le hash MD5 d'une chaîne base64
 * Accepte soit les données base64 pures, soit le src complet avec préfixe
 */
export function computeHash(base64Data: string): string {
  const base64Only = extractBase64Data(base64Data)
  return crypto.createHash("md5").update(base64Only).digest("hex")
}

// ============================================================================
// Fonctions de détection des dimensions d'image
// ============================================================================

/**
 * Extrait les dimensions d'une image PNG depuis ses données binaires
 * Les dimensions sont dans le chunk IHDR aux octets 16-23
 */
export function getPngDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47
  ) {
    return null
  }
  // Width at offset 16 (4 bytes, big-endian)
  // Height at offset 20 (4 bytes, big-endian)
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return { width, height }
}

/**
 * Extrait les dimensions d'une image JPEG depuis ses données binaires
 */
export function getJpegDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  // JPEG signature: FF D8 FF
  if (
    buffer.length < 3 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[2] !== 0xff
  ) {
    return null
  }

  // Search for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
  let offset = 2
  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset++
      continue
    }

    const marker = buffer[offset + 1]
    // SOF0, SOF1, SOF2 markers contain image dimensions
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      // Height at offset+5 (2 bytes), Width at offset+7 (2 bytes)
      const height = buffer.readUInt16BE(offset + 5)
      const width = buffer.readUInt16BE(offset + 7)
      return { width, height }
    }

    // Skip to next marker
    if (offset + 3 < buffer.length) {
      const segmentLength = buffer.readUInt16BE(offset + 2)
      offset += 2 + segmentLength
    } else {
      break
    }
  }
  return null
}

/**
 * Extrait les dimensions d'une image depuis son src base64
 * Accepte soit les données base64 pures, soit le src complet avec préfixe
 */
export function getImageDimensions(
  base64Data: string,
): { width: number; height: number } | null {
  const base64Only = extractBase64Data(base64Data)
  const buffer = Buffer.from(base64Only, "base64")

  // Try PNG first
  const pngDims = getPngDimensions(buffer)
  if (pngDims) return pngDims

  // Try JPEG
  const jpegDims = getJpegDimensions(buffer)
  if (jpegDims) return jpegDims

  return null
}

// ============================================================================
// Fonction de filtrage des pastilles d'alinéa
// ============================================================================

/**
 * Vérifie si une image est une pastille d'alinéa basé sur ses dimensions
 * Une pastille est une image à peu près carrée et petite (≤ 64 pixels)
 *
 * @param base64Data - Données base64 de l'image (avec ou sans préfixe)
 * @returns true si l'image est une pastille d'alinéa
 */
export function isAlineaPastille(base64Data: string): boolean {
  const dims = getImageDimensions(base64Data)
  if (!dims) return false

  const { width, height } = dims

  // Doit être à peu près carrée (ratio entre 0.5 et 2.0 pour être permissif)
  // Certaines pastilles ont un ratio de 1.5 (ex: 45x30 pixels)
  const ratio = width / height
  const isSquarish = ratio >= 0.5 && ratio <= 2.0

  // Doit être petite (≤ 64 pixels de côté)
  const isSmall = width <= 64 && height <= 64

  return isSquarish && isSmall
}

// ============================================================================
// Interface commune pour les informations d'image
// ============================================================================

/**
 * Informations de base sur une image extraite
 */
export interface ExtractedImage {
  hash: string
  base64Src: string
  zIndex: number
  position: number
}

/**
 * Extrait toutes les images d'alinéa d'un contenu HTML
 * Retourne uniquement les images qui passent le filtre isAlineaPastille
 *
 * @param htmlContent - Contenu HTML à analyser
 * @returns Liste des images extraites avec leur hash, src, z-index et position
 */
export function extractAlineaImages(htmlContent: string): ExtractedImage[] {
  const images: ExtractedImage[] = []
  const seenHashes = new Set<string>()
  const seenPositions = new Set<number>()

  let match: RegExpExecArray | null

  // Pattern 1: span avec z-index contenant une image
  const regex1 = new RegExp(SPAN_WITH_IMAGE_REGEX.source, "gi")
  while ((match = regex1.exec(htmlContent)) !== null) {
    const zIndex = parseInt(match[1], 10)
    const base64Src = match[2]

    if (!isAlineaPastille(base64Src)) {
      continue
    }

    const hash = computeHash(base64Src)
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash)
      seenPositions.add(match.index)
      images.push({
        hash,
        base64Src,
        zIndex,
        position: match.index,
      })
    }
  }

  // Pattern 2: image avec z-index dans son propre style
  const regex2 = new RegExp(IMAGE_WITH_ZINDEX_REGEX.source, "gi")
  while ((match = regex2.exec(htmlContent)) !== null) {
    const base64Src = match[1]
    const zIndex = parseInt(match[2], 10)

    if (!isAlineaPastille(base64Src)) {
      continue
    }

    const hash = computeHash(base64Src)
    if (!seenHashes.has(hash)) {
      seenHashes.add(hash)
      seenPositions.add(match.index)
      images.push({
        hash,
        base64Src,
        zIndex,
        position: match.index,
      })
    }
  }

  // Pattern 3: images positionnées absolument sans z-index explicite
  const regex3 = new RegExp(IMAGE_POSITIONED_REGEX.source, "gi")
  while ((match = regex3.exec(htmlContent)) !== null) {
    const base64Src = match[1]

    if (!isAlineaPastille(base64Src)) {
      continue
    }

    const hash = computeHash(base64Src)
    if (!seenHashes.has(hash) && !seenPositions.has(match.index)) {
      seenHashes.add(hash)
      seenPositions.add(match.index)
      // Utiliser la position dans le document comme pseudo z-index pour le tri
      images.push({
        hash,
        base64Src,
        zIndex: match.index,
        position: match.index,
      })
    }
  }

  return images
}
