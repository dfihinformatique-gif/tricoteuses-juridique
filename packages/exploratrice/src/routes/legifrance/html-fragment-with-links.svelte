<script lang="ts">
  import { page } from "$app/state"
  import { cleanHtmlContenu } from "$lib/strings"

  const {
    fragment,
  }: {
    fragment: string
  } = $props()

  const linkUrlOriginReplacement = $derived(page.data.linkUrlOriginReplacement)
</script>

{@html cleanHtmlContenu(
  linkUrlOriginReplacement === undefined
    ? fragment
    : fragment.replaceAll("https://tricoteuses.fr", linkUrlOriginReplacement),
)}
