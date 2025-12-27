<script lang="ts">
  import type { Snippet } from "svelte"
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card"
  import { Badge } from "$lib/components/ui/badge"
  import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "$lib/components/ui/accordion"
  import { Separator } from "$lib/components/ui/separator"

  interface Props {
    definitions: Record<string, any>
  }

  let { definitions }: Props = $props()

  // Sort schemas alphabetically by name
  const sortedDefinitions = $derived(
    Object.entries(definitions).sort(([nameA], [nameB]) =>
      nameA.localeCompare(nameB),
    ),
  )

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

<Separator class="my-12" />

<div class="mt-12">
  <h2 class="mb-6 text-3xl font-bold">Schémas de données</h2>
  <p class="mb-6 text-muted-foreground">
    Documentation détaillée des structures de données utilisées dans les champs
    "data" des réponses API.
  </p>

  <Accordion type="multiple" class="space-y-4">
    {#each sortedDefinitions as [schemaName, schema] (schemaName)}
      <AccordionItem value={schemaName} id={schemaName} class="rounded-lg border">
        <AccordionTrigger class="px-4 hover:no-underline">
          <div class="text-left">
            <h3 class="text-lg font-semibold">{schemaName}</h3>
            {#if (schema as any)?.description}
              <p class="mt-1 text-sm text-muted-foreground">
                {(schema as any).description}
              </p>
            {/if}
          </div>
        </AccordionTrigger>
        <AccordionContent class="px-4 pb-4">
          {#snippet renderSchemaUI(s: any)}
            {#if s.enum}
              <!-- Enumeration type -->
              <div class="text-sm">
                <div class="mb-2 flex items-baseline gap-2">
                  <Badge variant="outline" class="text-xs">enum</Badge>
                  {#if s.type}
                    <span class="text-xs text-muted-foreground">Type: {s.type}</span>
                  {/if}
                </div>
                <div class="ml-1 text-xs">
                  <span class="text-muted-foreground">Valeurs possibles:</span>
                  <div class="mt-2 flex flex-wrap gap-1">
                    {#each s.enum as enumValue}
                      <Badge variant="secondary" class="font-mono text-xs">
                        {enumValue}
                      </Badge>
                    {/each}
                  </div>
                </div>
              </div>
            {:else if s.properties}
              <div class="space-y-2 border-l-2 border-muted pl-3">
                {#each Object.entries(s.properties) as [propName, propSchema] (propName)}
                  <div class="text-sm">
                    <div class="flex flex-wrap items-baseline gap-2">
                      <span class="font-mono font-semibold text-primary">
                        {propName}
                      </span>
                      <Badge variant="outline" class="text-xs">
                        {getTypeDisplay(propSchema as any)}
                      </Badge>
                      {#if s.required?.includes(propName)}
                        <Badge variant="destructive" class="text-xs">
                          requis
                        </Badge>
                      {/if}
                      {#if (propSchema as any).$ref}
                        <a
                          href="#{extractRefName((propSchema as any).$ref)}"
                          class="text-xs text-purple-600 hover:underline dark:text-purple-400"
                        >
                          → {extractRefName((propSchema as any).$ref)}
                        </a>
                      {/if}
                    </div>
                    {#if (propSchema as any).description}
                      <p class="mt-1 ml-1 text-xs text-muted-foreground">
                        {(propSchema as any).description}
                      </p>
                    {/if}
                    {#if (propSchema as any).enum}
                      <div class="mt-1 ml-1 text-xs">
                        <span class="text-muted-foreground">Valeurs possibles:</span>
                        <div class="mt-1 flex flex-wrap gap-1">
                          {#each (propSchema as any).enum as enumValue}
                            <Badge variant="secondary" class="font-mono text-xs">
                              {enumValue}
                            </Badge>
                          {/each}
                        </div>
                      </div>
                    {/if}
                    {#if (propSchema as any).type === "object" && (propSchema as any).properties}
                      <div class="mt-2">
                        {@render renderSchemaUI(propSchema)}
                      </div>
                    {/if}
                    {#if (propSchema as any).type === "array" && (propSchema as any).items}
                      {#if (propSchema as any).items.properties}
                        <div class="mt-2">
                          <div class="mb-1 text-xs text-muted-foreground">
                            Éléments du tableau:
                          </div>
                          {@render renderSchemaUI((propSchema as any).items)}
                        </div>
                      {:else if (propSchema as any).items.$ref}
                        <a
                          href="#{extractRefName((propSchema as any).items.$ref)}"
                          class="ml-1 text-xs text-purple-600 hover:underline dark:text-purple-400"
                        >
                          → Voir {extractRefName((propSchema as any).items.$ref)}
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
                    <Badge variant="outline" class="text-xs">{s.type}</Badge>
                  </div>
                {/if}
                {#if s.format}
                  <p class="ml-1 text-xs text-muted-foreground">
                    Format: {s.format}
                  </p>
                {/if}
                {#if s.pattern}
                  <p class="mt-1 ml-1 text-xs text-muted-foreground">
                    Pattern: <code class="font-mono">{s.pattern}</code>
                  </p>
                {/if}
                {#if !s.type && !s.format && !s.pattern}
                  <p class="text-xs italic text-muted-foreground">
                    Schéma sans propriétés définies
                  </p>
                {/if}
              </div>
            {/if}
          {/snippet}
          {@render renderSchemaUI(schema)}
        </AccordionContent>
      </AccordionItem>
    {/each}
  </Accordion>
</div>
