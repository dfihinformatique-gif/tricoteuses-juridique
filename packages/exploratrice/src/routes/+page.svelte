<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import ExternalProjectCard from "$lib/components/external-project-card.svelte"
  import ReuseCard from "$lib/components/reuse-card.svelte"
  import SeeAllCard from "$lib/components/see-all-card.svelte"
  import ServiceCard from "$lib/components/service-card.svelte"
  import {
    dataServices,
    externalProjects,
    reuses,
  } from "$lib/data/tricoteuses-ecosystem.js"
  import { localizedHref } from "$lib/i18n.js"
  import ChevronRight from "@lucide/svelte/icons/chevron-right"
  import { onDestroy, onMount } from "svelte"
  import * as m from "$lib/paraglide/messages.js"

  const featuredServices = Object.values(dataServices).filter((s) => s.featured)
  const featuredExternalReuses = Object.values(reuses).filter(
    (r) => r.type === "external" && r.featured,
  )
  const featuredDemos = Object.values(reuses).filter(
    (r) => r.type === "demo" && r.featured,
  )
  const featuredExternalProjects = externalProjects.filter((p) => p.featured)

  let intervalId: NodeJS.Timeout | undefined = $state(undefined)
  let tagline = $state("")
  let taglineIndex = 0
  const taglines = $derived([
    "",
    m.home_tagline_git(),
    m.home_tagline_databases(),
    m.home_tagline_api(),
    m.home_tagline_ai(),
    m.home_tagline_links(),
    m.home_tagline_diffs(),
    m.home_tagline_making(),
    m.home_tagline_opendata(),
    m.home_tagline_opensource(),
    m.home_tagline_realtime(),
  ])

  onMount(() => {
    intervalId = setInterval(() => {
      taglineIndex++
      if (taglineIndex >= taglines.length) {
        taglineIndex = 0
      }
      tagline = taglines[taglineIndex]
    }, 3000)
  })

  onDestroy(() => {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
    }
  })
</script>

<svelte:head>
  <title>{m.site_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <!-- Hero Section -->
  <header class="mb-16 text-center">
    <h1 class="mb-4 text-5xl font-bold">
      {m.site_name()}<span class="text-primary italic">{tagline}</span>
    </h1>
    <p class="mx-auto max-w-3xl text-xl text-muted-foreground">
      {m.home_hero_description()}
      <a
        href={localizedHref("/a_propos")}
        class="ml-1 text-sm underline-offset-4 hover:underline"
      >
        {m.home_hero_learn_more()}
      </a>
    </p>
  </header>

  <!-- Services Section -->
  <section class="mb-16">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h2 class="mb-2 text-3xl font-bold">{m.home_services_title()}</h2>
        <p class="text-muted-foreground">
          {m.home_services_description()}
        </p>
      </div>
      <Button href={localizedHref("/services")} variant="outline">
        {m.home_services_see_all()}
        <ChevronRight class="ml-2 h-4 w-4" />
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each featuredServices as service (service.id)}
        <ServiceCard {service} />
      {/each}
      <SeeAllCard
        href={localizedHref("/services")}
        label={m.home_services_see_all()}
      />
    </div>
  </section>

  <!-- Reuses Section -->
  <section class="mb-16">
    <div class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="mb-2 text-3xl font-bold">{m.home_reuses_title()}</h2>
          <p class="text-muted-foreground">
            {m.home_reuses_description()}
          </p>
        </div>
        <Button href={localizedHref("/reutilisations")} variant="outline">
          {m.home_reuses_see_all()}
          <ChevronRight class="ml-2 h-4 w-4" />
        </Button>
      </div>

      <!-- External Reuses -->
      {#if featuredExternalReuses.length > 0}
        <h3 class="mb-4 text-xl font-semibold">{m.home_reuses_external()}</h3>
        <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {#each featuredExternalReuses as reuse (reuse.id)}
            <ReuseCard {reuse} />
          {/each}
          <SeeAllCard
            href={localizedHref("/reutilisations")}
            label={m.home_reuses_see_all()}
          />
        </div>
      {/if}

      <!-- Demos -->
      {#if featuredDemos.length > 0}
        <h3 class="mb-4 text-xl font-semibold">{m.home_reuses_demos()}</h3>
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {#each featuredDemos as reuse (reuse.id)}
            <ReuseCard {reuse} />
          {/each}
          <SeeAllCard
            href={localizedHref("/reutilisations")}
            label={m.home_reuses_see_all()}
          />
        </div>
      {/if}
    </div>
  </section>

  <!-- External Projects Section -->
  <section class="mb-16">
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h2 class="mb-2 text-3xl font-bold">
          {m.home_external_projects_title()}
        </h2>
        <p class="text-muted-foreground">
          {m.home_external_projects_description()}
        </p>
      </div>
      <Button href={localizedHref("/projets_externes")} variant="outline">
        {m.home_external_projects_see_all()}
        <ChevronRight class="ml-2 h-4 w-4" />
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {#each featuredExternalProjects as project (project.id)}
        <ExternalProjectCard {project} />
      {/each}
      <SeeAllCard
        href={localizedHref("/projets_externes")}
        label={m.home_external_projects_see_all()}
      />
    </div>
  </section>

  <!-- CTA Section -->
  <section class="rounded-lg border bg-muted p-8 text-center">
    <h2 class="mb-4 text-2xl font-bold">
      {m.home_cta_title()}
    </h2>
    <p class="mb-6 text-muted-foreground">
      {m.home_cta_description()}
    </p>
    <Button href={localizedHref("/reutilisations/proposer")} size="lg">
      {m.home_cta_button()}
      <ChevronRight class="ml-2 h-4 w-4" />
    </Button>
  </section>
</div>
