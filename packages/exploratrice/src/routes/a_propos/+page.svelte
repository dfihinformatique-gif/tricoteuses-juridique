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
</script>

<svelte:head>
  <title>À propos de Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: "À propos" }]} />

  <!-- Hero Section -->
  <header class="mb-12 text-center">
    <h1 class="mb-4 text-4xl font-bold">Tricoteuses</h1>
    <p class="text-xl text-muted-foreground">
      La loi française accessible à toutes et tous
    </p>
  </header>

  <!-- Présentation générale -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">Présentation générale</h2>
    <Card.Root>
      <Card.Content class="py-6">
        <div class="space-y-4 text-lg leading-relaxed">
          <p>
            <strong>Tricoteuses</strong> est une
            <strong>initiative citoyenne</strong>
            qui propose des outils pour <strong>faciliter l'accès</strong> aux
            données ouvertes relatives à <strong>la loi française</strong>,
            qu'il s'agisse de « la loi telle qu'elle se fabrique » (Assemblée et
            Sénat) ou de « la loi telle qu'elle existe » (Journal officiel,
            codes consolidés, Constitution).
          </p>
          <p>
            Nous nous appuyons sur les données ouvertes grâce à la Loi pour une
            République numérique de 2016 et aux efforts combinés des
            institutions (dont l'Assemblée Nationale, le Sénat et la DILA) et
            des initiatives citoyennes (en particulier l'association Regards
            citoyens), qui ont abouti à la mise en place d'un Open Data
            d'envergure et pérenne.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Nos principes -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">Nos principes</h2>
    <div class="space-y-6">
      <!-- Des données ouvertes -->
      <Card.Root>
        <Card.Header>
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-primary/10 p-2">
              <BookOpenIcon class="h-6 w-6 text-primary" />
            </div>
            <Card.Title class="text-xl">Des données ouvertes</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            Tricoteuses repose uniquement sur et ne produit que des données
            ouvertes.
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
            <Card.Title class="text-xl">Du code libre</Card.Title>
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            L'ensemble du code produit dans le cadre de l'initiative est diffusé
            selon les termes de licences conformes à la définition du Logiciel
            Libre et celle de l'Open Source.
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
              >Une infrastructure souveraine</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            L'infrastructure de l'initiative repose sur des Logiciels Libres –
            et notamment la solution de forge Forgejo – administrés par ses
            membres.
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
            <Card.Title class="text-xl">Une gouvernance transparente</Card.Title
            >
          </div>
        </Card.Header>
        <Card.Content>
          <p class="text-muted-foreground">
            Tricoteuses est une association de fait, qui repose sur les
            initiatives individuelles, où les décisions sont prises par
            consensus et que nous nous efforçons de documenter.
          </p>
        </Card.Content>
      </Card.Root>
    </div>
  </section>

  <!-- En savoir plus -->
  <section class="mb-12">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Content class="py-8 text-center">
        <h2 class="mb-4 text-2xl font-bold">En savoir plus</h2>
        <p class="mb-6 text-muted-foreground">
          Découvrez plus d'informations sur notre organisation, nos réunions,
          notre FAQ et nos mentions légales.
        </p>
        <Button
          href="https://git.tricoteuses.fr/tricoteuses/a_propos"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
        >
          Dépôt Git de présentation du projet
          <ExternalLinkIcon class="ml-2 h-4 w-4" />
        </Button>
      </Card.Content>
    </Card.Root>
  </section>

  <!-- Contact -->
  <section class="mb-12">
    <h2 class="mb-6 text-3xl font-bold">Nous contacter</h2>
    <div class="grid gap-6 md:grid-cols-2">
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <UsersIcon class="h-5 w-5" />
            Matrix
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
            Email
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
            Forge Git
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
