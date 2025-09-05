const latinTeens: Array<string[]> = [
  [],
  ["un"],
  ["du"], // duo
  ["ter"],
  ["quater"],
  ["quin"],
  ["sex"],
  ["sept"],
  ["oct"], // octo
  ["nov"], // novo
]
const latinTens: Array<string[]> = [
  [],
  ["decies"],
  ["vicies", "vecies"],
  ["tricies", "trecies"],
  ["quadragies"],
  ["quinquagies"],
  ["sexagies"],
  ["septuagies"],
  ["octogies"],
  ["nonagies"],
]
const latinUnits: Array<string[]> = [
  [],
  ["semel"],
  ["bis"],
  ["ter"],
  ["quater"],
  ["quinquies"],
  ["sexies"],
  ["septies"],
  ["octies"],
  ["nonies", "novies"],
]
const romanNumeralConversionTable = [
  1000,
  "M",
  900,
  "CM",
  500,
  "D",
  400,
  "CD",
  100,
  "C",
  90,
  "XC",
  50,
  "L",
  40,
  "XL",
  10,
  "X",
  9,
  "IX",
  5,
  "V",
  4,
  "IV",
  1,
  "I",
]
const teens = [
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
]
const tens = [
  "",
  "dix",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante-dix",
  "quatre-vingt",
  "quatre-vingt-dix",
]

const units = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
]

function cardinalNumeralFromNumber(num: number): string | undefined {
  if (num < 0) {
    return undefined
  }
  if (num === 0) {
    return "zéro"
  }

  if (num < 10) {
    return units[num]
  }

  if (num < 20) {
    return teens[num - 10]
  }

  if (num < 100) {
    const d = Math.floor(num / 10)
    const u = num % 10

    if (d === 7) {
      return `soixante-${teens[u]}`
    }
    if (d === 9) {
      return `quatre-vingt-${teens[u]}`
    }

    const result = tens[d]
    if (u === 0) {
      return result
    }
    if (u === 1 && d !== 8) {
      return `${result} et ${units[u]}`
    }
    return result + `-${units[u]}`
  }

  if (num < 1000) {
    const h = Math.floor(num / 100)
    const rest = num % 100
    let result = h === 1 ? "cent" : `${units[h]} cents`

    if (rest === 0) {
      return result
    }

    if (h > 1 && rest > 0) {
      result = result.slice(0, -1) // Remove 's' from 'cents'
    }

    return `${result} ${cardinalNumeralFromNumber(rest)}`
  }

  if (num < 1000000) {
    const k = Math.floor(num / 1000)
    const rest = num % 1000
    const result = k === 1 ? "mille" : `${cardinalNumeralFromNumber(k)} mille`

    if (rest === 0) {
      return result
    }

    return result + ` ${cardinalNumeralFromNumber(rest)}`
  }

  throw new Error("Number must be a less than one million.")
}

export function* iterCardinalNumeralFormsFromNumber(
  num: number,
): Generator<string, void> {
  if (num === 1) {
    yield "premier"
    yield "première"
    yield "unique"
    yield "Ier"
    yield "Ière"
    yield "1er"
    yield "1ère"
  }
  const cardinal = cardinalNumeralFromNumber(num)
  if (cardinal !== undefined) {
    yield cardinal
  }
  const roman = romanNumeralFromNumber(num)
  if (roman !== undefined) {
    yield roman
  }
  yield num.toString()
}

export function* iterLatinMultiplicativeAdverbsFromNumber(
  num: number,
): Generator<string, void> {
  if (num <= 0) {
    return
  }
  if (num < 10) {
    yield* latinUnits[num]
  } else if (num < 100) {
    const decade = Math.floor(num / 10)
    const unit = num % 10
    for (const latinTen of latinTens[decade]) {
      for (const latinTeen of latinTeens[unit]) {
        yield `${latinTeen}${[2, 8, 9].includes(unit) && latinTen[0] !== "o" ? "o" : ""}${latinTen}`
      }
    }
    if (decade < 9 && [8, 9].includes(unit)) {
      const nextLatinTens = latinTens[decade + 1]
      for (const nextLatinTen of nextLatinTens) {
        yield `${unit === 8 ? "duo" : "un"}${nextLatinTen[0] === "o" ? "d" : "de"}${nextLatinTen}`
      }
    }
  } else {
    throw new Error("Number must be a less than 100.")
  }
}

export function* iterOrdinalNumeralFormsFromNumber(
  num: number,
): Generator<string, void> {
  if (num === 1) {
    yield "premier"
    yield "première"
    yield "Ier"
    yield "Ière"
    yield "1er"
    yield "1ère"
  } else {
    const ordinal = ordinalNumeralFromNumber(num)
    if (ordinal !== undefined) {
      yield ordinal
    }
    const roman = romanNumeralFromNumber(num)
    if (roman !== undefined) {
      yield `${roman}e`
      yield `${roman}ème`
    }
    if (num > 0) {
      yield `${num}e`
      yield `${num}ème`
    }
    if (num === 2) {
      yield "second"
      yield "seconde"
      yield "2nd"
      yield "2nde"
    }
  }
}

export function numberFromRomanNumeral(romanNumeral: string) {
  romanNumeral = romanNumeral.toUpperCase()
  let i = 0
  let result = 0
  for (let n = 0; n < romanNumeralConversionTable.length; n += 2) {
    while (
      romanNumeral.substring(
        i,
        i + (romanNumeralConversionTable[n + 1] as string).length,
      ) === romanNumeralConversionTable[n + 1]
    ) {
      result += romanNumeralConversionTable[n] as number
      i += (romanNumeralConversionTable[n + 1] as string).length
    }
  }
  return result
}

export function ordinalNumeralFromNumber(num: number): string | undefined {
  if (num <= 0) {
    return undefined
  }
  if (num === 1) {
    return "premier"
  }

  const cardinal = cardinalNumeralFromNumber(num)
  if (cardinal === undefined) {
    return undefined
  }
  const lastWord = cardinal.match(/(^| )([^ ]+)$/)![2]

  // Special cases
  if (lastWord === "un") {
    const base = cardinal.slice(0, -2)
    return base + "unième"
  }

  if (lastWord === "cinq") {
    return cardinal.slice(0, -4) + "cinquième"
  }

  if (lastWord === "neuf") {
    return cardinal.slice(0, -3) + "euvième"
  }

  // General rule: check for last word ending in 'e'
  if (lastWord.endsWith("e")) {
    const base = cardinal.slice(0, -1)
    return base + "ième"
  }

  // General rule
  return cardinal + "ième"
}

export function romanNumeralFromNumber(num: number): string | undefined {
  if (num < 0) {
    return undefined
  }
  if (num === 0) {
    return "0I"
  }
  let romanNumber = ""
  for (let n = 0; n < romanNumeralConversionTable.length; n += 2) {
    while (num >= (romanNumeralConversionTable[n] as number)) {
      romanNumber += romanNumeralConversionTable[n + 1] as string
      num -= romanNumeralConversionTable[n] as number
    }
  }
  return romanNumber
}
