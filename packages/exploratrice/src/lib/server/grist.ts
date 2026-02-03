import config from "$lib/server/config.js"
import { getOrSet } from "$lib/server/cache.js"

export interface GristRecord<T = Record<string, unknown>> {
  id: number
  fields: T
}

export interface GristRecordsResponse<T = Record<string, unknown>> {
  records: GristRecord<T>[]
}

export interface TricoteusesMeeting {
  id: number
  Date: string
  Heure?: string
  Lieu?: string
  Description?: string
  Lien?: string
}

interface GristMeetingRaw {
  Date: number | string
  Heure?: string
  Lieu?: string
  Description?: string
  Lien?: string
}

/**
 * Converts a Grist timestamp (Unix seconds) to ISO date string
 */
function convertGristDate(dateValue: number | string): string {
  if (typeof dateValue === "string") {
    return dateValue
  }
  // Grist stores dates as Unix timestamps in seconds, convert to milliseconds
  return new Date(dateValue * 1000).toISOString().split("T")[0]
}

/**
 * Fetches records from a Grist table
 */
async function fetchGristRecords<T = Record<string, unknown>>(
  docId: string,
  tableId: string,
): Promise<GristRecordsResponse<T>> {
  const url = `${config.grist.instanceUrl}/api/docs/${docId}/tables/${tableId}/records`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.grist.apiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Grist records: ${response.status} ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Parse meeting time from "HH:MM" format, returns null if invalid
 */
function parseMeetingTime(
  timeString?: string,
): { hours: number; minutes: number } | null {
  if (!timeString) return null

  const match = timeString.match(/^(\d{1,2}):(\d{2})/)
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
function getMeetingEndTime(meeting: TricoteusesMeeting): Date {
  const meetingDate = new Date(meeting.Date)

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
 * Fetches the next upcoming Tricoteuses meeting without cache
 */
async function fetchNextTricoteusesMeeting(): Promise<TricoteusesMeeting | null> {
  const docId = config.grist.docId
  const tableId = "Reunions"

  try {
    const data = await fetchGristRecords<GristMeetingRaw>(docId, tableId)

    if (!data.records || data.records.length === 0) {
      return null
    }

    // Convert Grist timestamps to ISO dates
    const meetings = data.records.map((record) => ({
      id: record.id,
      ...record.fields,
      Date: convertGristDate(record.fields.Date),
    }))

    // Filter meetings that haven't ended yet (meeting end time + 1 hour > now)
    const now = new Date()
    const futureMeetings = meetings
      .filter((meeting) => {
        const meetingEndTime = getMeetingEndTime(meeting)
        return meetingEndTime > now
      })
      .sort((a, b) => {
        const dateA = new Date(a.Date)
        const dateB = new Date(b.Date)
        return dateA.getTime() - dateB.getTime()
      })

    if (futureMeetings.length === 0) {
      return null
    }

    return futureMeetings[0]
  } catch (error) {
    console.error("Error fetching Tricoteuses meetings from Grist:", error)
    return null
  }
}

/**
 * Gets the next upcoming Tricoteuses meeting (with caching)
 */
export async function getNextTricoteusesMeeting(): Promise<TricoteusesMeeting | null> {
  return getOrSet(
    "grist-next-meeting",
    fetchNextTricoteusesMeeting,
    config.grist.cacheTtlMinutes,
  )
}

/**
 * Gets all Tricoteuses meetings
 */
export async function getAllTricoteusesMeetings(): Promise<
  TricoteusesMeeting[]
> {
  const docId = config.grist.docId
  const tableId = "Reunions"

  try {
    const data = await fetchGristRecords<GristMeetingRaw>(docId, tableId)

    if (!data.records || data.records.length === 0) {
      return []
    }

    // Convert Grist timestamps to ISO dates and sort by date (most recent first)
    return data.records
      .map((record) => ({
        id: record.id,
        ...record.fields,
        Date: convertGristDate(record.fields.Date),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.Date)
        const dateB = new Date(b.Date)
        return dateB.getTime() - dateA.getTime()
      })
  } catch (error) {
    console.error("Error fetching all Tricoteuses meetings from Grist:", error)
    return []
  }
}
