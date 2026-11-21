export type TemplateStyle = 'monospace' | 'embedded'

type LyricChordPair = string[] | [string, undefined] | [string, string]

const directiveOrSectionPattern = /^\s*@\w+|^\s*\[/
const blankLinePattern = /^\s*$/

/** pattern for lines that should not be processed for chord embedding */
const unpairableLinePattern = /^\s*$|^\s*@|^\s*\[/

export function detectPotentialMonospaceFormat(sourceTxt: string) {
  return !/{/gm.test(sourceTxt)
}

export function detectTemplateStyle(sourceTxt: string): TemplateStyle {
  return detectPotentialMonospaceFormat(sourceTxt) ? 'monospace' : 'embedded'
}

export function monospaceToTemplate(sourceTxt: string) {
  if (!sourceTxt) return ''

  const sourceLines = sourceTxt.split('\n')
  const linePairs = pairLines(sourceLines)
  const rendered: string[] = []

  for (const pair of linePairs) {
    rendered.push(embedChords(pair))
  }

  return rendered.join('\n')
}

export function templateToMonospace(sourceTxt: string) {
  if (!sourceTxt) return ''

  const sourceLines = sourceTxt.split('\n')
  const rendered: string[] = []

  for (const rawLine of sourceLines) {
    const trimmed = rawLine.trim()

    if (!trimmed) {
      rendered.push(rawLine)
      continue
    }

    if (directiveOrSectionPattern.test(rawLine)) {
      rendered.push(rawLine.trimEnd())
      continue
    }

    const [chordLine, lyricsLine] = extractChordsAndLyrics(rawLine.trimEnd())
    rendered.push(chordLine, lyricsLine)
  }

  return rendered.join('\n')
}

function countContiguousPairableLines(lines: string[], startIndex: number): number {
  let count = 0
  for (let j = startIndex; j < lines.length; j++) {
    if (unpairableLinePattern.test(lines[j])) {
      break
    }
    count++
  }
  return count
}

function pairLines(lines: string[]): LyricChordPair[] {
  const groups: LyricChordPair[] = []
  let currentGroup: LyricChordPair | undefined
  let pairableLinesCounter = 0

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i]
    const currentLineTrimmedEnd = currentLine.trimEnd()
    const isBlank = blankLinePattern.test(currentLine)
    const isDirectiveOrSection = directiveOrSectionPattern.test(currentLine)

    const isEmptyChordLine =
      isBlank &&
      pairableLinesCounter % 2 === 0 &&
      countContiguousPairableLines(lines, i + 1) % 2 === 1

    if (isDirectiveOrSection || (isBlank && !isEmptyChordLine)) {
      groups.push([isBlank ? currentLine : currentLineTrimmedEnd])
      currentGroup = []
      continue
    }

    if (pairableLinesCounter % 2 === 0) {
      // start new pairing
      currentGroup = []
      groups.push(currentGroup)
    }

    currentGroup!.push(currentLineTrimmedEnd)
    pairableLinesCounter++
  }

  if (pairableLinesCounter % 2 !== 0) {
    console.warn('Unexpected odd number of lines', lines.length)
  }

  return groups
}

function extractChordsAndLyrics(line: string): [string, string] {
  const positionedChords: [number, string][] = []
  let lyrics = ''
  const tokenPattern = /\{([^}]*)\}|([^{]+|\{)/g

  for (let match = tokenPattern.exec(line); match !== null; match = tokenPattern.exec(line)) {
    const chord = match[1]
    const text = match[2]
    if (chord !== undefined) {
      if (chord.length > 0) {
        positionedChords.push([lyrics.length, chord])
      }
    } else if (text !== undefined) {
      lyrics += text
    }
  }

  let chordLine = ''
  for (const [offset, chord] of positionedChords) {
    const targetOffset = chordLine.length === 0 ? offset : Math.max(offset, chordLine.length + 1)
    chordLine = chordLine.padEnd(targetOffset, ' ') + chord
  }

  return [chordLine.trimEnd(), lyrics.trimEnd()]
}

function embedChords([chordLine, lyricsLine]: LyricChordPair): string {
  if (lyricsLine === undefined) {
    return chordLine ?? ''
  }

  const chordLineLen = chordLine.length
  const lyricsLineLen = lyricsLine.length
  const adjustedLyricsLine = chordLineLen > lyricsLineLen
    ? lyricsLine.padEnd(chordLineLen, ' ')
    : lyricsLine

  const chordLineParts = chordLine.split(/(\s+\S+|\S+)/g)
    .filter(s => s)
  const positioned: [number, string][] = []
  let offset = 0
  for (const part of chordLineParts) {
    const components = part.split(/(\s+|\S+)/).filter(s => s)

    if (components.length < 2) {
      // should only go here for the very first chord in the line with no leading spaces
      const component = components[0]
      positioned.push([0, wrapChord(component)])
      offset += component.length
      continue
    }

    const spaces = components[0].length
    const component = components[1]
    positioned.push([offset + spaces, wrapChord(component)])
    offset += spaces + component.length
  }

  const chunks = []
  let prevOffset = adjustedLyricsLine.length
  for (let i = positioned.length - 1; i > -1; i--) {
    const [offset, insertable] = positioned[i]
    chunks.unshift(adjustedLyricsLine.slice(offset, prevOffset))
    chunks.unshift(insertable)
    prevOffset = offset
  }

  if (prevOffset > 0) {
    chunks.unshift(adjustedLyricsLine.slice(0, prevOffset))
  }

  return chunks.join('').trim()

  function wrapChord(chord: string) {
    return `{${chord}}`
  }
}
