/**
 * Shared Grist types that can be imported by both server and browser modules
 */

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
