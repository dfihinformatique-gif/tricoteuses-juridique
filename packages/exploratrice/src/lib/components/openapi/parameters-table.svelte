<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import { resolveParameters } from "$lib/openapi/helpers"

  interface Props {
    parameters:
      | Array<OpenAPIV2.ParameterObject | OpenAPIV2.ReferenceObject>
      | undefined
    openApiSpec: OpenAPIV2.Document
  }

  let { parameters, openApiSpec }: Props = $props()

  const resolvedParams = $derived(resolveParameters(parameters, openApiSpec))
</script>

{#if resolvedParams && resolvedParams.length > 0}
  <div>
    <h4 class="mb-2 font-semibold">Paramètres</h4>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th class="px-3 py-2 text-left">Nom</th>
            <th class="px-3 py-2 text-left">Type</th>
            <th class="px-3 py-2 text-left">Requis</th>
            <th class="px-3 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {#each resolvedParams as param, i (`${param.name || ""}-${param.in || ""}-${i}`)}
            <tr class="border-t border-gray-200 dark:border-gray-700">
              <td class="px-3 py-2 font-mono text-xs">{param.name || "-"}</td>
              <td class="px-3 py-2 text-xs">{param.in || "-"}</td>
              <td class="px-3 py-2 text-xs">{param.required ? "Oui" : "Non"}</td
              >
              <td class="px-3 py-2 text-xs">{param.description || "-"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
