import type { ParamMatcher } from "@sveltejs/kit"
import { legalId } from "$lib/zod/legifrance.js"

const LegalIdSchema = legalId()

export const match: ParamMatcher = (param: string): boolean => {
  const result = LegalIdSchema.safeParse(param)
  return result.success
}
