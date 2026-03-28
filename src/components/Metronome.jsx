import React, { useEffect, useRef } from 'react'
import { useMetronome } from '../hooks/useMetronome.js'
import { useTapTempo } from '../hooks/useTapTempo.js'

const BPM_MIN = 20
const BPM_MAX = 300

function clampBpm(val) {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(val)))
}

export default function Metronome({
  bpm,
  onBpmChange,
  getAudioContext,
  detectedBpm,
  detectionStatus,
  onApplyBpm,
  onDismissBpm,
}) {
  const { isRunning, start, stop, onTickRef } = useMetronome({ bpm, getAudioContext })
  const { tap, lastComputedBpm } = useTapTempo()

  const beatLightRef = useRef(null)
  const tapBtnRef = useRef(null)

  useEffect(() => {
    if (lastComputedBpm !== null) onBpmChange(lastComputedBpm)
  }, [lastComputedBpm]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onTickRef.current = () => {
      const el = beatLightRef.current
      if (!el) return
      el.classList.add('beat-light--on')
      setTimeout(() => el.classList.remove('beat-light--on'), 80)
    }
    return () => { onTickRef.current = null }
  }, [onTickRef])

  function handleTap() {
    tap()
    const btn = tapBtnRef.current
    if (btn) {
      btn.classList.add('tap-btn--flash')
      setTimeout(() => btn.classList.remove('tap-btn--flash'), 120)
    }
  }

  // Show ÷2 / ×2 when detected BPM is likely at wrong multiple
  const showHalfDouble = detectedBpm !== null && (detectedBpm > 140 || detectedBpm < 70)

  return (
    <div className="metronome">
      {/* BPM detection indicator */}
      {detectionStatus === 'analysing' && (
        <span className="bpm-detecting">
          <span className="bpm-detecting-dot" />
          Detecting BPM…
        </span>
      )}

      {detectionStatus === 'done' && detectedBpm !== null && (
        <span className="bpm-suggestion">
          <span className="bpm-suggestion-label">Detected:</span>
          <strong>{detectedBpm}</strong>
          {showHalfDouble && (
            <button
              className="bpm-suggestion-btn bpm-suggestion-btn--alt"
              onClick={() => onApplyBpm(clampBpm(detectedBpm / 2))}
              title="Apply half tempo"
            >
              ÷2
            </button>
          )}
          <button
            className="bpm-suggestion-btn bpm-suggestion-btn--apply"
            onClick={() => onApplyBpm(clampBpm(detectedBpm))}
          >
            Apply
          </button>
          {showHalfDouble && (
            <button
              className="bpm-suggestion-btn bpm-suggestion-btn--alt"
              onClick={() => onApplyBpm(clampBpm(detectedBpm * 2))}
              title="Apply double tempo"
            >
              ×2
            </button>
          )}
          <button
            className="bpm-suggestion-dismiss"
            onClick={onDismissBpm}
            title="Dismiss"
          >
            ×
          </button>
        </span>
      )}

      {detectionStatus === 'error' && (
        <span className="bpm-detect-error">BPM detection unavailable</span>
      )}

      <div className="beat-light" ref={beatLightRef} />
      <label className="toolbar-label" htmlFor="bpm-input">BPM</label>
      <input
        id="bpm-input"
        type="number"
        className="bpm-input"
        min={BPM_MIN}
        max={BPM_MAX}
        step={1}
        value={bpm}
        onChange={e => onBpmChange(clampBpm(Number(e.target.value)))}
      />
      <button
        ref={tapBtnRef}
        className="btn btn-secondary tap-btn"
        onClick={handleTap}
      >
        Tap
      </button>
      <button
        className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'}`}
        onClick={() => isRunning ? stop() : start()}
      >
        {isRunning ? 'Stop' : 'Click'}
      </button>
    </div>
  )
}
