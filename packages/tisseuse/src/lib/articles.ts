import { toArabic } from "roman-numerals"

// A: Arrêté
// D: Décret
// L: Législatif
// LO: Article créé par une loi organique
// R: Règlemntaire
const articleNumberRegExp =
  /^préliminaire|PREAMBULE|((Annexe (à l')article )?([ADLR]|LO)?(1er|\d+))$/

// TODO improve
const numberBySemelBisTerEtc: Record<string, number> = {
  semel: 1,
  bis: 2,
  ter: 3,
  quater: 4,
  cinquies: 5,
  sexies: 6,
  septies: 7,
  octies: 8,
  nonies: 9,
  decies: 10,
  undecies: 11,
  duodecies: 12,
  tridecies: 13,
  quaterdecies: 14,
  quindecies: 15,
  sexdecies: 16,
  septdecies: 17,
  octodecies: 18,
  duodevecies: 18,
  duodevicies: 18,
  novodecies: 19,
  undevecies: 19,
  undevicies: 19,
  vecies: 20,
  vicies: 20,
  unvecies: 21,
  unvicies: 21,
  duovecies: 22,
  duovicies: 22,
  tervecies: 23,
  tervicies: 23,
  quatervecies: 24,
  quatervicies: 24,
  quinvecies: 25,
  quinvicies: 25,
  sevecies: 25,
  sevicies: 25,
  sexvecies: 26,
  sexvicies: 26,
  septvecies: 27,
  septvicies: 27,
  octovecies: 28,
  octovicies: 28,
  duodetricies: 28,
  duodetrecies: 28,
  novovecies: 29,
  novovicies: 29,
  undetricies: 29,
  undetrecies: 29,
  tricies: 30,
  trecies: 30,
  untricies: 31,
  untrecies: 31,
  duotricies: 32,
  duotrecies: 32,
  tertricies: 33,
  tertrecies: 33,
  quatertricies: 34,
  quatertrecies: 34,
  quintrecies: 35,
  quintricies: 35,
  setrecies: 35,
  setricies: 35,
  sextrecies: 35,
  sextricies: 35,
  septtrecies: 37,
  septtricies: 37,
  octotrecies: 38,
  octotricies: 38,
  duodequadracies: 38,
  novotrecies: 39,
  undequadracies: 39,
  novotricies: 39,
  quadracies: 40,
}

const semelBisTerEtcRegExp =
  /^(?:un(?:de?)?|duo(?:de)?|ter|quater|quin|sex?|sept|octo|novo)?(?:dec|v[ei]c|tr[ei]c|quadrag|quinquag|sexag|septuag|octog|nonag)ies|semel|bis|ter|quater|(?:quinqu|sex|sept|oct|no[nv])ies$/

function articleNumberSegmentToNumber(articleNumber: string): number {
  return articleNumber === "PREAMBULE"
    ? -4_000_000
    : articleNumber === "préliminaire"
      ? -3_000_000
      : articleNumber[0] === "L"
        ? articleNumber[1] === "O" // loi organique
          ? parseInt(articleNumber.slice(2)) - 2_000_000
          : parseInt(articleNumber.slice(1)) - 1_000_000 // législatif
        : articleNumber[0] === "R" // règlementaire
          ? parseInt(articleNumber.slice(1)) + 1_000_000
          : articleNumber[0] === "D" // décret
            ? parseInt(articleNumber.slice(1)) + 2_000_000
            : articleNumber[0] === "A" // arrêté
              ? parseInt(articleNumber.slice(1)) + 3_000_000
              : parseInt(articleNumber)
}

function articleNumberSegmentToPriorityAndNumber(
  segment: string,
  index: number,
  segments: string[],
): [number, number] {
  for (const [priority, [regExp, numberExtractor]] of (
    [
      [articleNumberRegExp, (segment) => articleNumberSegmentToNumber(segment)],
      [
        /^[A-Z]$/,
        (segment) =>
          [...segment].reduce(
            (sum, letter) => sum * 256 + letter.charCodeAt(0),
            0,
          ),
      ],
      [
        semelBisTerEtcRegExp,
        (segment) => numberBySemelBisTerEtc[segment] ?? 9999,
      ],
      // "Annexe" alone must be sorted after "Article 1 Annexe", "Annexe 1, art. 1"…
      [/^Annexe/i, () => (segments.length > 1 ? 1 : null)],
      [/^Tableau/i, () => 1],
      [/^[IVX]+$/, (segment) => toArabic(segment)],
      [/^Annexe/i, () => 1],
    ] as Array<
      [
        RegExp,
        (segment: string, index: number, segments: string[]) => number | null,
      ]
    >
  ).entries()) {
    if (regExp.test(segment)) {
      const extractedNumber = numberExtractor(segment, index, segments)
      if (extractedNumber !== null) {
        return [priority, extractedNumber]
      }
    }
  }
  throw new Error(
    `Unexpected segment "${segment}" in article number segments ${JSON.stringify(segments)}`,
  )
}

function splitArticleNumber(articleNumber: string): string[] {
  let annexe = false
  if (articleNumber === "ANNEXE À L'ARTICLE A. 752-3") {
    // LEGIARTI000043893358
    articleNumber = "Annexe 7-8"
  } else if (articleNumber.startsWith("Annexe à l'article ")) {
    annexe = true
    articleNumber = articleNumber.replace(/^Annexe à l'article /, "")
  } else if (articleNumber.startsWith("Annexe article ")) {
    annexe = true
    articleNumber = articleNumber.replace(/^Annexe article /, "")
  } else if (articleNumber === "R* 712-8") {
    // LEGIARTI000027445433
    articleNumber = "R712-8"
  }
  const segments = articleNumber
    .trim()
    .split(/,?\s+|-/)
    .filter(
      (segment) =>
        segment !== "" &&
        !["à", "art.", "articles", "aux", "l'article", "n°"].includes(segment),
    )
    .map((segment) => segment.replace(/^1er$/, "1"))
  if (annexe) {
    segments.push("Annexe")
  }
  return segments.reduce((segments: string[], segment: string) => {
    if (/^[A-Z]{2,3}$/.test(segment)) {
      segments.push(...segment)
    } else {
      segments.push(segment)
    }
    return segments
  }, [])
}

export function sortArticlesNumbers(
  articleNumber1: string,
  articleNumber2: string,
): number {
  const segments1 = splitArticleNumber(articleNumber1)
  const segments2 = splitArticleNumber(articleNumber2)
  for (let i = 0; i < Math.max(segments1.length, segments2.length); i++) {
    const segment1 = segments1[i]
    if (segment1 === undefined) {
      return -1
    }
    const segment2 = segments2[i]
    if (segment2 === undefined) {
      return 1
    }
    if (segment1 === segment2) {
      continue
    }

    const [priority1, number1] = articleNumberSegmentToPriorityAndNumber(
      segment1,
      i,
      segments1,
    )
    const [priority2, number2] = articleNumberSegmentToPriorityAndNumber(
      segment2,
      i,
      segments2,
    )
    if (priority1 !== priority2) {
      return priority1 - priority2
    }
    if (number1 !== number2) {
      return number1 - number2
    }
  }
  return 0
}
