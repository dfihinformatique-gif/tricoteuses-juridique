<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import CheckCircleIcon from "@lucide/svelte/icons/check-circle"
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle"
  import InfoIcon from "@lucide/svelte/icons/info"
  import BookOpenIcon from "@lucide/svelte/icons/book-open"
  import ScaleIcon from "@lucide/svelte/icons/scale"
  import MailIcon from "@lucide/svelte/icons/mail"
  import * as m from "$lib/paraglide/messages.js"
</script>

<svelte:head>
  <title>{m.license_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.license_odbl_breadcrumb() }]} />

  <!-- Hero Section -->
  <header class="mb-12 text-center">
    <h1 class="mb-4 text-4xl font-bold">{m.license_title()}</h1>
    <p class="text-xl text-muted-foreground">
      {m.license_tagline()}
    </p>
  </header>

  <!-- Introduction -->
  <section class="mb-12">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <ScaleIcon class="h-6 w-6 text-primary" />
          </div>
          <Card.Title class="text-xl">{m.license_intro_title()}</Card.Title>
        </div>
      </Card.Header>
      <Card.Content>
        <p class="text-lg leading-relaxed">
          {@html m.license_intro_description()}
        </p>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Qu'est-ce que l'ODbL -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.license_what_is_odbl_title()}</h2>
    <Card.Root>
      <Card.Content class="py-6">
        <p class="text-lg leading-relaxed text-muted-foreground">
          {m.license_what_is_odbl_description()}
        </p>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Permissions -->
  <section class="mb-12">
    <h2 class="mb-4 text-3xl font-bold">{m.license_permissions_title()}</h2>
    <p class="mb-6 text-lg text-muted-foreground">
      {m.license_permissions_subtitle()}
    </p>
    <div class="space-y-4">
      <!-- Utiliser -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <CheckCircleIcon class="h-5 w-5 text-green-600" />
            <Card.Title class="text-lg"
              >{m.license_permission_use_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_permission_use_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Partager -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <CheckCircleIcon class="h-5 w-5 text-green-600" />
            <Card.Title class="text-lg"
              >{m.license_permission_share_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_permission_share_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Adapter -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <CheckCircleIcon class="h-5 w-5 text-green-600" />
            <Card.Title class="text-lg"
              >{m.license_permission_adapt_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_permission_adapt_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Usage commercial -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <CheckCircleIcon class="h-5 w-5 text-green-600" />
            <Card.Title class="text-lg"
              >{m.license_permission_commercial_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_permission_commercial_description()}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Obligations -->
  <section class="mb-12">
    <h2 class="mb-4 text-3xl font-bold">{m.license_obligations_title()}</h2>
    <p class="mb-6 text-lg text-muted-foreground">
      {m.license_obligations_subtitle()}
    </p>
    <div class="space-y-4">
      <!-- Attribution -->
      <Card.Root
        class="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
      >
        <Card.Header>
          <div class="flex items-center gap-3">
            <AlertCircleIcon class="h-5 w-5 text-orange-600" />
            <Card.Title class="text-lg"
              >{m.license_obligation_attribution_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_obligation_attribution_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Share-Alike -->
      <Card.Root
        class="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
      >
        <Card.Header>
          <div class="flex items-center gap-3">
            <AlertCircleIcon class="h-5 w-5 text-orange-600" />
            <Card.Title class="text-lg"
              >{m.license_obligation_sharealike_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_obligation_sharealike_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Maintenir l'ouverture -->
      <Card.Root
        class="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
      >
        <Card.Header>
          <div class="flex items-center gap-3">
            <AlertCircleIcon class="h-5 w-5 text-orange-600" />
            <Card.Title class="text-lg"
              >{m.license_obligation_open_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_obligation_open_description()}
          </p>
        </Card.Content>
      </Card.Root>

      <!-- Conserver les mentions -->
      <Card.Root
        class="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"
      >
        <Card.Header>
          <div class="flex items-center gap-3">
            <AlertCircleIcon class="h-5 w-5 text-orange-600" />
            <Card.Title class="text-lg"
              >{m.license_obligation_notice_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            {m.license_obligation_notice_description()}
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Points importants -->
  <section class="mb-12">
    <Card.Root
      class="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20"
    >
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
            <InfoIcon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <Card.Title class="text-xl">{m.license_important_title()}</Card.Title>
        </div>
      </Card.Header>
      <Card.Content>
        <ul class="space-y-3 text-muted-foreground">
          <li class="flex gap-3">
            <span class="mt-1 text-blue-600 dark:text-blue-400">•</span>
            <span>{@html m.license_important_point1()}</span>
          </li>
          <li class="flex gap-3">
            <span class="mt-1 text-blue-600 dark:text-blue-400">•</span>
            <span>{@html m.license_important_point2()}</span>
          </li>
          <li class="flex gap-3">
            <span class="mt-1 text-blue-600 dark:text-blue-400">•</span>
            <span>{@html m.license_important_point3()}</span>
          </li>
        </ul>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Licences commerciales -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.license_commercial_title()}</h2>
    <Card.Root
      class="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
    >
      <Card.Content class="py-8">
        <p class="mb-6 text-lg leading-relaxed">
          {@html m.license_commercial_description()}
        </p>

        <div class="mb-6">
          <h3 class="mb-4 text-xl font-semibold">
            {m.license_commercial_benefits_title()}
          </h3>
          <ul class="space-y-2">
            <li class="flex items-start gap-3">
              <CheckCircleIcon
                class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
              />
              <span>{m.license_commercial_benefit1()}</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckCircleIcon
                class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
              />
              <span>{m.license_commercial_benefit2()}</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckCircleIcon
                class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
              />
              <span>{m.license_commercial_benefit3()}</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckCircleIcon
                class="mt-0.5 h-5 w-5 flex-shrink-0 text-primary"
              />
              <span>{m.license_commercial_benefit4()}</span>
            </li>
          </ul>
        </div>

        <div class="rounded-lg border border-primary/20 bg-background/50 p-6">
          <h3 class="mb-3 text-lg font-semibold">
            {m.license_commercial_contact_title()}
          </h3>
          <p class="mb-4 text-muted-foreground">
            {m.license_commercial_contact_description()}
          </p>
          <Button
            href="https://code4code.eu/tarifs"
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            class="w-full sm:w-auto"
          >
            {m.license_commercial_contact_button()}
            <ExternalLinkIcon class="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Ressources -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">{m.license_resources_title()}</h2>
    <div class="space-y-4">
      <!-- Texte officiel -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <BookOpenIcon class="h-5 w-5 text-primary" />
            </div>
            <Card.Title class="text-lg"
              >{m.license_resources_official_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="mb-4 text-muted-foreground">
            {m.license_resources_official_description()}
          </p>
          <Button
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            {m.license_resources_official_link()}
            <ExternalLinkIcon class="ml-2 h-4 w-4" />
          </Button>
        </Card.Content>
      </Card.Root>

      <!-- Résumé lisible -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <InfoIcon class="h-5 w-5 text-primary" />
            </div>
            <Card.Title class="text-lg"
              >{m.license_resources_summary_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="mb-4 text-muted-foreground">
            {m.license_resources_summary_description()}
          </p>
          <Button
            href="https://opendatacommons.org/licenses/odbl/summary/"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            {m.license_resources_summary_link()}
            <ExternalLinkIcon class="ml-2 h-4 w-4" />
          </Button>
        </Card.Content>
      </Card.Root>

      <!-- FAQ -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <InfoIcon class="h-5 w-5 text-primary" />
            </div>
            <Card.Title class="text-lg"
              >{m.license_resources_faq_title()}</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="mb-4 text-muted-foreground">
            {m.license_resources_faq_description()}
          </p>
          <Button
            href="https://opendatacommons.org/faq/licenses/"
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
          >
            {m.license_resources_faq_link()}
            <ExternalLinkIcon class="ml-2 h-4 w-4" />
          </Button>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- Contact -->
  <section class="mb-12">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Content class="py-8 text-center">
        <div class="mb-4 flex justify-center">
          <div class="rounded-full bg-primary/10 p-4">
            <MailIcon class="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 class="mb-4 text-2xl font-bold">{m.license_contact_title()}</h2>
        <p class="mb-6 text-muted-foreground">
          {m.license_contact_description()}
        </p>
        <Button href="/a_propos" size="lg">
          {m.license_contact_button()}
        </Button>
      </Card.Content>
    </Card.Root>
  </section>
</div>
