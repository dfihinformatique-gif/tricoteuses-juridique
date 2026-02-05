<script lang="ts">
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import * as Card from "$lib/components/ui/card/index.js"
  import * as Accordion from "$lib/components/ui/accordion/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { HelpCircle } from "@lucide/svelte/icons"
</script>

<svelte:head>
  <title>FAQ - Foire aux questions - Tricoteuses</title>
  <meta
    name="description"
    content="Questions fréquemment posées sur le projet Tricoteuses et la loi sous git"
  />
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb segments={[{ label: "FAQ" }]} />

  <header class="mb-12 text-center">
    <div class="mb-4 flex justify-center">
      <div class="rounded-full bg-primary/10 p-4">
        <HelpCircle class="h-12 w-12 text-primary" />
      </div>
    </div>
    <h1 class="mb-4 text-4xl font-bold">Foire aux questions (FAQ)</h1>
    <p class="text-xl text-muted-foreground">
      Réponses aux questions les plus fréquentes sur le projet Tricoteuses
    </p>
  </header>

  <Accordion.Root class="space-y-4" type="multiple">
    <!-- Question 1 -->
    <Accordion.Item value="item-1">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              1
            </div>
            <h2 class="text-lg font-semibold">
              Pourquoi le nom "Tricoteuses" ?
            </h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <p class="text-muted-foreground">
              Les Tricoteuses désignent les femmes du peuple qui, pendant la
              Révolution française de 1789, assistaient aux séances de la
              Convention nationale, des clubs populaires et du tribunal
              révolutionnaire tout en tricotant (en cousant).
            </p>
            <Button
              href="https://fr.wikipedia.org/wiki/Tricoteuses"
              target="_blank"
              rel="noopener noreferrer"
              variant="link"
              class="mt-2 px-0"
            >
              Plus d'informations sur Wikipedia
              <ExternalLinkIcon class="ml-1 h-3 w-3" />
            </Button>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>

    <!-- Question 2 -->
    <Accordion.Item value="item-2">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              2
            </div>
            <h2 class="text-lg font-semibold">Comment contribuer ?</h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <p class="mb-4 text-muted-foreground">
              Le projet de passer la loi sous git est un projet de longue
              haleine et vous pouvez nous aider de différentes manières :
            </p>
            <ul class="space-y-3">
              <li class="flex gap-2">
                <span class="text-primary">•</span>
                <span class="text-muted-foreground">
                  Si vous rencontrez une erreur dans un
                  <a
                    href="https://git.tricoteuses.fr/textes_consolides/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    texte consolidé
                    <ExternalLinkIcon class="inline h-3 w-3" />
                  </a>, créez un ticket dans le dépôt du texte (ou dans celui du
                  logiciel
                  <a
                    href="https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    Tricoteuses Légifrance
                    <ExternalLinkIcon class="inline h-3 w-3" />
                  </a>
                  si le problème se pose dans plusieurs textes consolidés).
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-primary">•</span>
                <span class="text-muted-foreground">
                  Vous pouvez chercher parmi les tickets (et particulièrement
                  parmi
                  <a
                    href="https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/issues?labels=9"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    ceux étiquetés "good first issue"
                    <ExternalLinkIcon class="inline h-3 w-3" />
                  </a>) une tâche qui vous convienne, créer une bifurcation (aka
                  un <em>fork</em>) de
                  <a
                    href="https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    Tricoteuses Légifrance
                    <ExternalLinkIcon class="inline h-3 w-3" />
                  </a>
                  et vous atteler à la tâche.
                </span>
              </li>
              <li class="flex gap-2">
                <span class="text-primary">•</span>
                <span class="text-muted-foreground">
                  Nous proposons aussi une
                  <a
                    href="https://git.tricoteuses.fr/logiciels/tricoteuses-legifrance/projects"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline"
                  >
                    liste de projets
                    <ExternalLinkIcon class="inline h-3 w-3" />
                  </a>
                  auxquels vous pouvez contribuer.
                </span>
              </li>
            </ul>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>

    <!-- Question 3 -->
    <Accordion.Item value="item-3">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              3
            </div>
            <h2 class="text-lg font-semibold">
              Où se trouvent les articles dont la mise en vigueur est différée ?
            </h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <p class="text-muted-foreground">
              Si un code juridique a des articles dont la mise en vigueur est
              différée dans le temps, ils se trouvent dans la branche
              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                >futur</code
              >.
            </p>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>

    <!-- Question 4 -->
    <Accordion.Item value="item-4">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              4
            </div>
            <h2 class="text-lg font-semibold">
              Pourquoi certains articles ont-ils une date de fin valant
              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                >2999-01-01</code
              > ?
            </h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <p class="text-muted-foreground">
              Quand un article est actuellement en vigueur et qu'il n'est pas
              prévu d'échéance pour le supprimer ou le remplacer, l'article a
              alors une date de fin mise à
              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                >2999-01-01</code
              >
              dans les données Légifrance.
            </p>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>

    <!-- Question 5 -->
    <Accordion.Item value="item-5">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              5
            </div>
            <h2 class="text-lg font-semibold">
              Pourquoi certains commit ont-ils une date valant
              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                >2222-02-22</code
              > ?
            </h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <p class="text-muted-foreground">
              Quand un article fait l'objet d'une mise en vigueur différée à une
              date non précisée, l'article a alors une date de début mise à
              <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
                >2222-02-22</code
              >
              dans les données Légifrance.
            </p>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>

    <!-- Question 6 -->
    <Accordion.Item value="item-6">
      <Card.Root>
        <Accordion.Trigger class="px-6 py-4 hover:no-underline">
          <div class="flex items-start gap-3 text-left">
            <div
              class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            >
              6
            </div>
            <h2 class="text-lg font-semibold">
              Pourquoi ce mélange de HTML et de Markdown dans des fichiers .md ?
            </h2>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <Card.Content class="px-6 pb-6">
            <div class="space-y-3 text-muted-foreground">
              <p>
                Les forges comme Forgejo ne savent pas afficher des fichiers
                HTML, contrairement aux fichiers Markdown. Par contre elles
                permettent d'insérer (un sous-ensemble) du HTML dans des
                fichiers Markdown.
              </p>
              <p>
                Les articles de loi sont écrits en HTML (simple) dans les
                données Légifrance. Les convertir en Markdown pourrait entraîner
                une perte de qualité, notamment pour les tableaux.
              </p>
              <p>
                Les liens relatifs (entre les sections et leurs articles ou
                leurs sous-sections) sont mieux gérés par Forgejo s'ils sont
                écrits en Markdown plutôt qu'en HTML : En HTML, le comportement
                est différent suivant que l'URL actuelle se termine ou non par
                un "/".
              </p>
            </div>
          </Card.Content>
        </Accordion.Content>
      </Card.Root>
    </Accordion.Item>
  </Accordion.Root>

  <!-- Contact Section -->
  <section class="mt-12">
    <Card.Root class="border-primary/20 bg-primary/5">
      <Card.Content class="py-8 text-center">
        <h2 class="mb-4 text-2xl font-bold">Vous avez d'autres questions ?</h2>
        <p class="mb-6 text-muted-foreground">
          N'hésitez pas à nous contacter pour toute question supplémentaire
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <Button
            href="https://matrix.to/#/#tricoteuses:tricoteuses.fr"
            target="_blank"
            rel="noopener noreferrer"
            variant="default"
          >
            Rejoindre notre espace Matrix
            <ExternalLinkIcon class="ml-2 h-4 w-4" />
          </Button>
          <Button href="mailto:tricoteuses@tricoteuses.fr" variant="outline">
            Envoyer un email
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </section>
</div>
