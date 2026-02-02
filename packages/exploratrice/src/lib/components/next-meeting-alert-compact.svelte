<script lang="ts">
  import { Calendar } from "@lucide/svelte/icons"
  import { localizedHref } from "$lib/i18n.js"
  import type { TricoteusesMeeting } from "$lib/server/grist.js"
  import * as m from "$lib/paraglide/messages.js"
  import { getLocale } from "$lib/paraglide/runtime.js"

  let { meeting }: { meeting: TricoteusesMeeting } = $props()

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
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

  function getDaysPlural(days: number): string {
    return days > 1 ? "s" : ""
  }
</script>

<a
  href={localizedHref("/reunions")}
  class="mb-4 flex items-center justify-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm transition-colors hover:bg-primary/10"
>
  <Calendar class="h-4 w-4 shrink-0 text-primary" />
  <span class="text-foreground">
    <span class="font-medium">{m.meeting_alert_title()}</span>
    {#if daysUntil === 0}
      <span class="text-muted-foreground">({m.meeting_alert_today()})</span>
    {:else if daysUntil === 1}
      <span class="text-muted-foreground">({m.meeting_alert_tomorrow()})</span>
    {:else if daysUntil > 0 && daysUntil <= 7}
      <span class="text-muted-foreground">
        ({m.meeting_alert_in_days({
          days: daysUntil.toString(),
          plural: getDaysPlural(daysUntil),
        })})
      </span>
    {/if}
    — <span class="capitalize">{formatDate(meeting.Date)}</span>
    {#if meeting.Heure}
      <span class="text-muted-foreground">à {meeting.Heure}</span>
    {/if}
  </span>
</a>
