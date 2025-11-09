import type { Snippet } from "svelte"

class MainMenu {
  pageSpecificMenuItem: Snippet | undefined = $state(undefined)
}

export const mainMenu = new MainMenu()
