<script lang="ts">
  import type { Snippet } from "svelte"
  import type { Endpoint } from "$lib/openapi/helpers"

  interface Props {
    title: string
    description: string
    endpoints: Endpoint[]
    colorClass: string
    endpointCard: Snippet<[Endpoint]>
  }

  let { title, description, endpoints, colorClass, endpointCard }: Props =
    $props()
</script>

{#if endpoints.length > 0}
  <section>
    <h2 class="mb-4 text-2xl font-bold {colorClass}">
      {title}
    </h2>
    <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
      {description}
    </p>
    <div class="space-y-4">
      {#each endpoints as endpoint (endpoint.path)}
        {@render endpointCard(endpoint)}
      {/each}
    </div>
  </section>
{/if}
