<script lang="ts">
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right"
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js"
  import { localizedHref } from "$lib/i18n.js"
  import * as m from "$lib/paraglide/messages.js"

  type BreadcrumbSegment = {
    label: string
    href?: string
  }

  let { segments }: { segments: BreadcrumbSegment[] } = $props()

  // Toujours inclure "Accueil" comme premier segment
  const fullSegments = $derived([
    { label: m.nav_home(), href: localizedHref("/") },
    ...segments,
  ])
</script>

<nav class="mb-6">
  <Breadcrumb.Root>
    <Breadcrumb.List>
      {#each fullSegments as segment, index (index)}
        <Breadcrumb.Item>
          {#if segment.href !== undefined}
            <Breadcrumb.Link href={localizedHref(segment.href)}>
              {segment.label}
            </Breadcrumb.Link>
          {:else}
            <Breadcrumb.Page>
              {segment.label}
            </Breadcrumb.Page>
          {/if}
        </Breadcrumb.Item>
        {#if index < fullSegments.length - 1}
          <Breadcrumb.Separator>
            <ChevronRightIcon />
          </Breadcrumb.Separator>
        {/if}
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
</nav>
