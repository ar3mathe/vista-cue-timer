import React, { useRef, useState } from 'react'

const ACCEPTED_AUDIO = 'audio/mpeg,audio/wav,audio/aac,audio/flac,audio/aiff'
const ACCEPTED = `video/*,${ACCEPTED_AUDIO}`

function detectMode(file) {
  if (!file) return null
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return null
}

function parseDurationInput(str) {
  const trimmed = (str || '').trim()
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/)
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const frac = colonMatch[3] ? parseFloat('0.' + colonMatch[3]) : 0
    return mins * 60 + secs + frac
  }
  const num = parseFloat(trimmed)
  if (Number.isFinite(num) && num > 0) return num
  return null
}

function formatPreview(secs) {
  if (!secs || secs < 0) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}m ${s}s`
}

export default function VideoUploader({ onFileSelected, onStartBlank }) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [showBlankForm, setShowBlankForm] = useState(false)
  const [durationInput, setDurationInput] = useState('')
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return
    const mode = detectMode(file)
    if (mode) onFileSelected(file, mode)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragActive(true)
  }

  function handleDragLeave() {
    setIsDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragActive(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  function handleBlankSubmit(e) {
    e.preventDefault()
    const secs = parseDurationInput(durationInput)
    if (secs && secs >= 10 && secs <= 10800) {
      onStartBlank(secs)
    }
  }

  const parsedSecs = parseDurationInput(durationInput)
  const isValidDuration = parsedSecs && parsedSecs >= 10 && parsedSecs <= 10800

  return (
    <div className="uploader-wrap">
      <div
        className={`drop-zone ${isDragActive ? 'drop-zone--active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <div className="drop-zone-icon">🎬</div>
        <p className="drop-zone-text">Drop a video or audio file here, or click to browse</p>
        <p className="drop-zone-hint">Video: mp4, mov, webm — Audio: mp3, wav, aac, flac, aiff</p>
      </div>

      <div className="blank-timeline-section">
        {!showBlankForm ? (
          <button
            className="btn btn-secondary blank-timeline-btn"
            onClick={() => setShowBlankForm(true)}
          >
            ⏱ Start with a blank timeline
          </button>
        ) : (
          <form className="blank-form" onSubmit={handleBlankSubmit}>
            <span className="blank-form-label">Duration:</span>
            <input
              type="text"
              className="blank-form-input"
              placeholder="e.g. 2:30 or 150"
              value={durationInput}
              onChange={e => setDurationInput(e.target.value)}
              autoFocus
            />
            {parsedSecs && (
              <span className="blank-form-preview">
                {isValidDuration ? formatPreview(parsedSecs) : 'min 10s, max 3h'}
              </span>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isValidDuration}
            >
              Start
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setShowBlankForm(false); setDurationInput('') }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
