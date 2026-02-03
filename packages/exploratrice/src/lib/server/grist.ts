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

    // Filter future meetings and sort by date
    const now = new Date()
    const futureMeetings = meetings
      .filter((meeting) => {
        const meetingDate = new Date(meeting.Date)
        return meetingDate >= now
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
