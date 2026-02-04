import type { TricoteusesMeeting } from "$lib/grist.js"

/**
 * Parse meeting time from "HH:MM" or "HHhMM" format, returns null if invalid
 */
function parseMeetingTime(
  timeString?: string,
): { hours: number; minutes: number } | null {
  if (!timeString) return null

  // Support both "12:00" and "12h00" formats
  const match = timeString.match(/^(\d{1,2})[:h](\d{2})/)
  if (!match) return null

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return { hours, minutes }
}

/**
 * Get meeting end time (meeting date + time + 1 hour)
 * If no time is specified, assumes end of day (23:59) + 1 hour
 */
export function getMeetingEndTime(meeting: TricoteusesMeeting): Date {
  // Parse date in local timezone by splitting the ISO date string
  // This avoids timezone issues with Date constructor
  const [year, month, day] = meeting.Date.split("-").map(Number)
  const meetingDate = new Date(year, month - 1, day)

  const time = parseMeetingTime(meeting.Heure)

  if (time) {
    // Set the meeting start time
    meetingDate.setHours(time.hours, time.minutes, 0, 0)
    // Add 1 hour
    meetingDate.setHours(meetingDate.getHours() + 1)
  } else {
    // No time specified, assume end of day + 1 hour
    meetingDate.setHours(23, 59, 0, 0)
    meetingDate.setHours(meetingDate.getHours() + 1)
  }

  return meetingDate
}

/**
 * Check if a meeting has ended (current time > meeting end time + 1 hour)
 */
export function isMeetingEnded(meeting: TricoteusesMeeting): boolean {
  const now = new Date()
  const meetingEndTime = getMeetingEndTime(meeting)
  return now > meetingEndTime
}

/**
 * Check if a meeting is still relevant to display
 * (hasn't ended yet, meaning current time <= meeting end time + 1 hour)
 */
export function isMeetingRelevant(meeting: TricoteusesMeeting): boolean {
  return !isMeetingEnded(meeting)
}
