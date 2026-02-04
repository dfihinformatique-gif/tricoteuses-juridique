<script lang="ts">
  import {
    Calendar,
    Clock,
    MapPin,
    ExternalLink,
    Video,
    CalendarPlus,
    QrCode,
  } from "@lucide/svelte/icons"
  import type { PageData } from "./$types.js"
  import { parseMarkdown } from "$lib/markdown.js"
  import { downloadICalFile, generateGoogleCalendarLink } from "$lib/ical.js"

  import * as m from "$lib/paraglide/messages.js"
  import { getLocale } from "$lib/paraglide/runtime.js"
  import QRCode from "qrcode"
  import { onMount } from "svelte"
  import { Button } from "$lib/components/ui/button"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu"
  import OpenGraphMeta from "$lib/components/open-graph-meta.svelte"

  let { data }: { data: PageData } = $props()

  const ogMetadata = $derived(data.ogMetadata)

  // QR codes pour chaque réunion
  let qrCodes = $state<Record<number, string>>({})
  let expandedQrCodes = $state<Record<number, boolean>>({})

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    // Convert Paraglide locale ("fr", "en") to BCP 47 locale tag ("fr-FR", "en-US")
    const locale = getLocale()
    const localeTag = locale === "fr" ? "fr-FR" : "en-US"
    return new Intl.DateTimeFormat(localeTag, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  // Les réunions sont déjà filtrées côté serveur (utilise l'heure du serveur)
  const upcomingMeetings = $derived(data.upcomingMeetings)
  const pastMeetings = $derived(data.pastMeetings)

  // Générer les QR codes pour toutes les réunions avec liens
  onMount(async () => {
    const allMeetings = [...data.upcomingMeetings, ...data.pastMeetings]
    const meetingsWithLinks = allMeetings.filter((m) => m.Lien)
    for (const meeting of meetingsWithLinks) {
      try {
        const qrDataUrl = await QRCode.toDataURL(meeting.Lien!, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })
        qrCodes[meeting.id] = qrDataUrl
      } catch (err) {
        console.error(
          `Error generating QR code for meeting ${meeting.id}:`,
          err,
        )
      }
    }
  })

  function handleDownloadICal(meeting: (typeof data.meetings)[0]) {
    downloadICalFile(meeting)
  }

  function handleOpenGoogleCalendar(meeting: (typeof data.meetings)[0]) {
    const link = generateGoogleCalendarLink(meeting)
    window.open(link, "_blank", "noopener,noreferrer")
  }

  function toggleQrCode(meetingId: number) {
    expandedQrCodes[meetingId] = !expandedQrCodes[meetingId]
  }
</script>

<OpenGraphMeta metadata={ogMetadata} />

<div class="container mx-auto max-w-5xl px-4 py-8">
  <header class="mb-12">
    <h1 class="mb-4 text-4xl font-bold">{m.meetings_title()}</h1>
    <p class="text-lg text-muted-foreground">
      {m.meetings_description()}
    </p>
    <div class="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p class="text-base text-foreground">
        {@html parseMarkdown(m.meetings_schedule_info())}
      </p>
    </div>
  </header>

  {#if upcomingMeetings.length > 0}
    <section class="mb-12">
      <h2 class="mb-6 text-2xl font-semibold">{m.meetings_upcoming_title()}</h2>
      <div class="space-y-4">
        {#each upcomingMeetings as meeting (meeting.id)}
          <div
            class="rounded-lg border border-primary/20 bg-primary/5 p-6 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div class="mb-4 flex items-start justify-between">
              <div class="flex-1">
                <div class="mb-2 flex items-center gap-2 text-primary">
                  <Calendar class="h-5 w-5" />
                  <span class="text-lg font-semibold capitalize">
                    {formatDate(meeting.Date)}
                  </span>
                </div>
                {#if meeting.Heure}
                  <div
                    class="mb-2 flex items-center gap-2 text-muted-foreground"
                  >
                    <Clock class="h-4 w-4" />
                    <span>{meeting.Heure}</span>
                  </div>
                {/if}
                {#if meeting.Lieu}
                  <div class="flex items-center gap-2 text-muted-foreground">
                    <MapPin class="h-4 w-4" />
                    <span>{meeting.Lieu}</span>
                  </div>
                {/if}
              </div>
            </div>
            {#if meeting.Description}
              <div class="prose prose-sm mb-3 max-w-none text-muted-foreground">
                {@html parseMarkdown(meeting.Description)}
              </div>
            {/if}
            {#if meeting.Lien}
              <div
                class="mb-3 flex items-start gap-2 rounded-md bg-primary/10 p-3"
              >
                <Video class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div class="min-w-0 flex-1">
                  <div class="mb-1 text-xs font-medium text-primary">
                    {meeting.Lieu === "Visioconférence"
                      ? m.meeting_video_link_label()
                      : m.meeting_link_label()}
                  </div>
                  <a
                    href={meeting.Lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-sm break-all text-primary hover:underline"
                  >
                    {meeting.Lien}
                    <ExternalLink class="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            {/if}

            <!-- Actions -->
            <div class="flex flex-wrap gap-2">
              <!-- Bouton Ajouter au calendrier -->
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Button {...props} variant="outline" size="sm">
                      <CalendarPlus class="mr-2 h-4 w-4" />
                      {m.meeting_add_to_calendar()}
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item
                    onclick={() => handleDownloadICal(meeting)}
                  >
                    <Calendar class="mr-2 h-4 w-4" />
                    iCal / Apple Calendar
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onclick={() => handleOpenGoogleCalendar(meeting)}
                  >
                    <Calendar class="mr-2 h-4 w-4" />
                    Google Calendar
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              <!-- Bouton QR Code -->
              {#if meeting.Lien && qrCodes[meeting.id]}
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => toggleQrCode(meeting.id)}
                >
                  <QrCode class="mr-2 h-4 w-4" />
                  {expandedQrCodes[meeting.id]
                    ? m.meeting_qr_code_hide()
                    : m.meeting_qr_code_show()}
                </Button>
              {/if}
            </div>

            <!-- QR Code -->
            {#if expandedQrCodes[meeting.id] && qrCodes[meeting.id]}
              <div
                class="mt-4 flex flex-col items-center rounded-md border bg-white p-4"
              >
                <p class="mb-2 text-sm font-medium text-gray-700">
                  {m.meeting_qr_code_scan()}
                </p>
                <img
                  src={qrCodes[meeting.id]}
                  alt="QR Code pour rejoindre la visioconférence"
                  class="rounded"
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {:else}
    <section class="mb-12">
      <div
        class="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center"
      >
        <Calendar class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <p class="text-lg text-muted-foreground">
          {m.meetings_no_upcoming()}
        </p>
      </div>
    </section>
  {/if}

  {#if pastMeetings.length > 0}
    <section>
      <h2 class="mb-6 text-2xl font-semibold text-muted-foreground">
        {m.meetings_past_title()}
      </h2>
      <div class="space-y-3">
        {#each pastMeetings as meeting (meeting.id)}
          <div
            class="rounded-lg border bg-muted/20 p-4 opacity-70 transition-all hover:opacity-100"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="mb-1 flex items-center gap-2">
                  <Calendar class="h-4 w-4 text-muted-foreground" />
                  <span class="font-medium text-muted-foreground capitalize">
                    {formatDate(meeting.Date)}
                  </span>
                  {#if meeting.Heure}
                    <span class="text-sm text-muted-foreground">
                      · {meeting.Heure}
                    </span>
                  {/if}
                </div>
                {#if meeting.Lieu}
                  <div class="mb-1 flex items-center gap-2">
                    <MapPin class="h-3 w-3 text-muted-foreground" />
                    <span class="text-sm text-muted-foreground">
                      {meeting.Lieu}
                    </span>
                  </div>
                {/if}
                {#if meeting.Description}
                  <div
                    class="prose prose-sm mb-2 max-w-none text-muted-foreground"
                  >
                    {@html parseMarkdown(meeting.Description)}
                  </div>
                {/if}
                {#if meeting.Lien}
                  <div class="mt-2 flex items-start gap-2">
                    <Video
                      class="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground"
                    />
                    <a
                      href={meeting.Lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs break-all text-muted-foreground hover:underline"
                    >
                      {meeting.Lien}
                      <ExternalLink class="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
