<script lang="ts">
  import dash from "@iconify-icons/codicon/dash"
  import triangleDown from "@iconify-icons/codicon/triangle-down"
  import triangleRight from "@iconify-icons/codicon/triangle-right"

  import type { Aggregate } from "$lib/aggregates"
  import ArticleView from "$lib/components/ArticleView.svelte"
  import SectionTaView from "$lib/components/SectionTaView.svelte"
  import TexteVersionView from "$lib/components/TexteVersionView.svelte"
  import {
    type LegalObject,
    type LegalObjectType,
    type Lien,
    pathnameFromLegalId,
    rootTypeFromLegalId,
  } from "$lib/legal"

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
  >
    <iconify-icon class="mt-1 inline-block shrink-0" icon={dash} inline />
    <a class="link-hover link-primary link" href={pathnameFromLegalId(id)}>
      {lien["#text"]}
    </a>
  </div>
{:else}
  <div
    class="inline-flex cursor-pointer align-top"
    on:click|stopPropagation={toggle}
    on:keyup|stopPropagation={toggle}
  >
    <iconify-icon
      class="mt-1 inline-block shrink-0"
      icon={open ? triangleDown : triangleRight}
      inline
    />
    {lien["#text"]}
  </div>
  {#if open}
    <div class="ml-2 border-l-4 pl-2">
      <svelte:component
        this={componentAndProperties.component}
        {...componentAndProperties.properties}
      />
    </div>
  {/if}
{/if}
