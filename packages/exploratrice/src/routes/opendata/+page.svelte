<svelte:head>
  <title>Données ouvertes, API et IA</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">Données ouvertes, API et IA</h1>
    <p class="text-lg text-gray-600 dark:text-gray-300">
      Accédez aux données publiques juridiques françaises : utilisez nos dépôts de données, notre API REST, connectez-vous directement à nos bases de données ou utilisez notre serveur MCP pour permettre aux chats IA de connaître la loi.
    </p>
  </header>

  <div class="grid items-start gap-8 md:grid-cols-2">
    <!-- API Canutes Assemblée -->
    <a
      href="/opendata/canutes_assemblee"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30"
        >
          <svg
            class="h-6 w-6 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400"
        >
          API Canutes Assemblée
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Accédez aux données de l'Assemblée Nationale : acteurs, amendements,
        dossiers législatifs, documents, organes, réunions et scrutins.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          PostgREST
        </span>
        <span
          class="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        >
          OpenAPI 2.0
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400"
      >
        Consulter la documentation
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </a>

    <!-- API Canutes Legifrance -->
    <a
      href="/opendata/canutes_legifrance"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-purple-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30"
        >
          <svg
            class="h-6 w-6 text-purple-600 dark:text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-purple-600 dark:text-white dark:group-hover:text-purple-400"
        >
          API Canutes Legifrance
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Explorez les données législatives françaises : articles de loi, textes
        légaux, sections, dossiers législatifs et journaux officiels.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        >
          PostgREST
        </span>
        <span
          class="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        >
          OpenAPI 2.0
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-purple-600 dark:text-purple-400"
      >
        Consulter la documentation
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </a>

    <!-- Dépôts de données DILA -->
    <a
      href="https://git.tricoteuses.fr/dila"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
        >
          <svg
            class="h-6 w-6 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400"
        >
          Dépôts de données DILA
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Accédez aux données brutes de Légifrance publiées par la DILA, récupérées plusieurs fois par jour,
        converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          JSON
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          Git
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          MAJ quotidiennes
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-amber-600 dark:text-amber-400"
      >
        Accéder aux dépôts
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>

    <!-- Dépôts de données Assemblée nationale -->
    <a
      href="https://git.tricoteuses.fr/assemblee"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
        >
          <svg
            class="h-6 w-6 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400"
        >
          Dépôts de données Assemblée
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Accédez aux données brutes de l'Assemblée nationale, récupérées plusieurs fois par jour,
        converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          JSON
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          Git
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          MAJ quotidiennes
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-amber-600 dark:text-amber-400"
      >
        Accéder aux dépôts
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>

    <!-- Dépôts de données Sénat -->
    <a
      href="https://git.tricoteuses.fr/senat"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-amber-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-amber-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30"
        >
          <svg
            class="h-6 w-6 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400"
        >
          Dépôts de données Sénat
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Accédez aux données brutes du Sénat, récupérées plusieurs fois par jour,
        converties en JSON, nettoyées et versionnées sous Git par Tricoteuses.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          JSON
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          Git
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          MAJ quotidiennes
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-amber-600 dark:text-amber-400"
      >
        Accéder aux dépôts
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>

    <!-- Constitution du 4 octobre 1958 -->
    <a
      href="https://git.tricoteuses.fr/constitution/constitution_du_4_octobre_1958"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30"
        >
          <svg
            class="h-6 w-6 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400"
        >
          Constitution de 1958
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Consultez le texte intégral de la Constitution du 4 octobre 1958
        avec son historique complet des modifications, versionné sous Git.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Texte intégral
        </span>
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Git
        </span>
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Historique
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        Consulter la Constitution
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>

    <!-- Codes juridiques -->
    <a
      href="https://git.tricoteuses.fr/codes"
      target="_blank"
      rel="noopener noreferrer"
      class="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-400"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30"
        >
          <svg
            class="h-6 w-6 text-indigo-600 dark:text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400"
        >
          Codes juridiques
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Consultez l'ensemble des codes juridiques français (Code civil, Code général des impôts, etc.)
        avec leur historique complet des modifications, versionnés sous Git.
      </p>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Tous les codes
        </span>
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Git
        </span>
        <span
          class="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
        >
          Historique
        </span>
      </div>

      <div
        class="mt-4 flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400"
      >
        Consulter les codes
        <svg
          class="ml-2 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>

    <!-- Serveur MCP Moulineuse -->
    <div
      class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30"
        >
          <svg
            class="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2
          class="text-2xl font-bold text-gray-900 dark:text-white"
        >
          Serveur MCP
        </h2>
      </div>

      <p class="mb-4 text-gray-600 dark:text-gray-300">
        Interrogez directement les bases de données juridiques de Tricoteuses via le protocole MCP (Model Context Protocol).
        Parfait pour permettre à la plupart des chats IA d'avoir une connaissance approfondie, la plus exacte possible et à jour de la loi et de sa fabrique.
      </p>

      <div class="mb-4">
        <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Configuration recommandée (HTTP) :
        </p>
        <pre class="overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-900"><code>{`{
  "mcpServers": {
    "tricoteuses": {
      "url": "https://mcp.code4code.eu/mcp",
      "transport": "streamable-http"
    }
  }
}`}</code></pre>
      </div>

      <div class="flex flex-wrap gap-2">
        <span
          class="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          MCP Protocol
        </span>
        <span
          class="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          Streamable HTTP
        </span>
        <span
          class="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300"
        >
          PostgreSQL
        </span>
      </div>

      <div class="mt-4">
        <a
          href="https://git.tricoteuses.fr/logiciels/tricoteuses-juridique/src/branch/main/packages/moulineuse/USAGE.md"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
        >
          Pour en savoir plus
          <svg
            class="ml-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- Note Code4code.eu -->
  <div
    class="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950"
  >
    <div class="flex items-start gap-3">
      <svg
        class="mt-0.5 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p class="text-sm text-blue-900 dark:text-blue-100">
          L'ensemble de ces services vous sont proposés gracieusement par
          <a
            href="https://code4code.eu"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline hover:text-blue-700 dark:hover:text-blue-300"
          >
            Code4code.eu
          </a>, dans le cadre de son engagement, au sein des Tricoteuses, pour l'ouverture et l'accessibilité des données
          publiques juridiques françaises.
        </p>
      </div>
    </div>
  </div>
</div>
