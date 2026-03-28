import { useState, useEffect, useRef } from 'react'

const BUCKET_COUNT = 2000

/**
 * Decodes the audio track from a video or audio File and downsamples to BUCKET_COUNT points.
 *
 * @param {{ sourceFile: File|null, getAudioContext: function }} params
 * @returns {{ waveformData: Float32Array|null, isDecoding: boolean, decodeError: string|null }}
 */
export function useWaveform({ sourceFile, getAudioContext }) {
  const [waveformData, setWaveformData] = useState(null)
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [isDecoding, setIsDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState(null)
  const abortRef = useRef(false)

  useEffect(() => {
    if (!sourceFile) {
      setWaveformData(null)
      setAudioBuffer(null)
      setIsDecoding(false)
      setDecodeError(null)
      return
    }

    abortRef.current = false
    setIsDecoding(true)
    setDecodeError(null)
    setWaveformData(null)

    let objectUrl = null

    async function decode() {
      try {
        const audioCtx = getAudioContext()
        objectUrl = URL.createObjectURL(sourceFile)

        const response = await fetch(objectUrl)
        const arrayBuffer = await response.arrayBuffer()

        URL.revokeObjectURL(objectUrl)
        objectUrl = null

        if (abortRef.current) return

        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)

        if (abortRef.current) return

        setAudioBuffer(decodedBuffer)

        const channelData = decodedBuffer.getChannelData(0)
        const buckets = new Float32Array(BUCKET_COUNT)
        const samplesPerBucket = Math.ceil(channelData.length / BUCKET_COUNT)

        for (let i = 0; i < BUCKET_COUNT; i++) {
          const start = i * samplesPerBucket
          const end = Math.min(start + samplesPerBucket, channelData.length)
          let max = 0
          for (let j = start; j < end; j++) {
            const abs = Math.abs(channelData[j])
            if (abs > max) max = abs
          }
          buckets[i] = max
        }

        setWaveformData(buckets)
      } catch (err) {
        if (!abortRef.current) {
          const isAiff = sourceFile.name.toLowerCase().endsWith('.aiff') ||
                         sourceFile.name.toLowerCase().endsWith('.aif')
          const msg = isAiff
            ? 'AIFF files may not be supported in this browser. Try converting to WAV or MP3.'
            : (err.message || 'Failed to decode audio.')
          setDecodeError(msg)
        }
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        if (!abortRef.current) setIsDecoding(false)
      }
    }

    decode()

    return () => {
      abortRef.current = true
    }
  }, [sourceFile]) // eslint-disable-line react-hooks/exhaustive-deps

  return { waveformData, audioBuffer, isDecoding, decodeError }
}
