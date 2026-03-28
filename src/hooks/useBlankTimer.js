import { useRef, useState, useCallback, useEffect } from 'react'

/**
 * RAF-based timer using AudioContext clock for accuracy.
 * @param {{ getAudioContext: function }} params
 * @returns {{ isPlaying, elapsed, play, pause, seek, reset, setDuration }}
 */
export function useBlankTimer({ getAudioContext }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const getAudioContextRef = useRef(getAudioContext)
  getAudioContextRef.current = getAudioContext

  const audioCtxStartRef = useRef(null) // audioCtx.currentTime at last play start
  const offsetRef = useRef(0)           // elapsed time before current play segment
  const durationRef = useRef(60)        // max duration in seconds
  const rafRef = useRef(null)

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    if (audioCtxStartRef.current === null) return
    const ctx = getAudioContextRef.current()
    const current = Math.min(
      offsetRef.current + (ctx.currentTime - audioCtxStartRef.current),
      durationRef.current
    )
    setElapsed(current)
    if (current < durationRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      audioCtxStartRef.current = null
      offsetRef.current = durationRef.current
      setIsPlaying(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const play = useCallback((duration) => {
    durationRef.current = duration
    if (offsetRef.current >= duration) offsetRef.current = 0
    const ctx = getAudioContextRef.current()
    audioCtxStartRef.current = ctx.currentTime
    stopRaf()
    rafRef.current = requestAnimationFrame(tick)
    setIsPlaying(true)
  }, [tick, stopRaf])

  const pause = useCallback(() => {
    if (audioCtxStartRef.current !== null) {
      const ctx = getAudioContextRef.current()
      offsetRef.current = Math.min(
        offsetRef.current + (ctx.currentTime - audioCtxStartRef.current),
        durationRef.current
      )
      audioCtxStartRef.current = null
    }
    stopRaf()
    setIsPlaying(false)
  }, [stopRaf])

  const seek = useCallback((time) => {
    offsetRef.current = Math.max(0, Math.min(time, durationRef.current))
    setElapsed(offsetRef.current)
    if (audioCtxStartRef.current !== null) {
      const ctx = getAudioContextRef.current()
      audioCtxStartRef.current = ctx.currentTime
    }
  }, [])

  const reset = useCallback(() => {
    stopRaf()
    audioCtxStartRef.current = null
    offsetRef.current = 0
    setElapsed(0)
    setIsPlaying(false)
  }, [stopRaf])

  const setDuration = useCallback((duration) => {
    durationRef.current = duration
    if (offsetRef.current > duration) {
      offsetRef.current = duration
      setElapsed(duration)
    }
  }, [])

  useEffect(() => () => stopRaf(), [stopRaf])

  return { isPlaying, elapsed, play, pause, seek, reset, setDuration }
}
