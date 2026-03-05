# Gestion des images d'alinéa (pastilles)

Ce document décrit le workflow pour extraire, analyser et corriger les numéros d'alinéa associés aux images de pastilles dans les documents HTML de l'Assemblée nationale.

## Vue d'ensemble

Les documents HTML de l'Assemblée nationale contiennent des pastilles numérotées (①, ②, ③, etc.) qui indiquent les numéros d'alinéa. Ces pastilles sont des images PNG encodées en base64. Le système utilise trois scripts pour :

1. **Extraire** les images et leurs métadonnées (avec crop automatique)
2. **Analyser** statistiquement pour deviner les numéros d'alinéa
3. **Réviser** manuellement via une interface web

### Crop automatique des images

Lors de l'extraction, chaque image est automatiquement "croppée" (les bordures blanches ou transparentes sont supprimées). Cela permet de :

- **Réduire le nombre d'images uniques** : des images identiques mais avec des bordures différentes sont regroupées
- **Améliorer l'OCR** : les images croppées sont plus faciles à lire
- **Simplifier la révision** : moins d'images à réviser manuellement

Le système calcule deux hashes pour chaque image :

- **Hash original** : basé sur les données base64 brutes
- **Hash croppé** : basé sur l'image après suppression des bordures

Dans la page de révision, les images sont regroupées par hash croppé et seules les images croppées sont affichées.

## Architecture

```
┌─────────────────────────┐
│   Documents HTML        │
│   (dyn-opendata.html)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ extract_alineas_images  │ ──► alineas_images_extracted.json
│  (crop + double hash)   │     (hash original + hash croppé)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ merge_reviewed_alineas_ │ ◄── │ alinea_numbers_         │
│ numbers                 │     │ reviewed.json           │
└─────────────────────────┘     └─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│ alineas_numbers.ts      │ (mapping final hash → alinéa)
└─────────────────────────┘

┌─────────────────────────┐
│ generate_alineas_numbers│ ──► alinea_review.html
│ _review                 │     (interface de révision)
└─────────────────────────┘
```

## Fichiers

| Fichier                         | Description                                                               |
| ------------------------------- | ------------------------------------------------------------------------- |
| `alineas_images_extracted.json` | Données extraites (images originales et croppées, occurrences)            |
| `alineas_numbers_reviewed.json` | Corrections manuelles (priorité maximale, indexées par hash original)     |
| `alineas_numbers.ts`            | Mapping final utilisé par le simplificateur HTML (hash original → alinéa) |
| `alinea_review.html`            | Page HTML de révision interactive (groupée par hash croppé)               |

## Workflow

### Étape 1 : Extraction des images

Cette étape parcourt tous les documents HTML et extrait les informations sur chaque pastille.

```bash
cd packages/tisseuse
npx tsx src/scripts/extract_alineas_images.ts [chemin_documents] [--output fichier.json]
```

**Paramètres :**

- `chemin_documents` : Répertoire des documents (par défaut : `~/Projects/tricoteuses/assemblee-data/Documents`)
- `--output` : Fichier de sortie (par défaut : `src/lib/alineas/alineas_images_extracted.json`)

**Exemple :**

```bash
# Extraction complète (peut prendre plusieurs minutes)
npx tsx src/scripts/extract_alineas_images.ts

# Extraction d'un sous-ensemble pour test
npx tsx src/scripts/extract_alineas_images.ts ~/assemblee-data/Documents/DECL
```

**Données extraites pour chaque image :**

- Hash MD5 du base64 original
- Hash MD5 du base64 après crop (suppression des bordures blanches/transparentes)
- Données base64 complètes (original et croppé)
- Dimensions (largeur × hauteur)
- Liste des occurrences avec :
  - Chemin du document
  - Article parent

**Quand relancer ?**

- Lors de l'ajout de nouveaux documents
- Après une mise à jour majeure des documents sources

---

### Étape 2 : Fusion des corrections manuelles

Cette étape fusionne les corrections manuelles avec le mapping existant.

```bash
npx tsx src/scripts/merge_reviewed_alineas_numbers.ts
```

**Paramètres :**

- `--merge` : Fusionne les corrections manuelles avec le mapping existant

**Exemple :**

```bash
# Fusion des corrections dans alineas_numbers.ts
npx tsx src/scripts/merge_reviewed_alineas_numbers.ts
```

**Priorité des valeurs :**

1. Corrections manuelles (`alineas_numbers_reviewed.json`)
2. Mapping existant (`alineas_numbers.ts`)

---

### Étape 3 : Révision manuelle

Cette étape génère une page HTML interactive pour réviser et corriger les numéros d'alinéa.

```bash
npx tsx src/scripts/generate_alineas_numbers_review.ts [fichier.json] [--output fichier.html]
```

**Paramètres :**

- `fichier.json` : Fichier extrait (par défaut : `src/lib/alineas/alineas_images_extracted.json`)
- `--output` : Fichier HTML de sortie (par défaut : `src/lib/alineas/alinea_review.html`)

**Exemple :**

```bash
npx tsx src/scripts/generate_alineas_numbers_review.ts
# Puis ouvrir alinea_review.html dans un navigateur
```

**Regroupement par hash croppé :**

Les images sont regroupées par leur hash croppé. Cela signifie que :

- Seules les images croppées sont affichées (sans les bordures blanches/transparentes)
- Des images qui étaient différentes à cause de leurs bordures sont maintenant regroupées
- Le nombre d'images à réviser est significativement réduit
- Chaque carte affiche le nombre de "variantes" (hashes originaux) correspondantes

**Fonctionnalités de l'interface :**

- **Affichage des images croppées** avec leur hash, valeur existante
- **Indicateur de variantes** : affiche combien de hashes originaux correspondent au même hash croppé
- **Mode zoom** : cliquez sur une image pour l'agrandir, saisissez le numéro d'alinéa et passez à la suivante avec Entrée
- **Filtres** :
  - Afficher uniquement les hashes sans mapping
  - Afficher uniquement les incohérences (OCR ≠ existant)
  - Masquer les non-pastilles
- **Actions** :
  - Modifier le numéro d'alinéa pour chaque image (appliqué à tous les hashes originaux)
  - Marquer une image comme "pas une pastille"
  - Exporter/importer les corrections

**Enregistrement des corrections :**

1. Cliquer sur "💾 Enregistrer les corrections"
2. Un fichier `alinea_manual_corrections.json` est téléchargé
   - Les corrections sont automatiquement "expandues" vers tous les hashes originaux correspondants
3. Copier ce fichier vers `src/lib/alineas/alineas_numbers_reviewed.json`
4. Relancer l'analyse avec `merge_reviewed_alineas_numbers.ts`

---

### Étape 4 : Fusion finale

Après avoir effectué les corrections manuelles :

```bash
npx tsx src/scripts/merge_reviewed_alineas_numbers.ts
```

Cette commande :

1. Charge les corrections manuelles
2. Charge le mapping existant
3. Calcule les valeurs manquantes par propagation
4. Met à jour `src/lib/alineas/alineas_numbers.ts`

---

## Workflow complet (exemple)

```bash
cd packages/tisseuse

# 1. Extraction (une seule fois ou quand les documents changent)
npx tsx src/scripts/extract_alineas_images.ts
# ⏱️ ~5-10 minutes pour ~13000 documents

# 2. Génération de la page de révision
npx tsx src/scripts/generate_alineas_numbers_review.ts
# ⏱️ ~10 secondes

# 3. Révision manuelle
# - Ouvrir alinea_review.html dans un navigateur
# - Corriger les erreurs (mode zoom recommandé pour saisie rapide)
# - Exporter les corrections

# 4. Copier les corrections
cp ~/Downloads/alineas_numbers_reviewed.json src/lib/alineas/

# 5. Fusion des corrections
npx tsx src/scripts/merge_reviewed_alineas_numbers.ts

# 6. Répéter 2-5 si nécessaire
```

---

## Structure du fichier de corrections manuelles

```json
{
  "description": "Corrections manuelles des numéros d'alinéa",
  "lastUpdated": "2026-02-12T10:00:00.000Z",
  "corrections": {
    "3897ae4eea49099dacd75569920c84b7": 172,
    "22e32fa2c5b5e9aef2127fc1156c162a": 173,
    "abcd1234...": 0
  },
  "notPastilles": ["f2c380780579a280a096acd8fcc823a0"]
}
```

- **corrections** : `hash → numéro d'alinéa` (0 = non-pastille)
- **notPastilles** : Liste des hashes qui ne sont pas des pastilles d'alinéa

---

## Dépannage

### Le hash d'une image n'est pas dans le mapping

1. Vérifier que le document a été inclus dans l'extraction
2. Relancer l'extraction si nécessaire
3. Ajouter une correction manuelle

---

## Modules partagés

Le fichier `src/lib/alineas/alineas_images_utils.ts` contient les fonctions communes :

- `computeHash()` : Calcul du hash MD5 de l'image originale
- `computeCroppedHash()` : Calcul du hash MD5 après crop (suppression des bordures)
- `cropPngImage()` : Crop d'une image PNG (suppression des bordures blanches/transparentes)
- `getCroppedBase64Src()` : Retourne les données base64 de l'image croppée
- `extractAlineaImages()` : Extraction des images d'un HTML
- `isAlineaPastille()` : Vérifie si une image est une pastille (dimensions, ratio)
- `getImageDimensions()` : Extrait les dimensions PNG/JPEG
- Regex pour la détection des images (`SPAN_WITH_IMAGE_REGEX`, etc.)
