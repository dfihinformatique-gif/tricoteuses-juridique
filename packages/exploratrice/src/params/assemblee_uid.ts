import type { ParamMatcher } from "@sveltejs/kit"

import { AssembleeUidSchema } from "$lib/zod/assemblee.js"

export const match: ParamMatcher = (param: string): boolean => {
  const result = AssembleeUidSchema.safeParse(param)
  return result.success
}
