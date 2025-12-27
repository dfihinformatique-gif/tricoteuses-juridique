<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card"
  import { Badge } from "$lib/components/ui/badge"
  import { Separator } from "$lib/components/ui/separator"
  import FormattedDescription from "./formatted-description.svelte"
  import SchemaPropertyRenderer from "./schema-property-renderer.svelte"

  interface Props {
    schema: any
    commonIdFieldName?: string
  }

  let { schema, commonIdFieldName = "uid" }: Props = $props()
</script>

{#if schema}
  <div class="space-y-4">
    <h4 class="text-sm font-semibold">Structure de la réponse</h4>

    <!-- Common response fields -->
    <Card class="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle class="text-sm">Champs communs (tous les endpoints)</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="text-sm">
          <div class="flex items-baseline gap-2">
            <span class="font-mono font-semibold text-primary">
              {commonIdFieldName}
            </span>
            <Badge variant="outline" class="text-xs">string</Badge>
            <Badge variant="destructive" class="text-xs">requis</Badge>
          </div>
          <p class="mt-1 ml-1 text-xs text-muted-foreground">
            Identifiant unique de l'enregistrement
          </p>
        </div>

        <div class="text-sm">
          <div class="flex items-baseline gap-2">
            <span class="font-mono font-semibold text-primary">
              data
            </span>
            <Badge variant="outline" class="text-xs">object</Badge>
            <Badge variant="destructive" class="text-xs">requis</Badge>
          </div>
          <p class="mt-1 ml-1 text-xs text-muted-foreground">
            Données JSON contenant les informations détaillées (voir ci-dessous)
          </p>
        </div>
      </CardContent>
    </Card>

    <div>
      <h5 class="mb-3 text-sm font-semibold">
        Structure détaillée du champ "data"
      </h5>

      {#if schema.oneOf}
        <!-- Multiple possible schemas -->
        <div class="space-y-4">
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-sm font-semibold text-primary">
              data
            </span>
            <Badge variant="outline" class="text-xs">oneOf</Badge>
          </div>
          <p class="text-sm text-muted-foreground">
            Ce champ peut contenir l'un des types suivants :
          </p>
          {#each schema.oneOf as subSchema, idx (idx)}
            <Card>
              <CardHeader>
                <div class="flex items-center justify-between">
                  <CardTitle class="text-base">
                    {subSchema.title || "Type " + (idx + 1)}
                  </CardTitle>
                  {#if subSchema.title}
                    <a
                      href="#{subSchema.title}"
                      class="text-sm text-purple-600 hover:underline dark:text-purple-400"
                    >
                      → Voir le schéma complet
                    </a>
                  {/if}
                </div>
                {#if subSchema.description}
                  <FormattedDescription
                    description={subSchema.description}
                    class="text-sm text-muted-foreground"
                  />
                {/if}
              </CardHeader>
              <CardContent>
                <SchemaPropertyRenderer schema={subSchema} />
              </CardContent>
            </Card>
          {/each}
        </div>
      {:else}
        <!-- Single schema -->
        <Card>
          <CardHeader>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-sm font-semibold text-primary">
                data
              </span>
              <Badge variant="outline" class="text-xs">
                {schema.type || 'object'}
              </Badge>
              {#if schema.title}
                <span class="text-sm text-muted-foreground">
                  ({schema.title})
                </span>
              {/if}
            </div>
            {#if schema.description}
              <div class="mt-2">
                <FormattedDescription
                  description={schema.description}
                  class="text-sm text-muted-foreground"
                />
              </div>
            {/if}
          </CardHeader>
          <CardContent>
            <SchemaPropertyRenderer {schema} />
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
{/if}
