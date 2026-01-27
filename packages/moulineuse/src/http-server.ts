#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import cors from "cors"
import express from "express"
import { randomUUID } from "node:crypto"
import { z } from "zod"
import { assembleeDb, closeConnections, legiDb } from "./lib/databases.js"
import { loadAssembleeSchemas, loadLegifranceSchemas } from "./lib/schemas.js"

const app = express()
const PORT = parseInt(process.env.PORT || "3000", 10)

// Middleware
app.use(cors())
app.use(express.json())

// Session storage for persistent MCP connections
const sessions = new Map<
  string,
  {
    mcpServer: McpServer
    transport: StreamableHTTPServerTransport
    created: number
  }
>()

// Cleanup old sessions (older than 1 hour)
setInterval(
  () => {
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.created > ONE_HOUR) {
        console.log(`Cleaning up expired session: ${sessionId}`)
        session.transport.close()
        sessions.delete(sessionId)
      }
    }
  },
  5 * 60 * 1000,
) // Check every 5 minutes

// Schema pour les requêtes SQL
const QueryAssembleeSchema = z.object({
  query: z.string().describe("SQL query to execute on canutes_assemblee"),
  params: z
    .array(z.any())
    .optional()
    .describe("Optional parameters for the SQL query"),
})

const QueryLegifranceSchema = z.object({
  query: z.string().describe("SQL query to execute on canutes_legifrance"),
  params: z
    .array(z.any())
    .optional()
    .describe("Optional parameters for the SQL query"),
})

const ListTablesSchema = z.object({
  database: z
    .enum(["assemblee", "legifrance"])
    .describe("Database to list tables from"),
})

const DescribeTableSchema = z.object({
  database: z
    .enum(["assemblee", "legifrance"])
    .describe("Database containing the table"),
  table: z.string().describe("Name of the table to describe"),
})

const GetJsonSchemasSchema = z.object({
  database: z
    .enum(["assemblee", "legifrance"])
    .describe("Database to get JSON schemas for"),
})

// Create MCP server
function createMcpServer() {
  const mcpServer = new McpServer(
    {
      name: "moulineuse",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register query_assemblee tool
  mcpServer.registerTool(
    "query_assemblee",
    {
      description:
        "Execute a SQL query on the canutes_assemblee PostgreSQL database. Use this to search and retrieve data about French National Assembly documents, actors, debates, amendments, votes, etc.",
      inputSchema: QueryAssembleeSchema,
    },
    async ({ query, params }) => {
      try {
        const results = await assembleeDb.unsafe(query, params ?? [])
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  // Register query_legifrance tool
  mcpServer.registerTool(
    "query_legifrance",
    {
      description:
        "Execute a SQL query on the canutes_legifrance PostgreSQL database. Use this to search and retrieve data about French laws, codes, decrees, and other legal texts from Légifrance.",
      inputSchema: QueryLegifranceSchema,
    },
    async ({ query, params }) => {
      try {
        const results = await legiDb.unsafe(query, params ?? [])
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  // Register list_tables tool
  mcpServer.registerTool(
    "list_tables",
    {
      description:
        "List all tables available in a database with their descriptions",
      inputSchema: ListTablesSchema,
    },
    async ({ database }) => {
      try {
        const db = database === "assemblee" ? assembleeDb : legiDb

        const tables = await db`
          SELECT
            tablename as name,
            schemaname as schema
          FROM pg_catalog.pg_tables
          WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
          ORDER BY tablename
        `

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tables, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  // Register describe_table tool
  mcpServer.registerTool(
    "describe_table",
    {
      description:
        "Get the schema of a table including column names, types, and constraints",
      inputSchema: DescribeTableSchema,
    },
    async ({ database, table }) => {
      try {
        const db = database === "assemblee" ? assembleeDb : legiDb

        const columns = await db`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_name = ${table}
          ORDER BY ordinal_position
        `

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(columns, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  // Register get_json_schemas tool
  mcpServer.registerTool(
    "get_json_schemas",
    {
      description:
        "Get the JSON Schemas that describe the structure of JSON data inside the 'data' fields of database tables. These schemas define the structure of documents like acteurs, amendements, débats, codes, articles, etc.",
      inputSchema: GetJsonSchemasSchema,
    },
    async ({ database }) => {
      try {
        const schemas =
          database === "assemblee"
            ? await loadAssembleeSchemas()
            : await loadLegifranceSchemas()

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schemas, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  return mcpServer
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    server: "moulineuse",
    version: "0.1.0",
    transport: "streamable-http",
    sessions: sessions.size,
  })
})

// MCP HTTP endpoint - handles GET, POST, and DELETE
app.all("/mcp", async (req, res) => {
  try {
    // Extract session ID from header
    const sessionId = req.headers["mcp-session-id"] as string | undefined

    // Handle DELETE - terminate session
    if (req.method === "DELETE") {
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!
        await session.transport.close()
        sessions.delete(sessionId)
        console.log(`Session terminated: ${sessionId}`)
      }
      res.status(204).end()
      return
    }

    // Get or create session
    let session = sessionId ? sessions.get(sessionId) : undefined

    if (!session) {
      // Create new session
      const newSessionId = sessionId || randomUUID()
      const mcpServer = createMcpServer()
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
      })

      // Connect server to transport
      await mcpServer.connect(transport)

      session = {
        mcpServer,
        transport,
        created: Date.now(),
      }
      sessions.set(newSessionId, session)

      console.log(`New MCP session created: ${newSessionId}`)
    }

    // Handle the request with the session's transport
    await session.transport.handleRequest(req, res, req.body)
  } catch (error) {
    console.error("Error handling MCP request:", error)
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
})

// Start server
async function main() {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    Moulineuse MCP HTTP Server                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Local:  http://localhost:${PORT.toString().padEnd(43)}║
║  Public: https://mcp.code4code.eu                                ║
║                                                                  ║
║  Health:   http://localhost:${PORT}/health${" ".repeat(34 - PORT.toString().length)}║
║  Endpoint: http://localhost:${PORT}/mcp${" ".repeat(37 - PORT.toString().length)}║
║                                                                  ║
║  Transport: Streamable HTTP (MCP Protocol)                      ║
╚══════════════════════════════════════════════════════════════════╝
    `)
  })

  // Gestion de l'arrêt propre
  process.on("SIGINT", async () => {
    console.log("\nShutting down gracefully...")
    // Close all sessions
    for (const session of sessions.values()) {
      await session.transport.close()
    }
    sessions.clear()
    await closeConnections()
    process.exit(0)
  })

  process.on("SIGTERM", async () => {
    console.log("\nShutting down gracefully...")
    // Close all sessions
    for (const session of sessions.values()) {
      await session.transport.close()
    }
    sessions.clear()
    await closeConnections()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
