<script lang="ts">
  import type { OpenGraphMetadata } from "$lib/opengraph.js"

  interface Props {
    metadata: OpenGraphMetadata
  }

  let { metadata }: Props = $props()
</script>

<svelte:head>
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={metadata.type} />
  <meta property="og:title" content={metadata.title} />
  <meta property="og:description" content={metadata.description} />
  {#if metadata.url}
    <meta property="og:url" content={metadata.url} />
  {/if}
  {#if metadata.image}
    <meta property="og:image" content={metadata.image} />
  {/if}
  {#if metadata.imageAlt}
    <meta property="og:image:alt" content={metadata.imageAlt} />
  {/if}
  {#if metadata.siteName}
    <meta property="og:site_name" content={metadata.siteName} />
  {/if}
  {#if metadata.locale}
    <meta property="og:locale" content={metadata.locale} />
  {/if}

  <!-- Article metadata -->
  {#if metadata.article}
    {#if metadata.article.publishedTime}
      <meta property="article:published_time" content={metadata.article.publishedTime} />
    {/if}
    {#if metadata.article.modifiedTime}
      <meta property="article:modified_time" content={metadata.article.modifiedTime} />
    {/if}
    {#if metadata.article.author}
      <meta property="article:author" content={metadata.article.author} />
    {/if}
    {#if metadata.article.section}
      <meta property="article:section" content={metadata.article.section} />
    {/if}
    {#if metadata.article.tag}
      {#each metadata.article.tag as tag}
        <meta property="article:tag" content={tag} />
      {/each}
    {/if}
  {/if}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={metadata.title} />
  <meta name="twitter:description" content={metadata.description} />
  {#if metadata.image}
    <meta name="twitter:image" content={metadata.image} />
  {/if}
  {#if metadata.imageAlt}
    <meta name="twitter:image:alt" content={metadata.imageAlt} />
  {/if}

  <!-- Standard meta tags -->
  <title>{metadata.title}</title>
  <meta name="description" content={metadata.description} />
</svelte:head>
