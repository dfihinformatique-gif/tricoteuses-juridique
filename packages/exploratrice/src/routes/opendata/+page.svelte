<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card"
  import { Badge } from "$lib/components/ui/badge"
  import { Alert, AlertDescription } from "$lib/components/ui/alert"
  import { Building, Book, Database, Folder, FileText, Terminal, ExternalLink, ChevronRight, Info } from "@lucide/svelte"
</script>

<svelte:head>
  <title>Données ouvertes, API et IA</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">Données ouvertes, API et IA</h1>
    <p class="text-lg text-muted-foreground">
      Accédez aux données publiques juridiques françaises : utilisez nos dépôts de données, notre API REST, connectez-vous directement à nos bases de données ou utilisez notre serveur MCP pour permettre aux chats IA de connaître la loi.
    </p>
  </header>

  <div class="grid items-start gap-6 md:grid-cols-2">
    <!-- API Canutes Assemblée -->
    <a href="/opendata/canutes_assemblee" class="transition-transform hover:scale-[1.02]">
      <Card class="h-full border-l-4 border-l-blue-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Building class="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle class="text-2xl">API Canutes Assemblée</CardTitle>
          </div>
          <CardDescription>
            Accédez aux données de l'Assemblée Nationale : acteurs, amendements,
            dossiers législatifs, documents, organes, réunions et scrutins.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">PostgREST</Badge>
            <Badge variant="secondary">OpenAPI 2.0</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
            Consulter la documentation
            <ChevronRight class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- API Canutes Legifrance -->
    <a href="/opendata/canutes_legifrance" class="transition-transform hover:scale-[1.02]">
      <Card class="h-full border-l-4 border-l-purple-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Book class="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle class="text-2xl">API Canutes Legifrance</CardTitle>
          </div>
          <CardDescription>
            Explorez les données législatives françaises : articles de loi, textes
            légaux, sections, dossiers législatifs et journaux officiels.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">PostgREST</Badge>
            <Badge variant="secondary">OpenAPI 2.0</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
            Consulter la documentation
            <ChevronRight class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- API Parlement -->
    <a href="/opendata/parlement" class="transition-transform hover:scale-[1.02]">
      <Card class="h-full border-l-4 border-l-blue-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Database class="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle class="text-2xl">API Parlement</CardTitle>
          </div>
          <CardDescription>
            Accédez aux données unifiées du Parlement français : Assemblée Nationale
            et Sénat. Acteurs, amendements, dossiers, documents, débats, scrutins,
            questions et bien plus.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">Express API</Badge>
            <Badge variant="secondary">OpenAPI 3.0</Badge>
            <Badge variant="secondary">Assemblée & Sénat</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
            Consulter la documentation
            <ChevronRight class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Dépôts de données DILA -->
    <a
      href="https://git.tricoteuses.fr/dila"
      target="_blank"
      rel="noopener noreferrer"
      class="transition-transform hover:scale-[1.02]"
    >
      <Card class="h-full border-l-4 border-l-amber-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Folder class="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle class="text-2xl">Dépôts de données DILA</CardTitle>
          </div>
          <CardDescription>
            Accédez aux données brutes de Légifrance publiées par la DILA, récupérées plusieurs fois par jour,
            converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">Git</Badge>
            <Badge variant="secondary">MAJ quotidiennes</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            Accéder aux dépôts
            <ExternalLink class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Dépôts de données Assemblée nationale -->
    <a
      href="https://git.tricoteuses.fr/assemblee"
      target="_blank"
      rel="noopener noreferrer"
      class="transition-transform hover:scale-[1.02]"
    >
      <Card class="h-full border-l-4 border-l-amber-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Folder class="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle class="text-2xl">Dépôts de données Assemblée</CardTitle>
          </div>
          <CardDescription>
            Accédez aux données brutes de l'Assemblée nationale, récupérées plusieurs fois par jour,
            converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">Git</Badge>
            <Badge variant="secondary">MAJ quotidiennes</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            Accéder aux dépôts
            <ExternalLink class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Dépôts de données Sénat -->
    <a
      href="https://git.tricoteuses.fr/senat"
      target="_blank"
      rel="noopener noreferrer"
      class="transition-transform hover:scale-[1.02]"
    >
      <Card class="h-full border-l-4 border-l-amber-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Folder class="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle class="text-2xl">Dépôts de données Sénat</CardTitle>
          </div>
          <CardDescription>
            Accédez aux données brutes du Sénat, récupérées plusieurs fois par jour,
            converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">Git</Badge>
            <Badge variant="secondary">MAJ quotidiennes</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            Accéder aux dépôts
            <ExternalLink class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Constitution du 4 octobre 1958 -->
    <a
      href="https://git.tricoteuses.fr/constitution/constitution_du_4_octobre_1958"
      target="_blank"
      rel="noopener noreferrer"
      class="transition-transform hover:scale-[1.02]"
    >
      <Card class="h-full border-l-4 border-l-slate-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/30">
              <FileText class="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <CardTitle class="text-2xl">Constitution de 1958</CardTitle>
          </div>
          <CardDescription>
            Consultez le texte intégral de la Constitution du 4 octobre 1958
            avec son historique complet des modifications, versionné sous Git.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">Texte intégral</Badge>
            <Badge variant="secondary">Git</Badge>
            <Badge variant="secondary">Historique</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Consulter la Constitution
            <ExternalLink class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Codes juridiques -->
    <a
      href="https://git.tricoteuses.fr/codes"
      target="_blank"
      rel="noopener noreferrer"
      class="transition-transform hover:scale-[1.02]"
    >
      <Card class="h-full border-l-4 border-l-slate-500">
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900/30">
              <Book class="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <CardTitle class="text-2xl">Codes juridiques</CardTitle>
          </div>
          <CardDescription>
            Consultez l'ensemble des codes juridiques français (Code civil, Code général des impôts, etc.)
            avec leur historique complet des modifications, versionnés sous Git.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge variant="secondary">Tous les codes</Badge>
            <Badge variant="secondary">Git</Badge>
            <Badge variant="secondary">Historique</Badge>
          </div>
          <div class="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            Consulter les codes
            <ExternalLink class="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>

    <!-- Serveur MCP Moulineuse -->
    <Card class="border-l-4 border-l-green-500">
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
            <Terminal class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle class="text-2xl">Serveur MCP</CardTitle>
        </div>
        <CardDescription>
          Interrogez directement les bases de données juridiques de Tricoteuses via le protocole MCP (Model Context Protocol).
          Parfait pour permettre à la plupart des chats IA d'avoir une connaissance approfondie, la plus exacte possible et à jour de la loi et de sa fabrique.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <p class="mb-2 text-sm font-medium">
            Configuration recommandée (HTTP) :
          </p>
          <pre class="overflow-x-auto rounded-lg border bg-muted p-3 text-xs"><code>{`{
  "mcpServers": {
    "tricoteuses": {
      "url": "https://mcp.code4code.eu/mcp",
      "transport": "streamable-http"
    }
  }
}`}</code></pre>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge variant="secondary">MCP Protocol</Badge>
          <Badge variant="secondary">Streamable HTTP</Badge>
          <Badge variant="secondary">PostgreSQL</Badge>
        </div>

        <a
          href="https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/moulineuse/USAGE.md"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        >
          Pour en savoir plus
          <ExternalLink class="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  </div>

  <!-- Note sur les fournisseurs de services -->
  <Alert class="mt-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
    <Info class="h-5 w-5 text-blue-600 dark:text-blue-400" />
    <AlertDescription class="ml-2">
      <p class="mb-2 text-sm text-blue-900 dark:text-blue-100">
        Ces services vous sont proposés gracieusement, dans le cadre de l'engagement des Tricoteuses pour l'ouverture et l'accessibilité des données publiques juridiques françaises :
      </p>
      <ul class="space-y-1 text-sm text-blue-900 dark:text-blue-100">
        <li>
          • L'API Parlement par
          <a
            href="https://www.legiwatch.fr/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
          >
            Legiwatch
          </a>
        </li>
        <li>
          • Les autres services (API Canutes, dépôts de données, serveur MCP) par
          <a
            href="https://code4code.eu"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
          >
            Code4code.eu
          </a>
        </li>
      </ul>
    </AlertDescription>
  </Alert>
</div>
