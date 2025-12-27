<script lang="ts">
  import type { OpenAPIV2 } from "openapi-types"
  import { resolveParameters } from "$lib/openapi/helpers"
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table"
  import { Badge } from "$lib/components/ui/badge"

  interface Props {
    parameters:
      | Array<OpenAPIV2.ParameterObject | OpenAPIV2.ReferenceObject>
      | undefined
    openApiSpec: OpenAPIV2.Document
  }

  let { parameters, openApiSpec }: Props = $props()

  const resolvedParams = $derived(resolveParameters(parameters, openApiSpec))
</script>

{#if resolvedParams && resolvedParams.length > 0}
  <div>
    <h4 class="mb-2 text-sm font-semibold">Paramètres</h4>
    <div class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Requis</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {#each resolvedParams as param, i (`${param.name || ""}-${param.in || ""}-${i}`)}
            <TableRow>
              <TableCell class="font-mono text-xs">{param.name || "-"}</TableCell>
              <TableCell>
                <Badge variant="outline" class="text-xs">{param.in || "-"}</Badge>
              </TableCell>
              <TableCell>
                {#if param.required}
                  <Badge variant="destructive" class="text-xs">Oui</Badge>
                {:else}
                  <Badge variant="secondary" class="text-xs">Non</Badge>
                {/if}
              </TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {param.description || "-"}
              </TableCell>
            </TableRow>
          {/each}
        </TableBody>
      </Table>
    </div>
  </div>
{/if}
