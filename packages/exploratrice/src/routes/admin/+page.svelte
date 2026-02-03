<script lang="ts">
  import { enhance } from "$app/forms"
  import { Button } from "$lib/components/ui/button"
  import * as Card from "$lib/components/ui/card"
  import * as Alert from "$lib/components/ui/alert"
  import PageBreadcrumb from "$lib/components/page-breadcrumb.svelte"
  import Trash2 from "@lucide/svelte/icons/trash-2"
  import CheckCircle from "@lucide/svelte/icons/check-circle"
  import AlertCircle from "@lucide/svelte/icons/alert-circle"

  let { form } = $props()
  let isSubmitting = $state(false)
</script>

<PageBreadcrumb segments={[{ label: "Administration" }]} />

<div class="mx-auto max-w-4xl">
  <h1 class="mb-6 text-3xl font-bold">Administration</h1>

  {#if form?.success}
    <Alert.Root
      class="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
    >
      <CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
      <Alert.Description class="ml-2 text-green-800 dark:text-green-200">
        {form.message}
      </Alert.Description>
    </Alert.Root>
  {:else if form?.success === false}
    <Alert.Root variant="destructive" class="mb-6">
      <AlertCircle class="h-4 w-4" />
      <Alert.Description class="ml-2">
        {form.message}
      </Alert.Description>
    </Alert.Root>
  {/if}

  <div class="space-y-6">
    <Card.Root>
      <Card.Header>
        <Card.Title>Gestion du cache</Card.Title>
        <Card.Description>
          Gérer le cache filesystem utilisé pour stocker temporairement les
          données de l'API Grist.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form
          method="POST"
          action="?/clearCache"
          use:enhance={() => {
            isSubmitting = true
            return async ({ update }) => {
              await update()
              isSubmitting = false
            }
          }}
        >
          <div class="space-y-4">
            <div
              class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20"
            >
              <p class="text-sm text-orange-800 dark:text-orange-200">
                <strong>Attention :</strong> Vider le cache forcera le rechargement
                des données depuis l'API Grist lors de la prochaine requête. Utilisez
                cette fonction si les données semblent obsolètes.
              </p>
            </div>

            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              class="w-full sm:w-auto"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              {isSubmitting ? "Vidage en cours..." : "Vider le cache"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Informations</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted-foreground">Emplacement du cache :</dt>
            <dd class="font-mono">/packages/exploratrice/.cache</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-muted-foreground">TTL par défaut :</dt>
            <dd>60 minutes</dd>
          </div>
        </dl>
      </Card.Content>
    </Card.Root>
  </div>
</div>
