# Fichiers de messages pour l'internationalisation

Ce dossier contient les fichiers de traduction pour l'application Exploratrice.

## Fichiers

- `fr.json` - Messages en français (langue de base)
- `en.json` - Messages en anglais

## Structure des messages

Les messages sont organisés par section/page avec des clés utilisant des underscores :

```json
{
  "$schema": "https://inlang.com/schema/inlang-message-format",
  "site_title": "Tricoteuses - Données publiques juridiques françaises",
  "nav_home": "Accueil",
  "home_services_title": "Services et données",
  "common_license": "Licence"
}
```

## Conventions de nommage

### Préfixes par section

- `site_*` - Titre et nom du site
- `nav_*` - Navigation et menu principal
- `home_*` - Page d'accueil
- `services_*` - Page liste des services
- `service_detail_*` - Page détail d'un service
- `reuses_*` - Page liste des réutilisations
- `external_projects_*` - Page liste des projets externes
- `software_*` - Page liste des logiciels
- `about_*` - Page "À propos"
- `search_*` - Page de recherche
- `assemblee_*` - Pages spécifiques Assemblée
- `legifrance_*` - Pages spécifiques Légifrance
- `common_*` - Messages communs réutilisables
- `error_*` - Messages d'erreur
- `language_*` - Sélecteur de langue
- `breadcrumb_*` - Fil d'Ariane

### Préfixes pour les données

- `data_*` - Toutes les données de l'écosystème Tricoteuses
  - `data_[id]_name` - Nom d'une entité
  - `data_[id]_description` - Description d'une entité
  - `data_[id]_provider` - Fournisseur d'une entité
  - `data_[id]_author` - Auteur d'une entité

Exemples :

- `data_api_canutes_assemblee_name` - Nom de l'API Canutes Assemblée
- `data_tricoteuses_legifrance_description` - Description du logiciel
- `data_reuse_legiwatch_author` - Auteur de la réutilisation

### Préfixes pour les composants

- `service_card_*` - Composant carte de service
- `reuse_card_*` - Composant carte de réutilisation
- `external_project_card_*` - Composant carte de projet externe

## Messages avec paramètres

Pour injecter des valeurs dynamiques, utilisez des accolades :

```json
{
  "greeting": "Bonjour {name} !",
  "items_found": "{count} résultats trouvés"
}
```

Utilisation :

```javascript
m.greeting({ name: "Alice" })
m.items_found({ count: 42 })
```

## Messages avec HTML

Les messages peuvent contenir du HTML simple :

```json
{
  "about_presentation_p1": "<strong>Tricoteuses</strong> est une <strong>initiative citoyenne</strong>..."
}
```

Dans le code, utilisez `{@html}` :

```svelte
<p>{@html m.about_presentation_p1()}</p>
```

## Pluriels

Pour gérer les pluriels, utilisez le séparateur pipe `|` :

```json
{
  "software_authors": "auteur | auteurs",
  "software_count_single": "logiciel",
  "software_count_plural": "logiciels"
}
```

Utilisation :

```javascript
// Approche 1 : clés séparées
count > 1 ? m.software_count_plural() : m.software_count_single()

// Approche 2 : avec pipe
const [singular, plural] = m.software_authors().split(" | ")
count > 1 ? plural : singular
```

## Ajouter une nouvelle traduction

1. **Ajouter la clé dans `fr.json`** :

```json
{
  "my_new_key": "Mon nouveau message"
}
```

2. **Ajouter la traduction dans `en.json`** :

```json
{
  "my_new_key": "My new message"
}
```

3. **Utiliser dans le code** :

```svelte
<script lang="ts">
  import * as m from "$lib/paraglide/messages.js"
</script>

<p>{m.my_new_key()}</p>
```

4. **Recompiler** (automatique en mode dev) :

```bash
npm run dev
```

## Compilation

Les messages sont compilés automatiquement par le plugin Vite Paraglide :

- En mode dev : compilation à la volée avec hot reload
- En mode build : compilation optimisée avec tree-shaking

Les fichiers compilés sont générés dans `src/lib/paraglide/` et ne doivent **jamais être modifiés manuellement**.

## Validation

Pour valider les fichiers de messages :

1. **Format JSON** : Les fichiers doivent être du JSON valide
2. **Schéma** : Doit inclure `"$schema": "https://inlang.com/schema/inlang-message-format"`
3. **Cohérence** : Toutes les clés doivent exister dans toutes les langues
4. **Paramètres** : Les paramètres `{name}` doivent être identiques dans toutes les langues

## Statistiques

- **Nombre total de messages** : 270+
- **Langues supportées** : 2 (français, anglais)
- **Couverture** : ~60% des pages principales

## Ressources

- [Documentation Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
