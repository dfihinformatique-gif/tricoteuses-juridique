<script lang="ts">
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import { Search } from "@lucide/svelte"

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
  <Label for="search" class="sr-only">Rechercher</Label>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      id="search"
      type="text"
      bind:value
      {placeholder}
      class="pl-10"
    />
  </div>
</div>
