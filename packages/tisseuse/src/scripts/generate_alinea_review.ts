#!/usr/bin/env npx ts-node

/**
 * Script de génération d'un fichier HTML de révision des images d'alinéa
 *
 * Ce script lit le fichier JSON généré par `extract_alinea_images.ts` et génère
 * un fichier HTML interactif permettant de visualiser chaque image d'alinéa,
 * son hash MD5, et le numéro d'alinéa détecté pour permettre une correction manuelle.
 *
 * ## Usage
 *
 * ```bash
 * npx tsx src/scripts/generate_alinea_review.ts [fichier_extrait.json] [--output fichier.html]
 * ```
 *
 * Par défaut :
 * - Lit `./alinea_images_extracted.json`
 * - Génère `./alinea_review.html`
 *
 * @module generate_alinea_review
 */

import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import { extractBase64Data } from "../lib/server/alinea_image_utils.js"

import type { ExtractedData, ImageData } from "./extract_alinea_images.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_INPUT_PATH = "./alinea_images_extracted.json"
const DEFAULT_OUTPUT_PATH = "./alinea_review.html"

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
// Chargement du mapping existant et des corrections manuelles
// ============================================================================

let existingMapping: Record<string, number> = {}
try {
  const mappingPath = path.join(
    __dirname,
    "../lib/server/alinea_image_hashes.ts",
  )
  if (fs.existsSync(mappingPath)) {
    const content = fs.readFileSync(mappingPath, "utf-8")
    const hashMatches = content.matchAll(/"([a-f0-9]{32})":\s*(\d+)/g)
    for (const m of hashMatches) {
      existingMapping[m[1]] = parseInt(m[2], 10)
    }
    console.log(
      `Mapping existant chargé : ${Object.keys(existingMapping).length} entrées`,
    )
  }
} catch (e) {
  console.warn("Could not load existing mapping:", e)
}

let manualCorrections: ManualCorrections = {
  lastUpdated: null,
  corrections: {},
  notPastilles: [],
}
try {
  if (fs.existsSync(MANUAL_CORRECTIONS_PATH)) {
    const content = fs.readFileSync(MANUAL_CORRECTIONS_PATH, "utf-8")
    manualCorrections = JSON.parse(content) as ManualCorrections
    const corrCount = Object.keys(manualCorrections.corrections).length
    const notPastCount = manualCorrections.notPastilles.length
    if (corrCount > 0 || notPastCount > 0) {
      console.log(
        `Corrections manuelles chargées : ${corrCount} corrections, ${notPastCount} non-pastilles`,
      )
    }
  }
} catch (e) {
  console.warn("Could not load manual corrections:", e)
}

// ============================================================================
// Interface pour les données de révision
// ============================================================================

interface ReviewImageData {
  hash: string
  base64Src: string
  dimensions: { width: number; height: number } | null
  occurrenceCount: number
  firstInArticleCount: number
  existingAlinea: number | null
  ocrAlinea: number | null
  sampleDocuments: string[]
}

// ============================================================================
// OCR avec Tesseract
// ============================================================================

/**
 * Utilise Tesseract OCR pour détecter le numéro dans une pastille d'alinéa
 */
function ocrPastille(base64Src: string): number | null {
  const base64Data = extractBase64Data(base64Src)
  const buffer = Buffer.from(base64Data, "base64")

  const tmpDir = os.tmpdir()
  const tmpId = `alinea_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const tmpFileOrig = path.join(tmpDir, `${tmpId}_orig.png`)
  const tmpFileProcessed = path.join(tmpDir, `${tmpId}_processed.png`)

  try {
    fs.writeFileSync(tmpFileOrig, buffer)

    // Prétraitement avec ImageMagick
    try {
      execSync(
        `convert "${tmpFileOrig}" -resize 400% -trim +repage -bordercolor white -border 10 -threshold 50% "${tmpFileProcessed}"`,
        { timeout: 5000, stdio: "pipe" },
      )
    } catch {
      execSync(`cp "${tmpFileOrig}" "${tmpFileProcessed}"`, {
        timeout: 1000,
        stdio: "pipe",
      })
    }

    // OCR avec Tesseract
    let result: string | null = null

    // Essai 1: PSM 8 (single word)
    try {
      result = execSync(
        `tesseract "${tmpFileProcessed}" stdout --psm 8 -c tessedit_char_whitelist=0123456789`,
        { encoding: "utf-8", timeout: 5000 },
      ).trim()

      const num = parseInt(result, 10)
      if (!isNaN(num) && num >= 1 && num <= 2000) {
        return num
      }
    } catch {
      // Ignore
    }

    // Essai 2: PSM 7 (single line)
    try {
      result = execSync(
        `tesseract "${tmpFileProcessed}" stdout --psm 7 -c tessedit_char_whitelist=0123456789`,
        { encoding: "utf-8", timeout: 5000 },
      ).trim()

      const num = parseInt(result, 10)
      if (!isNaN(num) && num >= 1 && num <= 2000) {
        return num
      }
    } catch {
      // Ignore
    }

    // Essai 3: avec scaling différent
    const tmpFileScaled = path.join(tmpDir, `${tmpId}_scaled.png`)
    try {
      execSync(
        `convert "${tmpFileOrig}" -resize 300% -sharpen 0x1 "${tmpFileScaled}"`,
        { timeout: 5000, stdio: "pipe" },
      )
      result = execSync(
        `tesseract "${tmpFileScaled}" stdout --psm 8 -c tessedit_char_whitelist=0123456789`,
        { encoding: "utf-8", timeout: 5000 },
      ).trim()

      const num = parseInt(result, 10)
      if (!isNaN(num) && num >= 1 && num <= 2000) {
        return num
      }
    } catch {
      // Ignore
    } finally {
      try {
        fs.unlinkSync(tmpFileScaled)
      } catch {
        // Ignore
      }
    }

    return null
  } catch {
    return null
  } finally {
    // Nettoyage
    try {
      fs.unlinkSync(tmpFileOrig)
    } catch {
      // Ignore
    }
    try {
      fs.unlinkSync(tmpFileProcessed)
    } catch {
      // Ignore
    }
  }
}

// Cache OCR
const ocrCache = new Map<string, number | null>()

function ocrPastilleCached(hash: string, base64Src: string): number | null {
  if (ocrCache.has(hash)) {
    return ocrCache.get(hash)!
  }
  const result = ocrPastille(base64Src)
  ocrCache.set(hash, result)
  return result
}

// ============================================================================
// Chargement des données
// ============================================================================

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

// ============================================================================
// Génération HTML
// ============================================================================

function generateHtml(
  images: ReviewImageData[],
  stats: {
    uniqueHashes: number
    totalOccurrences: number
    ocrSuccessCount: number
    ocrFailCount: number
    existingCount: number
  },
): string {
  // Trier par alinéa existant ou OCR
  const sortedImages = [...images].sort((a, b) => {
    const aVal = a.existingAlinea ?? a.ocrAlinea ?? 9999
    const bVal = b.existingAlinea ?? b.ocrAlinea ?? 9999
    return aVal - bVal
  })

  let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Révision des images d'alinéa</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { margin-bottom: 10px; }
    .stats {
      background: #fff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stats p { margin: 5px 0; }
    .controls {
      background: #fff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .controls label { margin-right: 20px; }
    .controls button {
      padding: 8px 16px;
      margin-right: 10px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
    }
    .controls button:hover { background: #0056b3; }
    .controls button.secondary {
      background: #6c757d;
    }
    .controls button.secondary:hover { background: #545b62; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .card.has-existing { border-left: 4px solid #28a745; }
    .card.no-ocr { border-left: 4px solid #ffc107; }
    .card.mismatch { border-left: 4px solid #dc3545; }
    .card.not-pastille { opacity: 0.5; background: #f8f9fa; }
    .card img {
      max-width: 64px;
      max-height: 64px;
      image-rendering: pixelated;
      margin-bottom: 10px;
      border: 1px solid #ddd;
    }
    .card .hash {
      font-family: monospace;
      font-size: 10px;
      color: #666;
      word-break: break-all;
      text-align: center;
      margin-bottom: 5px;
    }
    .card .info {
      font-size: 12px;
      color: #333;
      text-align: center;
      margin-bottom: 10px;
    }
    .card .info .existing { color: #28a745; font-weight: bold; }
    .card .info .ocr { color: #007bff; }
    .card .info .count { color: #666; }
    .card input[type="number"] {
      width: 80px;
      padding: 5px;
      text-align: center;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .card input.modified {
      border-color: #007bff;
      background: #e7f3ff;
    }
    .card input.not-pastille-input {
      background: #f8f9fa;
      color: #999;
    }
    .card .mark-not-pastille {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
      cursor: pointer;
    }
    .card .mark-not-pastille:hover { color: #333; }
    .hidden { display: none !important; }
    .section-header {
      grid-column: 1 / -1;
      background: #e9ecef;
      padding: 10px 15px;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 10px;
    }
    .section-header.mismatch-header { background: #f8d7da; color: #721c24; }
    .section-header.missing-header { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <h1>Révision des images d'alinéa</h1>

  <div class="stats">
    <p><strong>Hashes uniques:</strong> ${stats.uniqueHashes}</p>
    <p><strong>Occurrences totales:</strong> ${stats.totalOccurrences}</p>
    <p><strong>Avec mapping existant:</strong> ${stats.existingCount}</p>
    <p><strong>OCR réussi:</strong> ${stats.ocrSuccessCount} (${((stats.ocrSuccessCount / stats.uniqueHashes) * 100).toFixed(1)}%)</p>
    <p><strong>OCR échoué:</strong> ${stats.ocrFailCount}</p>
  </div>

  <div class="controls">
    <label>
      <input type="checkbox" id="showOnlyMissing" />
      Afficher uniquement les hashes sans mapping
    </label>
    <label>
      <input type="checkbox" id="showOnlyMismatch" />
      Afficher uniquement les incohérences (OCR ≠ existant)
    </label>
    <label>
      <input type="checkbox" id="hideNotPastille" checked />
      Masquer les "non-pastilles"
    </label>
    <br><br>
    <button onclick="exportCorrections()">💾 Enregistrer les corrections</button>
    <button onclick="importCorrections()" class="secondary">📂 Importer</button>
    <button onclick="applyOcrToEmpty()" class="secondary">🔄 Appliquer OCR aux vides</button>
    <input type="file" id="importFile" style="display:none" accept=".json" />
    <p style="margin-top:10px;color:#666;font-size:12px;">
      Les corrections sont enregistrées dans <code>src/lib/server/alinea_manual_corrections.json</code>
    </p>
  </div>

  <div class="grid" id="imageGrid">
`

  // Grouper par catégorie
  const withMismatch: ReviewImageData[] = []
  const withoutMapping: ReviewImageData[] = []
  const withMapping: ReviewImageData[] = []

  for (const img of sortedImages) {
    const hasMismatch =
      img.existingAlinea !== null &&
      img.ocrAlinea !== null &&
      img.existingAlinea !== img.ocrAlinea

    if (hasMismatch) {
      withMismatch.push(img)
    } else if (img.existingAlinea === null) {
      withoutMapping.push(img)
    } else {
      withMapping.push(img)
    }
  }

  function renderCard(img: ReviewImageData): string {
    // Vérifier si une correction manuelle existe
    const manualCorrection = manualCorrections.corrections[img.hash]
    const isManualNotPastille =
      manualCorrections.notPastilles.includes(img.hash) ||
      manualCorrection === 0

    const hasExisting = img.existingAlinea !== null
    const noOcr = img.ocrAlinea === null
    const isMismatch =
      hasExisting &&
      img.ocrAlinea !== null &&
      img.existingAlinea !== img.ocrAlinea

    let cardClass = "card"
    if (isManualNotPastille) cardClass += " not-pastille"
    else if (isMismatch) cardClass += " mismatch"
    else if (hasExisting) cardClass += " has-existing"
    else if (noOcr) cardClass += " no-ocr"

    // Priorité: correction manuelle > existant > OCR
    const inputValue = isManualNotPastille
      ? 0
      : (manualCorrection ?? img.existingAlinea ?? img.ocrAlinea ?? "")
    const hasManualValue =
      manualCorrection !== undefined && manualCorrection !== img.existingAlinea
    const inputClass = hasManualValue ? "modified" : ""

    const notPastilleLabel = isManualNotPastille
      ? "✅ Marqué non-pastille"
      : "❌ Pas une pastille"

    return `
    <div class="${cardClass}" data-hash="${img.hash}" data-existing="${img.existingAlinea ?? ""}" data-ocr="${img.ocrAlinea ?? ""}">
      <img src="${img.base64Src}" alt="Alinéa" />
      <div class="hash">${img.hash}</div>
      <div class="info">
        ${hasExisting ? `<span class="existing">Existant: ${img.existingAlinea}</span><br>` : ""}
        ${img.ocrAlinea !== null ? `<span class="ocr">OCR: ${img.ocrAlinea}</span><br>` : '<span class="ocr">OCR: ?</span><br>'}
        <span class="count">${img.occurrenceCount} occ. (${img.firstInArticleCount} en tête)</span>
      </div>
      <input type="number" min="0" max="2000" value="${inputValue}" class="${inputClass}${isManualNotPastille ? " not-pastille-input" : ""}"
             onchange="markModified(this)" placeholder="Alinéa" />
      <div class="mark-not-pastille" onclick="toggleNotPastille(this)">
        ${notPastilleLabel}
      </div>
    </div>`
  }

  // Section incohérences
  if (withMismatch.length > 0) {
    html += `<div class="section-header mismatch-header">⚠️ Incohérences OCR/Existant (${withMismatch.length})</div>`
    for (const img of withMismatch) {
      html += renderCard(img)
    }
  }

  // Section sans mapping
  if (withoutMapping.length > 0) {
    html += `<div class="section-header missing-header">📝 Sans mapping (${withoutMapping.length})</div>`
    for (const img of withoutMapping) {
      html += renderCard(img)
    }
  }

  // Section avec mapping
  if (withMapping.length > 0) {
    html += `<div class="section-header">✅ Avec mapping (${withMapping.length})</div>`
    for (const img of withMapping) {
      html += renderCard(img)
    }
  }

  html += `
  </div>

  <script>
    // Charger les corrections manuelles existantes
    const corrections = ${JSON.stringify(manualCorrections.corrections)};
    const notPastilles = new Set(${JSON.stringify(manualCorrections.notPastilles)});

    // Marquer les cartes avec corrections existantes au chargement
    document.addEventListener('DOMContentLoaded', function() {
      // Appliquer les corrections chargées
      for (const [hash, value] of Object.entries(corrections)) {
        const card = document.querySelector(\`.card[data-hash="\${hash}"]\`);
        if (card) {
          const input = card.querySelector('input');
          if (value === 0) {
            notPastilles.add(hash);
            card.classList.add('not-pastille');
            input.value = '0';
            input.classList.add('not-pastille-input');
            const markEl = card.querySelector('.mark-not-pastille');
            if (markEl) markEl.textContent = '✅ Marqué non-pastille';
          } else {
            input.value = value;
            input.classList.add('modified');
          }
        }
      }
      // Appliquer les non-pastilles
      for (const hash of notPastilles) {
        const card = document.querySelector(\`.card[data-hash="\${hash}"]\`);
        if (card && !card.classList.contains('not-pastille')) {
          card.classList.add('not-pastille');
          const input = card.querySelector('input');
          input.value = '0';
          input.classList.add('not-pastille-input');
          const markEl = card.querySelector('.mark-not-pastille');
          if (markEl) markEl.textContent = '✅ Marqué non-pastille';
        }
      }
      applyFilters();
    });

    function markModified(input) {
      const card = input.closest('.card');
      const hash = card.dataset.hash;
      const value = input.value.trim();

      if (value === '' || value === '0') {
        delete corrections[hash];
        input.classList.remove('modified');
      } else {
        corrections[hash] = parseInt(value, 10);
        input.classList.add('modified');
      }
    }

    function toggleNotPastille(el) {
      const card = el.closest('.card');
      const hash = card.dataset.hash;
      const input = card.querySelector('input');

      if (notPastilles.has(hash)) {
        notPastilles.delete(hash);
        card.classList.remove('not-pastille');
        input.classList.remove('not-pastille-input');
        el.textContent = '❌ Pas une pastille';
      } else {
        notPastilles.add(hash);
        card.classList.add('not-pastille');
        input.classList.add('not-pastille-input');
        input.value = '0';
        corrections[hash] = 0;
        el.textContent = '✅ Marqué non-pastille';
      }
      applyFilters();
    }

    function exportCorrections() {
      // Collecter toutes les valeurs des inputs
      document.querySelectorAll('.card').forEach(card => {
        const hash = card.dataset.hash;
        const input = card.querySelector('input');
        const value = parseInt(input.value, 10);
        if (!isNaN(value)) {
          if (value === 0) {
            notPastilles.add(hash);
            delete corrections[hash];
          } else {
            corrections[hash] = value;
            notPastilles.delete(hash);
          }
        }
      });

      const data = {
        description: "Corrections manuelles des numéros d'alinéa pour les images de pastilles",
        lastUpdated: new Date().toISOString(),
        corrections,
        notPastilles: Array.from(notPastilles)
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alinea_manual_corrections.json';
      a.click();
      URL.revokeObjectURL(url);

      alert(\`Corrections exportées!\\n\\nCopiez le fichier téléchargé vers:\\npackages/tisseuse/src/lib/server/alinea_manual_corrections.json\\n\\nPuis exécutez:\\nnpx tsx src/scripts/analyze_alinea_images.ts --merge\`);
    }

    function importCorrections() {
      document.getElementById('importFile').click();
    }

    document.getElementById('importFile').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = JSON.parse(evt.target.result);

          // Appliquer les corrections
          if (data.corrections) {
            Object.assign(corrections, data.corrections);
            for (const [hash, value] of Object.entries(data.corrections)) {
              const card = document.querySelector(\`.card[data-hash="\${hash}"]\`);
              if (card) {
                const input = card.querySelector('input');
                input.value = value;
                if (value !== 0) {
                  input.classList.add('modified');
                }
              }
            }
          }

          // Appliquer les non-pastilles
          if (data.notPastilles) {
            for (const hash of data.notPastilles) {
              notPastilles.add(hash);
              const card = document.querySelector(\`.card[data-hash="\${hash}"]\`);
              if (card) {
                card.classList.add('not-pastille');
                const input = card.querySelector('input');
                input.value = '0';
                input.classList.add('not-pastille-input');
                const markEl = card.querySelector('.mark-not-pastille');
                markEl.textContent = '✅ Marqué non-pastille';
              }
            }
          }

          alert(\`Importé: \${Object.keys(data.corrections || {}).length} corrections, \${(data.notPastilles || []).length} non-pastilles\`);
          applyFilters();
        } catch (err) {
          alert('Erreur lors de l\\'import: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    function applyOcrToEmpty() {
      const cards = document.querySelectorAll('.card');
      let count = 0;
      cards.forEach(card => {
        const input = card.querySelector('input');
        const ocr = card.dataset.ocr;
        if (input.value === '' && ocr && ocr !== '') {
          input.value = ocr;
          markModified(input);
          count++;
        }
      });
      alert(\`OCR appliqué à \${count} champs vides\`);
    }

    function applyFilters() {
      const showOnlyMissing = document.getElementById('showOnlyMissing').checked;
      const showOnlyMismatch = document.getElementById('showOnlyMismatch').checked;
      const hideNotPastille = document.getElementById('hideNotPastille').checked;

      document.querySelectorAll('.card').forEach(card => {
        const existing = card.dataset.existing;
        const ocr = card.dataset.ocr;
        const hash = card.dataset.hash;
        const isNotPastille = notPastilles.has(hash);
        const hasMismatch = existing && ocr && existing !== ocr;
        const isMissing = !existing;

        let show = true;
        if (hideNotPastille && isNotPastille) show = false;
        if (showOnlyMissing && !isMissing) show = false;
        if (showOnlyMismatch && !hasMismatch) show = false;

        card.classList.toggle('hidden', !show);
      });

      // Gérer les headers de section
      document.querySelectorAll('.section-header').forEach(header => {
        const nextCards = [];
        let next = header.nextElementSibling;
        while (next && !next.classList.contains('section-header')) {
          if (next.classList.contains('card')) {
            nextCards.push(next);
          }
          next = next.nextElementSibling;
        }
        const visibleCards = nextCards.filter(c => !c.classList.contains('hidden'));
        header.classList.toggle('hidden', visibleCards.length === 0);
      });
    }

    document.getElementById('showOnlyMissing').addEventListener('change', applyFilters);
    document.getElementById('showOnlyMismatch').addEventListener('change', applyFilters);
    document.getElementById('hideNotPastille').addEventListener('change', applyFilters);

    // Appliquer les filtres au chargement
    applyFilters();
  </script>
</body>
</html>`

  return html
}

// ============================================================================
// Point d'entrée principal
// ============================================================================

async function main(): Promise<void> {
  // Parser les arguments
  const args = process.argv.slice(2)
  let inputPath = DEFAULT_INPUT_PATH
  let outputPath = DEFAULT_OUTPUT_PATH

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputPath = args[i + 1]
      i++
    } else if (!args[i].startsWith("--")) {
      inputPath = args[i]
    }
  }

  console.log(`Chargement des données depuis: ${inputPath}`)

  // Charger les données extraites
  const extractedData = loadExtractedData(inputPath)

  console.log(`\nMétadonnées:`)
  console.log(
    `  Documents analysés: ${extractedData.metadata.documentsAnalyzed}`,
  )
  console.log(`  Hashes uniques: ${extractedData.metadata.uniqueHashes}`)
  console.log(
    `  Occurrences totales: ${extractedData.metadata.totalOccurrences}`,
  )

  // Convertir en données de révision avec OCR
  console.log("\nExécution de l'OCR sur les images...")
  const reviewImages: ReviewImageData[] = []
  let ocrSuccessCount = 0
  let ocrFailCount = 0
  let existingCount = 0

  const hashes = Object.keys(extractedData.images)
  let processed = 0

  for (const hash of hashes) {
    const img = extractedData.images[hash]
    const stats = extractedData.transitions[hash]

    // OCR
    const ocrAlinea = ocrPastilleCached(hash, img.base64Src)
    if (ocrAlinea !== null) {
      ocrSuccessCount++
    } else {
      ocrFailCount++
    }

    // Mapping existant
    const existingAlinea = existingMapping[hash] ?? null
    if (existingAlinea !== null) {
      existingCount++
    }

    // Échantillon de documents
    const sampleDocuments = img.occurrences
      .slice(0, 3)
      .map((occ) => occ.documentPath)

    reviewImages.push({
      hash,
      base64Src: img.base64Src,
      dimensions: img.dimensions,
      occurrenceCount: stats?.totalCount ?? img.occurrences.length,
      firstInArticleCount: stats?.firstInArticleCount ?? 0,
      existingAlinea,
      ocrAlinea,
      sampleDocuments,
    })

    processed++
    if (processed % 100 === 0) {
      process.stdout.write(
        `\rOCR: ${processed}/${hashes.length} (${((processed / hashes.length) * 100).toFixed(1)}%)`,
      )
    }
  }

  console.log(
    `\n\nOCR terminé: ${ocrSuccessCount} réussis, ${ocrFailCount} échecs (${((ocrSuccessCount / hashes.length) * 100).toFixed(1)}%)`,
  )

  // Générer le HTML
  console.log("\nGénération du fichier HTML...")
  const html = generateHtml(reviewImages, {
    uniqueHashes: hashes.length,
    totalOccurrences: extractedData.metadata.totalOccurrences,
    ocrSuccessCount,
    ocrFailCount,
    existingCount,
  })

  fs.writeFileSync(outputPath, html)
  console.log(`\nFichier généré: ${outputPath}`)
  console.log("Ouvrez-le dans un navigateur pour réviser les images.")
}

main().catch(console.error)
