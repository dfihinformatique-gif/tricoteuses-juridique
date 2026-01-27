<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js"
  import ChevronRight from "@lucide/svelte/icons/chevron-right"

  interface SeeAllCardProps {
    class?: string
    href: string
    label: string
  }

  let { class: className, href, label }: SeeAllCardProps = $props()
</script>

<a
  {href}
  class="group block transition-transform hover:scale-[1.02] {className ?? ''}"
>
  <Card.Root
    class="flex h-full items-center justify-center border-2 border-dashed bg-muted/30 hover:border-primary hover:bg-muted/50"
  >
    <Card.Content class="flex items-center gap-2 py-12 text-center">
      <span
        class="text-lg font-semibold text-muted-foreground group-hover:text-primary"
      >
        {label}
      </span>
      <ChevronRight
        class="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
      />
    </Card.Content>
  </Card.Root>
</a>
