import { useRef, useEffect } from 'react'

/**
 * Provides a lazily-created shared AudioContext.
 * The context is created on the first call to getAudioContext() (inside a user gesture),
 * complying with browser autoplay policies.
 */
export function useAudioContext() {
  const audioContextRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  function getAudioContext() {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  return { getAudioContext }
}
