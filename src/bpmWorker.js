// Classic Web Worker — importScripts is available here.
// Loaded via new Worker(new URL('./bpmWorker.js', import.meta.url)) from the main thread.

importScripts('https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.umd.js')

self.onmessage = async function (e) {
  const { channelData, sampleRate } = e.data

  // Signal the main thread immediately so the UI can show a spinner
  postMessage({ status: 'analysing', bpm: null, beats: [] })

  try {
    // EssentiaWASM is exposed as a global by the UMD bundle above
    const essentia = new Essentia(EssentiaWASM)
    const signal = essentia.arrayToVector(channelData)

    let bpm = null
    let beats = []

    try {
      // RhythmExtractor2013 returns both BPM and beat positions (ticks)
      const result = essentia.RhythmExtractor2013(signal)
      bpm = Math.round(result.bpm)
      beats = Array.from(essentia.vectorToArray(result.ticks))
    } catch (_) {
      // Fall back to PercivalBpmEstimator (BPM only) if RhythmExtractor2013 fails
      const result = essentia.PercivalBpmEstimator(signal, sampleRate)
      bpm = Math.round(result.bpm)
      beats = []
    }

    postMessage({ status: 'done', bpm, beats })
  } catch (err) {
    postMessage({ status: 'error', bpm: null, beats: [], message: String(err.message || err) })
  }
}
