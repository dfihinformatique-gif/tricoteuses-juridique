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

export function romanNumeralFromNumber(number: number): string {
  let romanNumber = ""
  for (let n = 0; n < romanNumeralConversionTable.length; n += 2) {
    while (number >= (romanNumeralConversionTable[n] as number)) {
      romanNumber += romanNumeralConversionTable[n + 1] as string
      number -= romanNumeralConversionTable[n] as number
    }
  }
  return romanNumber
}
