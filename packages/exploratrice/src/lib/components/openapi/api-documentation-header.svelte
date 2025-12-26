<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"

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
  <p class="mb-4 text-lg text-gray-600 dark:text-gray-300">
    {description}
  </p>

  {#if openApiSpec}
    <div
      class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
    >
      <p class="text-sm">
        <strong>Base URL:</strong>
        <code class="rounded bg-white px-2 py-1 dark:bg-gray-800"
          >{openApiSpec.schemes?.[0] ||
            "https"}://{openApiSpec.host}{openApiSpec.basePath || ""}</code
        >
      </p>
      <p class="mt-2 text-sm">
        <strong>Version:</strong>
        {openApiSpec.info?.version || "N/A"}
      </p>
    </div>
  {/if}
</header>
