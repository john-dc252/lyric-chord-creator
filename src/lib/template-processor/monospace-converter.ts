type LyricChordPair = string[] | [string, undefined] | [string, string]

/** pattern for lines that should not be processed for chord embedding */
const unpairableLinePattern = /^\s*$|^\s*@\w+:|^\s*\[/

export function detectPotentialMonospaceFormat(sourceTxt: string) {
  return !/{/gm.test(sourceTxt)
}

export function monospaceToTemplate(sourceTxt: string) {
  const sourceLines = sourceTxt.split('\n')
  const linePairs = pairLines(sourceLines)
  const rendered: string[] = []

  for (const pair of linePairs) {
    rendered.push(embedChords(pair))
  }

  return rendered.join('\n')
}

function pairLines(lines: string[]): LyricChordPair[] {
  const pairableLineCount = lines.values()
    .filter(l => !unpairableLinePattern.test(l))
    .reduce((a) => a + 1, 0);
  if (pairableLineCount % 2 != 0) {
    console.warn('Unexpected odd number of lines', lines.length)
  }

  const groups: LyricChordPair[] = []
  let currentGroup: LyricChordPair | undefined
  let pairableLinesCounter = 0

  for (const currentLine of lines) {
    const currentLineTrimmedEnd = currentLine.trimEnd()
    const isUnpairable = unpairableLinePattern.test(currentLine)

    if (isUnpairable) {
      groups.push([currentLineTrimmedEnd])
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

  return groups
}

function embedChords([chordLine, lyricsLine]: LyricChordPair): string {
  if (!lyricsLine) {
    return !chordLine?.trim() ? '@empty_line' : chordLine
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
