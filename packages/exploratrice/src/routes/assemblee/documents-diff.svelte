<script lang="ts">
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link"
  import { slugify } from "@tricoteuses/legifrance"
  import {
    reversePositionsSplitFromPositions,
    walkTableOfContents,
    type FragmentPosition,
    type TableOfContentsArticlePositioned,
    type TableOfContentsDivisionPositioned,
    type TableOfContentsPositioned,
    type Transformation,
  } from "@tricoteuses/tisseuse"
  import { diffWords } from "diff"
  import type { Attachment } from "svelte/attachments"
  import { innerHeight } from "svelte/reactivity/window"

  import { page } from "$app/state"
  import * as Collapsible from "$lib/components/ui/collapsible/index.js"
  import * as InputGroup from "$lib/components/ui/input-group/index.js"
  import { Label } from "$lib/components/ui/label/index.js"
  import NavigationMenuDropdown from "$lib/components/navigation-menu-dropdown.svelte"
  import { Badge } from "$lib/components/ui/badge/index.js"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js"
  import { fullDateFormatter } from "$lib/dates.js"
  import { mainMenu } from "$lib/hooks/main-menu.svelte.js"
  import { urlPathFromId } from "$lib/urls.js"

  import type { DocumentPageInfos } from "./documents.js"

  let {
    current,
    previous,
  }: {
    current: DocumentPageInfos
    previous: DocumentPageInfos
  } = $props()

  let currentMaxHeight = $state(5000)
  let currentShadowHost: Element | undefined = $state(undefined)
  const { document } = $derived(current)
  const { chrono } = $derived(document.cycleDeVie)
  let currentZoomPercentage = $state(100)
  const date = $derived(
    chrono.datePublication ??
      chrono.datePublicationWeb ??
      chrono.dateDepot ??
      chrono.dateCreation,
  )
  const linkUrlOriginReplacement = $derived(page.data.linkUrlOriginReplacement)
  let previousMaxHeight = $state(5000)
  let previousShadowHost: Element | undefined = $state(undefined)
  let previousZoomPercentage = $state(100)

  $effect(() => {
    mainMenu.pageSpecificMenuItem = pageSpecificMenuItem

    return () => {
      // Caution: Don't use delete.
      mainMenu.pageSpecificMenuItem = undefined
    }
  })

  $effect(() => {
    const hash = page.url.hash.slice(1)
    if (
      hash.startsWith("tricoteuses-avant-") &&
      previousShadowHost?.shadowRoot != null
    ) {
      const element = previousShadowHost.shadowRoot.getElementById(hash)
      if (element !== null) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    } else if (
      hash.startsWith("tricoteuses-apres-") &&
      currentShadowHost?.shadowRoot != null
    ) {
      const element = currentShadowHost.shadowRoot.getElementById(hash)
      if (element !== null) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    }
  })

  const attachCurrentDocumentHtml: Attachment = (element) => {
    element.attachShadow({ mode: "open" })
    currentShadowHost = element

    return () => {
      // Cleaning up.
      currentShadowHost = undefined
    }
  }

  const attachPreviousDocumentHtml: Attachment = (element) => {
    element.attachShadow({ mode: "open" })
    previousShadowHost = element

    return () => {
      // Cleaning up.
      previousShadowHost = undefined
    }
  }

  const calculateCurrentRemainingHeight: Attachment = (element) => {
    currentMaxHeight =
      innerHeight.current! - element.getBoundingClientRect().top
  }

  const calculatePreviousRemainingHeight: Attachment = (element) => {
    previousMaxHeight =
      innerHeight.current! - element.getBoundingClientRect().top
  }

  const generateBlocksDiff = ({
    currentBlockPosition,
    currentHtml,
    currentHtmlFragments,
    currentHtmlIndex,
    currentTransformation,
    previousBlockPosition,
    previousHtml,
    previousHtmlFragments,
    previousHtmlIndex,
    previousTransformation,
  }: {
    currentBlockPosition: FragmentPosition
    currentHtml: string
    currentHtmlFragments: string[]
    currentHtmlIndex: number
    currentTransformation: Transformation
    previousBlockPosition: FragmentPosition
    previousHtml: string
    previousHtmlFragments: string[]
    previousHtmlIndex: number
    previousTransformation: Transformation
  }): [number, number] => {
    const currentText = currentTransformation.output
    const previousText = previousTransformation.output

    const changes = diffWords(
      previousText.slice(
        previousBlockPosition.start,
        previousBlockPosition.stop,
      ),
      currentText.slice(currentBlockPosition.start, currentBlockPosition.stop),
      {
        // ignoreCase,
        // intlSegmenter,
      },
    )

    let currentTextIndex = currentBlockPosition.start
    const currentTextPositions: FragmentPosition[] = []
    let previousTextIndex = previousBlockPosition.start
    const previousTextPositions: FragmentPosition[] = []
    for (const change of changes) {
      const changeLength = change.value.length
      if (change.added) {
        const changeStop = currentTextIndex + changeLength
        let start = currentTextIndex
        for (let i = currentTextIndex; i < changeStop; i++) {
          if (currentText[i] === "\n") {
            if (i > start) {
              currentTextPositions.push({
                start,
                stop: i,
              })
            }
            start = i + 1
          }
        }
        if (start < changeStop) {
          currentTextPositions.push({
            start,
            stop: changeStop,
          })
        }
        currentTextIndex += changeLength // - (changeEndsWithLineFeed ? 1 : 0);
      } else if (change.removed) {
        const changeStop = previousTextIndex + changeLength
        let start = previousTextIndex
        for (let i = previousTextIndex; i < changeStop; i++) {
          if (previousText[i] === "\n") {
            if (i > start) {
              previousTextPositions.push({
                start,
                stop: i,
              })
            }
            start = i + 1
          }
        }
        if (start < changeStop) {
          previousTextPositions.push({
            start,
            stop: changeStop,
          })
        }
        previousTextIndex += changeLength // - (changeEndsWithLineFeed ? 1 : 0);
      } else {
        previousTextIndex += changeLength
        currentTextIndex += changeLength
      }
    }

    const previousHtmlPositions = reversePositionsSplitFromPositions(
      previousTransformation,
      previousTextPositions,
    )
    for (const previousHtmlPositionsForTextPosition of previousHtmlPositions) {
      for (const previousHtmlPosition of previousHtmlPositionsForTextPosition) {
        if (previousHtmlPosition.start > previousHtmlIndex) {
          previousHtmlFragments.push(
            previousHtml.slice(previousHtmlIndex, previousHtmlPosition.start),
          )
        }
        const previousOriginalHtmlFragment = previousHtml.slice(
          previousHtmlPosition.start,
          previousHtmlPosition.stop,
        )
        const previousModifiedHtmlFragment = `<del style="background-color: oklch(80.8% 0.114 19.571) !important">${previousOriginalHtmlFragment}</del>`
        previousHtmlFragments.push(previousModifiedHtmlFragment)
        previousHtmlIndex = previousHtmlPosition.stop
      }
    }

    const currentHtmlPositions = reversePositionsSplitFromPositions(
      currentTransformation,
      currentTextPositions,
    )
    for (const currentHtmlPositionsForTextPosition of currentHtmlPositions) {
      for (const currentHtmlPosition of currentHtmlPositionsForTextPosition) {
        if (currentHtmlPosition.start > currentHtmlIndex) {
          currentHtmlFragments.push(
            currentHtml.slice(currentHtmlIndex, currentHtmlPosition.start),
          )
        }
        const currentOriginalHtmlFragment = currentHtml.slice(
          currentHtmlPosition.start,
          currentHtmlPosition.stop,
        )
        const currentModifiedHtmlFragment = `<ins style="background-color: oklch(87.1% 0.15 154.449) !important">${currentOriginalHtmlFragment}</ins>`
        currentHtmlFragments.push(currentModifiedHtmlFragment)
        currentHtmlIndex = currentHtmlPosition.stop
      }
    }
    return [previousHtmlIndex, currentHtmlIndex]
  }

  const generateDocumentsDiff = (
    previous: DocumentPageInfos,
    current: DocumentPageInfos,
  ): [string, string] => {
    const currentTableOfContentsItems = [
      ...walkTableOfContents(current.documentSegmentation!),
    ] as Array<
      TableOfContentsArticlePositioned | TableOfContentsDivisionPositioned
    >
    const previousTableOfContentsItems = [
      ...walkTableOfContents(previous.documentSegmentation!),
    ] as Array<
      TableOfContentsArticlePositioned | TableOfContentsDivisionPositioned
    >
    let currentHtml = current.documentHtml
    const currentHtmlFragments: string[] = []
    let currentHtmlIndex = 0
    let currentIndex = 0
    let previousHtml = previous.documentHtml
    const previousHtmlFragments: string[] = []
    let previousHtmlIndex = 0
    for (
      let previousIndex = 0;
      previousIndex < previousTableOfContentsItems.length;
      previousIndex++
    ) {
      const previousItem = previousTableOfContentsItems[previousIndex]
      const previousNextItem = previousTableOfContentsItems[previousIndex + 1]
      if (previousItem.type !== "article") {
        continue
      }
      const matchingCurrentIndex = currentTableOfContentsItems.findIndex(
        (item) =>
          item.line.replace(/ :$/, "") === previousItem.line.replace(/ :$/, ""),
      )
      if (matchingCurrentIndex === -1) {
        // Previous article is deleted.
        ;[previousHtmlIndex, currentHtmlIndex] = generateBlocksDiff({
          currentBlockPosition: {
            start: currentHtmlIndex,
            stop: currentHtmlIndex,
          },
          currentHtml,
          currentHtmlFragments,
          currentHtmlIndex,
          currentTransformation: current.documentTransformation!,
          previousBlockPosition: {
            start: previousItem.position.start, // Include article title.
            stop:
              previousNextItem === undefined
                ? previousHtml.length
                : previousNextItem.position.start - 1, // Remove \n before line of next block.
          },
          previousHtml,
          previousHtmlFragments,
          previousHtmlIndex,
          previousTransformation: previous.documentTransformation!,
        })
      } else {
        for (; currentIndex < matchingCurrentIndex; currentIndex++) {
          // Current article is inserted.
          const currentItem = currentTableOfContentsItems[currentIndex]
          const currentNextItem = currentTableOfContentsItems[currentIndex + 1]
          ;[previousHtmlIndex, currentHtmlIndex] = generateBlocksDiff({
            currentBlockPosition: {
              start: currentItem.position.start, // Include article title.
              stop:
                currentNextItem === undefined
                  ? currentHtml.length
                  : currentNextItem.position.start - 1, // Remove \n before line of next block.
            },
            currentHtml,
            currentHtmlFragments,
            currentHtmlIndex,
            currentTransformation: current.documentTransformation!,
            previousBlockPosition: {
              start: previousHtmlIndex,
              stop: previousHtmlIndex,
            },
            previousHtml,
            previousHtmlFragments,
            previousHtmlIndex,
            previousTransformation: previous.documentTransformation!,
          })
        }

        // Both previous & current article exist => diff them.
        const currentItem = currentTableOfContentsItems[currentIndex]
        const currentNextItem = currentTableOfContentsItems[currentIndex + 1]
        ;[previousHtmlIndex, currentHtmlIndex] = generateBlocksDiff({
          currentBlockPosition: {
            start: currentItem.position.stop + 1, // Skip article title.
            stop:
              currentNextItem === undefined
                ? currentHtml.length
                : currentNextItem.position.start - 1, // Remove \n before line of next block.
          },
          currentHtml,
          currentHtmlFragments,
          currentHtmlIndex,
          currentTransformation: current.documentTransformation!,
          previousBlockPosition: {
            start: previousItem.position.stop + 1, // Skip article title.
            stop:
              previousNextItem === undefined
                ? previousHtml.length
                : previousNextItem.position.start - 1, // Remove \n before line of next block.
          },
          previousHtml,
          previousHtmlFragments,
          previousHtmlIndex,
          previousTransformation: previous.documentTransformation!,
        })
        currentIndex++
      }
    }

    // Insert remaining current articles.
    for (; currentIndex < currentTableOfContentsItems.length; currentIndex++) {
      // Current article is inserted.
      const currentItem = currentTableOfContentsItems[currentIndex]
      const currentNextItem = currentTableOfContentsItems[currentIndex + 1]
      ;[previousHtmlIndex, currentHtmlIndex] = generateBlocksDiff({
        currentBlockPosition: {
          start: currentItem.position.start, // Include article title.
          stop:
            currentNextItem === undefined
              ? currentHtml.length
              : currentNextItem.position.start - 1, // Remove \n before line of next block.
        },
        currentHtml,
        currentHtmlFragments,
        currentHtmlIndex,
        currentTransformation: current.documentTransformation!,
        previousBlockPosition: {
          start: previousHtmlIndex,
          stop: previousHtmlIndex,
        },
        previousHtml,
        previousHtmlFragments,
        previousHtmlIndex,
        previousTransformation: previous.documentTransformation!,
      })
    }

    if (previousHtmlIndex < previousHtml.length) {
      previousHtmlFragments.push(previousHtml.slice(previousHtmlIndex))
    }
    if (currentHtmlIndex < currentHtml.length) {
      currentHtmlFragments.push(currentHtml.slice(currentHtmlIndex))
    }
    return [previousHtmlFragments.join(""), currentHtmlFragments.join("")]
  }

  const [previousHtmlDiff, currentHtmlDiff] = $derived(
    generateDocumentsDiff(previous, current),
  )

  $effect(() => {
    if (
      currentShadowHost?.shadowRoot != null &&
      currentHtmlDiff !== undefined
    ) {
      currentShadowHost.shadowRoot.innerHTML =
        linkUrlOriginReplacement === undefined
          ? currentHtmlDiff
          : currentHtmlDiff.replaceAll(
              "https://tricoteuses.fr",
              linkUrlOriginReplacement,
            )
    }
  })

  $effect(() => {
    if (
      previousShadowHost?.shadowRoot != null &&
      previousHtmlDiff !== undefined
    ) {
      previousShadowHost.shadowRoot.innerHTML =
        linkUrlOriginReplacement === undefined
          ? previousHtmlDiff
          : previousHtmlDiff.replaceAll(
              "https://tricoteuses.fr",
              linkUrlOriginReplacement,
            )
    }
  })
</script>

{#snippet pageSpecificMenuItem()}
  <NavigationMenuDropdown trigger="Document">
    <DropdownMenu.Group>
      <DropdownMenu.Label>Voir aussi</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a href={urlPathFromId(document.dossierRef)}>Dossier législatif</a>
      </DropdownMenu.Item>
    </DropdownMenu.Group>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Autres formats</DropdownMenu.Label>
      <DropdownMenu.Item>
        <a
          class="flex whitespace-nowrap"
          href="https://assemblee.tricoteuses.fr/documents/{document.uid}"
          target="_blank">JSON augmenté <ExternalLinkIcon class="ml-1" /></a
        >
      </DropdownMenu.Item>
    </DropdownMenu.Group>
  </NavigationMenuDropdown>
{/snippet}

{#snippet segmentationView(
  {
    articles,
    divisions,
  }: TableOfContentsPositioned | TableOfContentsDivisionPositioned,
  { idPrefix = "tricoteuses-" }: { idPrefix?: string } = {},
)}
  <ul class="ml-4 list-outside list-disc">
    {#if articles !== undefined}
      <li>
        {#each articles as article, index}{#if index > 0},{/if}
          <a class="link" href="#{idPrefix}{slugify(article.line)}"
            >{article.line}</a
          >
        {/each}
      </li>
    {/if}
    {#if divisions !== undefined}
      {#each divisions as division}
        <li>
          <span>{division.line}</span>
          {@render segmentationView(division, { idPrefix })}
        </li>
      {/each}
    {/if}
  </ul>
{/snippet}

<h1 class="my-4 scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">
  <Badge variant="secondary"
    >{date === undefined ? "date inconnue" : fullDateFormatter(date)}</Badge
  >
  DIFF {document.titres.titrePrincipal}
  <Badge variant="outline">{document.denominationStructurelle}</Badge>
</h1>

<div class="mx-4 flex space-x-4">
  <div class="basis-1/2">
    <div class="flex items-baseline space-x-4">
      {#if previous.documentSegmentation !== undefined}
        <Collapsible.Root>
          <Collapsible.Trigger>Sommaire</Collapsible.Trigger>
          <Collapsible.Content>
            {@render segmentationView(previous.documentSegmentation, {
              idPrefix: "tricoteuses-avant-",
            })}
          </Collapsible.Content>
        </Collapsible.Root>
      {/if}

      <InputGroup.Root class="max-w-36">
        <InputGroup.Input
          id="previousZoomPercentage"
          max="1000"
          min="1"
          step="1"
          type="number"
          bind:value={previousZoomPercentage}
        />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>%</InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Addon
          ><Label for="previousZoomPercentage">Zoom</Label></InputGroup.Addon
        >
      </InputGroup.Root>
    </div>
    <div
      class="h-screen overflow-scroll"
      style:max-height="{previousMaxHeight}px"
    >
      <article
        {@attach attachPreviousDocumentHtml}
        {@attach calculatePreviousRemainingHeight}
        class="relative"
        style:transform="scale({previousZoomPercentage / 100})"
        style:transform-origin="0 0"
        style:transition="transform 0.2s ease-out"
      ></article>
    </div>
  </div>
  <div class="basis-1/2">
    <div class="flex items-baseline space-x-4">
      {#if current.documentSegmentation !== undefined}
        <Collapsible.Root>
          <Collapsible.Trigger>Sommaire</Collapsible.Trigger>
          <Collapsible.Content>
            {@render segmentationView(current.documentSegmentation, {
              idPrefix: "tricoteuses-apres-",
            })}
          </Collapsible.Content>
        </Collapsible.Root>
      {/if}

      <InputGroup.Root class="max-w-36">
        <InputGroup.Input
          id="currentZoomPercentage"
          max="1000"
          min="1"
          step="1"
          type="number"
          bind:value={currentZoomPercentage}
        />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>%</InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Addon
          ><Label for="currentZoomPercentage">Zoom</Label></InputGroup.Addon
        >
      </InputGroup.Root>
    </div>

    <div
      class="h-screen overflow-scroll"
      style:max-height="{currentMaxHeight}px"
    >
      <article
        {@attach attachCurrentDocumentHtml}
        {@attach calculateCurrentRemainingHeight}
        class="relative"
        style:transform="scale({currentZoomPercentage / 100})"
        style:transform-origin="0 0"
        style:transition="transform 0.2s ease-out"
      ></article>
    </div>
  </div>
</div>
