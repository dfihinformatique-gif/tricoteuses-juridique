<script lang="ts">
  import Minus from "@lucide/svelte/icons/minus"
  import Triangle from "@lucide/svelte/icons/triangle"

  import type { Aggregate } from "$lib/aggregates.js"
  import ArticleView from "$lib/components/ArticleView.svelte"
  import SectionTaView from "$lib/components/SectionTaView.svelte"
  import TexteVersionView from "$lib/components/TexteVersionView.svelte"
  import {
    type Article,
    type LegalObject,
    type LegalObjectType,
    type Lien,
    pathnameFromLegalId,
    rootTypeFromLegalId,
    type SectionTa,
    type TexteVersion,
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
  ):
    | {
        component: typeof ArticleView
        properties: {
          article: Article | undefined
          data: Aggregate
          level: number
        }
      }
    | {
        component: typeof SectionTaView
        properties: {
          data: Aggregate
          level: number
          sectionTa: SectionTa | undefined
        }
      }
    | {
        component: typeof TexteVersionView
        properties: {
          data: Aggregate
          level: number
          texteVersion: LegalObject | undefined
        }
      }
    | undefined {
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
          properties: { article: target as Article, data, level },
        }
      case "section_ta":
        return {
          component: SectionTaView,
          properties: { data, level, sectionTa: target as SectionTa },
        }
      case "texte_version":
        return {
          component: TexteVersionView,
          properties: { data, level, texteVersion: target as TexteVersion },
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
    <div class="ml-2 border-l-4 pl-2">
      <componentAndProperties.component
        {...componentAndProperties.properties}
      />
    </div>
  {/if}
{/if}
