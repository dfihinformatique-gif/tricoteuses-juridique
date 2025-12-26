# Guide d'utilisation de Moulineuse

## Introduction

Moulineuse est un serveur MCP (Model Context Protocol) qui permet d'interroger directement les bases de données PostgreSQL contenant les documents juridiques français :

- **canutes_assemblee** : données de l'Assemblée nationale
- **canutes_legifrance** : textes juridiques de Légifrance

Moulineuse propose **deux modes d'utilisation** :

- ⭐ **HTTP/SSE (Recommandé)** : Accès distant simple via https://mcp.code4code.eu
- **Stdio (Avancé)** : Accès local nécessitant une connexion aux bases PostgreSQL

---

## ⭐ Mode HTTP/SSE (Recommandé)

### Pourquoi ce mode ?

💡 **C'est le moyen le plus simple d'utiliser Moulineuse !**

- ✅ **Aucune installation complexe** - Pas besoin de configurer des bases de données
- ✅ **Accès immédiat** - Connectez-vous directement à https://mcp.code4code.eu
- ✅ **Toujours à jour** - Les données sont maintenues par l'équipe Tricoteuses
- ✅ **Sécurisé** - Connexion HTTPS chiffrée

### Configuration (3 lignes !)

Ajoutez simplement ceci à votre configuration MCP (ex: Claude Desktop) :

```json
{
  "mcpServers": {
    "moulineuse": {
      "url": "https://mcp.code4code.eu/sse",
      "transport": "sse"
    }
  }
}
```

**C'est tout !** Vous pouvez maintenant utiliser Moulineuse immédiatement.

### Exemple d'utilisation

Une fois configuré, vous pouvez demander à votre assistant AI :

```
Peux-tu me lister les tables disponibles dans la base assemblee ?
```

```
Trouve les 10 premiers députés de la 16ème législature
```

```
Quels sont les articles du code civil qui mentionnent le mariage ?
```

---

## 🔧 Mode stdio (Avancé)

### Prérequis

⚠️ **Ce mode nécessite un accès direct aux bases de données PostgreSQL.** Vous devez avoir :

- **Option 1** : Un accès VPN/SSH aux bases PostgreSQL de code4code.eu
- **Option 2** : Une copie locale complète des bases canutes_assemblee et canutes_legifrance
- **Option 3** : Des bases miroirs synchronisées

💡 **Si vous n'avez pas ces accès, utilisez le mode HTTP/SSE ci-dessus !**

### Cas d'usage du mode stdio

Ce mode est destiné aux utilisateurs qui :

- Développent sur le projet Moulineuse lui-même
- Ont besoin d'un déploiement privé/isolé
- Veulent tester des modifications locales des bases de données
- Ont des contraintes de sécurité nécessitant un accès local

### Configuration

1. **Copiez le fichier d'exemple de configuration** :

   ```bash
   cp example.env .env
   ```

2. **Éditez `.env` avec vos identifiants de base de données** :

   ```env
   ASSEMBLEE_DB_NAME="canutes_assemblee"
   ASSEMBLEE_DB_HOST="localhost"  # ou votre serveur PostgreSQL
   ASSEMBLEE_DB_PORT=5432
   ASSEMBLEE_DB_USER="votre_utilisateur"
   ASSEMBLEE_DB_PASSWORD="votre_mot_de_passe"

   LEGI_DB_NAME="canutes_legifrance"
   LEGI_DB_HOST="localhost"
   LEGI_DB_PORT=5432
   LEGI_DB_USER="votre_utilisateur"
   LEGI_DB_PASSWORD="votre_mot_de_passe"
   ```

3. **Construisez le projet** :

   ```bash
   npm install
   npm run build
   ```

4. **Configurez votre client MCP** en ajoutant dans votre configuration :
   ```json
   {
     "mcpServers": {
       "moulineuse": {
         "command": "node",
         "args": ["/chemin/absolu/vers/moulineuse/dist/index.js"],
         "env": {
           "ASSEMBLEE_DB_NAME": "canutes_assemblee",
           "ASSEMBLEE_DB_HOST": "localhost",
           "ASSEMBLEE_DB_PORT": "5432",
           "ASSEMBLEE_DB_USER": "votre_utilisateur",
           "ASSEMBLEE_DB_PASSWORD": "votre_mot_de_passe",
           "LEGI_DB_NAME": "canutes_legifrance",
           "LEGI_DB_HOST": "localhost",
           "LEGI_DB_PORT": "5432",
           "LEGI_DB_USER": "votre_utilisateur",
           "LEGI_DB_PASSWORD": "votre_mot_de_passe"
         }
       }
     }
   }
   ```

### Sécurité pour le mode stdio

- Le serveur utilise des requêtes préparées pour prévenir les injections SQL
- Configurez des utilisateurs PostgreSQL en **lecture seule** pour le serveur MCP
- Ne commitez **jamais** vos fichiers `.env` contenant les mots de passe
- Utilisez des mots de passe forts pour vos bases de données
- Limitez l'accès réseau aux bases de données aux machines de confiance

---

## 🛠️ Outils disponibles

Quel que soit le mode choisi (HTTP/SSE ou stdio), vous avez accès aux 5 outils suivants :

### 1. list_tables

Liste toutes les tables disponibles dans une base de données.

**Exemple d'utilisation :**

```
Peux-tu lister les tables disponibles dans la base assemblee ?
```

**Réponse attendue :**
Liste des tables avec leurs schémas (ex: `acteur`, `amendement`, `scrutin`, etc.)

### 2. describe_table

Décrit la structure d'une table (colonnes, types, contraintes).

**Exemple d'utilisation :**

```
Peux-tu décrire la structure de la table "acteur" dans la base assemblee ?
```

**Réponse attendue :**
Détails des colonnes : noms, types de données, nullable, valeurs par défaut, etc.

### 3. get_json_schemas

Récupère les JSON Schemas décrivant la structure des données JSON dans les champs `data` des tables.

**Exemple d'utilisation :**

```
Peux-tu me donner les JSON Schemas pour la base assemblee ?
```

**Réponse attendue :**
Un objet JSON contenant toutes les définitions de schémas pour les différents types de documents (acteurs, amendements, débats, etc.).

**Utilité :**
Les JSON Schemas vous permettent de comprendre la structure exacte des documents stockés dans les champs `data` JSONB des tables PostgreSQL. Cela est essentiel pour :

- Comprendre quels champs sont disponibles dans chaque type de document
- Savoir comment accéder aux données imbriquées
- Construire des requêtes SQL qui extraient des données spécifiques des champs JSON

**Exemple de requête utilisant les schémas :**
Une fois que vous connaissez la structure grâce au schéma, vous pouvez faire des requêtes comme :

```sql
SELECT
  uid,
  data->>'nom' as nom,
  data->>'prenom' as prenom,
  data->'mandats' as mandats
FROM acteur
WHERE legislature = 16
LIMIT 10
```

### 4. query_assemblee

Execute une requête SQL sur la base de données canutes_assemblee.

**Exemples d'utilisation :**

```
Trouve les 10 premiers députés de la 16ème législature
```

Requête SQL générée :

```sql
SELECT nom, prenom, groupe_sigle
FROM acteur
WHERE legislature = 16 AND type_acteur = 'depute'
LIMIT 10
```

```
Combien d'amendements ont été déposés pendant la 16ème législature ?
```

Requête SQL générée :

```sql
SELECT COUNT(*) as total_amendements
FROM amendement
WHERE legislature = 16
```

### 5. query_legifrance

Execute une requête SQL sur la base de données canutes_legifrance.

**Exemples d'utilisation :**

```
Trouve les articles du code civil traitant du mariage
```

Requête SQL générée :

```sql
SELECT id, numero, titre
FROM article
WHERE code = 'CODE_CIVIL'
  AND (titre ILIKE '%mariage%' OR texte ILIKE '%mariage%')
LIMIT 20
```

```
Quels sont les derniers décrets publiés ?
```

Requête SQL générée :

```sql
SELECT id, titre, date_publication
FROM texte
WHERE nature = 'DECRET'
ORDER BY date_publication DESC
LIMIT 10
```

---

## 💡 Conseils d'utilisation

1. **Explorez d'abord le schéma** : Utilisez `list_tables` et `describe_table` pour comprendre la structure des données avant de faire des requêtes complexes.

2. **Limitez les résultats** : Ajoutez toujours une clause `LIMIT` à vos requêtes pour éviter de récupérer trop de données.

3. **Utilisez les index** : Les requêtes sur les colonnes indexées (comme `legislature`, `uid`, `id`) seront plus rapides.

4. **Schémas OpenAPI** : Consultez les schémas OpenAPI disponibles pour comprendre la structure complète des données :
   - Assemblée : https://db.code4code.eu/canutes_assemblee/
   - Légifrance : https://db.code4code.eu/canutes_legifrance/

---

## 🐛 Dépannage

### Mode HTTP/SSE

**Le serveur ne répond pas :**

- Vérifiez que https://mcp.code4code.eu est accessible depuis votre réseau
- Vérifiez votre connexion internet
- Essayez d'accéder à https://mcp.code4code.eu/health dans un navigateur

### Mode stdio

**Erreur de connexion à la base de données :**

- Vérifiez que PostgreSQL est démarré
- Vérifiez les identifiants dans `.env`
- Vérifiez que l'utilisateur a les permissions de lecture sur les bases
- Vérifiez que le pare-feu autorise la connexion au port PostgreSQL

**Le serveur MCP ne démarre pas :**

- Vérifiez que le projet est compilé (`npm run build`)
- Vérifiez que le chemin dans la configuration MCP est correct (chemin absolu)
- Vérifiez que les variables d'environnement sont bien définies
- Vérifiez que Node.js version 24 ou supérieure est installé

---

## 📞 Support

Pour toute question ou problème :

- Issues : https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/issues
- Documentation : https://tricoteuses.fr/
