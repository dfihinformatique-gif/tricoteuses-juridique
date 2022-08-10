import type { AuditSwitchError } from "@auditors/core"

export function realErrorFromError(error: unknown): unknown {
  if (
    error !== null &&
    typeof error === "object" &&
    (error as { [key: string]: unknown })["@auditors/error"] === "switch"
  ) {
    const { errors, index } = error as AuditSwitchError
    return realErrorFromError(errors[index])
  }
  return error
}
