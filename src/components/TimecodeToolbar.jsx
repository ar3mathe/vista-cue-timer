import React from 'react'

const FRAME_RATES = [23.98, 24, 25, 29.97, 30]

export default function TimecodeToolbar({ displayMode, frameRate, onDisplayModeChange, onFrameRateChange }) {
  return (
    <div className="timecode-toolbar">
      <span className="toolbar-label">Display</span>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${displayMode === 'seconds' ? 'toggle-btn--active' : ''}`}
          onClick={() => onDisplayModeChange('seconds')}
        >
          Seconds
        </button>
        <button
          className={`toggle-btn ${displayMode === 'smpte' ? 'toggle-btn--active' : ''}`}
          onClick={() => onDisplayModeChange('smpte')}
        >
          Timecode
        </button>
      </div>
      <select
        className="framerate-select"
        value={frameRate}
        disabled={displayMode === 'seconds'}
        onChange={e => onFrameRateChange(Number(e.target.value))}
      >
        {FRAME_RATES.map(fr => (
          <option key={fr} value={fr}>{fr} fps</option>
        ))}
      </select>
    </div>
  )
}
