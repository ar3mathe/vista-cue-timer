import { useState, useRef, useCallback, useEffect } from 'react'

const SCHEDULE_AHEAD_TIME = 0.1  // seconds to look ahead
const SCHEDULER_INTERVAL = 25    // ms between scheduler ticks
const CLICK_DURATION = 0.05      // seconds

/**
 * Web Audio lookahead metronome scheduler.
 * BPM is stored in a ref so the scheduler closure always reads the latest value
 * without requiring a restart.
 *
 * @param {{ bpm: number, getAudioContext: function }} params
 * @returns {{ isRunning: boolean, start: function, stop: function }}
 */
export function useMetronome({ bpm, getAudioContext }) {
  const [isRunning, setIsRunning] = useState(false)

  const bpmRef = useRef(bpm)
  const nextBeatTimeRef = useRef(0)
  const beatCountRef = useRef(0)
  const intervalIdRef = useRef(null)
  const onTickRef = useRef(null)

  // Keep bpmRef in sync without restarting
  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  const scheduleClick = useCallback((audioCtx, time, isDownbeat) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.frequency.value = isDownbeat ? 880 : 440
    osc.type = 'sine'

    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.3, time + 0.001)
    gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start(time)
    osc.stop(time + CLICK_DURATION)

    // Fire visual tick callback near beat time
    if (onTickRef.current) {
      const delay = Math.max(0, (time - audioCtx.currentTime) * 1000)
      setTimeout(() => onTickRef.current?.(), delay)
    }
  }, [])

  const runScheduler = useCallback((audioCtx) => {
    while (nextBeatTimeRef.current < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      const isDownbeat = beatCountRef.current % 4 === 0
      scheduleClick(audioCtx, nextBeatTimeRef.current, isDownbeat)
      nextBeatTimeRef.current += 60 / bpmRef.current
      beatCountRef.current += 1
    }
  }, [scheduleClick])

  const start = useCallback(() => {
    const audioCtx = getAudioContext()
    nextBeatTimeRef.current = audioCtx.currentTime
    beatCountRef.current = 0

    intervalIdRef.current = setInterval(() => runScheduler(audioCtx), SCHEDULER_INTERVAL)
    setIsRunning(true)
  }, [getAudioContext, runScheduler])

  const stop = useCallback(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current)
      intervalIdRef.current = null
    }
    setIsRunning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current)
    }
  }, [])

  return { isRunning, start, stop, onTickRef }
}
