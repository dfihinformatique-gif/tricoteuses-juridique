<script lang="ts">
  interface Props {
    searchQuery: string
  }

  let { searchQuery }: Props = $props()
</script>

<div class="py-12 text-center text-gray-500">
  <p>Aucun endpoint trouvé pour la recherche "{searchQuery}"</p>
</div>
