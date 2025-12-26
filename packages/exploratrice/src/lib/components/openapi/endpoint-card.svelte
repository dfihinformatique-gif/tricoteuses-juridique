<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import type { Endpoint } from "$lib/openapi/helpers"
  import { getMethodColor } from "$lib/openapi/helpers"
  import ParametersTable from "./parameters-table.svelte"
  import ResponseSchemaSection from "./response-schema-section.svelte"
  import EndpointTestInterface from "./endpoint-test-interface.svelte"

  interface Props {
    endpoint: Endpoint
    selectedEndpoint: string | null
    selectedMethod: string
    openApiSpec: OpenAPIV2.Document
    baseUrl: string
    getSchemaForEndpoint: (path: string) => any
    onSelectEndpoint: (path: string, method: string) => void
    commonIdFieldName?: string
  }

  let {
    endpoint,
    selectedEndpoint,
    selectedMethod,
    openApiSpec,
    baseUrl,
    getSchemaForEndpoint,
    onSelectEndpoint,
    commonIdFieldName = "uid",
  }: Props = $props()
</script>

<div
  class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
>
  <div class="bg-gray-50 p-4 dark:bg-gray-800">
    <h2 class="mb-3 text-xl font-semibold">
      <code class="text-blue-600 dark:text-blue-400">{endpoint.path}</code>
    </h2>

    <!-- Methods -->
    <div class="space-y-3">
      {#each endpoint.methods as { method, details } (method)}
        <div class="border-l-4 border-gray-300 pl-4 dark:border-gray-600">
          <button
            onclick={() => {
              if (
                selectedEndpoint === endpoint.path &&
                selectedMethod === method
              ) {
                onSelectEndpoint("", "")
              } else {
                onSelectEndpoint(endpoint.path, method)
              }
            }}
            class="flex w-full items-center gap-3 text-left transition-opacity hover:opacity-80"
          >
            <span
              class="{getMethodColor(
                method,
              )} rounded px-3 py-1 font-mono text-sm font-bold text-white uppercase"
            >
              {method}
            </span>
            <span class="text-gray-700 dark:text-gray-300">
              {details.summary || details.description || "No description"}
            </span>
          </button>

          {#if selectedEndpoint === endpoint.path && selectedMethod === method}
            <div class="mt-4 space-y-4 rounded bg-white p-4 dark:bg-gray-900">
              <!-- Description -->
              {#if details.description}
                <div>
                  <h4 class="mb-2 font-semibold">Description</h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {details.description}
                  </p>
                </div>
              {/if}

              <!-- Parameters -->
              <ParametersTable parameters={details.parameters} {openApiSpec} />

              <!-- Responses -->
              {#if details.responses}
                <div>
                  <h4 class="mb-2 font-semibold">Réponses</h4>
                  <div class="space-y-2">
                    {#each Object.entries(details.responses) as [code, response] (code)}
                      <div class="rounded bg-gray-50 p-3 dark:bg-gray-800">
                        <div class="mb-1 flex items-center gap-2">
                          <span
                            class="font-mono text-sm font-bold {code.startsWith(
                              '2',
                            )
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'}"
                          >
                            {code}
                          </span>
                          <span class="text-sm"
                            >{(response as any)?.description || ""}</span
                          >
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Response structure -->
              <ResponseSchemaSection
                schema={getSchemaForEndpoint(endpoint.path)}
                {commonIdFieldName}
              />

              <!-- Test Interface -->
              <EndpointTestInterface
                endpointPath={endpoint.path}
                {method}
                parameters={details.parameters}
                {openApiSpec}
                {baseUrl}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>
