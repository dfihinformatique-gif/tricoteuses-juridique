<script lang="ts">
  interface Props {
    value: string
    placeholder?: string
  }

  let {
    value = $bindable(),
    placeholder = "Rechercher un endpoint...",
  }: Props = $props()
</script>

<div class="mb-6">
  <input
    type="text"
    bind:value
    {placeholder}
    class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
  />
</div>
