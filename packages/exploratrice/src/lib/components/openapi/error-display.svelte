<script lang="ts">
  import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert"
  import { AlertCircle } from "@lucide/svelte"

  interface Props {
    error: string | null | undefined
  }

  let { error }: Props = $props()
</script>

{#if error}
  <Alert variant="destructive" class="mb-6">
    <AlertCircle class="h-4 w-4" />
    <AlertTitle>Erreur</AlertTitle>
    <AlertDescription>
      {error}
    </AlertDescription>
  </Alert>
{/if}
