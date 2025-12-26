# Dockerfile pour Moulineuse MCP HTTP/SSE Server

# Étape 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json tsconfig.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY src ./src

# Compiler TypeScript
RUN npm run build

# Étape 2: Production
FROM node:24-alpine

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copier les fichiers compilés depuis l'étape de build
COPY --from=builder /app/dist ./dist

# Variables d'environnement par défaut
ENV PORT=3000 \
    NODE_ENV=production

# Exposer le port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Labels pour la documentation
LABEL maintainer="Emmanuel Raviart <emmanuel@raviart.com>" \
      description="Moulineuse - MCP server for French legislative databases" \
      version="0.1.0" \
      org.opencontainers.image.source="https://git.tricoteuses.fr/logiciels/tricoteuses-juridique"

# Démarrer le serveur HTTP/SSE
CMD ["node", "dist/http-server.js"]
