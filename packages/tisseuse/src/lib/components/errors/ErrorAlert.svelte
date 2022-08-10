<script lang="ts">
  import Icon from "@iconify/svelte"
  import errorIcon from "@iconify-icons/codicon/error"

  import { realErrorFromError } from "./errors"
  import ErrorValue from "./ErrorValue.svelte"

  export let error: unknown
  export let hideError = false

  $: realError = realErrorFromError(error)
</script>

{#if realError !== error || (!hideError && realError != null)}
  <div class="alert alert-error">
    <div class="flex-1">
      <Icon class="mr-1" icon={errorIcon} />
      <ErrorValue bind:error frame={false} {hideError} />
    </div>
  </div>
{/if}
