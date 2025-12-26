<script lang="ts">
  interface Props {
    error: string | null | undefined
  }

  let { error }: Props = $props()
</script>

{#if error}
  <div
    class="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
  >
    <strong>Erreur:</strong>
    {error}
  </div>
{/if}
