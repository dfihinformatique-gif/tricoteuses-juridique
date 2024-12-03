<script lang="ts">
  import { CircleX } from "lucide-svelte"

  import { realErrorFromError } from "./errors"
  import ErrorValue from "./ErrorValue.svelte"

  export let error: unknown
  export let hideError = false

  $: realError = realErrorFromError(error)
</script>

{#if realError !== error || (!hideError && realError != null)}
  <div class="alert alert-error">
    <div class="flex-1">
      <CircleX class="mr-1" />
      <ErrorValue bind:error frame={false} {hideError} />
    </div>
  </div>
{/if}
