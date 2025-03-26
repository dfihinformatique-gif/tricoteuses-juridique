<script lang="ts">
  import { Minus, Triangle } from "lucide-svelte"

  import type { Aggregate } from "$lib/aggregates.js"
  import ArticleView from "$lib/components/ArticleView.svelte"
  import SectionTaView from "$lib/components/SectionTaView.svelte"
  import TexteVersionView from "$lib/components/TexteVersionView.svelte"
  import {
    type LegalObject,
    type LegalObjectType,
    type Lien,
    pathnameFromLegalId,
    rootTypeFromLegalId,
  } from "$lib/legal/index.js"

  export let data: Aggregate
  export let level = 1
  export let lien: Lien

  let open = false

  $: id = lien["@id"]
  $: rootType = rootTypeFromLegalId(id)
  $: componentAndProperties = componentAndPropertiesFromTypeAndTarget(rootType)

  function toggle() {
    open = !open
  }

  function componentAndPropertiesFromTypeAndTarget(
    type: LegalObjectType | undefined,
  ) {
    if (type === undefined) {
      return undefined
    }
    const target =
      rootType === undefined
        ? undefined
        : (data[rootType] as { [id: string]: LegalObject })?.[id]
    switch (type) {
      case "article":
        return {
          component: ArticleView,
          properties: { article: target, data, level },
        }
      case "section_ta":
        return {
          component: SectionTaView,
          properties: { data, level, sectionTa: target },
        }
      case "texte_version":
        return {
          component: TexteVersionView,
          properties: { data, level, texteVersion: target },
        }
      default:
        return undefined
    }
  }
</script>

{#if componentAndProperties === undefined}
  <div
    class="inline-flex align-top"
    on:click|stopPropagation={toggle}
    on:keyup|stopPropagation={toggle}
    role="button"
    tabindex="-1"
  >
    <Minus class="mr-1 mt-0.5 w-3 flex-none shrink-0" />
    <a
      class="text-blue-500 underline hover:decoration-2"
      href={pathnameFromLegalId(id)}
    >
      {lien["#text"]}
    </a>
  </div>
{:else}
  <div
    class="inline-flex cursor-pointer align-top"
    on:click|stopPropagation={toggle}
    on:keyup|stopPropagation={toggle}
    role="button"
    tabindex="-1"
  >
    <Triangle
      class="mr-1 mt-0.5 w-3 flex-none"
      fill="currentColor"
      transform="rotate({open ? 180 : 90})"
    />
    {lien["#text"]}
  </div>
  {#if open}
    <div
      class="ml-2 border-l-4 pl-2"
      <svelte:component
      this={componentAndProperties.component}
      {...componentAndProperties.properties}
    ></div>
  {/if}
{/if}
