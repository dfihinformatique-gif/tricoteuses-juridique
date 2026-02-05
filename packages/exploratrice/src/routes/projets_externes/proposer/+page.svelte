<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import { Input } from "$lib/components/ui/input/index.js"
  import { Label } from "$lib/components/ui/label/index.js"
  import { Textarea } from "$lib/components/ui/textarea/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import CheckIcon from "@lucide/svelte/icons/check"
  import CopyIcon from "@lucide/svelte/icons/copy"
  import * as m from "$lib/paraglide/messages.js"

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
  <title>{m.external_project_propose_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      {
        label: m.external_project_detail_breadcrumb(),
        href: "/projets_externes",
      },
      { label: m.external_project_propose_breadcrumb() },
    ]}
  />

  <!-- Header -->
  <div class="mb-8 text-center">
    <h1 class="mb-4 text-4xl font-bold">
      {m.external_project_propose_title()}
    </h1>
    <p class="text-lg text-muted-foreground">
      {m.external_project_propose_description()}
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
          <h2 class="text-xl font-semibold">
            {m.external_project_propose_project_info_title()}
          </h2>

          <div class="space-y-2">
            <Label for="projectName"
              >{m.external_project_propose_project_name_label()}</Label
            >
            <Input
              id="projectName"
              bind:value={projectName}
              placeholder={m.external_project_propose_project_name_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectDescription"
              >{m.external_project_propose_project_description_label()}</Label
            >
            <Textarea
              id="projectDescription"
              bind:value={projectDescription}
              placeholder={m.external_project_propose_project_description_placeholder()}
              rows={4}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectUrl"
              >{m.external_project_propose_project_url_label()}</Label
            >
            <Input
              id="projectUrl"
              bind:value={projectUrl}
              type="url"
              placeholder={m.external_project_propose_project_url_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="repositoryUrl"
              >{m.external_project_propose_repository_url_label()}</Label
            >
            <Input
              id="repositoryUrl"
              bind:value={repositoryUrl}
              type="url"
              placeholder={m.external_project_propose_repository_url_placeholder()}
            />
          </div>

          <div class="space-y-2">
            <Label for="screenshotUrl"
              >{m.external_project_propose_screenshot_url_label()}</Label
            >
            <Input
              id="screenshotUrl"
              bind:value={screenshotUrl}
              type="url"
              placeholder={m.external_project_propose_screenshot_url_placeholder()}
            />
          </div>
        </div>

        <!-- License information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            {m.external_project_propose_license_title()}
          </h2>
          <p class="text-sm text-muted-foreground">
            {m.external_project_propose_license_description()}
          </p>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <Label for="licenseName"
                >{m.external_project_propose_license_name_label()}</Label
              >
              <Input
                id="licenseName"
                bind:value={licenseName}
                placeholder={m.external_project_propose_license_name_placeholder()}
              />
            </div>

            <div class="space-y-2">
              <Label for="licenseSpdxId"
                >{m.external_project_propose_license_spdx_label()}</Label
              >
              <Input
                id="licenseSpdxId"
                bind:value={licenseSpdxId}
                placeholder={m.external_project_propose_license_spdx_placeholder()}
              />
            </div>

            <div class="space-y-2">
              <Label for="licenseUrl"
                >{m.external_project_propose_license_url_label()}</Label
              >
              <Input
                id="licenseUrl"
                bind:value={licenseUrl}
                type="url"
                placeholder={m.external_project_propose_license_url_placeholder()}
              />
            </div>
          </div>
        </div>

        <!-- Contact information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            {m.external_project_propose_contact_title()}
          </h2>

          <div class="space-y-2">
            <Label for="authorName"
              >{m.external_project_propose_author_name_label()}</Label
            >
            <Input
              id="authorName"
              bind:value={authorName}
              placeholder={m.external_project_propose_author_name_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="contactEmail"
              >{m.external_project_propose_contact_email_label()}</Label
            >
            <Input
              id="contactEmail"
              bind:value={contactEmail}
              type="email"
              placeholder={m.external_project_propose_contact_email_placeholder()}
              required
            />
            <p class="text-xs text-muted-foreground">
              {m.external_project_propose_contact_email_help()}
            </p>
          </div>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end">
          <Button type="submit" disabled={!isFormValid}
            >{m.external_project_propose_submit_button()}</Button
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
          <h2 class="text-xl font-semibold">
            {m.external_project_propose_output_title()}
          </h2>
          <Button variant="outline" size="sm" onclick={copyToClipboard}>
            {#if copied}
              <CheckIcon class="mr-2 h-4 w-4" />
              {m.external_project_propose_output_copied()}
            {:else}
              <CopyIcon class="mr-2 h-4 w-4" />
              {m.external_project_propose_output_copy_button()}
            {/if}
          </Button>
        </div>

        <p class="mb-4 text-sm text-muted-foreground">
          {m.external_project_propose_output_thanks()}
        </p>

        <ul
          class="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground"
        >
          <li>
            {@html m.external_project_propose_output_option_github()}
          </li>
          <li>
            {@html m.external_project_propose_output_option_email()}
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
