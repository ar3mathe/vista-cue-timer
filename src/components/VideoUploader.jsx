import React, { useRef, useState, useEffect } from 'react'

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
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function VideoUploader({ onFileSelected, onStartBlank }) {
  const [isDragActive, setIsDragActive]   = useState(false)
  const [showBlankModal, setShowBlankModal] = useState(false)
  const [durationInput, setDurationInput]  = useState('')
  const inputRef    = useRef(null)
  const modalInputRef = useRef(null)

  // Auto-focus the duration input when modal opens
  useEffect(() => {
    if (showBlankModal) {
      setTimeout(() => modalInputRef.current?.focus(), 60)
    }
  }, [showBlankModal])

  // Close on Escape key
  useEffect(() => {
    if (!showBlankModal) return
    function onKey(e) {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showBlankModal])

  function closeModal() {
    setShowBlankModal(false)
    setDurationInput('')
  }

  function handleFile(file) {
    if (!file) return
    const mode = detectMode(file)
    if (mode) onFileSelected(file, mode)
  }

  function handleDragOver(e)  { e.preventDefault(); setIsDragActive(true) }
  function handleDragLeave()  { setIsDragActive(false) }
  function handleDrop(e)      { e.preventDefault(); setIsDragActive(false); handleFile(e.dataTransfer.files[0]) }
  function handleInputChange(e) { handleFile(e.target.files[0]); e.target.value = '' }

  function handleBlankStart() {
    const secs = parseDurationInput(durationInput)
    if (secs && secs >= 10 && secs <= 10800) {
      onStartBlank(secs)
      closeModal()
    }
  }

  const parsedSecs    = parseDurationInput(durationInput)
  const isValidDuration = parsedSecs && parsedSecs >= 10 && parsedSecs <= 10800

  return (
    <>
      <div className="uploader-wrap">
        {/* Blank timeline — desktop: below drop zone; mobile: above via CSS order */}
        <div className="blank-timeline-section">
          <button
            className="btn blank-timeline-btn"
            onClick={() => setShowBlankModal(true)}
          >
            ⏱ Start with a blank timeline
          </button>
        </div>

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
          <p className="drop-zone-text">Drop a video or audio file, or tap to browse</p>
          <p className="drop-zone-hint">Video: mp4, mov, webm — Audio: mp3, wav, aac, flac, aiff</p>
        </div>
      </div>

      {/* Blank timeline modal */}
      {showBlankModal && (
        <div className="modal-overlay" onMouseDown={closeModal}>
          <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⏱ Blank timeline</h2>
              <button className="modal-close-btn" onClick={closeModal} title="Close">×</button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">Set a duration, press play, then tap keyframes as time runs.</p>

              <label className="modal-field-label" htmlFor="blank-dur-input">Duration</label>
              <input
                ref={modalInputRef}
                id="blank-dur-input"
                type="text"
                className="modal-input"
                placeholder="e.g. 2:30 or 150"
                value={durationInput}
                onChange={e => setDurationInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && isValidDuration && handleBlankStart()}
              />
              <div className="modal-preview">
                {parsedSecs
                  ? isValidDuration
                    ? <span className="modal-preview--ok">→ {formatPreview(parsedSecs)}</span>
                    : <span className="modal-preview--err">Min 10 s · Max 3 h</span>
                  : <span className="modal-preview--hint">Enter minutes:seconds or total seconds</span>
                }
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!isValidDuration}
                onClick={handleBlankStart}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
