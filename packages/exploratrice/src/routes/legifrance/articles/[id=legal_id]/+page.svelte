<script lang="ts">
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"

  import * as Alert from "$lib/components/ui/alert/index.js"

  import { queryArticlePageInfos } from "../../article.remote.js"
  import Article from "../../article.svelte"

  let { params } = $props()

  const articlePageInfos = $derived(await queryArticlePageInfos(params.id))
  let displayMode: "links" | "references" = $state("links")
  let showIds = $state(false)
</script>

{#if articlePageInfos === undefined}
  <Alert.Root class="mx-auto w-fit max-w-xl" variant="destructive">
    <AlertCircleIcon />
    <Alert.Title>Article {params.id} non trouvé !</Alert.Title>
  </Alert.Root>
{:else}
  <Article {articlePageInfos} bind:displayMode bind:showIds />
{/if}
