import { useState, useRef, useCallback } from 'react'

const TAP_TIMEOUT = 2000   // ms — reset buffer if gap exceeds this
const MAX_TAPS = 8

/**
 * Tap tempo hook. Call tap() on each button press.
 *
 * @returns {{ tap: function, lastComputedBpm: number|null }}
 */
export function useTapTempo() {
  const [lastComputedBpm, setLastComputedBpm] = useState(null)
  const tapsRef = useRef([])

  const tap = useCallback(() => {
    const now = Date.now()
    const taps = tapsRef.current

    // Reset if too long since last tap
    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_TIMEOUT) {
      tapsRef.current = []
    }

    tapsRef.current.push(now)

    // Keep only the last MAX_TAPS
    if (tapsRef.current.length > MAX_TAPS) {
      tapsRef.current = tapsRef.current.slice(-MAX_TAPS)
    }

    const currentTaps = tapsRef.current

    if (currentTaps.length < 2) return

    // Compute average interval between consecutive taps
    let totalInterval = 0
    for (let i = 1; i < currentTaps.length; i++) {
      totalInterval += currentTaps[i] - currentTaps[i - 1]
    }
    const avgInterval = totalInterval / (currentTaps.length - 1)
    const bpm = Math.round(60000 / avgInterval)

    setLastComputedBpm(bpm)
  }, [])

  return { tap, lastComputedBpm }
}
