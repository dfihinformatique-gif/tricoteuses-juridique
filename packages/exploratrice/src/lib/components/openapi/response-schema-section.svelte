<script lang="ts">
  import SchemaPropertyRenderer from "./schema-property-renderer.svelte"

  interface Props {
    schema: any
    commonIdFieldName?: string
  }

  let { schema, commonIdFieldName = "uid" }: Props = $props()
</script>

{#if schema}
  <div>
    <h4 class="mb-2 font-semibold">Structure de la réponse</h4>

    <!-- Common response fields -->
    <div
      class="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
    >
      <h5 class="mb-3 text-sm font-semibold">
        Champs communs (tous les endpoints)
      </h5>
      <div
        class="space-y-2 border-l-2 border-gray-300 pl-3 dark:border-gray-600"
      >
        <div class="text-sm">
          <div class="flex items-baseline gap-2">
            <span
              class="font-mono font-semibold text-blue-600 dark:text-blue-400"
            >
              {commonIdFieldName}
            </span>
            <span
              class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
            >
              string
            </span>
            <span
              class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              requis
            </span>
          </div>
          <p class="mt-1 ml-1 text-xs text-gray-600 dark:text-gray-400">
            Identifiant unique de l'enregistrement
          </p>
        </div>

        <div class="text-sm">
          <div class="flex items-baseline gap-2">
            <span
              class="font-mono font-semibold text-blue-600 dark:text-blue-400"
            >
              data
            </span>
            <span
              class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700"
            >
              object
            </span>
            <span
              class="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400"
            >
              requis
            </span>
          </div>
          <p class="mt-1 ml-1 text-xs text-gray-600 dark:text-gray-400">
            Données JSON contenant les informations détaillées (voir ci-dessous)
          </p>
        </div>
      </div>
    </div>

    <div>
      <h5 class="mb-2 text-sm font-semibold">
        Structure détaillée du champ "data"
      </h5>

      {#if schema.oneOf}
        <!-- Multiple possible schemas -->
        <div class="mb-3 flex items-baseline gap-2">
          <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
            data
          </span>
          <span class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
            oneOf
          </span>
        </div>
        <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Ce champ peut contenir l'un des types suivants :
        </p>
        {#each schema.oneOf as subSchema, idx (idx)}
          <div
            class="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <h6 class="mb-2 flex items-center gap-2 text-base font-semibold">
              <span>{subSchema.title || "Type " + (idx + 1)}</span>
              {#if subSchema.title}
                <a
                  href="#{subSchema.title}"
                  class="text-sm text-purple-600 hover:underline dark:text-purple-400"
                >
                  → Voir le schéma complet
                </a>
              {/if}
            </h6>
            {#if subSchema.description}
              <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {subSchema.description}
              </p>
            {/if}
            <SchemaPropertyRenderer schema={subSchema} />
          </div>
        {/each}
      {:else}
        <!-- Single schema -->
        <div class="mb-3">
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
              data
            </span>
            <span class="rounded bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
              {schema.type || 'object'}
            </span>
            {#if schema.title}
              <span class="text-sm text-gray-600 dark:text-gray-400">
                ({schema.title})
              </span>
            {/if}
          </div>
          {#if schema.description}
            <p class="mt-1 ml-1 text-sm text-gray-600 dark:text-gray-400">
              {schema.description}
            </p>
          {/if}
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <SchemaPropertyRenderer {schema} />
        </div>
      {/if}
    </div>
  </div>
{/if}
