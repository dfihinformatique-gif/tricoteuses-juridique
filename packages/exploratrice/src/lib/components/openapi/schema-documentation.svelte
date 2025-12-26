<script lang="ts">
  import type { Snippet } from "svelte"

  interface Props {
    definitions: Record<string, any>
  }

  let { definitions }: Props = $props()

  let expandedSchemas = $state<Set<string>>(new Set())

  function toggleSchema(schemaName: string) {
    const newSet = new Set(expandedSchemas)
    if (newSet.has(schemaName)) {
      newSet.delete(schemaName)
    } else {
      newSet.add(schemaName)
    }
    expandedSchemas = newSet
  }

  function extractRefName(ref: string): string {
    return ref.split("/").pop() || ""
  }

  function getTypeDisplay(schema: any): string {
    if (schema.$ref) {
      return extractRefName(schema.$ref)
    }
    if (schema.type === "array" && schema.items) {
      if (schema.items.$ref) {
        return `${extractRefName(schema.items.$ref)}[]`
      }
      return `${schema.items.type || "any"}[]`
    }
    if (schema.enum) {
      return "enum"
    }
    return schema.type || "any"
  }
</script>

<div class="mt-12 border-t pt-8">
  <h2 class="mb-6 text-3xl font-bold">Schémas de données</h2>
  <p class="mb-6 text-gray-600 dark:text-gray-400">
    Documentation détaillée des structures de données utilisées dans les champs
    "data" des réponses API.
  </p>

  <div class="space-y-4">
    {#each Object.entries(definitions) as [schemaName, schema] (schemaName)}
      <div
        id={schemaName}
        class="scroll-mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <button
          onclick={() => toggleSchema(schemaName)}
          class="dark:hover:bg-gray-750 flex w-full items-center justify-between bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 dark:bg-gray-800"
        >
          <div>
            <h3 class="text-lg font-semibold">{schemaName}</h3>
            {#if (schema as any)?.description}
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {(schema as any).description}
              </p>
            {/if}
          </div>
          <span class="text-2xl"
            >{expandedSchemas.has(schemaName) ? "−" : "+"}</span
          >
        </button>

        {#if expandedSchemas.has(schemaName)}
          <div class="bg-white p-4 dark:bg-gray-900">
            {#snippet renderSchemaUIGlobal(s: any)}
              {#if s.enum}
                <!-- Enumeration type -->
                <div class="text-sm">
                  <div class="mb-2 flex items-baseline gap-2">
                    <span
                      class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
                    >
                      enum
                    </span>
                    {#if s.type}
                      <span class="text-xs text-gray-500">Type: {s.type}</span>
                    {/if}
                  </div>
                  <div class="ml-1 text-xs">
                    <span class="text-gray-500">Valeurs possibles:</span>
                    <div class="mt-2 flex flex-wrap gap-1">
                      {#each s.enum as enumValue}
                        <span
                          class="rounded bg-gray-100 px-2 py-1 font-mono dark:bg-gray-800"
                        >
                          {enumValue}
                        </span>
                      {/each}
                    </div>
                  </div>
                </div>
              {:else if s.properties}
                <div
                  class="space-y-2 border-l-2 border-gray-300 pl-3 dark:border-gray-600"
                >
                  {#each Object.entries(s.properties) as [propName, propSchema]: [string, any] (propName)}
                    <div class="text-sm">
                      <div class="flex flex-wrap items-baseline gap-2">
                        <span
                          class="font-mono font-semibold text-blue-600 dark:text-blue-400"
                        >
                          {propName}
                        </span>
                        <span
                          class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
                        >
                          {getTypeDisplay(propSchema)}
                        </span>
                        {#if s.required?.includes(propName)}
                          <span
                            class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          >
                            requis
                          </span>
                        {/if}
                        {#if propSchema.$ref}
                          <a
                            href="#{extractRefName(propSchema.$ref)}"
                            class="text-xs text-purple-600 hover:underline dark:text-purple-400"
                            onclick={(e) => {
                              const name = extractRefName(propSchema.$ref)
                              if (name && !expandedSchemas.has(name)) {
                                toggleSchema(name)
                              }
                            }}
                          >
                            → {extractRefName(propSchema.$ref)}
                          </a>
                        {/if}
                      </div>
                      {#if propSchema.description}
                        <p
                          class="mt-1 ml-1 text-xs text-gray-600 dark:text-gray-400"
                        >
                          {propSchema.description}
                        </p>
                      {/if}
                      {#if propSchema.enum}
                        <div class="mt-1 ml-1 text-xs">
                          <span class="text-gray-500">Valeurs possibles:</span>
                          <div class="mt-1 flex flex-wrap gap-1">
                            {#each propSchema.enum as enumValue}
                              <span
                                class="rounded bg-gray-100 px-2 py-0.5 font-mono dark:bg-gray-800"
                              >
                                {enumValue}
                              </span>
                            {/each}
                          </div>
                        </div>
                      {/if}
                      {#if propSchema.type === "object" && propSchema.properties}
                        <div class="mt-2">
                          {@render renderSchemaUIGlobal(propSchema)}
                        </div>
                      {/if}
                      {#if propSchema.type === "array" && propSchema.items}
                        {#if propSchema.items.properties}
                          <div class="mt-2">
                            <div class="mb-1 text-xs text-gray-500">
                              Éléments du tableau:
                            </div>
                            {@render renderSchemaUIGlobal(propSchema.items)}
                          </div>
                        {:else if propSchema.items.$ref}
                          <a
                            href="#{extractRefName(propSchema.items.$ref)}"
                            class="ml-1 text-xs text-purple-600 hover:underline dark:text-purple-400"
                            onclick={(e) => {
                              const name = extractRefName(propSchema.items.$ref)
                              if (name && !expandedSchemas.has(name)) {
                                toggleSchema(name)
                              }
                            }}
                          >
                            → Voir {extractRefName(propSchema.items.$ref)}
                          </a>
                        {/if}
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <!-- Other schema types (primitive, etc.) -->
                <div class="text-sm">
                  {#if s.type}
                    <div class="mb-2 flex items-baseline gap-2">
                      <span
                        class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
                      >
                        {s.type}
                      </span>
                    </div>
                  {/if}
                  {#if s.format}
                    <p class="ml-1 text-xs text-gray-600 dark:text-gray-400">
                      Format: {s.format}
                    </p>
                  {/if}
                  {#if s.pattern}
                    <p
                      class="mt-1 ml-1 text-xs text-gray-600 dark:text-gray-400"
                    >
                      Pattern: <code class="font-mono">{s.pattern}</code>
                    </p>
                  {/if}
                  {#if !s.type && !s.format && !s.pattern}
                    <p class="text-xs text-gray-500 italic">
                      Schéma sans propriétés définies
                    </p>
                  {/if}
                </div>
              {/if}
            {/snippet}
            {@render renderSchemaUIGlobal(schema)}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
