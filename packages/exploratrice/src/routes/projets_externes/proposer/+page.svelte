<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import { Input } from "$lib/components/ui/input/index.js"
  import { Label } from "$lib/components/ui/label/index.js"
  import { Textarea } from "$lib/components/ui/textarea/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import CheckIcon from "@lucide/svelte/icons/check"
  import CopyIcon from "@lucide/svelte/icons/copy"

  let authorName = $state("")
  let contactEmail = $state("")
  let projectDescription = $state("")
  let projectName = $state("")
  let projectUrl = $state("")
  let repositoryUrl = $state("")
  let licenseName = $state("")
  let licenseSpdxId = $state("")
  let licenseUrl = $state("")
  let screenshotUrl = $state("")
  let showJsonOutput = $state(false)
  let copied = $state(false)

  function generateJson() {
    const license =
      licenseName.trim() !== ""
        ? {
            name: licenseName,
            spdxId: licenseSpdxId.trim() !== "" ? licenseSpdxId : undefined,
            url: licenseUrl.trim() !== "" ? licenseUrl : undefined,
          }
        : undefined

    return JSON.stringify(
      {
        id: projectName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
        name: projectName,
        description: projectDescription,
        author: authorName,
        url: projectUrl,
        repositoryUrl: repositoryUrl || undefined,
        license,
        screenshot: screenshotUrl || undefined,
        featured: false,
      },
      null,
      2,
    )
  }

  function handleSubmit() {
    showJsonOutput = true
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generateJson())
    copied = true
    setTimeout(() => {
      copied = false
    }, 2000)
  }

  const isFormValid = $derived(
    projectName.trim() !== "" &&
      projectDescription.trim() !== "" &&
      projectUrl.trim() !== "" &&
      authorName.trim() !== "" &&
      contactEmail.trim() !== "",
  )
</script>

<svelte:head>
  <title>Proposer un projet externe - Tricoteuses</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      { label: "Projets externes complémentaires", href: "/projets-externes" },
      { label: "Proposer un projet externe" },
    ]}
  />

  <!-- Header -->
  <div class="mb-8 text-center">
    <h1 class="mb-4 text-4xl font-bold">Proposer un projet externe</h1>
    <p class="text-lg text-muted-foreground">
      Vous avez créé un projet open source complémentaire à Tricoteuses ?
      Partagez-le avec la communauté !
    </p>
  </div>

  <!-- Form -->
  <Card.Root class="mb-8">
    <Card.Content class="py-6">
      <form
        onsubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        class="space-y-6"
      >
        <!-- Project information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Informations sur le projet</h2>

          <div class="space-y-2">
            <Label for="projectName">Nom du projet *</Label>
            <Input
              id="projectName"
              bind:value={projectName}
              placeholder="Mon Projet Open Source"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectDescription">Description *</Label>
            <Textarea
              id="projectDescription"
              bind:value={projectDescription}
              placeholder="Décrivez votre projet et comment il complète l'écosystème Tricoteuses..."
              rows={4}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectUrl">URL du projet *</Label>
            <Input
              id="projectUrl"
              bind:value={projectUrl}
              type="url"
              placeholder="https://mon-projet.fr"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="repositoryUrl">URL du dépôt Git (optionnel)</Label>
            <Input
              id="repositoryUrl"
              bind:value={repositoryUrl}
              type="url"
              placeholder="https://github.com/utilisateur/projet"
            />
          </div>

          <div class="space-y-2">
            <Label for="screenshotUrl"
              >URL de la capture d'écran (optionnel)</Label
            >
            <Input
              id="screenshotUrl"
              bind:value={screenshotUrl}
              type="url"
              placeholder="https://exemple.fr/capture.png"
            />
          </div>
        </div>

        <!-- License information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Licence (optionnel)</h2>
          <p class="text-sm text-muted-foreground">
            Si votre projet est sous licence open source, précisez-la.
          </p>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <Label for="licenseName">Nom de la licence</Label>
              <Input
                id="licenseName"
                bind:value={licenseName}
                placeholder="MIT, GPL-3.0, BSD-3-Clause, etc."
              />
            </div>

            <div class="space-y-2">
              <Label for="licenseSpdxId">SPDX ID (optionnel)</Label>
              <Input
                id="licenseSpdxId"
                bind:value={licenseSpdxId}
                placeholder="MIT, GPL-3.0-only, BSD-3-Clause, etc."
              />
            </div>

            <div class="space-y-2">
              <Label for="licenseUrl">URL de la licence</Label>
              <Input
                id="licenseUrl"
                bind:value={licenseUrl}
                type="url"
                placeholder="https://opensource.org/licenses/MIT"
              />
            </div>
          </div>
        </div>

        <!-- Contact information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">Vos coordonnées</h2>

          <div class="space-y-2">
            <Label for="authorName">Nom ou organisation *</Label>
            <Input
              id="authorName"
              bind:value={authorName}
              placeholder="Votre nom ou celui de votre organisation"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="contactEmail">Email de contact *</Label>
            <Input
              id="contactEmail"
              bind:value={contactEmail}
              type="email"
              placeholder="contact@exemple.fr"
              required
            />
            <p class="text-xs text-muted-foreground">
              Votre email ne sera utilisé que pour vous contacter au sujet de
              cette proposition.
            </p>
          </div>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end">
          <Button type="submit" disabled={!isFormValid}
            >Générer la proposition</Button
          >
        </div>
      </form>
    </Card.Content>
  </Card.Root>

  <!-- JSON output -->
  {#if showJsonOutput}
    <Card.Root class="border-l-4 border-l-green-500">
      <Card.Content class="py-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold">Votre proposition</h2>
          <Button variant="outline" size="sm" onclick={copyToClipboard}>
            {#if copied}
              <CheckIcon class="mr-2 h-4 w-4" />
              Copié !
            {:else}
              <CopyIcon class="mr-2 h-4 w-4" />
              Copier
            {/if}
          </Button>
        </div>

        <p class="mb-4 text-sm text-muted-foreground">
          Merci pour votre proposition ! Voici le JSON généré. Pour soumettre
          votre projet externe, vous pouvez :
        </p>

        <ul
          class="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground"
        >
          <li>
            Créer une issue sur notre <a
              href="https://github.com/tricoteuses/tricoteuses-juridique/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary underline">dépôt GitHub</a
            > en incluant ce JSON
          </li>
          <li>
            Nous envoyer un email à <a
              href="mailto:contact@tricoteuses.fr"
              class="text-primary underline">contact@tricoteuses.fr</a
            > avec ce JSON
          </li>
        </ul>

        <div class="rounded-lg bg-muted p-4">
          <pre class="overflow-x-auto text-sm"><code>{generateJson()}</code
            ></pre>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
