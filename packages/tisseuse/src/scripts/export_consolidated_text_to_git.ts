import assert from "assert"
import dedent from "dedent-js"
import fs from "fs-extra"
import git from "isomorphic-git"
import path from "path"
import * as prettier from "prettier"
import sade from "sade"

import type {
  JorfArticle,
  JorfArticleTm,
  JorfSectionTa,
  JorfSectionTaLienArt,
  JorfSectionTaLienSectionTa,
  JorfSectionTaStructure,
  JorfTextelr,
  JorfTextelrLienArt,
  JorfTexteVersion,
} from "$lib/legal/jorf"
import type {
  LegiArticle,
  LegiArticleTm,
  LegiSectionTa,
  LegiSectionTaLienArt,
  LegiSectionTaLienSectionTa,
  LegiSectionTaStructure,
  LegiTextelr,
  LegiTextelrLienArt,
  LegiTexteVersion,
} from "$lib/legal/legi"
import type { ArticleLienDb, TexteVersionLienDb } from "$lib/legal/shared"
import { db } from "$lib/server/databases"
import { slugify } from "$lib/strings"
import { walkDir } from "$lib/server/file_systems"

type Action = "CREATE" | "DELETE"

interface Context {
  articleById: Record<string, JorfArticle | LegiArticle>
  consolidatedTextCid: string
  consolidatedTextInternalIds: Set<string>
  consolidatedTextModifyingTextsIdsByActionByDate: Record<
    string,
    Partial<Record<Action, Set<string>>>
  >
  // Current content of a text at a given date
  currentInternalIds: Set<string>
  idsByActionByTexteMoficateurId: Record<
    string,
    Partial<Record<Action, Set<string>>>
  >
  // When a LEGI article, sectionTa or text has been created by the same JORF
  // article, sectionIa or text, ID of this JORF object
  jorfCreatorIdById: Record<string, string>
  modifyingArticleIdByActionById: Record<
    string,
    Partial<Record<Action, string>>
  >
  modifyingTextIdByActionById: Record<string, Partial<Record<Action, string>>>
  sectionTaById: Record<string, LegiSectionTa>
  targetDir: string
  texteManquantById: Record<string, TexteManquant>
  textelrById: Record<string, JorfTextelr | LegiTextelr | null>
  texteVersionById: Record<string, JorfTexteVersion | LegiTexteVersion | null>
}

interface NodeBase {
  children?: SectionTaNode[]
}

interface SectionTaNode extends NodeBase {
  liensArticles?: Array<JorfSectionTaLienArt | LegiSectionTaLienArt>
  titreTm: {
    "#text"?: string
    "@debut": string
    "@fin": string
    "@id": string // ID of a SectionTa
  }
}

interface TextelrNode extends NodeBase {
  liensArticles?: Array<JorfTextelrLienArt | LegiTextelrLienArt>
}

interface TexteManquant {
  date: string
}

const minDateObject = new Date("1971-01-01")
const minDateTimestamp = Math.floor(minDateObject.getTime() / 1000)
const oneDay = 24 * 60 * 60 // hours * minutes * seconds

async function addArticleToTree(
  context: Context,
  tree: TextelrNode,
  encounteredArticlesIds: Set<string>,
  lienArticle:
    | JorfTextelrLienArt
    | LegiTextelrLienArt
    | JorfSectionTaLienArt
    | LegiSectionTaLienArt,
): Promise<void> {
  if (encounteredArticlesIds.has(lienArticle["@id"])) {
    return
  }
  encounteredArticlesIds.add(lienArticle["@id"])
  const article = await getOrLoadArticle(context, lienArticle["@id"])
  await addArticleToTreeNode(
    context,
    tree,
    article.CONTEXTE.TEXTE.TM,
    lienArticle,
    article,
  )
}

async function addArticleToTreeNode(
  context: Context,
  node: SectionTaNode | TextelrNode,
  tm: JorfArticleTm | LegiArticleTm | undefined,
  lienArticle:
    | JorfTextelrLienArt
    | LegiTextelrLienArt
    | JorfSectionTaLienArt
    | LegiSectionTaLienArt,
  article: JorfArticle | LegiArticle,
): Promise<void> {
  if (tm === undefined) {
    // Article is directly in textelr.
    const liensArticles = (node.liensArticles ??= [])
    liensArticles.push(lienArticle as JorfTextelrLienArt | LegiTextelrLienArt)
  } else {
    let foundTitreTm: SectionTaNode["titreTm"]
    if (Array.isArray(tm.TITRE_TM)) {
      // LegiArticleTm
      const sortedTitreTmArray = tm.TITRE_TM.toSorted((titreTm1, titreTm2) =>
        titreTm1["@debut"].localeCompare(titreTm2["@debut"]),
      )
      if (lienArticle["@debut"] < sortedTitreTmArray[0]["@debut"]) {
        // Assume that the @debut of the first TITRE_TM is wrong.
        foundTitreTm = sortedTitreTmArray[0]
      } else if (lienArticle["@debut"] >= sortedTitreTmArray.at(-1)!["@fin"]) {
        // Assume that the @fin of the last TITRE_TM is wrong.
        foundTitreTm = sortedTitreTmArray.at(-1)!
      } else {
        foundTitreTm = sortedTitreTmArray.find(
          (titreTm) => lienArticle["@debut"] < titreTm["@fin"],
        )!
      }
    } else {
      // JorfArticleTm
      foundTitreTm = tm.TITRE_TM
    }
    const children = (node.children ??= [])
    const lastChild = children.at(-1)
    if (foundTitreTm["@id"] === lastChild?.titreTm["@id"]) {
      addArticleToTreeNode(context, lastChild, tm.TM, lienArticle, article)
    } else {
      const newChild: SectionTaNode = { titreTm: foundTitreTm }
      children.push(newChild)
      addArticleToTreeNode(context, newChild, tm.TM, lienArticle, article)
    }
  }
}

async function addModifyingArticleId(
  context: Context,
  modifyingArticleId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const modifyingArticle = await getOrLoadArticle(context, modifyingArticleId)
  const modifyingArticleDateSignature =
    modifyingArticle.CONTEXTE.TEXTE["@date_signature"]
  if (modifyingArticleDateSignature === undefined) {
    throw new Error(
      `Article modificateur ${modifyingArticleId} of ${modifiedId} has no CONTEXTE.TEXTE["@date_signature"]`,
    )
  }
  if (
    action === "CREATE" &&
    modifyingArticleDateSignature !== "2999-01-01" &&
    modifyingArticleDateSignature > modifiedDateDebut
  ) {
    console.warn(
      `Ignoring article créateur ${modifyingArticleId} because its date signature ${modifyingArticleDateSignature} doesn't match date début ${modifiedDateDebut} of ${modifiedId}`,
    )
    return
  }
  if (
    action === "DELETE" &&
    modifyingArticleDateSignature !== "2999-01-01" &&
    modifyingArticleDateSignature > modifiedDateFin
  ) {
    console.warn(
      `Ignoring article suppresseur ${modifyingArticleId} because its date signature ${modifyingArticleDateSignature} doesn't match date fin ${modifiedDateFin} of ${modifiedId}`,
    )
    return
  }

  if (modifiedId.startsWith("LEGITEXT")) {
    // A consolidated text doesn't change. Only its content changes.
  } else {
    const modifyingArticleIdByAction = (context.modifyingArticleIdByActionById[
      modifiedId
    ] ??= {})
    const existingModifyingArticleId = modifyingArticleIdByAction[action]
    if (existingModifyingArticleId === undefined) {
      modifyingArticleIdByAction[action] = modifyingArticleId
    } else if (existingModifyingArticleId !== modifyingArticleId) {
      const existingModifyingArticle = await getOrLoadArticle(
        context,
        existingModifyingArticleId,
      )
      if (
        existingModifyingArticle.CONTEXTE.TEXTE["@date_signature"]! <
        modifyingArticleDateSignature
      ) {
        modifyingArticleIdByAction[action] = modifyingArticleId
      }
    }
  }

  const modifyingTextId = modifyingArticle.CONTEXTE.TEXTE["@cid"]
  if (modifyingTextId !== undefined) {
    await addModifyingTextId(
      context,
      modifyingTextId,
      action,
      modifiedId,
      modifiedDateDebut,
      modifiedDateFin,
    )
  }
}

async function addModifyingTextId(
  context: Context,
  modifyingTextId: string,
  action: Action,
  modifiedId: string,
  modifiedDateDebut: string,
  modifiedDateFin: string,
): Promise<void> {
  const modifyingTexteVersion = await getOrLoadTexteVersion(
    context,
    modifyingTextId,
  )
  if (modifyingTexteVersion === null) {
    return
  }
  const modifyingTextDateSignature =
    modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
  if (modifyingTextDateSignature === undefined) {
    throw new Error(
      `Texte modificateur ${modifyingTextId} of ${modifiedId} has no META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE`,
    )
  }

  if (modifiedId.startsWith("JORFTEXT") || modifiedId.startsWith("LEGITEXT")) {
    // A consolidated text doesn't change. Only its content changes.
    const date =
      modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_PUBLI
    const consolidatedTextModifyingTextsIdsByAction =
      (context.consolidatedTextModifyingTextsIdsByActionByDate[date] ??= {})
    const consolidatedTextModifyingTextsIds =
      (consolidatedTextModifyingTextsIdsByAction[action] ??= new Set())
    consolidatedTextModifyingTextsIds.add(modifyingTextId)
  } else {
    if (
      action === "CREATE" &&
      modifyingTextDateSignature !== "2999-01-01" &&
      modifyingTextDateSignature > modifiedDateDebut
    ) {
      console.warn(
        `Ignoring creating text ${modifyingTextId} because its date signature ${modifyingTextDateSignature} doesn't match date début ${modifiedDateDebut} of ${modifiedId}`,
      )
      return
    }
    if (
      action === "DELETE" &&
      modifyingTextDateSignature !== "2999-01-01" &&
      modifyingTextDateSignature > modifiedDateFin
    ) {
      console.warn(
        `Ignoring texte suppresseur ${modifyingTextId} because its date signature ${modifyingTextDateSignature} doesn't match date fin ${modifiedDateFin} of ${modifiedId}`,
      )
      return
    }

    const modifyingTextIdByAction = (context.modifyingTextIdByActionById[
      modifiedId
    ] ??= {})
    const existingModifyingTextId = modifyingTextIdByAction[action]
    if (
      existingModifyingTextId === undefined ||
      context.texteManquantById[existingModifyingTextId] !== undefined
    ) {
      modifyingTextIdByAction[action] = modifyingTextId
      ;((context.idsByActionByTexteMoficateurId[modifyingTextId] ??= {})[
        action
      ] ??= new Set()).add(modifiedId)
    } else if (existingModifyingTextId !== modifyingTextId) {
      const existingModifyingTexteVersion = (await getOrLoadTexteVersion(
        context,
        existingModifyingTextId,
      ))!
      if (
        existingModifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE
          .DATE_TEXTE! < modifyingTextDateSignature
      ) {
        modifyingTextIdByAction[action] = modifyingTextId
        ;((context.idsByActionByTexteMoficateurId[modifyingTextId] ??= {})[
          action
        ] ??= new Set()).add(modifiedId)
      }
    }
  }
}

async function cleanHtmlFragment(
  fragment: string | undefined,
): Promise<string | undefined> {
  return fragment === undefined
    ? undefined
    : await prettier.format(
        fragment.replaceAll("<<", "«").replaceAll(">>", "»"),
        {
          parser: "html",
        },
      )
}
async function exportConsolidatedTextToGit(
  consolidatedTextId: string,
  targetDir: string,
): Promise<void> {
  const context: Context = {
    articleById: {},
    consolidatedTextCid: consolidatedTextId, // Temporary value, overrided below
    consolidatedTextInternalIds: new Set([consolidatedTextId]),
    consolidatedTextModifyingTextsIdsByActionByDate: {},
    currentInternalIds: new Set(),
    idsByActionByTexteMoficateurId: {},
    jorfCreatorIdById: {},
    modifyingArticleIdByActionById: {},
    modifyingTextIdByActionById: {},
    sectionTaById: {},
    targetDir,
    textelrById: {},
    texteManquantById: {},
    texteVersionById: {},
  }
  const consolidatedTextelr = (await getOrLoadTextelr(
    context,
    consolidatedTextId,
  )) as LegiTextelr
  assert.notStrictEqual(consolidatedTextelr, null)
  const consolidatedTexteVersion = (await getOrLoadTexteVersion(
    context,
    consolidatedTextId,
  )) as LegiTexteVersion
  assert.notStrictEqual(consolidatedTexteVersion, null)
  const meta = consolidatedTexteVersion.META
  context.consolidatedTextCid = meta.META_SPEC.META_TEXTE_CHRONICLE.CID
  // It seems that the CID of a LEGI text is the ID of the original JORF text
  // that created the first version of the law.
  // Most texts of LOI nature (except 191 / 3533) have a JORFTEXT CID.
  // Most texts of DECRET nature (except 409 / 53952) have a JORFTEXT CID.
  // Most texts of ARRETE nature (except 2832 / 80224) have a JORFTEXT CID.
  // Idem for the CONSTITUTION.
  // All texts of CODE nature have their CID === ID. But this is normal because a CODE
  // is not created from a single JORF law.
  const jorfCreatorArticleIdByNum: Record<string, string> = {}
  if (context.consolidatedTextCid.startsWith("JORFTEXT")) {
    context.jorfCreatorIdById[consolidatedTextId] = context.consolidatedTextCid

    // Map JORF articles by their number, to be able to associate them with the LEGI article that they
    // create.
    const jorfCreatorTextelr = (await getOrLoadTextelr(
      context,
      context.consolidatedTextCid,
    )) as JorfTextelr
    const { STRUCT: jorfCreatorTextelrStructure } = jorfCreatorTextelr
    const jorfCreatorLiensArticles = jorfCreatorTextelrStructure?.LIEN_ART
    if (jorfCreatorLiensArticles !== undefined) {
      for (const jorfCreatorLienArticle of jorfCreatorLiensArticles) {
        // Note: In JORF text of 1958 Constitution (JORFTEXT000000571356), for example,
        // `num` of articles are only present in LienArticle, not in (incomplete) articles
        // themselves.
        const articleNumber = jorfCreatorLienArticle["@num"]
        if (articleNumber !== undefined) {
          jorfCreatorArticleIdByNum[articleNumber] =
            jorfCreatorLienArticle["@id"]
        }
      }
    }

    // Note we currently ignore JORF SectionTAs and reference only their articles.
    for await (const { sectionTa: jorfCreatorSectionTa } of walkStructureTree(
      context,
      jorfCreatorTextelrStructure as JorfSectionTaStructure,
    )) {
      const jorfCreatorLiensArticles =
        jorfCreatorSectionTa?.STRUCTURE_TA?.LIEN_ART
      if (jorfCreatorLiensArticles !== undefined) {
        for (const jorfCreatorLienArticle of jorfCreatorLiensArticles) {
          const articleNumber = jorfCreatorLienArticle["@num"]
          if (articleNumber !== undefined) {
            jorfCreatorArticleIdByNum[articleNumber] =
              jorfCreatorLienArticle["@id"]
          }
        }
      }
    }
  }

  const metaTexteVersion = meta.META_SPEC.META_TEXTE_VERSION
  console.log(
    `${meta.META_COMMUN.ID} ${(metaTexteVersion.TITREFULL ?? metaTexteVersion.TITRE ?? meta.META_COMMUN.ID).replace(/\s+/g, " ").trim()} (${metaTexteVersion.DATE_DEBUT ?? ""} — ${metaTexteVersion.DATE_FIN === "2999-01-01" ? "…" : (metaTexteVersion.DATE_FIN ?? "")}, ${metaTexteVersion.ETAT})`,
  )

  // First Pass: Register IDs of internal objects and associate them with
  // their JORF counterparts (when JORF articles exist they should have the
  // same content as their LEGI counterparts).

  const { STRUCT: consolidatedTextelrStructure } = consolidatedTextelr
  const liensArticles = consolidatedTextelrStructure?.LIEN_ART
  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      context.consolidatedTextInternalIds.add(lienArticle["@id"])

      if (lienArticle["@num"] !== undefined) {
        const jorfCreatorArticleId =
          jorfCreatorArticleIdByNum[lienArticle["@num"]]
        if (jorfCreatorArticleId !== undefined) {
          context.jorfCreatorIdById[lienArticle["@id"]] = jorfCreatorArticleId
        }
      }
    }
  }

  for await (const { sectionTa } of walkStructureTree(
    context,
    consolidatedTextelrStructure as LegiSectionTaStructure,
  )) {
    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        context.consolidatedTextInternalIds.add(lienArticle["@id"])

        if (lienArticle["@num"] !== undefined) {
          const jorfCreatorArticleId =
            jorfCreatorArticleIdByNum[lienArticle["@num"]]
          if (jorfCreatorArticleId !== undefined) {
            context.jorfCreatorIdById[lienArticle["@id"]] = jorfCreatorArticleId
          }
        }
      }
    }
  }

  // Second Pass : Register texts & articles that modify parts (aka SectionTA & Article) of the consolidated text.

  await registerLegiTextModifiers(
    context,
    0,
    consolidatedTextelr,
    consolidatedTexteVersion,
  )

  if (liensArticles !== undefined) {
    for (const lienArticle of liensArticles) {
      const article = (await getOrLoadArticle(
        context,
        lienArticle["@id"],
      )) as LegiArticle
      await registerLegiArticleModifiers(
        context,
        0,
        lienArticle as LegiSectionTaLienArt,
        article,
      )
    }
  }

  for await (const { parentsSectionTa, sectionTa } of walkStructureTree(
    context,
    consolidatedTextelrStructure as LegiSectionTaStructure,
  )) {
    const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
    if (liensArticles !== undefined) {
      for (const lienArticle of liensArticles) {
        const article = (await getOrLoadArticle(
          context,
          lienArticle["@id"],
        )) as LegiArticle
        await registerLegiArticleModifiers(
          context,
          parentsSectionTa.length + 2,
          lienArticle as LegiSectionTaLienArt,
          article,
        )
      }
    }
  }

  // Sort textes modificateurs by date

  const modifyingTextsIds = new Set<string>()
  for (const modifyingTextIdByAction of Object.values(
    context.modifyingTextIdByActionById,
  )) {
    if (modifyingTextIdByAction.CREATE !== undefined) {
      modifyingTextsIds.add(modifyingTextIdByAction.CREATE)
    }
    if (modifyingTextIdByAction.DELETE !== undefined) {
      modifyingTextsIds.add(modifyingTextIdByAction.DELETE)
    }
  }

  const modifyingTextsIdByDate: Record<string, string[]> = {}
  for (const modifyingTextId of modifyingTextsIds) {
    let date: string
    let modifyingTexteVersion:
      | JorfTexteVersion
      | LegiTexteVersion
      | TexteManquant = context.texteManquantById[
      modifyingTextId
    ] as TexteManquant
    if (modifyingTexteVersion === undefined) {
      modifyingTexteVersion = (await getOrLoadTexteVersion(
        context,
        modifyingTextId,
      )) as JorfTexteVersion | LegiTexteVersion
      date =
        modifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.DATE_TEXTE
    } else {
      date = modifyingTexteVersion.date
    }
    let modifyingTextsId = modifyingTextsIdByDate[date]
    if (modifyingTextsId === undefined) {
      modifyingTextsId = modifyingTextsIdByDate[date] = []
    }
    modifyingTextsId.push(modifyingTextId)
  }

  // Generation of Git repository

  await fs.remove(targetDir)
  await fs.mkdir(targetDir, { recursive: true })
  await git.init({
    defaultBranch: "main",
    dir: targetDir,
    fs,
  })

  // Generate main LICENCE.md file.
  await fs.writeFile(
    path.join(targetDir, "LICENCE.md"),
    dedent`
      # Textes juridiques consolidés français sous Git

      **Avertissement** : Ce projet est en cours de développement. **Il peut contenir des erreurs** !
      En cas de doute, nous vous invitons à vous référer au site [Légifrance](https://www.legifrance.gouv.fr/).

      ## Droit d'auteur

      Les textes de ce dépôt sont disponibles sous une licence TODO,  qui s'ajoute aux
      conditions de réutilisation des données originales du site Légifrance, produites par
      la Direction de l'information légale et administrative (Dila).

      ## Conditions de réutilisation des données originales du site Légifrance

      Les données originales sont produites par la
      [Direction de l'information légale et administrative (Dila)](https://dila.premier-ministre.gouv.fr/).
      Elles sont réutilisables gratuitement sous [licence ouverte v2.0](https://www.etalab.gouv.fr/licence-ouverte-open-licence/).

      Les réutilisateurs s’obligent à mentionner :

      - la paternité des données (DILA) ;

      - les URL d’accès longues de téléchargement :

        - https://echanges.dila.gouv.fr/OPENDATA/JORF/
        - https://echanges.dila.gouv.fr/OPENDATA/LEGI/

      - le nom du fichier téléchargé ainsi que la date du fichier : dernières versions des fichiers des répertoires énumérés ci-dessus.

      Plus d'informations sur les données, provenant du site de la Dila :

      - https://echanges.dila.gouv.fr/OPENDATA/JORF/DILA_JORF_Presentation_20170824.pdf
      - https://echanges.dila.gouv.fr/OPENDATA/LEGI/DILA_LEGI_Presentation_20170824.pdf

      ## Avertissement — Données à caractère personnel

      Dans le cadre de leurs missions de service public, les administrations
      produisent ou reçoivent des informations publiques qui peuvent être
      réutilisées par toute personne physique ou morale à d’autres fins que celles
      de la mission de service public.

      Lorsque ces informations contiennent des données à caractère personnel,
      c’est-à-dire des éléments qui permettent d’identifier, directement ou
      indirectement, une personne physique, leur réutilisation est étroitement
      encadrée par l’article L322-2 du code des relations entre le public et
      l’administration.

      Cet article prévoit que la réutilisation d’une information publique contenant
      des données à caractère personnel est subordonnée au respect de la loi n°
      78-17 du 6 janvier 1978, dite « Informatique et libertés ». Il en résulte
      notamment que lorsque les données personnelles que cette information
      publique contient ont, préalablement à leur diffusion, fait l’objet d’une
      anonymisation totale ou partielle, conformément à des dispositions légales ou
      aux recommandations de la Commission nationale de l’informatique et des
      libertés (CNIL), la réutilisation ne peut avoir pour objet ou pour effet de
      réidentifier les personnes concernées.
    ` + "\n",
  )
  await git.add({
    dir: targetDir,
    filepath: "LICENCE.md",
    fs,
  })
  // Generate main README.md file.
  const consolidatedTextTitle = (
    consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
    consolidatedTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
    consolidatedTexteVersion.META.META_COMMUN.ID
  )
    .replace(/\s+/g, " ")
    .trim()
  const consolidatedTextDirName = slugify(consolidatedTextTitle, "_")
  await fs.writeFile(
    path.join(targetDir, "README.md"),
    dedent`
      # Textes juridiques consolidés français sous Git

      **Avertissement** : Ce projet est en cours de développement. **Il contient forcément des erreurs !**

      - [${consolidatedTextTitle}](${consolidatedTextDirName})
    ` + "\n",
  )
  await git.add({
    dir: targetDir,
    filepath: "README.md",
    fs,
  })
  // First commit of repository
  await git.commit({
    dir: targetDir,
    fs,
    author: {
      email: "tricoteuses@tricoteuses.fr",
      name: "Tricoteuses",
    },
    message: "Création du dépôt Git",
  })

  for (const [date, modifyingTextsId] of Object.entries(
    modifyingTextsIdByDate,
  ).toSorted(([date1], [date2]) => date1.localeCompare(date2))) {
    console.log(date)
    for (const modifyingTextId of modifyingTextsId.toSorted()) {
      // Generate tree of SectionTa & articles at this date
      const t0 = performance.now()
      let modifyingTexteVersion:
        | JorfTexteVersion
        | LegiTexteVersion
        | TexteManquant = context.texteManquantById[
        modifyingTextId
      ] as TexteManquant
      let modifyingTextTitle: string
      if (modifyingTexteVersion === undefined) {
        modifyingTexteVersion = (await getOrLoadTexteVersion(
          context,
          modifyingTextId,
        )) as JorfTexteVersion | LegiTexteVersion
        assert.notStrictEqual(modifyingTexteVersion, null)
        modifyingTextTitle = (
          modifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
          modifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
          modifyingTexteVersion.META.META_COMMUN.ID
        )
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\s+\(\d+\)$/, "")
      } else {
        modifyingTextTitle = `!!! Texte non trouvé ${date} !!!`
      }
      console.log(`  ${modifyingTextId} ${modifyingTextTitle}`)
      const idsByAction =
        context.idsByActionByTexteMoficateurId[modifyingTextId]
      if (idsByAction.DELETE !== undefined) {
        console.log(
          `    DELETE: ${[...idsByAction.DELETE].toSorted().join(", ")}`,
        )
      }
      if (idsByAction.CREATE !== undefined) {
        console.log(
          `    CREATE: ${[...idsByAction.CREATE].toSorted().join(", ")}`,
        )
      }

      const t1 = performance.now()
      const encounteredArticlesIds = new Set<string>()
      const tree: TextelrNode = {}
      if (liensArticles !== undefined) {
        for (const action of ["DELETE", "CREATE"] as Action[]) {
          for (const lienArticle of liensArticles) {
            const articleId = lienArticle["@id"]
            const modifyingTextIdByAction =
              context.modifyingTextIdByActionById[articleId]
            if (context.currentInternalIds.has(articleId)) {
              if (modifyingTextIdByAction.DELETE === modifyingTextId) {
                if (action === "DELETE") {
                  context.currentInternalIds.delete(articleId)
                }
                continue
              }
            } else if (modifyingTextIdByAction.CREATE === modifyingTextId) {
              if (action === "CREATE") {
                context.currentInternalIds.add(articleId)
              }
            } else {
              continue
            }
            if (action === "DELETE") {
              continue
            }
            await addArticleToTree(
              context,
              tree,
              encounteredArticlesIds,
              lienArticle,
            )
          }
        }
      }
      for await (const { sectionTa } of walkStructureTree(
        context,
        consolidatedTextelrStructure as LegiSectionTaStructure,
      )) {
        const liensArticles = sectionTa?.STRUCTURE_TA?.LIEN_ART
        if (liensArticles !== undefined) {
          for (const action of ["DELETE", "CREATE"] as Action[]) {
            for (const lienArticle of liensArticles) {
              const articleId = lienArticle["@id"]
              const modifyingTextIdByAction =
                context.modifyingTextIdByActionById[articleId]
              if (context.currentInternalIds.has(articleId)) {
                if (modifyingTextIdByAction.DELETE === modifyingTextId) {
                  if (action === "DELETE") {
                    context.currentInternalIds.delete(articleId)
                  }
                  continue
                }
              } else if (modifyingTextIdByAction.CREATE === modifyingTextId) {
                if (action === "CREATE") {
                  context.currentInternalIds.add(articleId)
                }
              } else {
                continue
              }
              if (action === "DELETE") {
                continue
              }
              await addArticleToTree(
                context,
                tree,
                encounteredArticlesIds,
                lienArticle,
              )
            }
          }
        }
      }

      const t2 = performance.now()
      await generateTextGitDirectory(
        context,
        2,
        tree,
        consolidatedTexteVersion as LegiTexteVersion,
        modifyingTextId,
      )

      const t3 = performance.now()
      let messageLines: string | undefined = undefined
      let summary: string | undefined = undefined
      if (modifyingTextId.startsWith("JORFTEXT")) {
        const jorfModifyingTexteVersion =
          modifyingTexteVersion as JorfTexteVersion
        messageLines = [
          [
            "Autorité",
            jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .AUTORITE,
          ],
          [
            "Ministère",
            jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .MINISTERE,
          ],
          ["Nature", jorfModifyingTexteVersion.META.META_COMMUN.NATURE],
          [
            "Date de début",
            jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .DATE_DEBUT,
          ],
          [
            "Date de fin",
            jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .DATE_FIN,
          ],
          ["Identifiant", jorfModifyingTexteVersion.META.META_COMMUN.ID],
          [
            "NOR",
            jorfModifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR,
          ],
          [
            "Ancien identifiant",
            jorfModifyingTexteVersion.META.META_COMMUN.ANCIEN_ID,
          ],
          // TODO: Mettre l'URL dans Légifrance et(?) le Git Tricoteuses
          ["URL", jorfModifyingTexteVersion.META.META_COMMUN.URL],
        ]
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
        summary = jorfModifyingTexteVersion.SM?.CONTENU?.replace(
          /<br\s*\/>/gi,
          "\n",
        )
      } else if (modifyingTextId.startsWith("LEGITEXT")) {
        const legiModifyingTexteVersion =
          modifyingTexteVersion as LegiTexteVersion
        messageLines = [
          [
            "État",
            legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION.ETAT,
          ],
          ["Nature", legiModifyingTexteVersion.META.META_COMMUN.NATURE],
          [
            "Date de début",
            legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .DATE_DEBUT,
          ],
          [
            "Date de fin",
            legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_VERSION
              .DATE_FIN,
          ],
          ["Identifiant", legiModifyingTexteVersion.META.META_COMMUN.ID],
          [
            "NOR",
            legiModifyingTexteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR,
          ],
          [
            "Ancien identifiant",
            legiModifyingTexteVersion.META.META_COMMUN.ANCIEN_ID,
          ],
          // TODO: Mettre l'URL dans le Git Tricoteuses
          ["URL", legiModifyingTexteVersion.META.META_COMMUN.URL],
        ]
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
      }
      const dateObject = new Date(date)
      let timestamp = Math.floor(dateObject.getTime() / 1000)
      if (timestamp < minDateTimestamp) {
        const diffDays = Math.round(
          Math.abs((minDateTimestamp - timestamp) / oneDay),
        )
        timestamp = minDateTimestamp - diffDays
      }
      const timezoneOffset = 0
      await git.commit({
        dir: targetDir,
        fs,
        author: {
          email: "codes_juridiques@tricoteuses.fr",
          name: "République française",
          timestamp,
          timezoneOffset,
        },
        committer: {
          email: "codes_juridiques@tricoteuses.fr",
          name: "République française",
          timestamp,
          timezoneOffset,
        },
        message: [modifyingTextTitle, summary, messageLines]
          .filter((block) => block !== undefined)
          .join("\n\n"),
      })

      const t4 = performance.now()
      console.log(`Durations: ${t1 - t0} ${t2 - t1} ${t3 - t2} ${t4 - t3}`)
    }
  }
}

async function generateSectionTaGitDirectory(
  context: Context,
  depth: number,
  sectionTaNode: SectionTaNode,
  sectionTa: LegiSectionTa,
  parentRepositoryRelativeDir: string,
  modifyingTextId: string,
  obsoleteRepositoryRelativeFilesPaths: Set<string>,
) {
  const sectionTaTitle = sectionTa.TITRE_TA ?? sectionTa.ID
  let sectionTaSlug = slugify(sectionTaTitle.split(":")[0].trim(), "_")
  if (sectionTaSlug.length > 255) {
    sectionTaSlug = sectionTaSlug.slice(0, 254)
    if (sectionTaSlug.at(-1) !== "_") {
      sectionTaSlug += "_"
    }
  }
  const sectionTaDirName = sectionTaSlug
  const repositoryRelativeDir = path.join(
    parentRepositoryRelativeDir,
    sectionTaDirName,
  )
  await fs.ensureDir(path.join(context.targetDir, repositoryRelativeDir))
  const readmeLinks: Array<{ href: string; title: string }> = []

  if (sectionTaNode.liensArticles !== undefined) {
    for (const lienArticle of sectionTaNode.liensArticles) {
      const articleId = lienArticle["@id"]
      const article = (await getOrLoadArticle(
        context,
        articleId,
      )) as LegiArticle
      const articleTitle = `Article ${article.META.META_SPEC.META_ARTICLE.NUM ?? articleId}`
      let articleSlug = slugify(articleTitle, "_")
      if (articleSlug.length > 252) {
        articleSlug = articleSlug.slice(0, 251)
        if (articleSlug.at(-1) !== "_") {
          articleSlug += "_"
        }
      }
      const articleFilename = `${articleSlug}.md`
      const articleRepositoryRelativeFilePath = path.join(
        repositoryRelativeDir,
        articleFilename,
      )
      await fs.writeFile(
        path.join(context.targetDir, articleRepositoryRelativeFilePath),
        dedent`
            ---
            ${[
              ["Type", article.META.META_SPEC.META_ARTICLE.TYPE],
              ["Date de début", article.META.META_SPEC.META_ARTICLE.DATE_DEBUT],
              ["Date de fin", article.META.META_SPEC.META_ARTICLE.DATE_FIN],
              ["Identifiant", articleId],
              ["Ancien identifiant", article.META.META_COMMUN.ANCIEN_ID],
              // TODO: Mettre l'URL dans le Git Tricoteuses
              ["URL", article.META.META_COMMUN.URL],
            ]
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")}
            ---

            ###### ${articleTitle}

            ${await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU)}
          ` + "\n",
      )
      await git.add({
        dir: context.targetDir,
        filepath: articleRepositoryRelativeFilePath,
        fs,
      })
      obsoleteRepositoryRelativeFilesPaths.delete(
        articleRepositoryRelativeFilePath,
      )
      readmeLinks.push({ href: articleFilename, title: articleTitle })
    }
  }

  if (sectionTaNode.children !== undefined) {
    for (const child of sectionTaNode.children) {
      const sectionTaId = child.titreTm["@id"]
      const sectionTa = (await getOrLoadSectionTa(
        context,
        sectionTaId,
      )) as LegiSectionTa
      const sectionTaTitle = sectionTa.TITRE_TA ?? sectionTaId
      let sectionTaSlug = slugify(sectionTaTitle.split(":")[0].trim(), "_")
      if (sectionTaSlug.length > 255) {
        sectionTaSlug = sectionTaSlug.slice(0, 254)
        if (sectionTaSlug.at(-1) !== "_") {
          sectionTaSlug += "_"
        }
      }
      const sectionTaDirName = sectionTaSlug
      readmeLinks.push({ href: sectionTaDirName, title: sectionTaTitle })

      await generateSectionTaGitDirectory(
        context,
        depth + 1,
        child,
        sectionTa,
        repositoryRelativeDir,
        modifyingTextId,
        obsoleteRepositoryRelativeFilesPaths,
      )
    }
  }

  const readmeRepositoryRelativeFilePath = path.join(
    repositoryRelativeDir,
    "README.md",
  )
  await fs.writeFile(
    path.join(context.targetDir, readmeRepositoryRelativeFilePath),
    dedent`
      ---
      ${[
        ["Commentaire", sectionTa.COMMENTAIRE],
        // ["État", lienSectionTa["@etat"]],
        ["Date de début", sectionTaNode.titreTm["@debut"]],
        ["Date de fin", sectionTaNode.titreTm["@fin"]],
        ["Identifiant", sectionTa.ID],
        // TODO: Mettre l'URL dans le Git Tricoteuses
        // ["URL", lienSectionTa["@url"]],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---

      ${"#".repeat(Math.min(depth, 6))} ${sectionTa.TITRE_TA ?? sectionTa.ID}

      ${readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n")}
    ` + "\n",
  )
  await git.add({
    dir: context.targetDir,
    filepath: readmeRepositoryRelativeFilePath,
    fs,
  })
  obsoleteRepositoryRelativeFilesPaths.delete(readmeRepositoryRelativeFilePath)
}

async function generateTextGitDirectory(
  context: Context,
  depth: number,
  tree: TextelrNode,
  texteVersion: LegiTexteVersion,
  modifyingTextId: string,
) {
  const texteTitle = (
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITREFULL ??
    texteVersion.META.META_SPEC.META_TEXTE_VERSION.TITRE ??
    texteVersion.META.META_COMMUN.ID
  )
    .replace(/\s+/g, " ")
    .trim()
  const texteDirName = slugify(texteTitle, "_")
  const repositoryRelativeDir = texteDirName
  const repositoryDir = path.join(context.targetDir, repositoryRelativeDir)
  await fs.ensureDir(repositoryDir)
  const obsoleteRepositoryRelativeFilesPaths = new Set(
    walkDir(context.targetDir, [repositoryRelativeDir]).map(
      (repositoryRelativeFileSplitPath) =>
        path.join(...repositoryRelativeFileSplitPath),
    ),
  )
  const readmeLinks: Array<{ href: string; title: string }> = []

  if (tree.liensArticles !== undefined) {
    for (const lienArticle of tree.liensArticles) {
      const articleId = lienArticle["@id"]
      const article = (await getOrLoadArticle(
        context,
        articleId,
      )) as LegiArticle
      const articleTitle = `Article ${article.META.META_SPEC.META_ARTICLE.NUM ?? articleId}`
      let articleSlug = slugify(articleTitle, "_")
      if (articleSlug.length > 252) {
        articleSlug = articleSlug.slice(0, 251)
        if (articleSlug.at(-1) !== "_") {
          articleSlug += "_"
        }
      }
      const articleFilename = `${articleSlug}.md`
      const articleRepositoryRelativeFilePath = path.join(
        repositoryRelativeDir,
        articleFilename,
      )
      await fs.writeFile(
        path.join(context.targetDir, articleRepositoryRelativeFilePath),
        dedent`
            ---
            ${[
              ["Type", article.META.META_SPEC.META_ARTICLE.TYPE],
              ["Date de début", article.META.META_SPEC.META_ARTICLE.DATE_DEBUT],
              ["Date de fin", article.META.META_SPEC.META_ARTICLE.DATE_FIN],
              ["Identifiant", articleId],
              ["Ancien identifiant", article.META.META_COMMUN.ANCIEN_ID],
              // TODO: Mettre l'URL dans le Git Tricoteuses
              ["URL", article.META.META_COMMUN.URL],
            ]
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n")}
            ---

            ###### ${articleTitle}

            ${await cleanHtmlFragment(article.BLOC_TEXTUEL?.CONTENU)}
          ` + "\n",
      )
      await git.add({
        dir: context.targetDir,
        filepath: articleRepositoryRelativeFilePath,
        fs,
      })
      obsoleteRepositoryRelativeFilesPaths.delete(
        articleRepositoryRelativeFilePath,
      )
      readmeLinks.push({ href: articleFilename, title: articleTitle })
    }
  }

  if (tree.children !== undefined) {
    for (const child of tree.children) {
      const sectionTaId = child.titreTm["@id"]
      const sectionTa = (await getOrLoadSectionTa(
        context,
        sectionTaId,
      )) as LegiSectionTa
      const sectionTaTitle = sectionTa.TITRE_TA ?? sectionTaId
      let sectionTaSlug = slugify(sectionTaTitle.split(":")[0].trim(), "_")
      if (sectionTaSlug.length > 255) {
        sectionTaSlug = sectionTaSlug.slice(0, 254)
        if (sectionTaSlug.at(-1) !== "_") {
          sectionTaSlug += "_"
        }
      }
      const sectionTaDirName = sectionTaSlug
      readmeLinks.push({ href: sectionTaDirName, title: sectionTaTitle })

      await generateSectionTaGitDirectory(
        context,
        depth + 1,
        child,
        sectionTa,
        repositoryRelativeDir,
        modifyingTextId,
        obsoleteRepositoryRelativeFilesPaths,
      )
    }
  }

  const readmeBlocks = [
    `${"#".repeat(Math.min(depth, 6))} ${texteTitle}`,
    await cleanHtmlFragment(texteVersion.VISAS?.CONTENU),
    readmeLinks.map(({ href, title }) => `- [${title}](${href})`).join("\n"),
    await cleanHtmlFragment(texteVersion.SIGNATAIRES?.CONTENU),
  ].filter((block) => block != null)
  const readmeRepositoryRelativeFilePath = path.join(
    repositoryRelativeDir,
    "README.md",
  )
  await fs.writeFile(
    path.join(context.targetDir, readmeRepositoryRelativeFilePath),
    dedent`
      ---
      ${[
        ["État", texteVersion.META.META_SPEC.META_TEXTE_VERSION.ETAT],
        ["Nature", texteVersion.META.META_COMMUN.NATURE],
        [
          "Date de début",
          texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT,
        ],
        [
          "Date de fin",
          texteVersion.META.META_SPEC.META_TEXTE_VERSION.DATE_FIN,
        ],
        ["Identifiant", texteVersion.META.META_COMMUN.ID],
        ["NOR", texteVersion.META.META_SPEC.META_TEXTE_CHRONICLE.NOR],
        ["Ancien identifiant", texteVersion.META.META_COMMUN.ANCIEN_ID],
        // TODO: Mettre l'URL dans Légifrance et(?) le Git Tricoteuses
        ["URL", texteVersion.META.META_COMMUN.URL],
      ]
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")}
      ---

      ${readmeBlocks.join("\n\n")}
    ` + "\n",
  )
  await git.add({
    dir: context.targetDir,
    filepath: readmeRepositoryRelativeFilePath,
    fs,
  })
  obsoleteRepositoryRelativeFilesPaths.delete(readmeRepositoryRelativeFilePath)

  // Delete obsolete files and directories.
  for (const obsoleteRepositoryRelativeFilePath of obsoleteRepositoryRelativeFilesPaths) {
    await fs.remove(
      path.join(context.targetDir, obsoleteRepositoryRelativeFilePath),
    )
    await git.remove({
      dir: context.targetDir,
      filepath: obsoleteRepositoryRelativeFilePath,
      fs,
    })
    if (
      obsoleteRepositoryRelativeFilePath === "README.md" ||
      obsoleteRepositoryRelativeFilePath.endsWith("/README.md")
    ) {
      await fs.remove(
        path.dirname(
          path.join(context.targetDir, obsoleteRepositoryRelativeFilePath),
        ),
      )
    }
  }
}

async function getOrLoadArticle(
  context: Context,
  articleId: string,
): Promise<JorfArticle | LegiArticle> {
  let article = context.articleById[articleId]
  if (article === undefined) {
    article = (
      await db<{ data: JorfArticle | LegiArticle }[]>`
        SELECT data FROM article WHERE id = ${articleId}
      `
    )[0]?.data
    assert.notStrictEqual(article, undefined)
    context.articleById[articleId] = article
  }
  return article
}

async function getOrLoadSectionTa(
  context: Context,
  sectionTaId: string,
): Promise<LegiSectionTa> {
  let sectionTa = context.sectionTaById[sectionTaId]
  if (sectionTa === undefined) {
    sectionTa = (
      await db<{ data: LegiSectionTa }[]>`
        SELECT data FROM section_ta WHERE id = ${sectionTaId}
      `
    )[0]?.data
    assert.notStrictEqual(sectionTa, undefined)
    context.sectionTaById[sectionTaId] = sectionTa
  }
  return sectionTa
}

async function getOrLoadTextelr(
  context: Context,
  texteId: string,
): Promise<JorfTextelr | LegiTextelr | null> {
  let textelr: JorfTextelr | LegiTextelr | null = context.textelrById[texteId]
  if (textelr === undefined) {
    textelr = (
      await db<{ data: JorfTextelr | LegiTextelr }[]>`
          SELECT data FROM textelr WHERE id = ${texteId}
        `
    )[0]?.data
    if (textelr === undefined) {
      console.warn(`Texte ${texteId} not found in table textelr`)
      textelr = null
    }
    context.textelrById[texteId] = textelr
  }
  return textelr
}

async function getOrLoadTexteVersion(
  context: Context,
  texteId: string,
): Promise<JorfTexteVersion | LegiTexteVersion | null> {
  let texteVersion: JorfTexteVersion | LegiTexteVersion | null =
    context.texteVersionById[texteId]
  if (texteVersion === undefined) {
    texteVersion = (
      await db<{ data: JorfTexteVersion | LegiTexteVersion }[]>`
          SELECT data FROM texte_version WHERE id = ${texteId}
        `
    )[0]?.data
    if (texteVersion === undefined) {
      console.warn(`Texte ${texteId} not found in table texte_version`)
      texteVersion = null
    }
    context.texteVersionById[texteId] = texteVersion
  }
  return texteVersion
}

async function registerLegiArticleModifiers(
  context: Context,
  depth: number,
  lienArticle: LegiSectionTaLienArt,
  article: LegiArticle,
): Promise<void> {
  const articleId = article.META.META_COMMUN.ID
  const articleIds = [articleId, context.jorfCreatorIdById[articleId]].filter(
    (id) => id !== undefined,
  )
  const articleDateDebut = article.META.META_SPEC.META_ARTICLE.DATE_DEBUT
  const articleDateFin = article.META.META_SPEC.META_ARTICLE.DATE_FIN
  console.log(
    `${lienArticle["@id"]} ${"  ".repeat(depth)}Article ${lienArticle["@num"]} (${lienArticle["@debut"]} — ${lienArticle["@fin"] === "2999-01-01" ? "…" : lienArticle["@fin"]}, ${lienArticle["@etat"]})`,
  )

  for (const articleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(articleIds)}
  `) {
    if (articleLien.article_id in context.consolidatedTextInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
    )
    assert.strictEqual(articleLien.cidtexte, context.consolidatedTextCid)
    assert(articleLien.article_id.startsWith("LEGIARTI"))
    if (
      (articleLien.typelien === "ABROGATION" && articleLien.cible) ||
      (articleLien.typelien === "ABROGE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && !articleLien.cible) ||
      (articleLien.typelien === "DISJONCTION" && articleLien.cible) ||
      (articleLien.typelien === "PERIME" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERE" && !articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      articleLien.typelien === "CITATION" ||
      (articleLien.typelien === "HISTO" && articleLien.cible) ||
      (articleLien.typelien === "PEREMPTION" && articleLien.cible) ||
      (articleLien.typelien === "PILOTE_SUIVEUR" && !articleLien.cible) ||
      (articleLien.typelien === "SPEC_APPLI" && articleLien.cible) ||
      articleLien.typelien === "TXT_ASSOCIE" ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDANCE" && articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible) ||
      (articleLien.typelien === "CREATION" && articleLien.cible) ||
      (articleLien.typelien === "CREE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACE" && !articleLien.cible) ||
      (articleLien.typelien === "DEPLACEMENT" && articleLien.cible) ||
      (articleLien.typelien === "DISJOINT" && articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && articleLien.cible) ||
      (articleLien.typelien === "MODIFIE" && !articleLien.cible) ||
      (articleLien.typelien === "TRANSFERT" && articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingArticleId(
            context,
            articleLien.article_id,
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else if (
      (articleLien.typelien === "CREATION" && !articleLien.cible) ||
      (articleLien.typelien === "MODIFICATION" && !articleLien.cible)
    ) {
      // It seems to be errors.
      // Ignore link.
    } else {
      throw new Error(
        `Unexpected article_lien to article ${articleLien.id}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(articleIds)}
  `) {
    if (
      texteVersionLien.texte_version_id in context.consolidatedTextInternalIds
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    )
    assert.strictEqual(texteVersionLien.cidtexte, context.consolidatedTextCid)
    assert(
      texteVersionLien.texte_version_id.startsWith("JORFTEXT") ||
        texteVersionLien.texte_version_id.startsWith("LEGITEXT"),
    )
    if (
      (texteVersionLien.typelien === "ABROGATION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "ANNULATION" && texteVersionLien.cible)
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "DELETE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
    } else if (
      (texteVersionLien.typelien === "APPLICATION" &&
        !texteVersionLien.cible) ||
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "HISTO" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "PEREMPTION" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "SPEC_APPLI" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_ASSOCIE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      (texteVersionLien.typelien === "CODIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CONCORDANCE" && texteVersionLien.cible) ||
      (texteVersionLien.typelien === "CREATION" && texteVersionLien.cible) ||
      // LEGIARTI000006527461 has an example of MODIFICATION with !cible
      texteVersionLien.typelien === "MODIFICATION" ||
      (texteVersionLien.typelien === "MODIFIE" && !texteVersionLien.cible) ||
      (texteVersionLien.typelien === "RECTIFICATION" &&
        texteVersionLien.cible) ||
      (texteVersionLien.typelien === "TRANSFERT" && texteVersionLien.cible)
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingTextId(
            context,
            texteVersionLien.texte_version_id,
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected texte_version_lien to article ${texteVersionLien.id}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  const articleLiens = article.LIENS?.LIEN
  // Note: The (eventual) JORF version of article (with ID === context.jorfCreatorIdById[articleId]]) never has LIENS.
  // => It is skipped.
  if (articleLiens !== undefined) {
    for (const articleLien of articleLiens) {
      if (articleLien["@cidtexte"] === undefined) {
        // Ignore link because it has no potential "texte modificateur".
        continue
      }
      if (articleLien["@id"]! in context.consolidatedTextInternalIds) {
        // Ignore internal links because a LEGI texte can't modify itself.
        continue
      }

      console.log(
        `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${articleLien["@sens"]} typelien: ${articleLien["@typelien"]} ${articleLien["@cidtexte"]} ${articleLien["@id"]}${articleLien["@nortexte"] === undefined ? "" : ` ${articleLien["@nortexte"]}`}${articleLien["@num"] === undefined ? "" : ` ${articleLien["@num"]}`} ${articleLien["@naturetexte"]} du ${articleLien["@datesignatexte"]} : ${articleLien["#text"]}`,
      )
      if (
        (articleLien["@typelien"] === "ABROGATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "ABROGE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "ANNULATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DISJONCTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PERIME" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "TRANSFERE" &&
          articleLien["@sens"] === "cible")
      ) {
        await addModifyingTextId(
          context,
          articleLien["@cidtexte"],
          "DELETE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
      } else if (
        articleLien["@typelien"] === "CITATION" ||
        (articleLien["@typelien"] === "HISTO" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PEREMPTION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "PILOTE_SUIVEUR" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "SPEC_APPLI" &&
          articleLien["@sens"] === "source") ||
        articleLien["@typelien"] === "TXT_ASSOCIE" ||
        articleLien["@typelien"] === "TXT_SOURCE"
      ) {
        // Ignore link.
      } else if (
        (articleLien["@typelien"] === "CODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDANCE" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CONCORDE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "CREATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "CREE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "DEPLACEMENT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "DISJOINT" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "MODIFIE" &&
          articleLien["@sens"] === "cible") ||
        (articleLien["@typelien"] === "RECTIFICATION" &&
          articleLien["@sens"] === "source") ||
        (articleLien["@typelien"] === "TRANSFERT" &&
          articleLien["@sens"] === "source")
      ) {
        await addModifyingTextId(
          context,
          articleLien["@cidtexte"],
          "CREATE",
          articleId,
          articleDateDebut,
          articleDateFin,
        )
        // Delete another version of the same article that existed before the newly created one.
        for (const articleVersion of article.VERSIONS.VERSION) {
          if (articleVersion.LIEN_ART["@id"] === articleId) {
            continue
          }
          if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
            await addModifyingTextId(
              context,
              articleLien["@cidtexte"],
              "DELETE",
              articleVersion.LIEN_ART["@id"],
              articleVersion.LIEN_ART["@debut"],
              articleVersion.LIEN_ART["@fin"],
            )
          }
        }
      } else if (
        articleLien["@typelien"] === "CREATION" &&
        articleLien["@sens"] === "cible"
      ) {
        // It seems to be an error.
        // Ignore link.
      } else {
        throw new Error(
          `Unexpected LIEN in article ${articleId}: @typelien=${articleLien["@typelien"]}, @sens=${articleLien["@sens"]}`,
        )
      }
    }
  }

  if (article.CONTEXTE.TEXTE["@cid"]?.startsWith("JORFTEXT")) {
    if (articleDateDebut === article.CONTEXTE.TEXTE["@date_publi"]) {
      // If article belongs directly to a text published in JORF at the same date, then this JORF text is its creating text.
      await addModifyingTextId(
        context,
        article.CONTEXTE.TEXTE["@cid"],
        "CREATE",
        articleId,
        articleDateDebut,
        articleDateFin,
      )
      // Delete another version of the same article that existed before the newly created one.
      for (const articleVersion of article.VERSIONS.VERSION) {
        if (articleVersion.LIEN_ART["@id"] === articleId) {
          continue
        }
        if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
          await addModifyingTextId(
            context,
            article.CONTEXTE.TEXTE["@cid"],
            "DELETE",
            articleVersion.LIEN_ART["@id"],
            articleVersion.LIEN_ART["@debut"],
            articleVersion.LIEN_ART["@fin"],
          )
        }
      }
    } else {
      // If article belongs directly to a text published in JORF but at a later date than the JORF text,
      // then if article has no creating text, consider that it has been created by a modifying text having the same start
      // date as the article when such a text exists.
      const modifyingTextIdByAction = (context.modifyingTextIdByActionById[
        articleId
      ] ??= {})
      if (modifyingTextIdByAction.CREATE === undefined) {
        const consolidatedTextModifyingTextsIds =
          context.consolidatedTextModifyingTextsIdsByActionByDate[
            articleDateDebut
          ]?.CREATE
        if (consolidatedTextModifyingTextsIds !== undefined) {
          if (consolidatedTextModifyingTextsIds.size === 1) {
            const modifyingTextId = [...consolidatedTextModifyingTextsIds][0]
            await addModifyingTextId(
              context,
              modifyingTextId,
              "CREATE",
              articleId,
              articleDateDebut,
              articleDateFin,
            )
            // Delete another version of the same article that existed before the newly created one.
            for (const articleVersion of article.VERSIONS.VERSION) {
              if (articleVersion.LIEN_ART["@id"] === articleId) {
                continue
              }
              if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
                await addModifyingTextId(
                  context,
                  modifyingTextId,
                  "DELETE",
                  articleVersion.LIEN_ART["@id"],
                  articleVersion.LIEN_ART["@debut"],
                  articleVersion.LIEN_ART["@fin"],
                )
              }
            }
          } else {
            console.log(
              `Can't attach modifying article ${articleId} to a modifying text`,
              `because there are several possibilities at the date ${articleDateDebut}:`,
              `${[...consolidatedTextModifyingTextsIds].join(", ")}`,
            )
          }
        }
      }
    }
  }

  // If article still has no creating text at all, then create a fake one.
  const modifyingTextIdByAction = (context.modifyingTextIdByActionById[
    articleId
  ] ??= {})
  if (modifyingTextIdByAction.CREATE === undefined) {
    const texteManquantId = `ZZZZ TEXTE MANQUANT ${articleDateDebut}`
    context.texteManquantById[texteManquantId] ??= {
      date: articleDateDebut,
    }
    modifyingTextIdByAction.CREATE = texteManquantId
    ;((context.idsByActionByTexteMoficateurId[texteManquantId] ??=
      {}).CREATE ??= new Set()).add(articleId)
    // Delete another version of the same article that existed before the newly created one.
    for (const articleVersion of article.VERSIONS.VERSION) {
      if (articleVersion.LIEN_ART["@id"] === articleId) {
        continue
      }
      if (articleVersion.LIEN_ART["@fin"] === articleDateDebut) {
        const modifyingTextIdByAction = (context.modifyingTextIdByActionById[
          articleVersion.LIEN_ART["@id"]
        ] ??= {})
        if (modifyingTextIdByAction.DELETE === undefined) {
          modifyingTextIdByAction.DELETE = texteManquantId
          ;((context.idsByActionByTexteMoficateurId[texteManquantId] ??=
            {}).DELETE ??= new Set()).add(articleVersion.LIEN_ART["@id"])
        }
      }
    }
  }
}

async function registerLegiTextModifiers(
  context: Context,
  depth: number,
  textelr: LegiTextelr,
  texteVersion: LegiTexteVersion,
): Promise<void> {
  const legiTextId = texteVersion.META.META_COMMUN.ID
  const textIds = [legiTextId, context.jorfCreatorIdById[legiTextId]].filter(
    (id) => id !== undefined,
  )
  const texteVersionMeta = texteVersion.META
  const texteVersionDateDebut =
    texteVersionMeta.META_SPEC.META_TEXTE_VERSION.DATE_DEBUT
  const texteVersionDateFin =
    texteVersionMeta.META_SPEC.META_TEXTE_VERSION.DATE_FIN
  console.log(
    `${legiTextId} ${"  ".repeat(depth)} ${(texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITREFULL ?? texteVersionMeta.META_SPEC.META_TEXTE_VERSION.TITRE ?? texteVersionMeta.META_COMMUN.ID).replace(/\s+/g, " ").trim()}`,
  )

  for (const articleLien of await db<ArticleLienDb[]>`
    SELECT * FROM article_lien WHERE id IN ${db(textIds)}
  `) {
    if (articleLien.article_id in context.consolidatedTextInternalIds) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${articleLien.article_id} cible: ${articleLien.cible} typelien: ${articleLien.typelien}`,
    )
    assert.strictEqual(articleLien.cidtexte, context.consolidatedTextCid)
    // if () {
    //   await addModifyingArticleId(
    //     context,
    //     articleLien.article_id,
    //     "DELETE",
    //     legiTextId,
    //     texteVersionDateDebut ?? "2999-01-01",
    //     texteVersionDateFin ?? "2999-01-01",
    //   )
    // } else
    if (
      articleLien.typelien === "CITATION" ||
      articleLien.typelien === "TXT_SOURCE"
    ) {
      // Ignore link.
    } else if (
      (articleLien.typelien === "CONCORDANCE" && !articleLien.cible) ||
      (articleLien.typelien === "CONCORDE" && !articleLien.cible)
    ) {
      await addModifyingArticleId(
        context,
        articleLien.article_id,
        "CREATE",
        legiTextId,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
      // Delete another version of the same text that existed before the newly created one.
      for (const version of textelr.VERSIONS.VERSION) {
        if (version.LIEN_TXT["@id"] === legiTextId) {
          continue
        }
        if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
          await addModifyingArticleId(
            context,
            articleLien.article_id,
            "DELETE",
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected article_lien to text ${articleLien.id}: typelien=${articleLien.typelien}, cible=${articleLien.cible}`,
      )
    }
  }

  for (const texteVersionLien of await db<TexteVersionLienDb[]>`
    SELECT * FROM texte_version_lien WHERE id IN ${db(textIds)}
  `) {
    if (
      texteVersionLien.texte_version_id in context.consolidatedTextInternalIds
    ) {
      // Ignore internal links because a LEGI texte can't modify itself.
      continue
    }

    console.log(
      `${" ".repeat(20)} ${"  ".repeat(depth + 1)}${texteVersionLien.texte_version_id} cible: ${texteVersionLien.cible} typelien: ${texteVersionLien.typelien}`,
    )
    assert.strictEqual(texteVersionLien.cidtexte, context.consolidatedTextCid)
    // if () {
    //   await addModifyingTextId(
    //     context,
    //     texteVersionLien.texte_version_id,
    //     "DELETE",
    //     legiTextId,
    //     texteVersionDateDebut ?? "2999-01-01",
    //     texteVersionDateFin ?? "2999-01-01",
    //   )
    // } else
    if (
      (texteVersionLien.typelien === "APPLICATION" &&
        !texteVersionLien.cible) ||
      texteVersionLien.typelien === "CITATION" ||
      (texteVersionLien.typelien === "TXT_SOURCE" && !texteVersionLien.cible)
    ) {
      // Ignore link.
    } else if (
      texteVersionLien.typelien === "MODIFIE" &&
      !texteVersionLien.cible
    ) {
      await addModifyingTextId(
        context,
        texteVersionLien.texte_version_id,
        "CREATE",
        legiTextId,
        texteVersionDateDebut ?? "2999-01-01",
        texteVersionDateFin ?? "2999-01-01",
      )
      // Delete another version of the same text that existed before the newly created one.
      for (const version of textelr.VERSIONS.VERSION) {
        if (version.LIEN_TXT["@id"] === legiTextId) {
          continue
        }
        if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
          await addModifyingTextId(
            context,
            texteVersionLien.texte_version_id,
            "DELETE",
            version.LIEN_TXT["@id"],
            version.LIEN_TXT["@debut"],
            version.LIEN_TXT["@fin"],
          )
        }
      }
    } else {
      throw new Error(
        `Unexpected texte_version_lien to text ${texteVersionLien.id}: typelien=${texteVersionLien.typelien}, cible=${texteVersionLien.cible}`,
      )
    }
  }

  for (const textId of textIds) {
    const texteVersion = await getOrLoadTexteVersion(context, textId)
    const texteVersionLiens =
      texteVersion?.META.META_SPEC.META_TEXTE_VERSION.LIENS?.LIEN
    if (texteVersionLiens !== undefined) {
      for (const texteVersionLien of texteVersionLiens) {
        if (texteVersionLien["@cidtexte"] === undefined) {
          // Ignore link because it has no potential "texte modificateur".
          continue
        }
        if (texteVersionLien["@id"]! in context.consolidatedTextInternalIds) {
          // Ignore internal links because a LEGI texte can't modify itself.
          continue
        }

        console.log(
          `${" ".repeat(20)} ${"  ".repeat(depth + 1)}sens: ${texteVersionLien["@sens"]} typelien: ${texteVersionLien["@typelien"]} ${texteVersionLien["@cidtexte"]} ${texteVersionLien["@id"]}${texteVersionLien["@nortexte"] === undefined ? "" : ` ${texteVersionLien["@nortexte"]}`}${texteVersionLien["@num"] === undefined ? "" : ` ${texteVersionLien["@num"]}`} ${texteVersionLien["@naturetexte"]} du ${texteVersionLien["@datesignatexte"]} : ${texteVersionLien["#text"]}`,
        )
        // if () {
        //   await addModifyingTextId(
        //     context,
        //     texteVersionLien["@cidtexte"],
        //     "DELETE",
        //     legiTextId,
        //     texteVersionDateDebut ?? "2999-01-01",
        //     texteVersionDateFin ?? "2999-01-01",
        //   )
        // } else
        if (
          (texteVersionLien["@typelien"] === "APPLICATION" &&
            texteVersionLien["@sens"] === "cible") ||
          texteVersionLien["@typelien"] === "CITATION"
        ) {
          // Ignore link.
        } else if (
          (texteVersionLien["@typelien"] === "MODIFICATION" &&
            texteVersionLien["@sens"] === "source") ||
          (texteVersionLien["@typelien"] === "MODIFIE" &&
            texteVersionLien["@sens"] === "cible")
        ) {
          await addModifyingTextId(
            context,
            texteVersionLien["@cidtexte"],
            "CREATE",
            legiTextId,
            texteVersionDateDebut ?? "2999-01-01",
            texteVersionDateFin ?? "2999-01-01",
          )
          // Delete another version of the same text that existed before the newly created one.
          const textelr = (await getOrLoadTextelr(context, textId)) as
            | JorfTextelr
            | LegiTextelr
          assert.notStrictEqual(textelr, null)
          for (const version of textelr.VERSIONS.VERSION) {
            if (version.LIEN_TXT["@id"] === textId) {
              continue
            }
            if (version.LIEN_TXT["@fin"] === texteVersionDateDebut) {
              await addModifyingTextId(
                context,
                texteVersionLien["@cidtexte"],
                "DELETE",
                version.LIEN_TXT["@id"],
                version.LIEN_TXT["@debut"],
                version.LIEN_TXT["@fin"],
              )
            }
          }
        } else {
          throw new Error(
            `Unexpected LIEN in text ${textId}: @typelien=${texteVersionLien["@typelien"]}, @sens=${texteVersionLien["@sens"]}`,
          )
        }
      }
    }
  }
}

async function* walkStructureTree(
  context: Context,
  structure: JorfSectionTaStructure | LegiSectionTaStructure,
  parentsSectionTa: LegiSectionTa[] = [],
): AsyncGenerator<
  {
    lienSectionTa: JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    liensSectionTa: Array<
      JorfSectionTaLienSectionTa | LegiSectionTaLienSectionTa
    >
    parentsSectionTa: Array<JorfSectionTa | LegiSectionTa>
    sectionTa: JorfSectionTa | LegiSectionTa
  },
  void
> {
  const liensSectionTa = structure?.LIEN_SECTION_TA
  if (liensSectionTa !== undefined) {
    for (const lienSectionTa of liensSectionTa) {
      const childSectionTa = await getOrLoadSectionTa(
        context,
        lienSectionTa["@id"],
      )
      context.consolidatedTextInternalIds.add(lienSectionTa["@id"])
      yield {
        lienSectionTa,
        liensSectionTa,
        parentsSectionTa,
        sectionTa: childSectionTa,
      }
      const childStructure = childSectionTa.STRUCTURE_TA
      if (childStructure !== undefined) {
        yield* walkStructureTree(context, childStructure, [
          ...parentsSectionTa,
          childSectionTa,
        ])
      }
    }
  }
}

sade("export_consolidated_text_to_git <consolidatedTextId> <targetDir>", true)
  .describe(
    "Convert a consolidated LEGI texte (Constitution, code, law, etc) to a Git repository",
  )
  .action(async (consolidatedTextId, targetDir) => {
    await exportConsolidatedTextToGit(consolidatedTextId, targetDir)
    process.exit(0)
  })
  .parse(process.argv)
