/**
 * Formats description text by converting JSDoc-style tags into HTML elements
 * Supports:
 * - {@link SchemaName text} -> clickable link to schema (internal)
 * - {@link http://url text} -> clickable link to URL (external)
 * - {@link https://url | text} -> clickable link to URL with pipe separator
 * - @deprecated -> formatted deprecation notice
 * - @example -> formatted example block
 */

interface FormattedSegment {
  type: 'text' | 'link' | 'external-link' | 'deprecated' | 'example'
  content: string
  linkTarget?: string
  linkText?: string
  isExternal?: boolean
}

/**
 * Parse a description string and extract formatted segments
 */
export function parseDescription(description: string): FormattedSegment[] {
  if (!description) return []

  const segments: FormattedSegment[] = []
  let currentPos = 0

  // Regex patterns for different tags
  // Match {@link URL|text} or {@link URL text} with optional extra spaces
  // Handles multiple spaces between @link and URL, and between URL and text
  const linkPattern = /{@link\s+(https?:\/\/[^\s|}]+|\w+)(?:(?:\s*\|\s*|\s+)([^}]+))?}/g
  const deprecatedPattern = /@deprecated\b/g
  const examplePattern = /@example\b/g

  // Find all matches
  const matches: Array<{ index: number; length: number; segment: FormattedSegment }> = []

  // Find @link tags
  let match: RegExpExecArray | null
  while ((match = linkPattern.exec(description)) !== null) {
    const target = match[1]
    const text = match[2]?.trim() || target
    const isExternal = /^https?:\/\//.test(target)

    matches.push({
      index: match.index,
      length: match[0].length,
      segment: {
        type: isExternal ? 'external-link' : 'link',
        content: match[0],
        linkTarget: target,
        linkText: text,
        isExternal,
      },
    })
  }

  // Find @deprecated tags
  while ((match = deprecatedPattern.exec(description)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      segment: {
        type: 'deprecated',
        content: match[0],
      },
    })
  }

  // Find @example tags
  while ((match = examplePattern.exec(description)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      segment: {
        type: 'example',
        content: match[0],
      },
    })
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index)

  // Build segments
  for (const match of matches) {
    // Add text before the match
    if (currentPos < match.index) {
      const text = description.slice(currentPos, match.index)
      if (text) {
        segments.push({ type: 'text', content: text })
      }
    }

    // Add the formatted segment
    segments.push(match.segment)
    currentPos = match.index + match.length
  }

  // Add remaining text
  if (currentPos < description.length) {
    const text = description.slice(currentPos)
    if (text) {
      segments.push({ type: 'text', content: text })
    }
  }

  // If no matches were found, return the whole text as a single segment
  if (segments.length === 0 && description) {
    segments.push({ type: 'text', content: description })
  }

  return segments
}

/**
 * Simple function to check if a description contains any special tags
 */
export function hasSpecialTags(description: string): boolean {
  if (!description) return false
  return /{@link\s+/.test(description) || /@deprecated\b/.test(description) || /@example\b/.test(description)
}
