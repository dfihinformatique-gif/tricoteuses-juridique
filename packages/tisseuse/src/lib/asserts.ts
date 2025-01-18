export function assertNever(type: string, value: never): never {
  throw `Unexpected type ${type}: ${type}`
}
