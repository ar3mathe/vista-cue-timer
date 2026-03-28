import React, { useRef, useState } from 'react'
import { serializeSession, deserializeSession } from '../utils/sessionIO.js'
import { exportToCsv } from '../utils/csvExport.js'

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isoDateStr() {
  return new Date().toISOString().slice(0, 10)
}

function safeName(name) {
  return (name || 'session').replace(/[^a-z0-9_\-\.]/gi, '_')
}

export default function SessionControls({
  keyframes,
  bpm,
  displayMode,
  frameRate,
  fileName,
  sourceDuration,
  sourceMode,
  blankDuration,
  onLoad,
  sessionMatchStatus,
}) {
  const loadInputRef = useRef(null)
  const [loadError, setLoadError] = useState(null)

  function handleSave() {
    const session = serializeSession(keyframes, bpm, displayMode, frameRate, fileName, sourceDuration, sourceMode, blankDuration)
    const baseName = sourceMode === 'blank' ? 'blank' : safeName(fileName)
    const json = JSON.stringify(session, null, 2)
    triggerDownload(json, `keyframes_${baseName}_${isoDateStr()}.json`, 'application/json')
  }

  function handleExportCsv() {
    const csv = exportToCsv(keyframes, displayMode, frameRate)
    triggerDownload(csv, `cues_${safeName(fileName)}_${isoDateStr()}.csv`, 'text/csv')
  }

  function handleLoadClick() {
    setLoadError(null)
    loadInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const obj = JSON.parse(evt.target.result)
        const session = deserializeSession(obj)
        onLoad(session)
        setLoadError(null)
      } catch (err) {
        setLoadError(err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const sourceLabel = sourceMode === 'audio' ? 'Audio' : sourceMode === 'blank' ? 'Blank' : 'Video'

  return (
    <div className="session-controls">
      <button className="btn btn-secondary" onClick={handleSave} disabled={keyframes.length === 0}>
        Save
      </button>
      <button className="btn btn-secondary mobile-hidden" onClick={handleExportCsv} disabled={keyframes.length === 0}>
        Export CSV
      </button>
      <button className="btn btn-secondary" onClick={handleLoadClick}>
        Load
      </button>
      <input
        ref={loadInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {loadError && (
        <span className="session-error" title={loadError}>Error loading session</span>
      )}
      {sessionMatchStatus === 'matched' && (
        <span className="session-badge session-badge--matched">Session matched</span>
      )}
      {sessionMatchStatus === 'unmatched' && (
        <span className="session-badge session-badge--unmatched">{sourceLabel} not matched — keyframes loaded</span>
      )}
    </div>
  )
}
