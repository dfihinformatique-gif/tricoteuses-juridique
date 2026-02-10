import * as cheerio from "cheerio"
import * as crypto from "crypto"
import type { Element } from "domhandler"

/**
 * Regex to extract z-index from style attribute
 * The z-index typically represents the alinea number (global in the document)
 */
const ZINDEX_REGEX = /z-index:\s*(\d+)/i

/**
 * Interface to track alinea markers with their global z-index
 * for later recalculation relative to articles
 */
interface AlineaMarker {
  /** The unique identifier for this marker */
  id: string
  /** The global z-index from the original document */
  globalZIndex: number
  /** MD5 hash of the pastille image (source of truth for alinea number) */
  imageHash?: string
}

/**
 * Known image hashes for alinea numbers (built from analysis of AN documents)
 * Maps MD5 hash of base64 image data to the alinea number it represents
 * This is the source of truth for alinea numbering
 *
 * There are two main variants of pastille images:
 * - PLF/DECL style (most common)
 * - PION style (different image set)
 */
const ALINEA_IMAGE_HASHES: Record<string, number> = {
  // === PLF/DECL style (most documents) ===
  // Alinéa 1
  f2c380780579a280a096acd8fcc823a0: 1,
  // Alinéa 2
  "3f80f0542475b680ceb73e8cf294b470": 2,
  // Alinéa 3
  fe80eb6fc64e8de969aed714ad45fe26: 3,
  // Alinéa 4
  "1d41f3dec63d8e79be502b56fc4d0fe9": 4,
  // Alinéa 5
  "3897ae4eea49099dacd75569920c84b7": 5,
  // Alinéa 6
  "22e32fa2c5b5e9aef2127fc1156c162a": 6,
  // Alinéa 8
  ba115410998ebd9c64824326754533a4: 8,
  // Alinéa 9
  "70d874b6c64c87b1fdd5bf57462d4564": 9,
  // Alinéa 10
  "9ab410689bdbec299cc78b83b78c7044": 10,
  // Alinéa 11
  "35a62848730154491676f4dc5cf215b6": 11,
  // Alinéa 12
  fd8f5b154eeb18c6c37f9710db2c3208: 12,
  // Alinéa 13
  "8453c19088a955c9e373a8e3c1d26a71": 13,
  // Alinéa 14
  a23583472cc9f7bb66438d29b552cc54: 14,
  // Alinéa 15
  b22170ede8a9b498fd902152cf57c85c: 15,
  // Alinéa 16
  c8e71e0cf4b3cb0b22ecef1f6da654af: 16,
  // Alinéa 17
  ef9d83a24fc1ad1a24dc71b457074340: 17,
  // Alinéa 18
  ee4bdd2bed21d03baa347aa69ac4df6c: 18,
  // Alinéa 19
  "5570eda6b2f877cfb8878a2ec7bb945a": 19,
  // Alinéa 20
  "8b9f76c8b657e64420311d2a42f0e380": 20,
  // Alinéa 21
  e03d8b22c0d46532cc3366d61b50dac3: 21,
  // Alinéa 22
  "8398e8ce5f54374a0e6996c7e98e8473": 22,
  // Alinéa 23
  d231ee7ba4106eee57ba5a5582653abf: 23,
  // Alinéa 24
  b20ba06b04fd026af93b09016710ba00: 24,
  // Alinéa 25
  c2a7bccf1470a6cd28fc82ed101d2c07: 25,
  // Alinéa 26
  "19271b90d74d421f98bf369a7f82c9d3": 26,
  // Alinéa 27
  "46fee6043b0e029fa9b825fbad5e98c3": 27,
  // Alinéa 28
  "9689ac3c09fdd58ca139a10768302c25": 28,
  // Alinéa 29
  "9d4c3b1d5f8e303dc5e85ab6b6946d65": 29,
  // Alinéa 30
  b57e014a6dd6510eb5587d08a0d08b4c: 30,
  // Alinéa 31
  "8ec2866c4c93d87a36168c85159a6098": 31,
  // Alinéa 32
  d7bd7ca947916840a2c3e78148b32593: 32,
  // Alinéa 33
  "2b21de659cc6da2f7487b175f2b58e28": 33,
  // Alinéa 34
  eec831e9445b1439556a03897221f5b0: 34,
  // Alinéa 35
  "2ee0cdacb399d1ac9b1da87f241ee656": 35,
  // Alinéa 36
  c9a08f28617891107f127b41b32662d6: 36,
  // Alinéa 37
  "3ce19c073258875b9e0972a21c33a948": 37,
  // Alinéa 38
  "7e62fd32fd5931c95f420353a72d5002": 38,
  // Alinéa 39
  "060a8f520a04af7ba5e1a8ec96e6aac3": 39,
  // Alinéa 40
  "021683a5a4665ac685d7af70da26d870": 40,
  // Alinéa 41
  "6b334945dc3c60d657c890a8ff018cff": 41,
  // Alinéa 42
  "5b7590bea073d9b715c0b89769472770": 42,
  // Alinéa 46
  "68078d9cd4631d632459adafb534ae80": 46,
  // Alinéa 55
  d46fc7b4a08f9b5106743f807dd14149: 55,
  // Alinéa 56
  "40d235bdc5227467bfd38a731ac80e98": 56,
  // Alinéa 57
  "6428d778150a7368a5e0413ec6e4b8b2": 57,
  // Alinéa 60
  d92afc055b14cb7fbc11555a4db60f21: 60,
  // Alinéa 63
  "84e1efaac13a4509eea5658871af2979": 63,
  // Alinéa 65
  "907998fe8c6a66bfe1edea08a60b8553": 65,
  // Alinéa 67
  "3ff9b079c6551010c3d18a2c54746f75": 67,
  // Alinéa 68
  b309f44db33e56b26cb9c52f9e11123e: 68,
  // Alinéa 74
  "42a0108c9e9c388e7d84dc22314fddeb": 74,
  // Alinéa 80
  "8c89237eef83435cb263e5dee1a0394a": 80,
  // Alinéa 81
  ddee5247f0a2bb5932f260219ee177cb: 81,
  // Alinéa 84
  b801c66e66f08e7b2b3d97b8e0e6b4d9: 84,
  // Alinéa 88
  "5ef75c3426bd02d78169eb62258e148f": 88,
  // Alinéa 89
  d31cd2dbf0ed2461a93a39c8f9a3b680: 89,
  // Alinéa 91
  "7b115ba70c522433671ca6a57911dd78": 91,
  // Alinéa 93
  "4db18b0155037fa016937229c483f57a": 93,
  // Alinéa 95
  "615066b9c2a9dd05a73daf93f84d7c14": 95,
  // Alinéa 96
  "5c8091721cb9beab02d62e046ead6627": 96,
  // Alinéa 98
  "2db95ebfcd4a6d69be038d6a8c984f88": 98,
  // Alinéa 100
  df62822dacf8772e8095d2f6b58a737d: 100,
  // Alinéa 103
  ac0ba5a2431decb14d3115f405df3398: 103,
  // Alinéa 104
  "03a65924157ee4e395ec8ab923def7ac": 104,
  // Alinéa 106
  c117af6f9d79cba2579e0b789ee062c1: 106,
  // Alinéa 109
  "480f1b0eaf3fa9dffb7e8fb619699478": 109,
  // Alinéa 110
  aa1446e53734b36f99e061d4657262ad: 110,
  // Alinéa 111
  "9a51b14d5537400e3a7a59bbe1cc8b52": 111,
  // Alinéa 112
  cc822f66efbb7c9e7290e9f4c048d792: 112,
  // Alinéa 113
  "7e63ac9e5fce028ab622be82e4175c5b": 113,
  // Alinéa 114
  "963bf94057e971c2898932fa6796e2fa": 114,
  // Alinéa 115
  "3e1d60f2439ed850c063bae7d4f12ea4": 115,
  // Alinéa 116
  "8e9dbc9c2c687e7aef3bebc28d6c962a": 116,
  // Alinéa 117
  fcc23f49b071767c570b2efaef36e57c: 117,
  // Alinéa 118
  "4ff82625e534e590ec4b0c9aca8d9b78": 118,
  // Alinéa 119
  a4d0a0eef2dbd97da1639879d64f9db4: 119,
  // Alinéa 120
  "225c4a79756a31df26d3d060a35f5676": 120,
  // Alinéa 121
  "43da6cfb1e3ecf61599d018862e4bb58": 121,
  // Alinéa 122
  "392485a67941e73a2e3f2fd59630d1d8": 122,
  // Alinéa 129
  "64858040f749ae9b597e6c101133d7da": 129,
  // Alinéa 134
  e2ca98541a9a011663deb14083b4eeb6: 134,
  // Alinéa 135
  "5b96b842495aa61647e265114128bc78": 135,
  // Alinéa 137
  "79637fa18b28a5bdc69da08c500e76fd": 137,
  // Alinéa 146
  aeb2a98262b43d3d257e03ca97d8dc68: 146,
  // Alinéa 149
  "730c0ef5209ac1f1bb05c463bd00ae79": 149,
  // Alinéa 161
  b36d7712b797830a3207989f8e3aa68c: 161,
  // Alinéa 186
  "5b1f0d7a6552f854e06a4cf0c8f33513": 186,
  // Alinéa 203
  "1b44da5955e2cb08a86299f08adaac9b": 203,
  // Alinéa 207
  "0d47535b3de84a6f9ff2ab720332b3ad": 207,
  // Alinéa 227
  "816fc06636363df27db9fbba95eb1fd0": 227,
  // Alinéa 228
  "1b023e87acf9020d1b5fcc53c0e6ddf7": 228,
  // Alinéa 257
  "3e30d60b04d516fdd6a59189699f3147": 257,
  // Alinéa 258
  "594b812e850a965637912b93cca37b64": 258,
  // Alinéa 261
  "67dc9f3f11a603ccf017ad12586b8a91": 261,
  // Alinéa 263
  c1088743a30653406b6f2ed543984130: 263,
  // Alinéa 265
  ef9cab291f0375eff6581140715a6a6c: 265,
  // Alinéa 267
  "6516c157be8d9d34d3bf39bb6bcf7e6f": 267,
  // Alinéa 268
  "0e84bd68d315087c98f4e0c5c2c8da18": 268,
  // Alinéa 270
  "6d8b4ecf2222d26651425dbcad12a474": 270,
  // Alinéa 274
  "1909bebaf838380af34e0093caa08daf": 274,
  // Alinéa 297
  ce69c375e92dd044fe597cec770ac820: 297,
  // Alinéa 304
  a33a96538a3d8003cec0175b74ff2180: 304,
  // Alinéa 330
  "777a99a8a4da2d09ce2bf46f13ae318b": 330,
  // Alinéa 337
  "07726ce6c4d6c938fa888cbf4dc825bf": 337,
  // Alinéa 341
  "5d60636fb30cd229fd97c91258084484": 341,
  // Alinéa 344
  c047e3926248f6a22f67a1aa0f78315f: 344,
  // Alinéa 345
  "5d57f4ddb1babca4523aed49b4a033c4": 345,
  // Alinéa 346
  f25c0f6457e1921eb9fe64f7ada57955: 346,
  // Alinéa 347
  c47926297b8d3896f902addf6d3c0204: 347,
  // Alinéa 352
  fb411489bb449a3036cce830e58848fa: 352,
  // Alinéa 353
  "066d1fde02e4981be98677e42703afa3": 353,
  // Alinéa 354
  f5c54e665cb455f5c3769089579ccef8: 354,
  // Alinéa 355
  "26f49df41bee66bc3896951466f4ce95": 355,
  // Alinéa 356
  "1f078421369aa0d004964f87180e21ea": 356,
  // Alinéa 357
  "497cbccbdfdcfb38beb7275ca7ae327d": 357,
  // Alinéa 358
  "9eb3eda5ded527bb7e680309e8029766": 358,
  // Alinéa 359
  "550b7ef4054e6b1796f2da1a8d5f3aa5": 359,
  // Alinéa 360
  "11df542468345a243b788df717456597": 360,
  // Alinéa 361
  "1e7d188297e7e5d3229b3135a8cf2b39": 361,
  // Alinéa 362
  "50582851f936c1af9e1dc45a4bb63546": 362,
  // Alinéa 363
  "765929a3cfd4b979d352f868027e4830": 363,
  // Alinéa 364
  "97e3c1db1747c0e28cd8f728a390d8f3": 364,
  // Alinéa 365
  "1e56dc576549143042bf672e5aa177d8": 365,
  // Alinéa 366
  "005ea8b73e379c38f9cda47bf7419d14": 366,
  // Alinéa 367
  "3b2a9a0d37634946d98329774f328e72": 367,
  // Alinéa 368
  ceddc5afe9275831e8b025e1732542ce: 368,
  // Alinéa 369
  "5751232480560c2c68412e6540ac8485": 369,
  // Alinéa 370
  "86c469cc6eb33bd873cfedd2ccd79ff7": 370,
  // Alinéa 371
  d8cf4316af53f0735fc9e854316d9e39: 371,
  // Alinéa 394
  f155fbe004644bd25c07b25c51185de6: 394,
  // Alinéa 395
  "3c86606dc51c0e557728c6c0125db14b": 395,
  // Alinéa 408
  "42447fb8dd1f7919205a13de3cfc839a": 408,
  // Alinéa 432
  f0d071d85c5e311dc97e03984dc50c0b: 432,
  // Alinéa 437
  edb24882d3f6168693d2ef48afc3696d: 437,
  // Alinéa 439
  "6e639da25ee675961ab4d380e99c6c62": 439,
  // Alinéa 442
  ec6b9b1266882a53b9f601aaa9b883c3: 442,
  // Alinéa 444
  a71711aec05e5d581a6939e497b3ef31: 444,
  // Alinéa 449
  "408b3c651992c8f75b9b0f95102b6da1": 449,
  // Alinéa 452
  e44df3f0afd5ad1cebff1b3f9c267aff: 452,
  // Alinéa 453
  ad05d42496dd84663b545b35b683a81e: 453,
  // Alinéa 454
  f280c4eb98c7f0d69b02ab6c91bafe16: 454,
  // Alinéa 455
  "20b6923c0338e56be9f6d3f78b5e0029": 455,
  // Alinéa 456
  ada10b144442290e65b7638a7b26bee8: 456,
  // Alinéa 459
  "1294acec761f811410e73be9a85cff1a": 459,
  // Alinéa 461
  c5fc04f41e79637cd6e92bf1b9fcd5ab: 461,
  // Alinéa 464
  "38db29746b96d514455913f4bc1fb0a8": 464,
  // Alinéa 36e (variant)
  "36e7d17c5eecc370c6c987c6314db1d3": 397,
  // Alinéa b05 (variant)
  b05de38102da8f8635c7cc7c389c11b7: 401,

  // === PION style (alternative image set) ===
  // Alinéa 1
  "31ce3e5492d9b729f4d10ddb242e027b": 1,
  // Alinéa 2
  cea0e8356f827f514bf667f008a06361: 2,
  // Alinéa 3
  "273fbc72b5d75d945070fdd79a5bdc0b": 3,
  // Alinéa 4
  "296e44eaf509aef7488fc94873785385": 4,
  // Alinéa 5
  "00e78f281a12b9b8439c2a8fb0f51a72": 5,
  // Alinéa 6
  "74b24c1f48751ce2685bd0c2a4e620ea": 6,
  // Alinéa 7
  "0fcbe0e6551fd9ca8c6fddd85d06c5d5": 7,
}

/**
 * CSS styles for alinea markers (inline to be self-contained)
 */
const ALINEA_STYLES = `
.alinea {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0 0.3em;
  margin-right: 0.3em;
  font-size: 0.75em;
  font-weight: bold;
  color: #555;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 1em;
  vertical-align: middle;
}

`

/**
 * Computes MD5 hash of a string (used for image base64 data)
 */
function computeHash(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex")
}

/**
 * Options for HTML simplification
 */
export interface SimplifyHtmlOptions {
  /** Keep align attribute on paragraphs (default: true) */
  keepAlignment?: boolean
  /** Convert nbsp to regular spaces (default: false) */
  convertNbsp?: boolean
  /** Remove empty paragraphs (default: true) */
  removeEmptyParagraphs?: boolean
  /** Keep image hash in alinea markers for debugging (default: false) */
  keepImageHash?: boolean
  /** Use relative alinea numbering within each article (1, 2, 3...) instead of
   * absolute numbers from the original document (default: false) */
  relativeAlineaNumbers?: boolean
}

/**
 * Checks if a style attribute contains bold formatting
 */
function isBold(style: string | undefined): boolean {
  if (!style) return false
  return (
    /font-weight\s*:\s*(bold|[6-9]00|1000)/i.test(style) ||
    /font-family\s*:\s*[^;]*\bBold\b/i.test(style)
  )
}

/**
 * Checks if a style attribute contains italic formatting
 */
function isItalic(style: string | undefined): boolean {
  if (!style) return false
  return (
    /font-style\s*:\s*italic/i.test(style) ||
    /font-family\s*:\s*[^;]*\bItalic\b/i.test(style)
  )
}

/**
 * Checks if a style attribute indicates superscript
 * Note: We exclude very small font sizes used just for spacing in Word documents
 */
function isSuperscript(style: string | undefined): boolean {
  if (!style) return false
  // Check for vertical-align: super
  if (!/vertical-align\s*:\s*super/i.test(style)) return false
  // Exclude tiny font sizes that are just used for spacing (e.g., font-size:6.67pt)
  const fontSizeMatch = style.match(/font-size\s*:\s*([\d.]+)pt/i)
  if (fontSizeMatch && parseFloat(fontSizeMatch[1]) < 8) {
    return false
  }
  return true
}

/**
 * Checks if a style attribute indicates subscript
 */
function isSubscript(style: string | undefined): boolean {
  if (!style) return false
  return /vertical-align\s*:\s*sub/i.test(style)
}

/**
 * Checks if a style or class indicates centered text
 */
function isCentered(
  style: string | undefined,
  className: string | undefined,
): boolean {
  if (style && /text-align\s*:\s*center/i.test(style)) return true
  if (className && /center/i.test(className)) return true
  return false
}

/**
 * Gets the text alignment from style
 */
function getAlignment(style: string | undefined): string | null {
  if (!style) return null
  const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Check if an element represents a heading based on its class name
 */
function getHeadingLevel(className: string | undefined): number | null {
  if (!className) return null

  // Match patterns like assnat4TitreNum, assnat5ChapitreNum, etc.
  const patterns: Array<[RegExp, number]> = [
    [/assnat1Tome|assnatAN1PARTIE/i, 1],
    [/assnat2Partie|assnatAN2GRAND/i, 2],
    [/assnat3Livre|assnatAN3GRAND/i, 3],
    [/assnat4Titre|assnatAN4Petit/i, 4],
    [/assnat5Chapitre|assnatAN5Petit/i, 5],
    [
      /assnat6Section|assnat7Sous-section|assnat8Paragraphe|assnat9ArticleNum/i,
      6,
    ],
  ]

  for (const [pattern, level] of patterns) {
    if (pattern.test(className)) {
      return level
    }
  }

  return null
}

/**
 * Simplifies Word-generated HTML to clean, semantic HTML
 *
 * This function takes complex HTML generated by Word (typically from Assemblée nationale documents)
 * and converts it to simple, clean HTML with only essential semantic elements:
 * - <p> for paragraphs
 * - <strong> for bold text
 * - <em> for italic text
 * - <sup> for superscript
 * - <sub> for subscript
 * - <br> for line breaks
 * - <h1> to <h6> for headings
 * - <a> for links (href preserved)
 *
 * @param html - The input HTML string (Word-generated)
 * @param options - Options for simplification
 * @returns Simplified HTML string
 */
export function simplifyWordHtml(
  html: string,
  options: SimplifyHtmlOptions = {},
): string {
  const {
    keepAlignment = true,
    convertNbsp = false,
    removeEmptyParagraphs = true,
  } = options

  const $ = cheerio.load(html, {
    xml: {
      decodeEntities: false,
    },
  })

  // Remove style and script elements
  $("style, script, meta, link").remove()

  // Collect alinea markers with their global z-index
  // We'll recalculate them relative to each article later
  const alineaMarkers: AlineaMarker[] = []
  let alineaMarkerId = 0

  // Process pastille images (alinea markers) before removing other images
  // These are small images positioned to the left that contain alinea numbers
  $('span[style*="position:absolute"]').each((_, span) => {
    const $span = $(span)
    const style = $span.attr("style") || ""
    const $img = $span.find("img")

    // Skip if no image found
    if ($img.length === 0) {
      return
    }

    // Skip pastilles where the image is inside <del> elements (deleted content)
    // The <del> can be either around the span or inside it wrapping the img
    if ($span.parents("del").length > 0 || $span.find("del img").length > 0) {
      return
    }

    // Also skip if the img itself is a direct child of del inside this span
    if ($img.parent("del").length > 0) {
      return
    }

    {
      const imgAttrs = $img.attr()

      // Check if this is a pastille image (small, positioned to the left)
      if (
        imgAttrs &&
        imgAttrs.width === "45" &&
        (imgAttrs.height === "31" || imgAttrs.height === "30") &&
        style.includes("position:absolute")
      ) {
        // Extract z-index which represents the alinea number (global)
        const zIndexMatch = style.match(ZINDEX_REGEX)
        if (zIndexMatch) {
          const globalZIndex = parseInt(zIndexMatch[1], 10)
          const markerId = `__alinea_marker_${alineaMarkerId++}__`

          // Extract image hash for validation
          const imgSrc = imgAttrs.src || ""
          const base64Match = imgSrc.match(/^data:image\/png;base64,(.+)$/)
          const imageHash = base64Match
            ? computeHash(base64Match[1])
            : undefined

          // Store the marker info for later recalculation
          alineaMarkers.push({
            id: markerId,
            globalZIndex,
            imageHash,
          })

          // Replace the span with a temporary placeholder
          // We'll replace these with correct relative numbers after processing headings
          const hashAttr = imageHash ? ` data-image-hash="${imageHash}"` : ""
          $span.replaceWith(
            `<span class="alinea" data-marker-id="${markerId}" data-global-zindex="${globalZIndex}"${hashAttr}></span>`,
          )
          return
        }
      }
    }
  })

  // Process remaining spans that might need cleanup
  $('span[style*="position:absolute"]').each((_, span) => {
    const $span = $(span)
    const style = $span.attr("style") || ""
    const $img = $span.find("img")

    // Check if this span only contains an image and should be removed
    if (
      $img.length > 0 &&
      $span.children().length === 1 &&
      style.includes("height:0pt")
    ) {
      // This is likely a layout span with an image, remove it
      $span.remove()
    }
  })

  // Remove remaining images (typically base64 logos in Word documents)
  $("img").remove()

  // Remove Word-specific elements that are just for layout
  // (pastille spans have already been processed above)
  $('span[style*="height:0pt"]:not(.alinea)').each((_, span) => {
    const $span = $(span)
    // Only remove if it doesn't contain meaningful content
    const text = $span.text().trim()
    if (!text || text === "\u00a0") {
      $span.remove()
    }
  })
  $(
    'span[style*="display:block"][style*="position:absolute"]:not(.alinea)',
  ).remove()
  $("del").remove()

  // Process all elements to extract formatting
  function processElement(el: Element): {
    bold: boolean
    italic: boolean
    sup: boolean
    sub: boolean
  } {
    const $el = $(el)
    const style = $el.attr("style")
    const tagName = el.tagName?.toLowerCase() || ""

    let bold = isBold(style) || tagName === "b" || tagName === "strong"
    let italic = isItalic(style) || tagName === "i" || tagName === "em"
    const sup = isSuperscript(style) || tagName === "sup"
    const sub = isSubscript(style) || tagName === "sub"

    // Check class for bold/italic hints
    const className = $el.attr("class") || ""
    if (/bold/i.test(className)) bold = true
    if (/italic/i.test(className)) italic = true

    return { bold, italic, sup, sub }
  }

  // Wrap content with appropriate tags based on formatting
  function wrapWithFormatting(
    content: string,
    formatting: { bold: boolean; italic: boolean; sup: boolean; sub: boolean },
  ): string {
    let result = content

    if (formatting.sup) {
      result = `<sup>${result}</sup>`
    } else if (formatting.sub) {
      result = `<sub>${result}</sub>`
    }

    if (formatting.italic) {
      result = `<em>${result}</em>`
    }

    if (formatting.bold) {
      result = `<strong>${result}</strong>`
    }

    return result
  }

  // Process span elements - extract formatting and replace with appropriate semantic tags
  // We need multiple passes since spans can be nested
  let spanCount = $("span").length
  while (spanCount > 0) {
    $("span").each((_, span) => {
      const $span = $(span)
      const style = $span.attr("style") || ""
      const className = $span.attr("class") || ""
      const formatting = processElement(span)
      const hasFormatting =
        formatting.bold || formatting.italic || formatting.sup || formatting.sub

      // Check if this is a "spacing" span (tiny superscript used just for spacing)
      const isSpacingSpan =
        /vertical-align\s*:\s*super/i.test(style) &&
        /font-size\s*:\s*([\d.]+)pt/i.test(style) &&
        parseFloat(
          (style.match(/font-size\s*:\s*([\d.]+)pt/i) || ["", "12"])[1],
        ) < 8

      // Check if this span has a meaningful class (like leaderText) that we should preserve as id
      const hasMeaningfulClass = className && !/^assnat/i.test(className)

      if (isSpacingSpan) {
        // Replace with the content (usually nbsp) without any formatting
        const innerHtml = $span.html() || ""
        $span.replaceWith(innerHtml)
      } else if (hasFormatting) {
        const innerHtml = $span.html() || ""
        $span.replaceWith(wrapWithFormatting(innerHtml, formatting))
      } else if (hasMeaningfulClass) {
        // Keep the span but remove style attribute
        $span.removeAttr("style")
      } else {
        // No formatting and no meaningful class - unwrap the span
        $span.replaceWith($span.html() || "")
      }
    })

    const newSpanCount = $("span").length
    if (newSpanCount >= spanCount) {
      // No progress made, break to avoid infinite loop
      break
    }
    spanCount = newSpanCount
  }

  // Process paragraphs - detect if they're actually headings
  $("p").each((_, p) => {
    const $p = $(p)
    const className = $p.attr("class")
    const style = $p.attr("style")
    const headingLevel = getHeadingLevel(className)

    // Get the text content to check if it starts with « (quoted legislative text)
    // These are citations and should not be converted to headings
    const textContent = $p.text().trim()
    const startsWithQuote = textContent.startsWith("«")

    if (headingLevel && !startsWithQuote) {
      // Convert to heading (but not if it's quoted text)
      const innerHtml = $p.html() || ""
      const $heading = $(`<h${headingLevel}>${innerHtml}</h${headingLevel}>`)

      // Keep alignment if it's centered
      if (keepAlignment && isCentered(style, className)) {
        $heading.attr("align", "center")
      }

      $p.replaceWith($heading)
    } else {
      // Keep as paragraph, but extract alignment if needed
      if (keepAlignment) {
        const alignment = getAlignment(style)
        if (alignment && alignment !== "justify" && alignment !== "left") {
          $p.attr("align", alignment)
        }
      }

      // Remove all other attributes
      const align = $p.attr("align")
      $p.removeAttr("style").removeAttr("class")
      if (align) {
        $p.attr("align", align)
      }
    }
  })

  // Process headings - clean attributes
  $("h1, h2, h3, h4, h5, h6").each((_, h) => {
    const $h = $(h)
    const style = $h.attr("style")
    const className = $h.attr("class")

    if (keepAlignment && isCentered(style, className)) {
      $h.removeAttr("style").removeAttr("class")
      $h.attr("align", "center")
    } else {
      $h.removeAttr("style").removeAttr("class")
    }
  })

  // Process links - keep only href, convert id-only anchors to spans
  $("a").each((_, a) => {
    const $a = $(a)
    const href = $a.attr("href")
    const id = $a.attr("id")

    // Remove all attributes except href and id
    const attribs = { ...((a as Element).attribs || {}) }
    for (const attr of Object.keys(attribs)) {
      if (attr !== "href" && attr !== "id") {
        $a.removeAttr(attr)
      }
    }

    // If no href and no meaningful id, unwrap the anchor
    if (!href && (!id || id.startsWith("_Toc"))) {
      $a.replaceWith($a.html() || "")
    } else if (!href && id) {
      // Convert id-only anchors to spans for semantic correctness
      const innerHtml = $a.html() || ""
      $a.replaceWith(`<span id="${id}">${innerHtml}</span>`)
    }
  })

  // Process divs - unwrap them (Word uses divs for sections)
  // We need to do this iteratively since nested divs require multiple passes
  while ($("div").length > 0) {
    $("div").each((_, div) => {
      const $div = $(div)
      const innerHtml = $div.html() || ""
      $div.replaceWith(innerHtml)
    })
  }

  // Process br elements with page-break style - convert to simple br
  $("br").each((_, br) => {
    const $br = $(br)
    $br.removeAttr("style").removeAttr("class")
  })

  // Process tables - keep structure but remove styling
  $("table, tr, td, th, thead, tbody, tfoot").each((_, el) => {
    const $el = $(el)
    $el.removeAttr("style").removeAttr("class")
  })

  // Now recalculate alinea numbers relative to each article
  // Articles are marked by h6 headings (from assnat9ArticleNum class)
  // Within each article, alineas should be numbered starting from 1
  recalculateAlineaNumbers(
    $,
    options.keepImageHash ?? false,
    options.relativeAlineaNumbers ?? false,
  )

  // Get the body content
  const bodyHtml = $("body").html() || $.html()

  // Check if there are any alinea markers - if so, add the styles
  const hasAlineas = bodyHtml.includes('class="alinea')
  let result = hasAlineas
    ? `<style>${ALINEA_STYLES}</style>\n${bodyHtml}`
    : bodyHtml

  // Clean up whitespace
  result = result
    // Remove excessive whitespace between tags
    .replace(/>\s+</g, "> <")
    // Normalize line breaks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim lines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")

  // Convert nbsp if requested
  if (convertNbsp) {
    result = result.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ")
  }

  // Remove empty paragraphs if requested
  if (removeEmptyParagraphs) {
    // Remove paragraphs that contain only whitespace, nbsp, or empty formatting tags
    result = result
      .replace(/<p[^>]*>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/p>/gi, "")
      .replace(
        /<p[^>]*>\s*<(strong|em|b|i)>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/\1>\s*<\/p>/gi,
        "",
      )
  }

  // Remove empty spans
  result = result.replace(/<span[^>]*>\s*<\/span>/gi, "")

  // Merge consecutive formatting tags
  result = mergeConsecutiveFormatting(result)

  // Final cleanup
  result = result
    // Remove empty formatting tags (including those with only whitespace/nbsp)
    .replace(
      /<(strong|em|b|i|sup|sub)>\s*(&nbsp;|&#xa0;|&#160;|\u00a0|\s)*\s*<\/\1>/gi,
      "",
    )
    // Remove formatting tags that only contain nbsp
    .replace(/<(strong|em|b|i)>(&nbsp;|&#xa0;|&#160;|\u00a0)+<\/\1>/gi, " ")
    // Normalize self-closing tags
    .replace(/<br\s*\/?>/gi, "<br/>")
    // Clean up multiple consecutive spaces
    .replace(/  +/g, " ")
    .trim()

  return result
}

/**
 * Recalculates alinea numbers within each article
 * Articles are identified by h6 headings (converted from assnat9ArticleNum)
 *
 * Two modes are supported:
 * - Absolute mode (relativeNumbering=false): Uses the image hash to determine
 *   the alinea number from the original document. This preserves the legal
 *   structure where numbers may be non-sequential (e.g., 10 → 12) when
 *   referencing amended law articles.
 * - Relative mode (relativeNumbering=true): Numbers alineas sequentially
 *   within each article starting from 1. This is useful for simplified
 *   display where the original document's numbering is not needed.
 */
function recalculateAlineaNumbers(
  $: cheerio.CheerioAPI,
  keepImageHash: boolean,
  relativeNumbering: boolean,
): void {
  // Get all elements in document order
  const body = $("body")
  if (body.length === 0) return

  // Find all alinea markers and h6 headings
  const allElements = body.find("h6, span.alinea[data-marker-id]")

  // Track state for duplicate detection and relative numbering
  let lastAlineaNumber = -1
  let relativeCounter = 0

  allElements.each((_, el) => {
    const $el = $(el)

    if (el.tagName?.toLowerCase() === "h6") {
      // New article starts - reset trackers
      lastAlineaNumber = -1
      relativeCounter = 0
    } else if ($el.hasClass("alinea") && $el.attr("data-marker-id")) {
      // This is an alinea marker
      const imageHash = $el.attr("data-image-hash")
      const globalZIndex = parseInt($el.attr("data-global-zindex") || "0", 10)

      let alineaNumber: number

      if (relativeNumbering) {
        // Relative mode: sequential numbering within each article
        relativeCounter++
        alineaNumber = relativeCounter
      } else {
        // Absolute mode: use the image hash as the source of truth
        if (imageHash && ALINEA_IMAGE_HASHES[imageHash] !== undefined) {
          // Known hash - use the predefined alinea number
          alineaNumber = ALINEA_IMAGE_HASHES[imageHash]
        } else {
          // Unknown hash - use the z-index as the alinea number
          // In most PLF/DECL documents, the z-index corresponds directly to the alinea number
          // This handles the many high-numbered alineas (100+) without needing to maintain
          // a complete hash table
          alineaNumber = globalZIndex > 0 ? globalZIndex : 1
        }
      }

      // Skip duplicates (same alinea number as previous, possibly from del/ins remnants)
      // Note: In relative mode, duplicates shouldn't occur, but we check anyway
      if (alineaNumber === lastAlineaNumber) {
        // Remove duplicate marker
        $el.remove()
        // In relative mode, decrement the counter since we removed this marker
        if (relativeNumbering) {
          relativeCounter--
        }
        return
      }

      lastAlineaNumber = alineaNumber

      // Update the marker with the alinea number
      $el.attr("data-alinea", String(alineaNumber))

      // Add visible text content showing the alinea number
      $el.text(String(alineaNumber))

      // Clean up temporary attributes
      $el.removeAttr("data-marker-id")
      $el.removeAttr("data-global-zindex")
      if (!keepImageHash) {
        $el.removeAttr("data-image-hash")
      }
    }
  })
}

/**
 * Merge consecutive identical formatting tags
 * e.g., <strong>foo</strong><strong>bar</strong> -> <strong>foobar</strong>
 */
function mergeConsecutiveFormatting(html: string): string {
  let result = html

  // Merge consecutive strong tags
  result = result.replace(/<\/strong>\s*<strong>/gi, "")

  // Merge consecutive em tags
  result = result.replace(/<\/em>\s*<em>/gi, "")

  // Merge consecutive sup tags
  result = result.replace(/<\/sup>\s*<sup>/gi, "")

  // Merge consecutive sub tags
  result = result.replace(/<\/sub>\s*<sub>/gi, "")

  return result
}

/**
 * Simplifies Word-generated HTML and returns a complete HTML document
 */
export function simplifyWordHtmlToDocument(
  html: string,
  options: SimplifyHtmlOptions = {},
): string {
  const simplifiedContent = simplifyWordHtml(html, options)

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Document simplifié</title>
</head>
<body>
${simplifiedContent}
</body>
</html>`
}
