<script lang="ts">
  import { getTypeDisplay, extractRefName } from "$lib/openapi/helpers"
  import SchemaPropertyRenderer from "./schema-property-renderer.svelte"

  interface Props {
    schema: any
    depth?: number
  }

  let { schema, depth = 0 }: Props = $props()
</script>

{#if schema.properties}
  <div class="space-y-2 border-l-2 border-gray-300 pl-3 dark:border-gray-600">
    {#each Object.entries(schema.properties) as [propName, propSchema]: [string, any] (propName)}
      <div class="text-sm">
        <div class="flex items-baseline gap-2">
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
          {#if schema.required?.includes(propName)}
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
            >
              → {extractRefName(propSchema.$ref)}
            </a>
          {/if}
        </div>
        {#if propSchema.description}
          <p class="mt-1 ml-1 text-xs text-gray-600 dark:text-gray-400">
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
            <SchemaPropertyRenderer schema={propSchema} depth={depth + 1} />
          </div>
        {/if}
        {#if propSchema.type === "array" && propSchema.items}
          {#if propSchema.items.properties}
            <div class="mt-2">
              <div class="mb-1 text-xs text-gray-500">Éléments du tableau:</div>
              <SchemaPropertyRenderer
                schema={propSchema.items}
                depth={depth + 1}
              />
            </div>
          {:else if propSchema.items.$ref}
            <a
              href="#{extractRefName(propSchema.items.$ref)}"
              class="ml-1 text-xs text-purple-600 hover:underline dark:text-purple-400"
            >
              → Voir {extractRefName(propSchema.items.$ref)}
            </a>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
{/if}
