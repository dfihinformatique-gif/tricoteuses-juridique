<script lang="ts">
  import { getTypeDisplay, extractRefName } from "$lib/openapi/helpers"
  import { Badge } from "$lib/components/ui/badge"
  import FormattedDescription from "./formatted-description.svelte"
  import SchemaPropertyRenderer from "./schema-property-renderer.svelte"

  interface Props {
    schema: any
    depth?: number
  }

  let { schema, depth = 0 }: Props = $props()
</script>

{#if schema.properties}
  <div class="space-y-2 border-l-2 border-muted pl-3">
    {#each Object.entries(schema.properties) as [propName, propSchema] (propName)}
      <div class="text-sm">
        <div class="flex items-baseline gap-2">
          <span class="font-mono font-semibold text-primary">
            {propName}
          </span>
          <Badge variant="outline" class="text-xs">
            {getTypeDisplay(propSchema as any)}
          </Badge>
          {#if schema.required?.includes(propName)}
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
          <div class="mt-1 ml-1">
            <FormattedDescription
              description={(propSchema as any).description}
              class="text-xs text-muted-foreground"
            />
          </div>
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
            <SchemaPropertyRenderer schema={propSchema} depth={depth + 1} />
          </div>
        {/if}
        {#if (propSchema as any).type === "array" && (propSchema as any).items}
          {#if (propSchema as any).items.properties}
            <div class="mt-2">
              <div class="mb-1 text-xs text-muted-foreground">Éléments du tableau:</div>
              <SchemaPropertyRenderer
                schema={(propSchema as any).items}
                depth={depth + 1}
              />
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
{/if}
