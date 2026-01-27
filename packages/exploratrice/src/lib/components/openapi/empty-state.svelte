<script lang="ts">
  import { Alert, AlertDescription } from "$lib/components/ui/alert"
  import SearchX from "@lucide/svelte/icons/search-x"

  interface Props {
    searchQuery: string
  }

  let { searchQuery }: Props = $props()
</script>

<Alert class="my-12">
  <SearchX class="h-4 w-4" />
  <AlertDescription class="ml-2">
    Aucun endpoint trouvé pour la recherche "{searchQuery}"
  </AlertDescription>
</Alert>
