<svelte:head>
  <title>API et données ouvertes</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">API et données ouvertes</h1>
    <p class="text-lg text-gray-600 dark:text-gray-300">
      Accédez aux données publiques françaises via notre API REST et autres
      sources de données ouvertes
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
  </div>

  <!-- Additional information -->
  <div
    class="mt-12 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800"
  >
    <h3 class="mb-3 text-lg font-semibold">À propos des API Tricoteuses</h3>
    <p class="mb-3 text-gray-600 dark:text-gray-300">
      Les API Tricoteuses fournissent un accès unifié et structuré aux données
      publiques françaises via des interfaces REST standardisées utilisant
      PostgREST.
    </p>
    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Accès libre et gratuit aux données publiques</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Documentation interactive avec schémas JSON détaillés</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Interface de test intégrée pour tous les endpoints</span>
      </li>
      <li class="flex items-start gap-2">
        <svg
          class="mt-0.5 h-5 w-5 shrink-0 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>API REST conforme aux standards OpenAPI 2.0 (Swagger)</span>
      </li>
    </ul>
  </div>
</div>
