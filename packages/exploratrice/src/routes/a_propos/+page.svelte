<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import BookOpenIcon from "@lucide/svelte/icons/book-open"
  import CodeIcon from "@lucide/svelte/icons/code"
  import ServerIcon from "@lucide/svelte/icons/server"
  import UsersIcon from "@lucide/svelte/icons/users"
  import MailIcon from "@lucide/svelte/icons/mail"
  import * as m from "$lib/paraglide/messages.js"
</script>

<svelte:head>
  <title>{m.about_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.nav_about() }]} />

  <!-- Hero Section -->
  <header class="mb-12 text-center">
    <h1 class="mb-4 text-4xl font-bold">{m.about_title()}</h1>
    <p class="text-xl text-muted-foreground">
      {m.about_tagline()}
    </p>
  </header>

  <!-- Présentation générale -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.about_presentation_title()}</h2>
    <Card.Root>
      <Card.Content class="py-6">
        <div class="space-y-4 text-lg leading-relaxed">
          <p>
            {@html m.about_presentation_p1()}
          </p>
          <p>
            {m.about_presentation_p2()}
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Nos principes -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.about_principles_title()}</h2>
    <div class="space-y-6">
      <!-- Des données ouvertes -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <BookOpenIcon class="h-6 w-6 text-primary" />
            </div>
            <Card.Title class="text-xl"
              >{m.about_principles_opendata_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.about_principles_opendata_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Du code libre -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <CodeIcon class="h-6 w-6 text-primary" />
            </div>
            <Card.Title class="text-xl"
              >{m.about_principles_opensource_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.about_principles_opensource_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Une infrastructure souveraine -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <ServerIcon class="h-6 w-6 text-primary" />
            </div>
            <Card.Title class="text-xl"
              >{m.about_principles_sovereign_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.about_principles_sovereign_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Une gouvernance transparente -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <UsersIcon class="h-6 w-6 text-primary" />
            </div>
            <Card.Title class="text-xl"
              >{m.about_principles_governance_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.about_principles_governance_description()}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- En savoir plus -->
  <section class="mb-12">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Content class="py-8 text-center">
        <h2 class="mb-4 text-2xl font-bold">{m.about_learn_more_title()}</h2>
        <p class="mb-6 text-muted-foreground">
          {m.about_learn_more_description()}
        </p>
        <Button
          href="https://git.tricoteuses.fr/tricoteuses/a_propos"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
        >
          {m.about_learn_more_button()}
          <ExternalLinkIcon class="ml-2 h-4 w-4" />
        </Button>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Contact -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.about_contact_title()}</h2>
    <div class="grid gap-6 md:grid-cols-2">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <UsersIcon class="h-5 w-5" />
            {m.about_contact_matrix()}
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <a
            href="https://matrix.to/#/@tricoteuses:tricoteuses.fr"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            @tricoteuses:tricoteuses.fr
          </a>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <MailIcon class="h-5 w-5" />
            {m.about_contact_email()}
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <a
            href="mailto:tricoteuses@tricoteuses.fr"
            class="text-primary hover:underline"
          >
            tricoteuses@tricoteuses.fr
          </a>
        </Card.Content>
      </Card.Root>

      <Card.Root class="md:col-span-2">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <CodeIcon class="h-5 w-5" />
            {m.about_contact_git_forge()}
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <a
            href="https://git.tricoteuses.fr"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center text-primary hover:underline"
          >
            git.tricoteuses.fr
            <ExternalLinkIcon class="ml-1 h-3 w-3" />
          </a>
        </Card.Content>
      </Card.Root>
    </div>
  </section>
</div>
