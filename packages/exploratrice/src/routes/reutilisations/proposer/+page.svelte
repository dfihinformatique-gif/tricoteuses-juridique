<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js"
  import { Button } from "$lib/components/ui/button/index.js"
  import * as Card from "$lib/components/ui/card/index.js"
  import { Input } from "$lib/components/ui/input/index.js"
  import { Label } from "$lib/components/ui/label/index.js"
  import { Textarea } from "$lib/components/ui/textarea/index.js"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import { dataServices } from "$lib/data/tricoteuses-ecosystem.js"
  import CheckIcon from "@lucide/svelte/icons/check"
  import CopyIcon from "@lucide/svelte/icons/copy"
  import * as m from "$lib/paraglide/messages.js"
  import { localizedHref } from "$lib/i18n.js"

  const services = Object.values(dataServices)

  let authorName = $state("")
  let contactEmail = $state("")
  let projectDescription = $state("")
  let projectName = $state("")
  let projectUrl = $state("")
  let screenshotUrl = $state("")
  let selectedServiceIds = $state<string[]>([])
  let showJsonOutput = $state(false)
  let copied = $state(false)

  function toggleService(serviceId: string) {
    if (selectedServiceIds.includes(serviceId)) {
      selectedServiceIds = selectedServiceIds.filter((id) => id !== serviceId)
    } else {
      selectedServiceIds = [...selectedServiceIds, serviceId]
    }
  }

  function generateJson() {
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
        type: "external",
        author: authorName,
        url: projectUrl,
        serviceIds: selectedServiceIds,
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
      contactEmail.trim() !== "" &&
      selectedServiceIds.length > 0,
  )

  function getServiceTypeLabel(type: string): string {
    switch (type) {
      case "api":
        return m.reuse_propose_service_type_api()
      case "git":
        return m.reuse_propose_service_type_git()
      case "mcp":
        return m.reuse_propose_service_type_mcp()
      default:
        return m.reuse_propose_service_type_consolidation()
    }
  }
</script>

<svelte:head>
  <title>{m.reuse_propose_page_title()}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
  <PageBreadcrumb
    segments={[
      {
        label: m.reuse_propose_breadcrumb_reuses(),
        href: localizedHref("/reutilisations"),
      },
      { label: m.reuse_propose_breadcrumb_propose() },
    ]}
  />

  <!-- Header -->
  <div class="mb-8 text-center">
    <h1 class="mb-4 text-4xl font-bold">{m.reuse_propose_heading()}</h1>
    <p class="text-lg text-muted-foreground">
      {m.reuse_propose_description()}
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
            {m.reuse_propose_project_info_title()}
          </h2>

          <div class="space-y-2">
            <Label for="projectName"
              >{m.reuse_propose_project_name_label()}</Label
            >
            <Input
              id="projectName"
              bind:value={projectName}
              placeholder={m.reuse_propose_project_name_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectDescription"
              >{m.reuse_propose_project_description_label()}</Label
            >
            <Textarea
              id="projectDescription"
              bind:value={projectDescription}
              placeholder={m.reuse_propose_project_description_placeholder()}
              rows={4}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="projectUrl">{m.reuse_propose_project_url_label()}</Label
            >
            <Input
              id="projectUrl"
              bind:value={projectUrl}
              type="url"
              placeholder={m.reuse_propose_project_url_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="screenshotUrl"
              >{m.reuse_propose_screenshot_url_label()}</Label
            >
            <Input
              id="screenshotUrl"
              bind:value={screenshotUrl}
              type="url"
              placeholder={m.reuse_propose_screenshot_url_placeholder()}
            />
          </div>
        </div>

        <!-- Services used -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            {m.reuse_propose_services_title()}
          </h2>
          <p class="text-sm text-muted-foreground">
            {m.reuse_propose_services_description()}
          </p>

          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            {#each services as service (service.id)}
              <button
                type="button"
                onclick={() => toggleService(service.id)}
                class="flex items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted {selectedServiceIds.includes(
                  service.id,
                )
                  ? 'border-primary bg-primary/10'
                  : ''}"
              >
                <div class="flex-1">
                  <div class="font-medium">{service.name}</div>
                  <div class="text-xs text-muted-foreground">
                    {getServiceTypeLabel(service.type)}
                  </div>
                </div>
                {#if selectedServiceIds.includes(service.id)}
                  <CheckIcon class="h-5 w-5 text-primary" />
                {/if}
              </button>
            {/each}
          </div>

          {#if selectedServiceIds.length > 0}
            <div class="flex flex-wrap gap-2">
              <span class="text-sm text-muted-foreground"
                >{m.reuse_propose_services_selected({
                  count: selectedServiceIds.length,
                })}</span
              >
              {#each selectedServiceIds as serviceId}
                {@const service = services.find((s) => s.id === serviceId)}
                {#if service !== undefined}
                  <Badge variant="secondary">{service.name}</Badge>
                {/if}
              {/each}
            </div>
          {/if}
        </div>

        <!-- Contact information -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold">
            {m.reuse_propose_contact_title()}
          </h2>

          <div class="space-y-2">
            <Label for="authorName">{m.reuse_propose_author_name_label()}</Label
            >
            <Input
              id="authorName"
              bind:value={authorName}
              placeholder={m.reuse_propose_author_name_placeholder()}
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="contactEmail"
              >{m.reuse_propose_contact_email_label()}</Label
            >
            <Input
              id="contactEmail"
              bind:value={contactEmail}
              type="email"
              placeholder={m.reuse_propose_contact_email_placeholder()}
              required
            />
            <p class="text-xs text-muted-foreground">
              {m.reuse_propose_contact_email_help()}
            </p>
          </div>
        </div>

        <!-- Submit button -->
        <div class="flex justify-end">
          <Button type="submit" disabled={!isFormValid}
            >{m.reuse_propose_submit_button()}</Button
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
            {m.reuse_propose_output_title()}
          </h2>
          <Button variant="outline" size="sm" onclick={copyToClipboard}>
            {#if copied}
              <CheckIcon class="mr-2 h-4 w-4" />
              {m.reuse_propose_output_copied()}
            {:else}
              <CopyIcon class="mr-2 h-4 w-4" />
              {m.reuse_propose_output_copy_button()}
            {/if}
          </Button>
        </div>

        <p class="mb-4 text-sm text-muted-foreground">
          {m.reuse_propose_output_thanks()}
        </p>

        <ul
          class="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground"
        >
          <li>
            {@html m.reuse_propose_output_option_github()}
          </li>
          <li>
            {@html m.reuse_propose_output_option_email()}
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
