# Simplification des documents HTML générés par Word

Ce script simplifie les documents HTML générés par Word (typiquement les documents de l'Assemblée nationale : projets de loi, propositions de loi, rapports, etc.) en HTML sémantique propre.

## Installation

Le script fait partie du package `@tricoteuses/tisseuse`. Assurez-vous d'avoir installé les dépendances :

```bash
npm install
```

## Utilisation

### Simplifier un fichier unique

```bash
npm run simplify-html file <chemin_fichier.html> [options]
```

Options disponibles :

- `-o, --output <chemin>` : Chemin du fichier de sortie (par défaut : `<nom>_simplified.html`)
- `-f, --full-document` : Générer un document HTML complet avec doctype
- `-n, --convert-nbsp` : Convertir les `&nbsp;` en espaces normales
- `-a, --keep-alignment` : Conserver les attributs d'alignement sur les paragraphes (activé par défaut)
- `-e, --keep-empty` : Conserver les paragraphes vides
- `-v, --verbose` : Afficher les détails du traitement

**Exemple :**

```bash
npm run simplify-html file ../assemblee-data/Documents/PION/AN/R5/15/BTC/000/PIONANR5L15BTC0989/dyn-opendata.html -o /tmp/simplifie.html -v
```

### Simplifier un répertoire entier

```bash
npm run simplify-html dir <chemin_repertoire> [options]
```

Options disponibles :

- `-o, --output <chemin>` : Répertoire de sortie (par défaut : même répertoire que l'entrée)
- `-r, --recursive` : Traiter les sous-répertoires récursivement
- `-p, --pattern <nom>` : Nom de fichier à rechercher (par défaut : `dyn-opendata.html`)
- `-f, --full-document` : Générer des documents HTML complets avec doctype
- `-n, --convert-nbsp` : Convertir les `&nbsp;` en espaces normales
- `-a, --keep-alignment` : Conserver les attributs d'alignement
- `-e, --keep-empty` : Conserver les paragraphes vides
- `-v, --verbose` : Afficher les détails du traitement

**Exemple :**

```bash
npm run simplify-html dir ../assemblee-data/Documents/PION/ -r -o /tmp/simplified_pions/ -v
```

## Transformations effectuées

Le script effectue les transformations suivantes :

### Éléments supprimés

- Balises `<style>` et CSS inline
- Images (généralement des logos en base64), sauf les pastilles d'alinéa qui sont converties
- Balises `<script>`
- Balises `<meta>` et `<link>`
- Éléments de positionnement absolu (sauf pastilles)
- Balises `<del>`

### Éléments transformés

| HTML Word | HTML simplifié |
|-----------|----------------|
| `<span style="font-weight: bold">` | `<strong>` |
| `<span style="font-style: italic">` | `<em>` |
| `<span style="vertical-align: super">` | `<sup>` |
| `<span style="vertical-align: sub">` | `<sub>` |
| `<p class="assnat9ArticleNum">` | `<h6>` |
| `<p class="assnat5ChapitreNum">` | `<h5>` |
| `<div class="assnatSection*">` | (contenu conservé, balise supprimée) |
| `<a id="...">` (sans href) | `<span id="...">` |
| Images de pastille (45x31px) | `<span class="alinea" data-alinea="N">` |

### Nettoyage

- Fusion des balises de formatage consécutives (`<strong>A</strong><strong>B</strong>` → `<strong>AB</strong>`)
- Suppression des paragraphes vides (sauf si `--keep-empty`)
- Préservation de l'alignement (`align="center"`, `align="right"`)
- Conservation des liens avec `href`

### Extraction des numéros d'alinéa

Les documents de l'Assemblée nationale contiennent souvent des "pastilles" - de petites images (45x31 pixels) positionnées à gauche des paragraphes qui contiennent le numéro d'alinéa. Ces images sont détectées grâce à leur attribut `z-index` dans le style CSS.

Le script remplace ces images par des balises `<span class="alinea" data-alinea="N">N</span>` où `N` est le numéro d'alinéa.

#### Deux modes de numérotation

**Mode relatif (`--relative-alinea` ou `-r`)** : Recommandé pour la plupart des cas d'usage. Les alinéas sont numérotés séquentiellement (1, 2, 3...) à partir de chaque article (marqué par un `<h6>`). Ce mode est plus fiable car il ne dépend pas du contenu des images.

```bash
npm run simplify-html file document.html --relative-alinea
```

Exemple de résultat :
```html
<h6>Article 1er</h6>
<p><span class="alinea" data-alinea="1">1</span>I. – La perception des ressources...</p>
<p><span class="alinea" data-alinea="2">2</span>II. – Sous réserve de dispositions contraires...</p>
<h6>Article 2</h6>
<p><span class="alinea" data-alinea="1">1</span>Le code de l'éducation est ainsi modifié...</p>
```

**Mode absolu (par défaut)** : Tente d'utiliser le numéro d'alinéa original du document, basé sur un mapping des hashes MD5 des images. Ce mode utilise une base de données de 2400+ hashes d'images générée par analyse statistique de 13 000+ documents de l'Assemblée nationale. Pour les images non reconnues, le z-index est utilisé comme fallback.

Note : Ce mode peut produire des numéros élevés (50, 51...) pour certains documents où les images ne sont pas reconnues. Dans ce cas, utilisez le mode relatif.

#### Débogage

L'option `--keep-image-hash` (ou `-H`) conserve le hash MD5 de l'image dans l'attribut `data-image-hash` pour faciliter le débogage :

```html
<p><span class="alinea" data-alinea="1" data-image-hash="31ce3e5492d9b729f4d10ddb242e027b">1</span>...</p>
```

## Utilisation programmatique

Le simplificateur peut aussi être utilisé comme module TypeScript :

```typescript
import { simplifyWordHtml, simplifyWordHtmlToDocument } from "@tricoteuses/tisseuse/server"

// Simplifier du HTML (renvoie un fragment)
const simplifiedFragment = simplifyWordHtml(htmlContent, {
  keepAlignment: true,
  convertNbsp: false,
  removeEmptyParagraphs: true,
})

// Simplifier et générer un document complet
const simplifiedDocument = simplifyWordHtmlToDocument(htmlContent, {
  keepAlignment: true,
})
```

## Exemple de résultat

### Avant (HTML Word)

```html
<p style="margin-top:24pt; margin-bottom:12pt; text-indent:0pt; text-align:center; page-break-after:avoid; font-family:'Times New Roman'; font-size:14pt; font-weight:bold; font-style:italic">
  <span style="font-weight:bold">Article 1</span><span style="font-size:9.33pt; vertical-align:super">er</span>
</p>
<p class="assnatLoiTexte" style="margin-bottom:12pt; text-indent:25.5pt; text-align:justify; font-family:'Times New Roman'; font-size:14pt">
  L'article L.&#xa0;511&#x2011;5 du code de l'éducation est ainsi rédigé&#xa0;:
</p>
```

### Après (HTML simplifié)

```html
<h6><span id="B3369631499">Article 1<sup>er</sup></span></h6>
<p>L'article L.&#xa0;511&#x2011;5 du code de l'éducation est ainsi rédigé&#xa0;:</p>
```

## Performance

Le script réduit typiquement la taille des fichiers de 75% à 95% :

- Propositions de loi simples : ~90% de réduction
- Rapports complexes avec tableaux : ~75% de réduction
- Documents avec pastilles d'alinéa : ~80% de réduction

## Exemple complet

Pour traiter le document `DECLANR5L17B2247-N0` (projet de loi de finances) :

```bash
npm run simplify-html file ../assemblee-data/Documents/DECL/AN/R5/17/B/002/DECLANR5L17B2247-N0/dyn-opendata.html -o /tmp/plf_simplifie.html -v
```

Résultat typique :
- Taille originale : 5.5 MB
- Taille simplifiée : 1.1 MB
- Réduction : ~80%
- Alinéas extraits : ~1500