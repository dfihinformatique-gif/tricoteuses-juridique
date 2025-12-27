# Tricoteuses Moulineuse

_MCP server for querying French legislative databases_

Moulineuse is a Model Context Protocol (MCP) server that provides direct access to French legislative PostgreSQL databases (canutes_assemblee and canutes_legifrance). It allows AI assistants to query legal and parliamentary data using SQL.

## Features

- **Direct database access**: Query canutes_assemblee and canutes_legifrance databases
- **SQL queries**: Execute custom SQL queries on the databases
- **Schema exploration**: List tables and describe their structure
- **JSON Schema support**: Access schemas describing the structure of JSON data in database fields
- **MCP compliant**: Standard Model Context Protocol implementation

## Available Tools

### `query_assemblee`

Execute SQL queries on the canutes_assemblee database containing French National Assembly data:

- Actors and parliamentary groups
- Debates and interventions
- Amendments
- Votes (scrutins)
- Legislative dossiers
- Questions

### `query_legifrance`

Execute SQL queries on the canutes_legifrance database containing French legal texts:

- Laws and codes
- Decrees and orders
- Constitutional texts
- Legal articles and sections

### `list_tables`

List all available tables in a database with their schema names.

### `describe_table`

Get detailed schema information for a specific table including:

- Column names
- Data types
- Nullable constraints
- Default values
- Character limits

### `get_json_schemas`

Get the JSON Schemas that describe the structure of JSON data inside the `data` fields of database tables. These schemas are essential for understanding the structure of documents stored in the databases:

- **Assemblée**: Schemas for acteurs, organes, agendas, amendements, débats, dossiers_legislatifs, questions, scrutins
- **Légifrance**: Schemas for codes, textes, articles, sections, and other legal document structures

The schemas are automatically loaded from the official Tricoteuses repositories and cached for performance.

## Installation

```bash
npm install
```

## Configuration

Copy `example.env` to `.env` and configure your database connections:

```bash
cp example.env .env
```

Edit `.env` with your database credentials:

```env
ASSEMBLEE_DB_NAME="canutes_assemblee"
ASSEMBLEE_DB_HOST="localhost"
ASSEMBLEE_DB_PORT=5432
ASSEMBLEE_DB_USER="assemblee"
ASSEMBLEE_DB_PASSWORD="your_password"

LEGI_DB_NAME="canutes_legifrance"
LEGI_DB_HOST="localhost"
LEGI_DB_PORT=5432
LEGI_DB_USER="legi"
LEGI_DB_PASSWORD="your_password"
```

## Usage

Moulineuse supports two modes of operation:

### 1. Stdio Mode (Default)

For use with MCP clients like Claude Desktop that connect via stdio:

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start  # or: moulineuse
```

### 2. HTTP Mode

For remote access via HTTP with Streamable HTTP transport:

**Development:**

```bash
npm run dev:http
```

**Production:**

```bash
npm run build
npm run start:http  # or: moulineuse-http
```

The HTTP server will be available at:

- Local: `http://localhost:3000`
- Public: `https://mcp.code4code.eu` (when deployed)

**Endpoints:**

- `GET /health` - Health check
- `GET /mcp` - MCP Streamable HTTP endpoint (for SSE streaming)
- `POST /mcp` - MCP Streamable HTTP endpoint (for JSON-RPC messages)
- `DELETE /mcp` - Session termination endpoint

### 3. Docker/Podman Deployment

For production deployment with Docker or Podman:

**Build the image:**

```bash
podman build -t moulineuse:latest .
# or
docker build -t moulineuse:latest .
```

**Run the container:**

```bash
podman run -d \
  --name moulineuse-mcp \
  --restart=unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  moulineuse:latest
```

**Or use Docker Compose:**

```bash
docker-compose up -d
# or
podman-compose up -d
```

📖 **Full deployment guide:** See [DEPLOY.md](DEPLOY.md) for detailed instructions including:

- Reverse proxy configuration (Nginx, Traefik)
- Systemd integration
- Monitoring and troubleshooting
- Security best practices

### MCP Client Configuration

#### Stdio Mode (Claude Desktop)

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "moulineuse": {
      "command": "node",
      "args": [
        "/path/to/tricoteuses-juridique/packages/moulineuse/dist/index.js"
      ],
      "env": {
        "ASSEMBLEE_DB_NAME": "canutes_assemblee",
        "ASSEMBLEE_DB_HOST": "localhost",
        "ASSEMBLEE_DB_PORT": "5432",
        "ASSEMBLEE_DB_USER": "assemblee",
        "ASSEMBLEE_DB_PASSWORD": "your_password",
        "LEGI_DB_NAME": "canutes_legifrance",
        "LEGI_DB_HOST": "localhost",
        "LEGI_DB_PORT": "5432",
        "LEGI_DB_USER": "legi",
        "LEGI_DB_PASSWORD": "your_password"
      }
    }
  }
}
```

#### HTTP/SSE Mode

Add to your MCP client configuration:

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

## Database Schemas

The databases use the same schemas as the PostgREST endpoints documented in the exploratrice project:

- **canutes_assemblee**: [OpenAPI documentation](https://db.code4code.eu/canutes_assemblee/)
- **canutes_legifrance**: [OpenAPI documentation](https://db.code4code.eu/canutes_legifrance/)

### JSON Schemas

The JSON Schemas describe the structure of data inside the `data` JSONB fields of the database tables. These schemas are automatically fetched from:

- **Assemblée**: https://git.tricoteuses.fr/logiciels/tricoteuses-assemblee/src/branch/master/src/schemas/
- **Légifrance**: https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/raw/branch/main/static/schemas.json

## Examples

### Query example for Assemblée

Find all deputies from a specific legislature:

```sql
SELECT nom, prenom, groupe_sigle
FROM acteur
WHERE legislature = 16 AND type_acteur = 'depute'
LIMIT 10
```

### Query example for Légifrance

Search for articles in a specific code:

```sql
SELECT id, numero, titre
FROM article
WHERE code = 'CODE_CIVIL'
LIMIT 10
```

### Get JSON Schemas

To understand the structure of the `data` field in the results, use the `get_json_schemas` tool to retrieve the schemas for all document types in a database.

## Security

- The server uses prepared statements to prevent SQL injection
- Database credentials should be kept secure and never committed to version control
- Consider using read-only database users for the MCP server
- JSON Schemas are fetched from trusted Tricoteuses repositories over HTTPS

## License

AGPL-3.0-or-later

## Related Projects

- [Tricoteuses Exploratrice](../exploratrice): Web application to navigate between French legislative documents
- [Tricoteuses Tisseuse](../tisseuse): Find links in/to French legislative documents
