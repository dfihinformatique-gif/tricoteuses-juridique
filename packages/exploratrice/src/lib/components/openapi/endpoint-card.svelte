<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import type { Endpoint } from "$lib/openapi/helpers"
  import { getMethodColor } from "$lib/openapi/helpers"
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card"
  import { Badge } from "$lib/components/ui/badge"
  import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
  } from "$lib/components/ui/collapsible"
  import { ChevronDown } from "@lucide/svelte"
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

<Card>
  <CardHeader>
    <CardTitle>
      <code class="font-mono text-sm text-primary">{endpoint.path}</code>
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-3">
    {#each endpoint.methods as { method, details } (method)}
      <Collapsible
        open={selectedEndpoint === endpoint.path && selectedMethod === method}
        onOpenChange={(open) => {
          if (open) {
            onSelectEndpoint(endpoint.path, method)
          } else {
            onSelectEndpoint("", "")
          }
        }}
      >
        <CollapsibleTrigger
          class="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
        >
          <div class="flex items-center gap-3">
            <Badge
              variant="outline"
              class="{getMethodColor(
                method,
              )} border-0 font-mono text-xs font-bold text-white uppercase"
            >
              {method}
            </Badge>
            <span class="text-sm">
              {details.summary || details.description || "No description"}
            </span>
          </div>
          <ChevronDown
            class="h-4 w-4 shrink-0 transition-transform duration-200 {selectedEndpoint ===
              endpoint.path && selectedMethod === method
              ? 'rotate-180'
              : ''}"
          />
        </CollapsibleTrigger>

        <CollapsibleContent
          class="mt-4 space-y-4 rounded-lg border bg-muted/50 p-4"
        >
          <!-- Description -->
          {#if details.description}
            <div>
              <h4 class="mb-2 text-sm font-semibold">Description</h4>
              <p class="text-sm text-muted-foreground">
                {details.description}
              </p>
            </div>
          {/if}

          <!-- Parameters -->
          <ParametersTable parameters={details.parameters} {openApiSpec} />

          <!-- Responses -->
          {#if details.responses}
            <div>
              <h4 class="mb-2 text-sm font-semibold">Réponses</h4>
              <div class="space-y-2">
                {#each Object.entries(details.responses) as [code, response] (code)}
                  <div class="rounded-lg border bg-card p-3">
                    <div class="flex items-center gap-2">
                      <Badge
                        variant={code.startsWith("2")
                          ? "default"
                          : "destructive"}
                        class="font-mono text-xs"
                      >
                        {code}
                      </Badge>
                      <span class="text-sm">
                        {(response as any)?.description || ""}
                      </span>
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
        </CollapsibleContent>
      </Collapsible>
    {/each}
  </CardContent>
</Card>
