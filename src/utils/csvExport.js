import { formatTime } from './formatTime.js'

function escapeCsvField(value) {
  const str = String(value ?? '')
  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replaceAll('"', '""') + '"'
  }
  return str
}

/**
 * Generate a CSV string from keyframes.
 * Columns: Cue Number, Label, Timecode, Time (s), Cue Duration (s)
 *
 * @param {Array<{id:string, time:number, label:string}>} keyframes - sorted by time
 * @param {"seconds"|"smpte"} displayMode
 * @param {number} frameRate
 * @returns {string}
 */
export function exportToCsv(keyframes, displayMode, frameRate) {
  const header = ['Cue Number', 'Label', 'Timecode', 'Time (s)', 'Cue Duration (s)'].join(',')

  const rows = keyframes.map((kf, i) => {
    const cueDuration = i === 0
      ? kf.time
      : kf.time - keyframes[i - 1].time

    return [
      escapeCsvField(i + 1),
      escapeCsvField(kf.label),
      escapeCsvField(formatTime(kf.time, displayMode, frameRate)),
      escapeCsvField(kf.time.toFixed(3)),
      escapeCsvField(cueDuration.toFixed(3)),
    ].join(',')
  })

  return [header, ...rows].join('\r\n')
}
