<script lang="ts">
  import type { AuditSwitchError } from "@auditors/core"

  import { realErrorFromError } from "./errors"

  export let error: unknown
  export let frame = true
  export let hideError = false

  $: realError = realErrorFromError(error)

  function asAuditSwitchError(value: unknown) {
    return value as AuditSwitchError
  }

  function asObject(value: unknown) {
    return value as { [key: string]: unknown }
  }

  function changeSwitchIndex({ target }: Event) {
    const { value } = target as HTMLSelectElement
    error = {
      ...asAuditSwitchError(error),
      index: parseInt(value),
    }
  }
</script>

{#if realError !== error}
  {@const switchError = asAuditSwitchError(error)}
  <div class="form-control">
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="label">
      <span class="label-text">Alternative Errors:</span>
    </label>
    <select
      class="select-bordered select w-full max-w-xs"
      on:blur={changeSwitchIndex}
      on:change={changeSwitchIndex}
      value={switchError.index}
    >
      {#each switchError.errors as _, index}
        <option value={index}>Alternative {index + 1}</option>
      {/each}
    </select>
  </div>
{/if}
{#if !hideError}
  {#if realError !== null && typeof realError === "object"}
    <ul class={frame ? "list-inside list-disc pl-4" : null}>
      {#each Object.entries(asObject(error)) as [itemKey, itemError]}
        <li>
          <span>{itemKey}:</span>
          <svelte:self error={itemError} />
        </li>
      {/each}
    </ul>
  {:else if realError != null}
    <span>{realError}</span>
  {/if}
{/if}
