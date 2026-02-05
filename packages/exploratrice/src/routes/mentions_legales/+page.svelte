<script lang="ts">
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import * as Card from "$lib/components/ui/card/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import { Scale, User, Shield, Mail } from "@lucide/svelte/icons"
  import * as m from "$lib/paraglide/messages.js"
</script>

<svelte:head>
  <title>{m.legal_notices_page_title()}</title>
  <meta name="description" content={m.legal_notices_page_description()} />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: m.nav_legal_notices() }]} />

  <header class="mb-12 text-center">
    <div class="mb-4 flex justify-center">
      <div class="rounded-full bg-primary/10 p-4">
        <Scale class="h-12 w-12 text-primary" />
      </div>
    </div>
    <h1 class="mb-4 text-4xl font-bold">{m.legal_notices_title()}</h1>
    <p class="text-xl text-muted-foreground">
      {m.legal_notices_tagline()}
    </p>
  </header>

  <!-- Éditeur et directeur de la publication -->
  <section class="mb-8">
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <User class="h-6 w-6 text-primary" />
          </div>
          <Card.Title class="text-2xl">
            {m.legal_notices_editor_title()}
          </Card.Title>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2 text-muted-foreground">
          <p class="font-semibold text-foreground">
            {m.legal_notices_editor_name()}
          </p>
          <p>{m.legal_notices_editor_address_line1()}</p>
          <p>{m.legal_notices_editor_address_line2()}</p>
          <p>{m.legal_notices_editor_address_line3()}</p>
          <p class="pt-2">
            <span class="font-medium"
              >{m.legal_notices_editor_phone_label()}</span
            >
            <a href="tel:+33781940450" class="text-primary hover:underline">
              {m.legal_notices_editor_phone()}
            </a>
          </p>
          <p>
            <span class="font-medium"
              >{m.legal_notices_editor_email_label()}</span
            >
            <a
              href="mailto:tricoteuse@tricoteuses.fr"
              class="text-primary hover:underline"
            >
              {m.legal_notices_editor_email()}
            </a>
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Protection des données personnelles -->
  <section class="mb-8">
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="rounded-lg bg-primary/10 p-2">
            <Shield class="h-6 w-6 text-primary" />
          </div>
          <Card.Title class="text-2xl">
            {m.legal_notices_data_protection_title()}
          </Card.Title>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="space-y-4 text-muted-foreground">
          <p>
            {m.legal_notices_data_protection_p1()}
          </p>
          <p>
            {m.legal_notices_data_protection_p2_part1()}
            <a
              href="https://git.tricoteuses.fr/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              git.tricoteuses.fr
            </a>{m.legal_notices_data_protection_p2_part2()}
            <a
              href="https://git.tricoteuses.fr/user/settings"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              {m.legal_notices_data_protection_p2_manage()}
            </a>
            {m.legal_notices_data_protection_p2_part3()}
            <a
              href="https://git.tricoteuses.fr/user/settings/account"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              {m.legal_notices_data_protection_p2_delete()}
            </a>.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Contact DPO -->
  <section class="mb-8">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Content class="py-8 text-center">
        <div class="mb-4 flex justify-center">
          <div class="rounded-full bg-primary/10 p-3">
            <Mail class="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 class="mb-4 text-xl font-bold">
          {m.legal_notices_dpo_question_title()}
        </h2>
        <p class="mb-6 text-muted-foreground">
          {m.legal_notices_dpo_description()}
        </p>
        <Button href="mailto:dpo@tricoteuses.fr" variant="default" size="lg">
          <Mail class="mr-2 h-4 w-4" />
          {m.legal_notices_dpo_button()}
        </Button>
      </Card.Content>
    </Card.Root>
  </section>
</div>
