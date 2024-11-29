import assert from "assert"
import fs from "fs-extra"
import sade from "sade"

import type {
  LegiSectionTa,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTexteVersion,
} from "$lib/legal/legi"
import { db } from "$lib/server/databases"

async function exportLegiTexteToMarkdown(
  legiTexteId: string,
  targetDir: string,
): Promise<void> {
  const texteVersion = (
    await db<{ data: LegiTexteVersion }[]>`
    SELECT data FROM texte_version WHERE id = ${legiTexteId}
  `
  )[0]?.data
  assert.notStrictEqual(texteVersion, undefined)

  const textelr = (
    await db<{ data: LegiTextelr }[]>`
    SELECT data FROM textelr WHERE id = ${legiTexteId}
  `
  )[0]?.data
  assert.notStrictEqual(textelr, undefined)

  const meta = texteVersion.META
  const metaTexteVersion = meta.META_SPEC.META_TEXTE_VERSION
  console.log(
    `${meta.META_COMMUN.ID} ${metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? meta.META_COMMUN.ID} (${metaTexteVersion.DATE_DEBUT ?? ""} — ${metaTexteVersion.DATE_FIN === "2999-01-01" ? "…" : (metaTexteVersion.DATE_FIN ?? "")}, ${metaTexteVersion.ETAT})`,
  )

  const textelrStructure = textelr.STRUCT
  for await (const {
    lienSectionTa,
    parentsSectionTa,
    sectionTa,
  } of walkStructureTree(textelrStructure as LegiSectionTaStructure)) {
    console.log(
      `${sectionTa.ID} ${"  ".repeat(parentsSectionTa.length + 1)}${sectionTa.TITRE_TA?.replace(/\s+/g, " ") ?? sectionTa.ID} (${lienSectionTa["@debut"]} — ${lienSectionTa["@fin"] === "2999-01-01" ? "…" : lienSectionTa["@fin"]}, ${lienSectionTa["@etat"]})`,
    )
  }
}

async function* walkStructureTree(
  structure: LegiSectionTaStructure,
  parentsSectionTa: LegiSectionTa[] = [],
): AsyncGenerator<
  {
    lienSectionTa: LegiSectionTaLienSectionTa
    parentsSectionTa: LegiSectionTa[]
    sectionTa: LegiSectionTa
  },
  void
> {
  const liensSectionTa = structure?.LIEN_SECTION_TA
  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const childSectionTa = (
        await db<{ data: LegiSectionTa }[]>`
          SELECT data FROM section_ta WHERE id = ${lienSectionTa["@id"]}
      `
      )[0]?.data
      assert.notStrictEqual(childSectionTa, undefined)
      yield { lienSectionTa, parentsSectionTa, sectionTa: childSectionTa }
      const childStructure = childSectionTa.STRUCTURE_TA
      if (childStructure !== undefined) {
        yield* walkStructureTree(childStructure, [
          ...parentsSectionTa,
          childSectionTa,
        ])
      }
    }
  }
}

sade("export_legi_texte_to_markdown <legiTexteId> <targetDir>", true)
  .describe(
    "Convert a LEGI texte (code, law, etc) to a markdown tree in a directory",
  )
  .action(async (legiTexteId, targetDir) => {
    await exportLegiTexteToMarkdown(legiTexteId, targetDir)
    process.exit(0)
  })
  .parse(process.argv)
