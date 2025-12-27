# OpenAPI Description Formatter

Ce module fournit un système de formatage automatique des descriptions dans les schémas JSON de l'API OpenAPI.

## Fonctionnalités

### Tags supportés

#### `{@link SchemaName texte du lien}`

Crée un lien cliquable vers un autre schéma (interne).

**Exemples :**
- `{@link Organe}` → Lien vers le schéma "Organe"
- `{@link Organe un organe}` → Lien avec le texte "un organe"
- `Liste des {@link Acteur acteurs}` → "Liste des [acteurs](#Acteur)"

#### `{@link https://url texte du lien}`

Crée un lien cliquable vers une URL externe.

**Exemples :**
- `{@link https://wikipedia.org/wiki/Amendement amendement}` → Lien externe vers Wikipedia
- `{@link https://url | texte}` → Supporte aussi le séparateur pipe `|`
- Les liens externes s'ouvrent dans un nouvel onglet avec une icône 🔗

#### `@deprecated`

Affiche un badge "Déprécié" en rouge.

**Exemple :**
- `Cette propriété est @deprecated` → Affiche un badge rouge "Déprécié"

#### `@example`

Affiche un badge "Exemple" gris.

**Exemple :**
- `@example { "id": 123 }` → Affiche un badge "Exemple"

## Usage

### Dans les composants Svelte

```svelte
<script>
  import FormattedDescription from "$lib/components/openapi/formatted-description.svelte"
</script>

<FormattedDescription
  description="Liste des {@link Organe organes} parlementaires"
  class="text-sm text-muted-foreground"
/>
```

### Fonctions utilitaires

```typescript
import { parseDescription, hasSpecialTags } from "$lib/openapi/description-formatter"

// Vérifier si une description contient des tags
if (hasSpecialTags(description)) {
  const segments = parseDescription(description)
  // segments contient les différentes parties de la description
}
```

## Composants modifiés

Les composants suivants utilisent maintenant le système de formatage :

- `schema-property-renderer.svelte` - Propriétés des schémas
- `schema-documentation.svelte` - Documentation complète des schémas
- `response-schema-section.svelte` - Section de réponse des endpoints

## Exemples de descriptions formatées

### Lien simple
```
"Référence à {@link Organe}"
```
→ Référence à [Organe](#Organe)

### Lien avec texte personnalisé
```
"Appartient à {@link Organe un organe} parlementaire"
```
→ Appartient à [un organe](#Organe) parlementaire

### Multiple tags
```
"@deprecated Cette liste d'{@link Acteur acteurs} n'est plus maintenue"
```
→ [Badge: Déprécié] Cette liste d'[acteurs](#Acteur) n'est plus maintenue

## Extension

Pour ajouter de nouveaux tags, modifiez :

1. `description-formatter.ts` - Ajouter le pattern regex et la logique de parsing
2. `formatted-description.svelte` - Ajouter le rendu visuel du nouveau tag
