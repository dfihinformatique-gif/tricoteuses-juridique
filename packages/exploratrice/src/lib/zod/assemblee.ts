/**
 * Assemblée nationale validation schemas
 * Replaces auditors from src/lib/auditors/assemblee.ts
 */

import { z } from "zod"
import {
  compteRenduUidRegex,
  documentUidRegex,
  dossierUidRegex,
  questionUidRegex,
  reunionUidRegex,
  scrutinUidRegex,
} from "@tricoteuses/assemblee"

/**
 * Validates any Assemblée UID format
 */
export const AssembleeUidSchema = z
  .string()
  .trim()
  .refine(
    (uid) =>
      [
        compteRenduUidRegex,
        documentUidRegex,
        dossierUidRegex,
        questionUidRegex,
        reunionUidRegex,
        scrutinUidRegex,
      ].some((regex) => regex.test(uid)),
    { message: "Invalid format for Assemblée UID" }
  )

export type AssembleeUid = z.infer<typeof AssembleeUidSchema>

/**
 * Validates Assemblée document UID format
 */
export const DocumentUidSchema = z
  .string()
  .trim()
  .regex(documentUidRegex, "Invalid format for Assemblée Document UID")

export type DocumentUid = z.infer<typeof DocumentUidSchema>

/**
 * Validates Assemblée dossier parlementaire UID format
 */
export const DossierParlementaireUidSchema = z
  .string()
  .trim()
  .regex(dossierUidRegex, "Invalid format for Assemblée DossierParlementaire UID")

export type DossierParlementaireUid = z.infer<typeof DossierParlementaireUidSchema>

/**
 * Validates Assemblée compte rendu UID format
 */
export const CompteRenduUidSchema = z
  .string()
  .trim()
  .regex(compteRenduUidRegex, "Invalid format for Assemblée CompteRendu UID")

export type CompteRenduUid = z.infer<typeof CompteRenduUidSchema>

/**
 * Validates Assemblée question UID format
 */
export const QuestionUidSchema = z
  .string()
  .trim()
  .regex(questionUidRegex, "Invalid format for Assemblée Question UID")

export type QuestionUid = z.infer<typeof QuestionUidSchema>

/**
 * Validates Assemblée reunion UID format
 */
export const ReunionUidSchema = z
  .string()
  .trim()
  .regex(reunionUidRegex, "Invalid format for Assemblée Reunion UID")

export type ReunionUid = z.infer<typeof ReunionUidSchema>

/**
 * Validates Assemblée scrutin UID format
 */
export const ScrutinUidSchema = z
  .string()
  .trim()
  .regex(scrutinUidRegex, "Invalid format for Assemblée Scrutin UID")

export type ScrutinUid = z.infer<typeof ScrutinUidSchema>
