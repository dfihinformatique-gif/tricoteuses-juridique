import type { TricoteusesMeeting } from "$lib/grist.js"

/**
 * Génère un fichier iCal (.ics) pour une réunion
 */
export function generateICalFile(meeting: TricoteusesMeeting): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")

  // Parser la date et l'heure
  const dateStr = meeting.Date // Format: YYYY-MM-DD
  const timeStr = meeting.Heure || "12:00" // Par défaut midi si pas d'heure

  // Créer la date de début
  let startDateTime: Date
  if (timeStr.toLowerCase().includes("toute la journée")) {
    // Événement toute la journée
    startDateTime = new Date(dateStr + "T00:00:00")
  } else {
    // Parser l'heure (formats: "12h00", "21h00", "12:00")
    const timeParts = timeStr.match(/(\d+)[h:](\d+)/)
    if (timeParts) {
      const hours = timeParts[1].padStart(2, "0")
      const minutes = timeParts[2].padStart(2, "0")
      startDateTime = new Date(`${dateStr}T${hours}:${minutes}:00`)
    } else {
      startDateTime = new Date(dateStr + "T12:00:00")
    }
  }

  // Date de fin (2 heures après le début par défaut)
  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)

  // Formater les dates au format iCal (YYYYMMDDTHHMMSS)
  const formatICalDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")
  }

  const dtStart = timeStr.toLowerCase().includes("toute la journée")
    ? dateStr.replace(/-/g, "")
    : formatICalDate(startDateTime)
  const dtEnd = timeStr.toLowerCase().includes("toute la journée")
    ? dateStr.replace(/-/g, "")
    : formatICalDate(endDateTime)

  // Préparer la description et le lieu
  const description = meeting.Description?.replace(/\n/g, "\\n") || ""
  const location = meeting.Lieu || ""
  const url = meeting.Lien || ""

  // Générer l'UID unique
  const uid = `meeting-${meeting.id}-${dateStr}@tricoteuses.fr`

  // Construire le fichier iCal
  const icalLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tricoteuses//Meetings//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
  ]

  // Ajouter les dates selon le type d'événement
  if (timeStr.toLowerCase().includes("toute la journée")) {
    icalLines.push(`DTSTART;VALUE=DATE:${dtStart}`)
    icalLines.push(`DTEND;VALUE=DATE:${dtEnd}`)
  } else {
    icalLines.push(`DTSTART:${dtStart}`)
    icalLines.push(`DTEND:${dtEnd}`)
  }

  icalLines.push(
    `SUMMARY:Réunion des Tricoteuses`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
  )

  if (url) {
    icalLines.push(`URL:${url}`)
  }

  icalLines.push(
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Rappel: Réunion des Tricoteuses dans 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  )

  return icalLines.join("\r\n")
}

/**
 * Génère un lien Google Calendar pour une réunion
 */
export function generateGoogleCalendarLink(
  meeting: TricoteusesMeeting,
): string {
  const dateStr = meeting.Date
  const timeStr = meeting.Heure || "12:00"

  // Parser la date et l'heure
  let startDateTime: Date
  if (timeStr.toLowerCase().includes("toute la journée")) {
    startDateTime = new Date(dateStr + "T00:00:00")
  } else {
    const timeParts = timeStr.match(/(\d+)[h:](\d+)/)
    if (timeParts) {
      const hours = timeParts[1].padStart(2, "0")
      const minutes = timeParts[2].padStart(2, "0")
      startDateTime = new Date(`${dateStr}T${hours}:${minutes}:00`)
    } else {
      startDateTime = new Date(dateStr + "T12:00:00")
    }
  }

  const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)

  // Format Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatGoogleDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")
  }

  const dates = `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`
  const text = encodeURIComponent("Réunion des Tricoteuses")
  const details = encodeURIComponent(meeting.Description || "")
  const location = encodeURIComponent(meeting.Lieu || "")

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates,
    details,
    location,
  })

  if (meeting.Lien) {
    params.set("details", `${meeting.Description || ""}\n\n${meeting.Lien}`)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Télécharge un fichier iCal
 */
export function downloadICalFile(meeting: TricoteusesMeeting): void {
  const icalContent = generateICalFile(meeting)
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `reunion-tricoteuses-${meeting.Date}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
