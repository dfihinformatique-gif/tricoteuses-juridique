<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import { Alert, AlertDescription } from "$lib/components/ui/alert"
  import { Badge } from "$lib/components/ui/badge"
  import Info from "@lucide/svelte/icons/info"

  interface Props {
    title: string
    description: string
    openApiSpec?: OpenAPIV2.Document | null
  }

  let { title, description, openApiSpec }: Props = $props()
</script>

<header class="mb-8">
  <h1 class="mb-4 text-4xl font-bold">
    {title}
  </h1>
  <p class="mb-4 text-lg text-muted-foreground">
    {description}
  </p>

  {#if openApiSpec}
    <Alert
      class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
    >
      <Info class="h-4 w-4" />
      <AlertDescription class="ml-2">
        <p class="text-sm">
          <strong>Base URL:</strong>
          <Badge variant="secondary" class="ml-2 font-mono">
            {openApiSpec.schemes?.[0] ||
              "https"}://{openApiSpec.host}{openApiSpec.basePath || ""}
          </Badge>
        </p>
        <p class="mt-2 text-sm">
          <strong>Version:</strong>
          <Badge variant="outline" class="ml-2">
            {openApiSpec.info?.version || "N/A"}
          </Badge>
        </p>
      </AlertDescription>
    </Alert>
  {/if}
</header>
