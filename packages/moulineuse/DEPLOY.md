# Guide de déploiement de Moulineuse avec Podman/Docker

Ce guide explique comment déployer le serveur MCP HTTP/SSE de Moulineuse avec Podman ou Docker.

## 📋 Prérequis

- Podman 4.0+ ou Docker 20.10+
- Accès aux bases de données PostgreSQL canutes_assemblee et canutes_legifrance
- Port 3000 disponible (ou modifier le port dans la configuration)

## 🚀 Déploiement rapide avec Podman

### 1. Préparer la configuration

Créez un fichier `.env` à partir de l'exemple :

```bash
cp example.env .env
```

Éditez `.env` avec vos identifiants de base de données :

```env
# Configuration Assemblée
ASSEMBLEE_DB_NAME=canutes_assemblee
ASSEMBLEE_DB_HOST=db.code4code.eu  # ou l'IP de votre serveur PostgreSQL
ASSEMBLEE_DB_PORT=5432
ASSEMBLEE_DB_USER=votre_utilisateur
ASSEMBLEE_DB_PASSWORD=votre_mot_de_passe

# Configuration Légifrance
LEGI_DB_NAME=canutes_legifrance
LEGI_DB_HOST=db.code4code.eu
LEGI_DB_PORT=5432
LEGI_DB_USER=votre_utilisateur
LEGI_DB_PASSWORD=votre_mot_de_passe
```

### 2. Build de l'image

**Avec Podman :**
```bash
podman build -t moulineuse:latest .
```

**Avec Docker :**
```bash
docker build -t moulineuse:latest .
```

### 3. Démarrer le conteneur

**Avec Podman :**
```bash
podman run -d \
  --name moulineuse-mcp \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  moulineuse:latest
```

**Avec Docker :**
```bash
docker run -d \
  --name moulineuse-mcp \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  moulineuse:latest
```

### 4. Vérifier le déploiement

```bash
# Vérifier les logs
podman logs moulineuse-mcp
# ou
docker logs moulineuse-mcp

# Tester le healthcheck
curl http://localhost:3000/health

# Tester l'endpoint SSE
curl http://localhost:3000/sse
```

## 🐳 Déploiement avec Docker Compose / Podman Compose

### 1. Utiliser docker-compose

```bash
# Avec Docker Compose
docker-compose up -d

# Avec Podman Compose
podman-compose up -d
```

### 2. Vérifier le statut

```bash
docker-compose ps
# ou
podman-compose ps
```

### 3. Voir les logs

```bash
docker-compose logs -f moulineuse
# ou
podman-compose logs -f moulineuse
```

### 4. Arrêter le service

```bash
docker-compose down
# ou
podman-compose down
```

## 🔄 Mise à jour

### 1. Récupérer les dernières modifications

```bash
git pull
```

### 2. Rebuild et redémarrer

**Avec Podman :**
```bash
podman stop moulineuse-mcp
podman rm moulineuse-mcp
podman build -t moulineuse:latest .
podman run -d \
  --name moulineuse-mcp \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  moulineuse:latest
```

**Avec Docker Compose :**
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## 🌐 Configuration reverse proxy

### Nginx

Exemple de configuration Nginx pour exposer Moulineuse sur `https://mcp.code4code.eu` :

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.code4code.eu;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Pour SSE
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Traefik

Exemple de labels pour Traefik :

```yaml
services:
  moulineuse:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.moulineuse.rule=Host(`mcp.code4code.eu`)"
      - "traefik.http.routers.moulineuse.entrypoints=websecure"
      - "traefik.http.routers.moulineuse.tls=true"
      - "traefik.http.routers.moulineuse.tls.certresolver=letsencrypt"
      - "traefik.http.services.moulineuse.loadbalancer.server.port=3000"
```

## 📊 Monitoring

### Healthcheck manuel

```bash
curl http://localhost:3000/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "server": "moulineuse",
  "version": "0.1.0",
  "transport": "sse"
}
```

### Logs en temps réel

```bash
# Podman
podman logs -f moulineuse-mcp

# Docker
docker logs -f moulineuse-mcp

# Docker Compose
docker-compose logs -f moulineuse
```

### Statistiques du conteneur

```bash
# Podman
podman stats moulineuse-mcp

# Docker
docker stats moulineuse-mcp
```

## 🔒 Sécurité

### Bonnes pratiques

1. **Ne jamais commiter le fichier `.env`** avec les vrais mots de passe
2. **Utiliser des utilisateurs PostgreSQL en lecture seule** pour Moulineuse
3. **Configurer un firewall** pour limiter l'accès aux bases de données
4. **Utiliser HTTPS** via un reverse proxy (Nginx, Traefik, Caddy)
5. **Mettre à jour régulièrement** l'image Docker
6. **Limiter les ressources** du conteneur (CPU, mémoire)
7. **Surveiller les logs** pour détecter les comportements anormaux

### Limiter les ressources

Ajoutez ces options lors du `podman run` ou `docker run` :

```bash
podman run -d \
  --name moulineuse-mcp \
  --cpus="1" \
  --memory="512m" \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  moulineuse:latest
```

## 🐛 Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs
podman logs moulineuse-mcp

# Vérifier la configuration
podman inspect moulineuse-mcp
```

### Erreur de connexion à la base de données

1. Vérifiez les variables d'environnement :
   ```bash
   podman exec moulineuse-mcp env | grep DB_
   ```

2. Testez la connexion depuis le conteneur :
   ```bash
   podman exec -it moulineuse-mcp sh
   # Depuis le conteneur :
   nc -zv $ASSEMBLEE_DB_HOST $ASSEMBLEE_DB_PORT
   ```

3. Vérifiez les règles du firewall sur le serveur PostgreSQL

### Le healthcheck échoue

```bash
# Tester manuellement depuis le conteneur
podman exec moulineuse-mcp node -e "require('http').get('http://localhost:3000/health', (r) => { console.log(r.statusCode); });"

# Tester depuis l'hôte
curl -v http://localhost:3000/health
```

### Problèmes de performance

```bash
# Voir l'utilisation des ressources
podman stats moulineuse-mcp

# Augmenter les limites si nécessaire
podman update --cpus="2" --memory="1g" moulineuse-mcp
```

## 📦 Build optimisé pour production

### Build multi-architecture

```bash
# Pour ARM64 et AMD64
podman build --platform linux/amd64,linux/arm64 -t moulineuse:latest .
```

### Registry privé

```bash
# Tag pour votre registry
podman tag moulineuse:latest registry.code4code.eu/moulineuse:latest

# Push vers le registry
podman push registry.code4code.eu/moulineuse:latest
```

## 🔄 Systemd integration (Podman)

Créer un service systemd pour Moulineuse :

```bash
# Générer le fichier service
podman generate systemd --new --files --name moulineuse-mcp

# Déplacer le fichier vers systemd
sudo mv container-moulineuse-mcp.service /etc/systemd/system/

# Activer et démarrer le service
sudo systemctl enable container-moulineuse-mcp.service
sudo systemctl start container-moulineuse-mcp.service

# Vérifier le statut
sudo systemctl status container-moulineuse-mcp.service
```

## 📚 Ressources

- [Documentation Podman](https://docs.podman.io/)
- [Documentation Docker](https://docs.docker.com/)
- [Guide MCP](https://modelcontextprotocol.io/)
- [Repository Tricoteuses](https://git.tricoteuses.fr/logiciels/tricoteuses-juridique)
