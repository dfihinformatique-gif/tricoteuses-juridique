<script lang="ts">
  import {
    Calendar,
    Clock,
    MapPin,
    ExternalLink,
    Bell,
    Video,
    CalendarPlus,
    QrCode,
  } from "@lucide/svelte/icons"
  import { localizedHref } from "$lib/i18n.js"
  import type { TricoteusesMeeting } from "$lib/server/grist.js"
  import { parseMarkdown } from "$lib/markdown.js"
  import { downloadICalFile, generateGoogleCalendarLink } from "$lib/ical.js"
  import * as m from "$lib/paraglide/messages.js"
  import { getLocale } from "$lib/paraglide/runtime.js"
  import QRCode from "qrcode"
  import { onMount } from "svelte"
  import { Button } from "$lib/components/ui/button"
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu"

  let { meeting }: { meeting: TricoteusesMeeting } = $props()

  let qrCodeDataUrl = $state<string>("")
  let showQrCode = $state(false)

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

  function getDaysUntil(dateString: string): number {
    const meetingDate = new Date(dateString)
    const now = new Date()
    const diffTime = meetingDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntil = $derived(getDaysUntil(meeting.Date))

  const descriptionHtml = $derived(
    meeting.Description ? parseMarkdown(meeting.Description) : "",
  )

  // Générer le QR code pour le lien de visio
  onMount(async () => {
    if (meeting.Lien) {
      try {
        qrCodeDataUrl = await QRCode.toDataURL(meeting.Lien, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })
      } catch (err) {
        console.error("Error generating QR code:", err)
      }
    }
  })

  function handleDownloadICal() {
    downloadICalFile(meeting)
  }

  function handleOpenGoogleCalendar() {
    const link = generateGoogleCalendarLink(meeting)
    window.open(link, "_blank", "noopener,noreferrer")
  }

  function getDaysPlural(days: number): string {
    return days > 1 ? "s" : ""
  }
</script>

<div
  class="mb-8 rounded-lg border-2 border-primary/30 bg-linear-to-r from-primary/10 to-primary/5 p-6 shadow-md"
>
  <div class="flex items-start gap-4">
    <div class="shrink-0">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20"
      >
        <Bell class="h-6 w-6 text-primary" />
      </div>
    </div>
    <div class="flex-1">
      <h3 class="mb-2 text-lg font-semibold text-primary">
        {m.meeting_alert_title()}
        {#if daysUntil === 0}
          <span class="text-sm font-normal">({m.meeting_alert_today()})</span>
        {:else if daysUntil === 1}
          <span class="text-sm font-normal">({m.meeting_alert_tomorrow()})</span
          >
        {:else if daysUntil > 0 && daysUntil <= 7}
          <span class="text-sm font-normal">
            ({m.meeting_alert_in_days({
              days: daysUntil.toString(),
              plural: getDaysPlural(daysUntil),
            })})
          </span>
        {/if}
      </h3>

      <div class="mb-3 space-y-2">
        <div class="flex items-center gap-2">
          <Calendar class="h-4 w-4 text-primary/70" />
          <span class="font-medium capitalize">{formatDate(meeting.Date)}</span>
        </div>

        {#if meeting.Heure}
          <div class="flex items-center gap-2 text-sm">
            <Clock class="h-4 w-4 text-muted-foreground" />
            <span>{meeting.Heure}</span>
          </div>
        {/if}

        {#if meeting.Lieu}
          <div class="flex items-center gap-2 text-sm">
            <MapPin class="h-4 w-4 text-muted-foreground" />
            <span>{meeting.Lieu}</span>
          </div>
        {/if}

        {#if meeting.Lien}
          <div class="flex items-start gap-2 text-sm">
            <Video class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div class="flex-1">
              <div class="mb-0.5 text-xs font-medium text-muted-foreground">
                {meeting.Lieu === "Visioconférence"
                  ? m.meeting_video_link_label()
                  : m.meeting_link_label()}
              </div>
              <a
                href={meeting.Lien}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {meeting.Lien}
                <ExternalLink class="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>
        {/if}
      </div>

      {#if meeting.Description}
        <div class="prose prose-sm mb-3 max-w-none text-muted-foreground">
          {@html descriptionHtml}
        </div>
      {/if}

      <div class="flex flex-wrap gap-3">
        <a
          href={localizedHref("/reunions")}
          class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {m.meeting_view_all()}
          <ExternalLink class="h-3 w-3" />
        </a>

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
            <DropdownMenu.Item onclick={handleDownloadICal}>
              <Calendar class="mr-2 h-4 w-4" />
              iCal / Apple Calendar
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={handleOpenGoogleCalendar}>
              <Calendar class="mr-2 h-4 w-4" />
              Google Calendar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <!-- Bouton QR Code -->
        {#if meeting.Lien && qrCodeDataUrl}
          <Button
            variant="outline"
            size="sm"
            onclick={() => (showQrCode = !showQrCode)}
          >
            <QrCode class="mr-2 h-4 w-4" />
            {showQrCode ? m.meeting_qr_code_hide() : m.meeting_qr_code_show()}
          </Button>
        {/if}
      </div>

      <!-- QR Code affiché -->
      {#if showQrCode && qrCodeDataUrl}
        <div
          class="mt-4 flex flex-col items-center rounded-md border bg-white p-4"
        >
          <p class="mb-2 text-sm font-medium text-gray-700">
            {m.meeting_qr_code_scan()}
          </p>
          <img
            src={qrCodeDataUrl}
            alt="QR Code pour rejoindre la visioconférence"
            class="rounded"
          />
        </div>
      {/if}
    </div>
  </div>
</div>
