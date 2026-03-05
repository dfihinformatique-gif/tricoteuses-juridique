#!/usr/bin/env npx ts-node

/**
 * Script de génération d'un fichier HTML de révision des images d'alinéa
 *
 * Ce script lit le fichier JSON généré par `extract_alinea_images.ts` et génère
 * un fichier HTML interactif permettant de visualiser chaque image d'alinéa,
 * son hash MD5, et le numéro d'alinéa détecté pour permettre une correction manuelle.
 *
 * - `extract_alineas_images.ts` : pour extraire les images
 * - `merge_reviewed_alineas_numbers.ts` : pour fusionner les corrections
 *
 * ## Usage
 *
 * ```bash
 * npx tsx src/scripts/generate_alineas_numbers_review.ts [fichier_extrait.json] [--output fichier.html]
 * ```
 *
 * Par défaut :
 * - Lit `src/lib/alineas/alineas_images_extracted.json`
 * - Génère `src/lib/alineas/alinea_review.html`
 *
 * @module generate_alineas_numbers_review
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import type { ExtractedData } from "./extract_alineas_images.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_INPUT_PATH = path.join(
  __dirname,
  "../lib/alineas/alineas_images_extracted.json",
)
const DEFAULT_OUTPUT_PATH = path.join(
  __dirname,
  "../lib/alineas/alinea_review.html",
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
// Chargement du mapping existant et des corrections manuelles
// ============================================================================

const existingMapping: Record<string, number> = {}
try {
  const mappingPath = path.join(__dirname, "../lib/alineas/alineas_numbers.ts")
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
  /** Hash croppé (utilisé pour regrouper les images similaires) */
  croppedHash: string
  /** Données base64 de l'image croppée */
  croppedBase64Src: string
  /** Liste des hashes originaux correspondant à ce hash croppé */
  originalHashes: string[]
  dimensions: { width: number; height: number } | null
  occurrenceCount: number
  existingAlinea: number | null
  sampleDocuments: string[]
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
    existingCount: number
  },
): string {
  // Trier par alinéa existant
  const sortedImages = [...images].sort((a, b) => {
    const aVal = a.existingAlinea ?? 9999
    const bVal = b.existingAlinea ?? 9999
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
      cursor: zoom-in;
      transition: transform 0.1s;
    }
    .card img:hover {
      transform: scale(1.1);
    }
    /* Modal de zoom */
    .zoom-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      cursor: zoom-out;
    }
    .zoom-modal.visible {
      display: flex;
    }
    .zoom-modal img {
      image-rendering: pixelated;
      border: 4px solid white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      background: white;
      padding: 10px;
    }
    .zoom-controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 15px 25px;
      border-radius: 8px;
      display: flex;
      gap: 15px;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .zoom-controls button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
      cursor: pointer;
      font-size: 16px;
    }
    .zoom-controls button:hover {
      background: #0056b3;
    }
    .zoom-controls button.nav-btn {
      background: #28a745;
      font-size: 20px;
      padding: 8px 14px;
    }
    .zoom-controls button.nav-btn:hover {
      background: #1e7e34;
    }
    .zoom-controls span {
      font-weight: bold;
      min-width: 60px;
      text-align: center;
    }
    .zoom-controls .alinea-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      border-left: 1px solid #ccc;
      padding-left: 15px;
    }
    .zoom-controls .alinea-input-group label {
      font-weight: bold;
      color: #333;
    }
    .zoom-controls .alinea-input-group input {
      width: 70px;
      padding: 8px;
      font-size: 16px;
      text-align: center;
      border: 2px solid #007bff;
      border-radius: 4px;
    }
    .zoom-controls .alinea-input-group input:focus {
      outline: none;
      border-color: #0056b3;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.25);
    }
    .zoom-controls .position-info {
      font-size: 12px;
      color: #666;
      border-left: 1px solid #ccc;
      padding-left: 15px;
    }
    .zoom-hint {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      color: #333;
    }
    .card .hash {
      font-family: monospace;
      font-size: 10px;
      color: #666;
      text-align: center;
      margin-bottom: 5px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }
    .card .info {
      font-size: 12px;
      color: #333;
      text-align: center;
      margin-bottom: 10px;
    }
    .card .info .existing { color: #28a745; font-weight: bold; }
    .card .info .count { color: #666; }
    .card .original-hashes {
      font-size: 10px;
      color: #0070b9;
      background: #e7f3ff;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 5px;
      cursor: help;
    }
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
  </div>

  <div class="controls">
    <label>
      <input type="checkbox" id="showOnlyMissing" />
      Afficher uniquement les hashes sans mapping
    </label>
    <label>
      <input type="checkbox" id="hideNotPastille" checked />
      Masquer les "non-pastilles"
    </label>
    <br><br>
    <button onclick="exportCorrections()">💾 Enregistrer les corrections</button>
    <button onclick="importCorrections()" class="secondary">📂 Importer</button>
    <input type="file" id="importFile" style="display:none" accept=".json" />
    <p style="margin-top:10px;color:#666;font-size:12px;">
      Les corrections sont enregistrées dans <code>src/lib/alineas/alineas_numbers_reviewed.json</code>
    </p>
  </div>

  <!-- Modal de zoom -->
  <div class="zoom-modal" id="zoomModal" onclick="closeZoom(event)">
    <div class="zoom-hint">Échap pour fermer • ←/→ pour naviguer • Entrée pour valider et passer au suivant • Molette pour zoomer</div>
    <img id="zoomImage" src="" alt="Zoom" />
    <div class="zoom-controls" onclick="event.stopPropagation()">
      <button class="nav-btn" onclick="navigateZoom(-1)" title="Image précédente (←)">◀</button>
      <button onclick="adjustZoom(-1)">➖</button>
      <span id="zoomLevel">400%</span>
      <button onclick="adjustZoom(1)">➕</button>
      <button onclick="resetZoom()">↺</button>
      <button class="nav-btn" onclick="navigateZoom(1)" title="Image suivante (→)">▶</button>
      <div class="alinea-input-group">
        <label for="zoomAlineaInput">Alinéa:</label>
        <input type="number" id="zoomAlineaInput" min="0" max="2000" placeholder="?"
               onkeydown="handleZoomInputKeydown(event)" />
      </div>
      <div class="position-info">
        <span id="zoomPosition">1 / 100</span>
      </div>
    </div>
  </div>

  <div class="grid" id="imageGrid">
`

  // Grouper par catégorie
  const withoutMapping: ReviewImageData[] = []
  const withMapping: ReviewImageData[] = []

  for (const img of sortedImages) {
    if (img.existingAlinea === null) {
      withoutMapping.push(img)
    } else {
      withMapping.push(img)
    }
  }

  function renderCard(img: ReviewImageData): string {
    // Utiliser le premier hash original comme référence pour les corrections
    const primaryHash = img.originalHashes[0] || img.croppedHash

    // Vérifier si une correction manuelle existe (chercher dans tous les hashes originaux)
    let manualCorrection: number | undefined = undefined
    let isManualNotPastille = false
    for (const hash of img.originalHashes) {
      if (manualCorrections.corrections[hash] !== undefined) {
        manualCorrection = manualCorrections.corrections[hash]
        break
      }
      if (manualCorrections.notPastilles.includes(hash)) {
        isManualNotPastille = true
        break
      }
    }
    if (manualCorrection === 0) {
      isManualNotPastille = true
    }

    const hasExisting = img.existingAlinea !== null

    let cardClass = "card"
    if (isManualNotPastille) cardClass += " not-pastille"
    else if (hasExisting) cardClass += " has-existing"

    // Priorité: correction manuelle > existant
    const inputValue = isManualNotPastille
      ? 0
      : (manualCorrection ?? img.existingAlinea ?? "")
    const hasManualValue =
      manualCorrection !== undefined && manualCorrection !== img.existingAlinea
    const inputClass = hasManualValue ? "modified" : ""

    const notPastilleLabel = isManualNotPastille
      ? "✅ Marqué non-pastille"
      : "❌ Pas une pastille"

    // Afficher le nombre de hashes originaux si > 1
    const originalHashesInfo =
      img.originalHashes.length > 1
        ? `<span class="original-hashes" title="${img.originalHashes.join(", ")}">${img.originalHashes.length} variantes</span>`
        : ""

    return `
    <div class="${cardClass}" data-hash="${primaryHash}" data-original-hashes="${img.originalHashes.join(",")}" data-cropped-hash="${img.croppedHash}" data-existing="${img.existingAlinea ?? ""}">
      <img src="${img.croppedBase64Src}" alt="Alinéa" onclick="openZoom(this)" />
      <div class="hash" title="${primaryHash}">${primaryHash.slice(0, 8)}…</div>
      ${originalHashesInfo}
      <div class="info">
        ${hasExisting ? `<span class="existing">Existant: ${img.existingAlinea}</span><br>` : ""}
        <span class="count">${img.occurrenceCount} occ.</span>
      </div>
      <input type="number" min="0" max="2000" value="${inputValue}" class="${inputClass}${isManualNotPastille ? " not-pastille-input" : ""}"
             onchange="markModified(this)" placeholder="Alinéa" />
      <div class="mark-not-pastille" onclick="toggleNotPastille(this)">
        ${notPastilleLabel}
      </div>
    </div>`
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
    // Charger les corrections manuelles existantes (indexées par hash original)
    const corrections = ${JSON.stringify(manualCorrections.corrections)};
    const notPastilles = new Set(${JSON.stringify(manualCorrections.notPastilles)});

    // Construire un mapping des hashes originaux vers les cartes
    const originalHashToCard = {};
    document.querySelectorAll('.card').forEach(card => {
      const originalHashes = (card.dataset.originalHashes || '').split(',').filter(h => h);
      for (const origHash of originalHashes) {
        originalHashToCard[origHash] = card;
      }
    });

    // Marquer les cartes avec corrections existantes au chargement
    document.addEventListener('DOMContentLoaded', function() {
      // Appliquer les corrections chargées
      for (const [hash, value] of Object.entries(corrections)) {
        const card = originalHashToCard[hash];
        if (card) {
          const input = card.querySelector('input');
          if (value === 0) {
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
        const card = originalHashToCard[hash];
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
      const originalHashes = (card.dataset.originalHashes || '').split(',').filter(h => h);
      const value = input.value.trim();

      // Appliquer à tous les hashes originaux
      for (const hash of originalHashes) {
        if (value === '' || value === '0') {
          delete corrections[hash];
        } else {
          corrections[hash] = parseInt(value, 10);
        }
      }

      if (value === '' || value === '0') {
        input.classList.remove('modified');
      } else {
        input.classList.add('modified');
      }
    }

    function toggleNotPastille(el) {
      const card = el.closest('.card');
      const originalHashes = (card.dataset.originalHashes || '').split(',').filter(h => h);
      const input = card.querySelector('input');

      // Vérifier si au moins un hash est marqué non-pastille
      const isCurrentlyNotPastille = originalHashes.some(h => notPastilles.has(h));

      if (isCurrentlyNotPastille) {
        // Enlever tous les hashes de notPastilles
        for (const hash of originalHashes) {
          notPastilles.delete(hash);
          delete corrections[hash];
        }
        card.classList.remove('not-pastille');
        input.classList.remove('not-pastille-input');
        el.textContent = '❌ Pas une pastille';
      } else {
        // Ajouter tous les hashes à notPastilles
        for (const hash of originalHashes) {
          notPastilles.add(hash);
          corrections[hash] = 0;
        }
        card.classList.add('not-pastille');
        input.classList.add('not-pastille-input');
        input.value = '0';
        el.textContent = '✅ Marqué non-pastille';
      }
      applyFilters();
    }

    function exportCorrections() {
      // Collecter toutes les valeurs des inputs et les appliquer à tous les hashes originaux
      const exportCorrections = {};
      const exportNotPastilles = new Set();

      document.querySelectorAll('.card').forEach(card => {
        const originalHashes = (card.dataset.originalHashes || '').split(',').filter(h => h);
        const input = card.querySelector('input');
        const value = parseInt(input.value, 10);

        if (!isNaN(value) && originalHashes.length > 0) {
          // Appliquer la correction à tous les hashes originaux
          for (const hash of originalHashes) {
            if (value === 0) {
              exportNotPastilles.add(hash);
            } else {
              exportCorrections[hash] = value;
            }
          }
        }
      });

      const data = {
        description: "Corrections manuelles des numéros d'alinéa pour les images de pastilles",
        lastUpdated: new Date().toISOString(),
        corrections: exportCorrections,
        notPastilles: Array.from(exportNotPastilles)
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alinea_manual_corrections.json';
      a.click();
      URL.revokeObjectURL(url);

      alert(\`Corrections exportées!\\n\\nCopiez le fichier téléchargé vers:\\nsrc/lib/alineas/alineas_numbers_reviewed.json\\n\\nPuis exécutez:\\nnpx tsx src/scripts/merge_reviewed_alineas_numbers.ts\`);
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
          let appliedCorrections = 0;
          let appliedNotPastilles = 0;
          const processedCards = new Set();

          // Appliquer les corrections (chercher par hash original)
          if (data.corrections) {
            for (const [hash, value] of Object.entries(data.corrections)) {
              corrections[hash] = value;
              const card = originalHashToCard[hash];
              if (card && !processedCards.has(card)) {
                processedCards.add(card);
                const input = card.querySelector('input');
                input.value = value;
                if (value !== 0) {
                  input.classList.add('modified');
                } else {
                  card.classList.add('not-pastille');
                  input.classList.add('not-pastille-input');
                  const markEl = card.querySelector('.mark-not-pastille');
                  markEl.textContent = '✅ Marqué non-pastille';
                }
                appliedCorrections++;
              }
            }
          }

          // Appliquer les non-pastilles (chercher par hash original)
          if (data.notPastilles) {
            for (const hash of data.notPastilles) {
              notPastilles.add(hash);
              const card = originalHashToCard[hash];
              if (card && !processedCards.has(card)) {
                processedCards.add(card);
                card.classList.add('not-pastille');
                const input = card.querySelector('input');
                input.value = '0';
                input.classList.add('not-pastille-input');
                const markEl = card.querySelector('.mark-not-pastille');
                markEl.textContent = '✅ Marqué non-pastille';
                appliedNotPastilles++;
              }
            }
          }

          alert(\`Importé: \${appliedCorrections} corrections appliquées, \${appliedNotPastilles} non-pastilles appliquées\\n(sur \${Object.keys(data.corrections || {}).length} corrections et \${(data.notPastilles || []).length} non-pastilles dans le fichier)\`);
          applyFilters();
        } catch (err) {
          alert('Erreur lors de l\\'import: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    function applyFilters() {
      const showOnlyMissing = document.getElementById('showOnlyMissing').checked;
      const hideNotPastille = document.getElementById('hideNotPastille').checked;

      document.querySelectorAll('.card').forEach(card => {
        const existing = card.dataset.existing;
        const originalHashes = (card.dataset.originalHashes || '').split(',').filter(h => h);
        const isNotPastille = originalHashes.some(h => notPastilles.has(h));
        const isMissing = !existing;

        let show = true;
        if (hideNotPastille && isNotPastille) show = false;
        if (showOnlyMissing && !isMissing) show = false;

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
    document.getElementById('hideNotPastille').addEventListener('change', applyFilters);

    // Appliquer les filtres au chargement
    applyFilters();

    // Gestion du zoom
    let currentZoomLevel = 400;
    const zoomLevels = [100, 200, 300, 400, 600, 800, 1000, 1200, 1600];
    let currentZoomCardIndex = -1;
    let visibleCards = [];
    let lastEnteredValue = null; // Dernière valeur saisie pour proposer +1

    function getVisibleCards() {
      return Array.from(document.querySelectorAll('.card:not(.hidden)'));
    }

    function openZoom(imgElement) {
      const modal = document.getElementById('zoomModal');
      const zoomImg = document.getElementById('zoomImage');
      const zoomInput = document.getElementById('zoomAlineaInput');

      // Trouver la carte parente et son index
      const card = imgElement.closest('.card');
      visibleCards = getVisibleCards();
      currentZoomCardIndex = visibleCards.indexOf(card);

      zoomImg.src = imgElement.src;
      currentZoomLevel = 400;
      updateZoomDisplay();

      // Remplir l'input avec la valeur actuelle ou proposer lastEnteredValue + 1
      const cardInput = card.querySelector('input[type="number"]');
      if (cardInput.value) {
        zoomInput.value = cardInput.value;
      } else if (lastEnteredValue !== null) {
        zoomInput.value = lastEnteredValue + 1;
      } else {
        zoomInput.value = '';
      }

      // Mettre à jour la position
      updatePositionDisplay();

      modal.classList.add('visible');
      document.body.style.overflow = 'hidden';

      // Focus sur l'input après un court délai et sélectionner le texte
      setTimeout(() => {
        zoomInput.focus();
        zoomInput.select();
      }, 100);
    }

    function closeZoom(event) {
      if (event.target.id === 'zoomModal' || event.target.id === 'zoomImage') {
        const modal = document.getElementById('zoomModal');
        modal.classList.remove('visible');
        document.body.style.overflow = '';
      }
    }

    function closeZoomForced() {
      const modal = document.getElementById('zoomModal');
      modal.classList.remove('visible');
      document.body.style.overflow = '';
    }

    function navigateZoom(direction) {
      if (visibleCards.length === 0) return;

      // Sauvegarder la valeur actuelle avant de naviguer
      saveCurrentZoomValue();

      // Calculer le nouvel index
      currentZoomCardIndex += direction;
      if (currentZoomCardIndex < 0) currentZoomCardIndex = visibleCards.length - 1;
      if (currentZoomCardIndex >= visibleCards.length) currentZoomCardIndex = 0;

      // Mettre à jour l'affichage
      const card = visibleCards[currentZoomCardIndex];
      const img = card.querySelector('img');
      const zoomImg = document.getElementById('zoomImage');
      const zoomInput = document.getElementById('zoomAlineaInput');

      zoomImg.src = img.src;

      // Remplir l'input avec la valeur de la nouvelle carte ou proposer lastEnteredValue + 1
      const cardInput = card.querySelector('input[type="number"]');
      if (cardInput.value) {
        zoomInput.value = cardInput.value;
      } else if (lastEnteredValue !== null) {
        zoomInput.value = lastEnteredValue + 1;
      } else {
        zoomInput.value = '';
      }

      updateZoomDisplay();
      updatePositionDisplay();

      // Scroll pour voir la carte dans la grille
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Focus sur l'input
      zoomInput.focus();
      zoomInput.select();
    }

    function saveCurrentZoomValue() {
      if (currentZoomCardIndex < 0 || currentZoomCardIndex >= visibleCards.length) return;

      const card = visibleCards[currentZoomCardIndex];
      const cardInput = card.querySelector('input[type="number"]');
      const zoomInput = document.getElementById('zoomAlineaInput');

      const value = parseInt(zoomInput.value, 10);
      if (!isNaN(value) && value > 0) {
        lastEnteredValue = value;
      }

      if (zoomInput.value !== cardInput.value) {
        cardInput.value = zoomInput.value;
        markModified(cardInput);
      }
    }

    function handleZoomInputKeydown(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveCurrentZoomValue();
        navigateZoom(1); // Passer à l'image suivante
      }
    }

    function updatePositionDisplay() {
      const positionEl = document.getElementById('zoomPosition');
      positionEl.textContent = (currentZoomCardIndex + 1) + ' / ' + visibleCards.length;
    }

    function adjustZoom(direction) {
      const currentIndex = zoomLevels.indexOf(currentZoomLevel);
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= zoomLevels.length) newIndex = zoomLevels.length - 1;
      currentZoomLevel = zoomLevels[newIndex];
      updateZoomDisplay();
    }

    function resetZoom() {
      currentZoomLevel = 400;
      updateZoomDisplay();
    }

    function updateZoomDisplay() {
      document.getElementById('zoomLevel').textContent = currentZoomLevel + '%';
      const zoomImg = document.getElementById('zoomImage');
      zoomImg.style.width = (currentZoomLevel / 100 * 64) + 'px';
      zoomImg.style.height = 'auto';
    }

    // Zoom avec la molette
    document.getElementById('zoomModal').addEventListener('wheel', function(e) {
      e.preventDefault();
      adjustZoom(e.deltaY < 0 ? 1 : -1);
    });

    // Raccourcis clavier
    document.addEventListener('keydown', function(e) {
      const modal = document.getElementById('zoomModal');
      if (!modal.classList.contains('visible')) return;

      if (e.key === 'Escape') {
        saveCurrentZoomValue();
        closeZoomForced();
      } else if (e.key === 'ArrowLeft' && document.activeElement.id !== 'zoomAlineaInput') {
        e.preventDefault();
        navigateZoom(-1);
      } else if (e.key === 'ArrowRight' && document.activeElement.id !== 'zoomAlineaInput') {
        e.preventDefault();
        navigateZoom(1);
      }
    });
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
  console.log(
    `  Hashes uniques (originaux): ${extractedData.metadata.uniqueHashes}`,
  )
  console.log(
    `  Occurrences totales: ${extractedData.metadata.totalOccurrences}`,
  )

  // Regrouper les images par hash croppé
  console.log("\nRegroupement des images par hash croppé...")
  const groupedByCroppedHash = new Map<
    string,
    {
      croppedBase64Src: string
      originalHashes: string[]
      dimensions: { width: number; height: number } | null
      totalOccurrences: number
      sampleDocuments: string[]
    }
  >()

  for (const hash of Object.keys(extractedData.images)) {
    const img = extractedData.images[hash]
    const croppedHash = img.croppedHash
    const croppedBase64Src = img.croppedBase64Src

    if (!groupedByCroppedHash.has(croppedHash)) {
      groupedByCroppedHash.set(croppedHash, {
        croppedBase64Src,
        originalHashes: [],
        dimensions: img.dimensions,
        totalOccurrences: 0,
        sampleDocuments: [],
      })
    }

    const group = groupedByCroppedHash.get(croppedHash)!
    group.originalHashes.push(hash)
    group.totalOccurrences += img.occurrences.length

    // Ajouter quelques documents d'exemple
    if (group.sampleDocuments.length < 3) {
      const newDocs = img.occurrences
        .slice(0, 3 - group.sampleDocuments.length)
        .map((occ) => occ.documentPath)
      group.sampleDocuments.push(...newDocs)
    }
  }

  const uniqueCroppedHashes = groupedByCroppedHash.size
  console.log(`  Hashes uniques après crop: ${uniqueCroppedHashes}`)
  console.log(
    `  Réduction: ${extractedData.metadata.uniqueHashes} → ${uniqueCroppedHashes} (${((1 - uniqueCroppedHashes / extractedData.metadata.uniqueHashes) * 100).toFixed(1)}% de moins)`,
  )

  // Convertir en données de révision
  console.log("\nPréparation des données de révision...")
  const reviewImages: ReviewImageData[] = []
  let existingCount = 0

  for (const croppedHash of groupedByCroppedHash.keys()) {
    const group = groupedByCroppedHash.get(croppedHash)!

    // Mapping existant - chercher dans tous les hashes originaux
    // Prendre la valeur la plus fréquente si plusieurs existent
    const existingValues: number[] = []
    for (const originalHash of group.originalHashes) {
      const existing = existingMapping[originalHash]
      if (existing !== undefined) {
        existingValues.push(existing)
      }
    }
    let existingAlinea: number | null = null
    if (existingValues.length > 0) {
      // Prendre la valeur la plus fréquente
      const valueCounts = new Map<number, number>()
      for (const val of existingValues) {
        valueCounts.set(val, (valueCounts.get(val) || 0) + 1)
      }
      let maxCount = 0
      for (const [val, count] of valueCounts) {
        if (count > maxCount) {
          maxCount = count
          existingAlinea = val
        }
      }
      existingCount++
    }

    reviewImages.push({
      croppedHash,
      croppedBase64Src: group.croppedBase64Src,
      originalHashes: group.originalHashes,
      dimensions: group.dimensions,
      occurrenceCount: group.totalOccurrences,
      existingAlinea,
      sampleDocuments: group.sampleDocuments,
    })
  }

  console.log(`  Avec mapping existant: ${existingCount}`)

  // Générer le HTML
  console.log("\nGénération du fichier HTML...")
  const html = generateHtml(reviewImages, {
    uniqueHashes: groupedByCroppedHash.size,
    totalOccurrences: extractedData.metadata.totalOccurrences,
    existingCount,
  })

  fs.writeFileSync(outputPath, html)
  console.log(`\nFichier généré: ${outputPath}`)
  console.log("Ouvrez-le dans un navigateur pour réviser les images.")
}

main().catch(console.error)
