/**
 * Module utilitaire commun pour la détection et l'analyse des images d'alinéa
 *
 * Ce module contient les fonctions partagées entre :
 * - merge_reviewed_alineas_numbers.ts : fusion des corrections
 * - generate_alineas_numbers_review.ts : génération de la page de révision
 *
 * @module alineas_images_utils
 */

import * as crypto from "node:crypto"
import * as zlib from "node:zlib"

// ============================================================================
// Regex pour la détection des images d'alinéa
// ============================================================================

/**
 * Regex pour extraire les spans avec z-index contenant une image
 * Capture: [1] = z-index, [2] = src base64 complet (avec préfixe data:image/...)
 */
const SPAN_WITH_IMAGE_REGEX =
  /<span[^>]*style="[^"]*z-index:\s*(-?\d+)[^"]*"[^>]*><img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*>/gi

/**
 * Regex alternative : image avec z-index dans son propre style
 * Capture: [1] = src base64 complet, [2] = z-index
 */
const IMAGE_WITH_ZINDEX_REGEX =
  /<img[^>]*src="(data:image\/[^;]+;base64,[^"]+)"[^>]*style="[^"]*z-index:\s*(-?\d+)[^"]*"[^>]*>/gi

/**
 * Regex pour les images positionnées absolument avec margin-left négatif
 * Ces images n'ont pas de z-index mais sont positionnées en absolu avec un margin négatif
 * Capture: [1] = src base64 complet
 */
const IMAGE_POSITIONED_REGEX =
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
// Fonctions de crop d'image PNG
// ============================================================================

/**
 * Décompresse les données IDAT d'un PNG
 */
function decompressIdat(buffer: Buffer): Buffer {
  // Trouver tous les chunks IDAT et les concaténer
  const idatChunks: Buffer[] = []
  let offset = 8 // Skip PNG signature

  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset)
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8)

    if (chunkType === "IDAT") {
      idatChunks.push(buffer.subarray(offset + 8, offset + 8 + chunkLength))
    }

    offset += 12 + chunkLength // length(4) + type(4) + data + crc(4)
  }

  const compressedData = Buffer.concat(idatChunks)
  return zlib.inflateSync(compressedData)
}

/**
 * Compresse les données pour un chunk IDAT
 */
function compressIdat(data: Buffer): Buffer {
  return zlib.deflateSync(data, { level: 9 })
}

/**
 * Calcule le CRC32 pour un chunk PNG
 */
function crc32(data: Buffer): number {
  let crc = 0xffffffff
  const table = getCrc32Table()

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

let crc32Table: Uint32Array | null = null

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table

  crc32Table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crc32Table[i] = c
  }
  return crc32Table
}

/**
 * Applique le filtre Paeth pour l'encodage PNG
 */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/**
 * Défiltre une ligne de pixels PNG
 */
function unfilterLine(
  filterType: number,
  currentLine: Uint8Array,
  prevLine: Uint8Array | null,
  bytesPerPixel: number,
): Uint8Array {
  const result = new Uint8Array(currentLine.length)

  for (let i = 0; i < currentLine.length; i++) {
    const raw = currentLine[i]
    const a = i >= bytesPerPixel ? result[i - bytesPerPixel] : 0 // left
    const b = prevLine ? prevLine[i] : 0 // above
    const c = prevLine && i >= bytesPerPixel ? prevLine[i - bytesPerPixel] : 0 // upper-left

    let decoded: number
    switch (filterType) {
      case 0: // None
        decoded = raw
        break
      case 1: // Sub
        decoded = (raw + a) & 0xff
        break
      case 2: // Up
        decoded = (raw + b) & 0xff
        break
      case 3: // Average
        decoded = (raw + Math.floor((a + b) / 2)) & 0xff
        break
      case 4: // Paeth
        decoded = (raw + paethPredictor(a, b, c)) & 0xff
        break
      default:
        decoded = raw
    }
    result[i] = decoded
  }

  return result
}

/**
 * Vérifie si un pixel est "blanc" ou transparent (à ignorer lors du crop)
 * Pour RGBA: transparent ou blanc
 * Pour RGB: blanc
 * Pour grayscale: blanc
 */
function isWhiteOrTransparent(
  pixels: Uint8Array,
  offset: number,
  bytesPerPixel: number,
  bitDepth: number,
): boolean {
  const maxValue = (1 << bitDepth) - 1
  const threshold = maxValue * 0.95 // 95% de blanc
  if (bytesPerPixel === 4) {
    // RGBA
    const alpha = pixels[offset + 3]
    if (alpha < maxValue * 0.1) return true // Transparent
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    return r >= threshold && g >= threshold && b >= threshold
  } else if (bytesPerPixel === 3) {
    // RGB
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    return r >= threshold && g >= threshold && b >= threshold
  } else if (bytesPerPixel === 2) {
    // Grayscale + Alpha
    const alpha = pixels[offset + 1]
    if (alpha < maxValue * 0.1) return true
    return pixels[offset] >= threshold
  } else if (bytesPerPixel === 1) {
    // Grayscale
    return pixels[offset] >= threshold
  }

  return false
}

/**
 * Extrait les informations IHDR d'un PNG
 */
function parseIhdr(buffer: Buffer): {
  width: number
  height: number
  bitDepth: number
  colorType: number
  bytesPerPixel: number
} | null {
  if (buffer.length < 29) return null

  // IHDR should be the first chunk after the signature
  const chunkLength = buffer.readUInt32BE(8)
  const chunkType = buffer.toString("ascii", 12, 16)

  if (chunkType !== "IHDR" || chunkLength !== 13) return null

  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  const bitDepth = buffer[24]
  const colorType = buffer[25]

  // Calculate bytes per pixel based on color type and bit depth
  let channels: number
  switch (colorType) {
    case 0:
      channels = 1
      break // Grayscale
    case 2:
      channels = 3
      break // RGB
    case 3:
      channels = 1
      break // Indexed (palette)
    case 4:
      channels = 2
      break // Grayscale + Alpha
    case 6:
      channels = 4
      break // RGBA
    default:
      return null
  }

  const bytesPerPixel = (channels * bitDepth) / 8

  return { width, height, bitDepth, colorType, bytesPerPixel }
}

/**
 * Crée un chunk PNG
 */
function createChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii")
  const chunk = Buffer.alloc(12 + data.length)

  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)

  const crcData = Buffer.concat([typeBuffer, data])
  chunk.writeUInt32BE(crc32(crcData), 8 + data.length)

  return chunk
}

/**
 * Crée une image PNG à partir des pixels bruts
 */
function createPng(
  pixels: Uint8Array,
  width: number,
  height: number,
  bytesPerPixel: number,
  colorType: number,
  bitDepth: number,
): Buffer {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = bitDepth
  ihdrData[9] = colorType
  ihdrData[10] = 0 // compression
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace

  const ihdrChunk = createChunk("IHDR", ihdrData)

  // IDAT chunk - add filter byte (0 = None) before each row
  const rowSize = width * bytesPerPixel
  const filteredData = Buffer.alloc(height * (1 + rowSize))

  for (let y = 0; y < height; y++) {
    filteredData[y * (1 + rowSize)] = 0 // No filter
    pixels
      .subarray(y * rowSize, (y + 1) * rowSize)
      .forEach((val, i) => (filteredData[y * (1 + rowSize) + 1 + i] = val))
  }

  const compressedData = compressIdat(filteredData)
  const idatChunk = createChunk("IDAT", compressedData)

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

/**
 * Crop une image PNG en enlevant les bordures blanches/transparentes
 *
 * @param base64Data - Données base64 de l'image PNG (avec ou sans préfixe data:image/...)
 * @returns Les données base64 de l'image croppée (sans préfixe), ou null en cas d'erreur
 */
export function cropPngImage(base64Data: string): string | null {
  try {
    const base64Only = extractBase64Data(base64Data)
    const buffer = Buffer.from(base64Only, "base64")

    // Parse IHDR
    const ihdr = parseIhdr(buffer)
    if (!ihdr) return null

    const { width, height, bitDepth, colorType, bytesPerPixel } = ihdr

    // Pour les images indexées (palette), on retourne l'original car c'est plus complexe
    if (colorType === 3) {
      return base64Only
    }

    // Décompresser les données IDAT
    let rawData: Buffer
    try {
      rawData = decompressIdat(buffer)
    } catch {
      return null
    }

    // Décoder les pixels (enlever le filtre de chaque ligne)
    const rowSize = width * bytesPerPixel
    const pixels = new Uint8Array(width * height * bytesPerPixel)
    let prevLine: Uint8Array | null = null

    for (let y = 0; y < height; y++) {
      const filterType = rawData[y * (1 + rowSize)]
      const currentLine = new Uint8Array(
        rawData.buffer,
        rawData.byteOffset + y * (1 + rowSize) + 1,
        rowSize,
      )
      const decodedLine = unfilterLine(
        filterType,
        currentLine,
        prevLine,
        Math.ceil(bytesPerPixel),
      )

      decodedLine.forEach((val, i) => (pixels[y * rowSize + i] = val))
      prevLine = decodedLine
    }

    // Trouver les limites du contenu non-blanc/non-transparent
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * bytesPerPixel
        if (!isWhiteOrTransparent(pixels, offset, bytesPerPixel, bitDepth)) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    // Si l'image est entièrement blanche/transparente, retourner l'original
    if (minX > maxX || minY > maxY) {
      return base64Only
    }

    // Ajouter une marge de 1 pixel si possible
    minX = Math.max(0, minX - 1)
    maxX = Math.min(width - 1, maxX + 1)
    minY = Math.max(0, minY - 1)
    maxY = Math.min(height - 1, maxY + 1)

    // Si pas de crop nécessaire (ou presque), retourner l'original
    const newWidth = maxX - minX + 1
    const newHeight = maxY - minY + 1
    if (newWidth >= width - 2 && newHeight >= height - 2) {
      return base64Only
    }

    // Créer les nouveaux pixels croppés
    const croppedPixels = new Uint8Array(newWidth * newHeight * bytesPerPixel)

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcOffset = ((minY + y) * width + (minX + x)) * bytesPerPixel
        const dstOffset = (y * newWidth + x) * bytesPerPixel
        for (let c = 0; c < bytesPerPixel; c++) {
          croppedPixels[dstOffset + c] = pixels[srcOffset + c]
        }
      }
    }

    // Créer le nouveau PNG
    const newPng = createPng(
      croppedPixels,
      newWidth,
      newHeight,
      bytesPerPixel,
      colorType,
      bitDepth,
    )

    return newPng.toString("base64")
  } catch {
    return null
  }
}

/**
 * Calcule le hash MD5 d'une image après crop
 * Retourne le hash de l'image croppée, ou le hash original si le crop échoue
 *
 * @param base64Data - Données base64 de l'image (avec ou sans préfixe data:image/...)
 * @returns Le hash MD5 de l'image croppée
 */
export function computeCroppedHash(base64Data: string): string {
  const cropped = cropPngImage(base64Data)
  if (cropped) {
    return crypto.createHash("md5").update(cropped).digest("hex")
  }
  // Fallback vers le hash original
  return computeHash(base64Data)
}

/**
 * Retourne les données base64 de l'image croppée avec le préfixe data:image/png
 *
 * @param base64Data - Données base64 de l'image (avec ou sans préfixe data:image/...)
 * @returns Les données base64 complètes (avec préfixe data:image/png;base64,) de l'image croppée
 */
export function getCroppedBase64Src(base64Data: string): string {
  const cropped = cropPngImage(base64Data)
  if (cropped) {
    return `data:image/png;base64,${cropped}`
  }
  // Fallback vers l'original
  const base64Only = extractBase64Data(base64Data)
  return `data:image/png;base64,${base64Only}`
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
