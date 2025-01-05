import { slugify } from "$lib/strings"

export function repositoryNameFromTitle(title: string): string {
  const slug = slugify(title, "_")
  let repositoryName = slug
  if (repositoryName.length > 100) {
    repositoryName = repositoryName
      .replaceAll("_de_", "_")
      .replaceAll("_des_", "_")
      .replaceAll("_l_", "_")
      .replaceAll("_la_", "_")
      .replaceAll("_le_", "_")
      .replaceAll("_les_", "_")
  }
  while (repositoryName.length > 100) {
    repositoryName = repositoryName.replace(/_[^_]+$/, "")
  }
  return repositoryName
}
