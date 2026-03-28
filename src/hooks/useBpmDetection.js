import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Manages BPM detection via a Web Worker running Essentia.js.
 *
 * @param {{ audioBuffer: AudioBuffer|null }} params
 * @returns {{ detectedBpm, detectionStatus, beatPositions, dismissDetectedBpm }}
 */
export function useBpmDetection({ audioBuffer }) {
  const [detectedBpm, setDetectedBpm] = useState(null)
  const [detectionStatus, setDetectionStatus] = useState('idle') // 'idle'|'analysing'|'done'|'error'
  const [beatPositions, setBeatPositions] = useState([])
  const workerRef = useRef(null)

  function terminateWorker() {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
  }

  useEffect(() => {
    terminateWorker()

    if (!audioBuffer) {
      setDetectedBpm(null)
      setDetectionStatus('idle')
      setBeatPositions([])
      return
    }

    setDetectionStatus('analysing')
    setDetectedBpm(null)
    setBeatPositions([])

    let cancelled = false

    const worker = new Worker(new URL('../bpmWorker.js', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (e) => {
      if (cancelled) return
      const { status, bpm, beats } = e.data
      setDetectionStatus(status)
      if (status === 'done') {
        setDetectedBpm(bpm)
        setBeatPositions(beats || [])
        terminateWorker()
      } else if (status === 'error') {
        terminateWorker()
      }
    }

    worker.onerror = () => {
      if (cancelled) return
      setDetectionStatus('error')
      terminateWorker()
    }

    // Copy channel 0 data so the transfer doesn't affect the AudioBuffer
    const channelData = new Float32Array(audioBuffer.getChannelData(0))
    const sampleRate = audioBuffer.sampleRate
    worker.postMessage({ channelData, sampleRate }, [channelData.buffer])

    return () => {
      cancelled = true
      terminateWorker()
    }
  }, [audioBuffer]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissDetectedBpm = useCallback(() => {
    setDetectedBpm(null)
    setDetectionStatus('idle')
    setBeatPositions([])
  }, [])

  return { detectedBpm, detectionStatus, beatPositions, dismissDetectedBpm }
}
