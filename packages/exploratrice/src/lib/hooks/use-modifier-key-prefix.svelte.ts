import { browser } from "$app/environment"

export function useModifierKeyPrefix(): { readonly current: string } {
  // Code inspired from
  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform#determining_the_modifier_key_for_the_users_platform
  // and
  // https://github.com/huntabyte/shadcn-svelte/blob/main/docs/src/lib/hooks/use-is-mac.svelte.ts
  const modifierKeyPrefix = $derived(
    browser &&
      (navigator.platform.startsWith("Mac") || navigator.platform === "iPhone")
      ? "⌘" // command key
      : "Ctrl", // control key
  )

  return {
    get current(): string {
      return modifierKeyPrefix
    },
  }
}
