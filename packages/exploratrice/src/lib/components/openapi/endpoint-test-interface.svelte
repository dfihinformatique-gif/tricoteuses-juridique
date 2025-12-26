<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import { buildUrl, resolveParameters } from "$lib/openapi/helpers"

  interface Props {
    endpointPath: string
    method: string
    parameters:
      | Array<OpenAPIV2.ParameterObject | OpenAPIV2.ReferenceObject>
      | undefined
    openApiSpec: OpenAPIV2.Document
    baseUrl: string
  }

  let { endpointPath, method, parameters, openApiSpec, baseUrl }: Props =
    $props()

  let testParameters = $state<Record<string, string>>({})
  let testResponse = $state<any>(null)
  let testError = $state<string | null>(null)
  let testLoading = $state(false)
  let isOpen = $state(false)

  const resolvedParams = $derived(resolveParameters(parameters, openApiSpec))

  async function executeTest() {
    testLoading = true
    testError = null
    testResponse = null

    try {
      const url = baseUrl + buildUrl(endpointPath, testParameters)
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          Accept: "application/json",
        },
      })

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key] = value
      })

      let body: any
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        body = await response.json()
      } else {
        body = await response.text()
      }

      testResponse = {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
      }
    } catch (error) {
      testError =
        error instanceof Error ? error.message : "Une erreur est survenue"
    } finally {
      testLoading = false
    }
  }

  function toggle() {
    isOpen = !isOpen
    if (!isOpen) {
      testParameters = {}
      testResponse = null
      testError = null
    }
  }
</script>

<div class="mt-6 border-t pt-4">
  <button
    onclick={toggle}
    class="rounded bg-purple-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-purple-700"
  >
    {isOpen ? "Masquer le test" : "Essayer"}
  </button>

  {#if isOpen}
    <div
      class="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20"
    >
      <h5 class="mb-3 font-semibold">Tester l'endpoint</h5>

      {#if resolvedParams && resolvedParams.length > 0}
        <div class="mb-4 space-y-3">
          <h6 class="text-sm font-semibold">Paramètres</h6>
          {#each resolvedParams as param (param.name)}
            <div>
              <label class="mb-1 block text-sm font-medium">
                {param.name}
                <span class="text-gray-500">({param.in})</span>
                {#if param.required}
                  <span class="text-red-600">*</span>
                {/if}
              </label>
              <input
                type="text"
                bind:value={testParameters[param.name]}
                placeholder={param.description || ""}
                class="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          {/each}
        </div>
      {/if}

      <div class="mb-4">
        <h6 class="mb-2 text-sm font-semibold">URL</h6>
        <code
          class="block rounded bg-gray-100 px-3 py-2 text-xs dark:bg-gray-800"
        >
          {baseUrl + buildUrl(endpointPath, testParameters)}
        </code>
      </div>

      <button
        onclick={executeTest}
        disabled={testLoading}
        class="rounded bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {testLoading ? "Chargement..." : "Exécuter"}
      </button>

      {#if testError}
        <div
          class="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
        >
          <strong>Erreur:</strong>
          {testError}
        </div>
      {/if}

      {#if testResponse}
        <div class="mt-4 space-y-3">
          <div>
            <h6 class="mb-2 text-sm font-semibold">Statut</h6>
            <div
              class="rounded px-3 py-2 text-sm {testResponse.status >= 200 &&
              testResponse.status < 300
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}"
            >
              {testResponse.status}
              {testResponse.statusText}
            </div>
          </div>

          <div>
            <h6 class="mb-2 text-sm font-semibold">En-têtes</h6>
            <div
              class="max-h-40 overflow-y-auto rounded bg-gray-100 p-3 dark:bg-gray-800"
            >
              <pre class="text-xs">{JSON.stringify(
                  testResponse.headers,
                  null,
                  2,
                )}</pre>
            </div>
          </div>

          <div>
            <h6 class="mb-2 text-sm font-semibold">Corps de la réponse</h6>
            <div
              class="max-h-96 overflow-y-auto rounded bg-gray-100 p-3 dark:bg-gray-800"
            >
              <pre class="text-xs">{typeof testResponse.body === "string"
                  ? testResponse.body
                  : JSON.stringify(testResponse.body, null, 2)}</pre>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
