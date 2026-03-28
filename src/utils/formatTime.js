/**
 * Central time formatting utility.
 * All time displays in the app must go through this function.
 *
 * @param {number} time - Time in seconds
 * @param {"seconds"|"smpte"} displayMode
 * @param {number} frameRate - e.g. 23.98, 24, 25, 29.97, 30
 * @returns {string}
 */
export function formatTime(time, displayMode = 'seconds', frameRate = 25) {
  if (!Number.isFinite(time) || time < 0) return '--:--'

  if (displayMode === 'smpte') {
    const fr = Math.round(frameRate)
    const totalFrames = Math.floor(time * frameRate)
    const FF = totalFrames % fr
    const totalSecs = Math.floor(totalFrames / fr)
    const SS = totalSecs % 60
    const MM = Math.floor(totalSecs / 60) % 60
    const HH = Math.floor(totalSecs / 3600)
    return (
      String(HH).padStart(2, '0') + ':' +
      String(MM).padStart(2, '0') + ':' +
      String(SS).padStart(2, '0') + ':' +
      String(FF).padStart(2, '0')
    )
  }

  // Default: seconds mode — MM:SS.mmm
  const totalMs = Math.floor(time * 1000)
  const ms = totalMs % 1000
  const totalSecs = Math.floor(totalMs / 1000)
  const SS = totalSecs % 60
  const MM = Math.floor(totalSecs / 60)
  return (
    String(MM).padStart(2, '0') + ':' +
    String(SS).padStart(2, '0') + '.' +
    String(ms).padStart(3, '0')
  )
}
