<script lang="ts">
  import "../app.css"

  import Icon from "@iconify/svelte"
  import chevronDown from "@iconify-icons/codicon/chevron-down"
  import chevronRight from "@iconify-icons/codicon/chevron-right"
  import threeBars from "@iconify-icons/codicon/three-bars"

  import { session } from "$app/stores"

  type MenuItem = MenuItemLink | MenuItemSubMenu

  interface MenuItemBase {
    href?: string
    items?: MenuItemLink[]
    label: string
    title?: string
  }

  interface MenuItemLink extends MenuItemBase {
    href: string
  }

  interface MenuItemSubMenu extends MenuItemBase {
    items: MenuItemLink[]
  }

  const menuItems: MenuItem[] = [
    { href: "/recherche", label: "Recherche" },
    {
      items: [
        { href: "/article", label: "ARTICLE" },
        { href: "/dossier_legislatif", label: "DOSSIER_LEGISLATIF" },
        { href: "/id", label: "ID" },
        { href: "/idcc", label: "IDCC" },
        { href: "/jo", label: "JO" },
        { href: "/section_ta", label: "SECTION_TA" },
        { href: "/texte_version", label: "TEXTE_VERSION" },
        { href: "/textekali", label: "TEXTEKALI" },
        { href: "/textelr", label: "TEXTELR" },
        { href: "/versions", label: "VERSIONS" },
      ],
      label: "Données",
    },
    // {
    //   items: [
    //     { href: "/jo", label: "JO" },
    //   ],
    //   label: "JORF",
    //   title: "Textes publiés au Journal officiel de la République française",
    // },
    // {
    //   items: [
    //     { href: "/article", label: "ARTICLE" },
    //     // { href: "/eli/ids", label: "ID" },
    //     { href: "/section_ta", label: "SECTION_TA" },
    //     { href: "/texte_version", label: "TEXTE_VERSION" },
    //     { href: "/textelr", label: "TEXTELR" },
    //     // { href: "/eli/versions", label: "VERSIONS" },
    //   ],
    //   label: "LEGI",
    //   title: "Codes, lois et règlements consolidés",
    // },
  ]
  const title = $session.title
</script>

<div class="navbar mb-2 bg-neutral text-neutral-content">
  <div class="navbar-start">
    <div class="dropdown">
      <button tabindex="0" class="btn btn-ghost lg:hidden">
        <Icon class="h-5 w-5" icon={threeBars} />
      </button>
      <ul
        tabindex="0"
        class="dropdown-content menu rounded-box menu-compact mt-3 w-52 bg-neutral p-2 text-neutral-content shadow"
      >
        {#each menuItems as { href, items, label, title }}
          {#if href !== undefined}
            <li><a {href} {title}>{label}</a></li>
          {:else if items !== undefined}
            <li tabindex="0">
              <span class="justify-between" {title}>
                {label}
                <Icon class="h-5 w-5" icon={chevronRight} />
              </span>
              <ul class="p-2 bg-neutral text-neutral-content">
                {#each items as { href, label }}
                  <li><a {href} {title}>{label}</a></li>
                {/each}
              </ul>
            </li>
          {/if}
        {/each}
      </ul>
    </div>
    <a class="btn btn-ghost text-xl normal-case" href="/"> {title}</a>
  </div>
  <div class="navbar-center hidden lg:flex">
    <ul class="menu menu-horizontal p-0">
      {#each menuItems as { href, items, label, title }}
        {#if href !== undefined}
          <li><a {href} {title}>{label}</a></li>
        {:else if items !== undefined}
          <li tabindex="0">
            <span class="justify-between" {title}>
              {label}
              <Icon class="h-5 w-5" icon={chevronDown} />
            </span>
            <ul class="p-2 bg-neutral text-neutral-content">
              {#each items as { href, label }}
                <li><a {href} {title}>{label}</a></li>
              {/each}
            </ul>
          </li>
        {/if}
      {/each}
    </ul>
  </div>
  <div class="navbar-end">
    <a
      class="btn"
      href="https://git.en-root.org/tricoteuses/tricoteuses-legal-explorer"
      >Contribuer</a
    >
  </div>
</div>

<div class="mx-auto w-11/12">
  <slot />
</div>
