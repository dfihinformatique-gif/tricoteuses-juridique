#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { assembleeDb, legiDb, closeConnections } from "./lib/databases.js"
import { loadAssembleeSchemas, loadLegifranceSchemas } from "./lib/schemas.js"

const server = new Server(
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

// Liste des outils disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_assemblee",
        description:
          "Execute a SQL query on the canutes_assemblee PostgreSQL database. Use this to search and retrieve data about French National Assembly documents, actors, debates, amendments, votes, etc.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute on canutes_assemblee",
            },
            params: {
              type: "array",
              description: "Optional parameters for the SQL query",
              items: {},
            },
          },
          required: ["query"],
        },
      },
      {
        name: "query_legifrance",
        description:
          "Execute a SQL query on the canutes_legifrance PostgreSQL database. Use this to search and retrieve data about French laws, codes, decrees, and other legal texts from Légifrance.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute on canutes_legifrance",
            },
            params: {
              type: "array",
              description: "Optional parameters for the SQL query",
              items: {},
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_tables",
        description:
          "List all tables available in a database with their descriptions",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              enum: ["assemblee", "legifrance"],
              description: "Database to list tables from",
            },
          },
          required: ["database"],
        },
      },
      {
        name: "describe_table",
        description:
          "Get the schema of a table including column names, types, and constraints",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              enum: ["assemblee", "legifrance"],
              description: "Database containing the table",
            },
            table: {
              type: "string",
              description: "Name of the table to describe",
            },
          },
          required: ["database", "table"],
        },
      },
      {
        name: "get_json_schemas",
        description:
          "Get the JSON Schemas that describe the structure of JSON data inside the 'data' fields of database tables. These schemas define the structure of documents like acteurs, amendements, débats, codes, articles, etc.",
        inputSchema: {
          type: "object",
          properties: {
            database: {
              type: "string",
              enum: ["assemblee", "legifrance"],
              description: "Database to get JSON schemas for",
            },
          },
          required: ["database"],
        },
      },
    ],
  }
})

// Gestionnaire d'exécution des outils
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "query_assemblee": {
        const args = QueryAssembleeSchema.parse(request.params.arguments)
        const results = await assembleeDb.unsafe(args.query, args.params || [])
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      }

      case "query_legifrance": {
        const args = QueryLegifranceSchema.parse(request.params.arguments)
        const results = await legiDb.unsafe(args.query, args.params || [])
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        }
      }

      case "list_tables": {
        const args = ListTablesSchema.parse(request.params.arguments)
        const db = args.database === "assemblee" ? assembleeDb : legiDb

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
      }

      case "describe_table": {
        const args = DescribeTableSchema.parse(request.params.arguments)
        const db = args.database === "assemblee" ? assembleeDb : legiDb

        const columns = await db`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns
          WHERE table_name = ${args.table}
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
      }

      case "get_json_schemas": {
        const args = GetJsonSchemasSchema.parse(request.params.arguments)
        const schemas =
          args.database === "assemblee"
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
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
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
})

// Démarrage du serveur
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Gestion de l'arrêt propre
  process.on("SIGINT", async () => {
    await closeConnections()
    process.exit(0)
  })

  process.on("SIGTERM", async () => {
    await closeConnections()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
