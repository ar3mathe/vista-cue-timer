import React, { useState, useEffect } from 'react'
import { formatTime } from '../utils/formatTime.js'

const PRESET_COLORS = [
  '#ff6b35', // orange (default)
  '#4a9eff', // blue
  '#4caf7d', // green
  '#ffdd57', // yellow
  '#ff6b9d', // pink
  '#a855f7', // purple
  '#ef4444', // red
  '#22d3ee', // cyan
]

export default function KeyframePanel({
  keyframes,
  displayMode,
  frameRate,
  videoDuration,
  currentTime,
  onUpdate,
  onDelete,
  onClearAll,
  onSeek,
}) {
  const [editingDurId, setEditingDurId] = useState(null)
  const [durDraft, setDurDraft]         = useState('')
  const [openColorId, setOpenColorId]   = useState(null)
  const [popupPos, setPopupPos]         = useState({ top: 0, left: 0 })
  const [labelModalId, setLabelModalId] = useState(null)
  const [labelModalDraft, setLabelModalDraft] = useState('')

  // Close colour popup on outside click
  useEffect(() => {
    if (!openColorId) return
    function onDown(e) {
      if (!e.target.closest('.kf-color-picker-wrap') && !e.target.closest('.kf-color-popup')) {
        setOpenColorId(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openColorId])

  let nearestIdx = -1
  let nearestDist = Infinity
  keyframes.forEach((kf, i) => {
    const dist = Math.abs(kf.time - currentTime)
    if (dist < nearestDist) { nearestDist = dist; nearestIdx = i }
  })
  const activeIdx = nearestDist <= 0.1 ? nearestIdx : -1

  function getCueDuration(index) {
    if (index === 0) return keyframes[0].time
    return keyframes[index].time - keyframes[index - 1].time
  }

  function handleDurFocus(kf, index) {
    setEditingDurId(kf.id)
    setDurDraft(getCueDuration(index).toFixed(2))
  }

  function handleDurBlur(kf, index) {
    const parsed = parseFloat(durDraft)
    if (!isNaN(parsed) && parsed >= 0) {
      const prevTime = index === 0 ? 0 : keyframes[index - 1].time
      const newTime = Math.max(0, Math.min(videoDuration || Infinity, prevTime + parsed))
      onUpdate(kf.id, { time: newTime })
    }
    setEditingDurId(null)
    setDurDraft('')
  }

  function handleNudge(id, delta) {
    const kf = keyframes.find(k => k.id === id)
    if (!kf) return
    const newTime = Math.max(0, Math.min(videoDuration, kf.time + delta))
    onUpdate(id, { time: newTime })
  }

  function openLabelModal(kf) {
    setLabelModalDraft(kf.label)
    setLabelModalId(kf.id)
  }

  function submitLabelModal() {
    if (labelModalId) onUpdate(labelModalId, { label: labelModalDraft })
    setLabelModalId(null)
  }

  function handleLabelClick(e, kf) {
    if (window.innerWidth <= 768) {
      e.preventDefault()
      e.currentTarget.blur()
      openLabelModal(kf)
    }
  }

  function handleColorDotClick(e, kfId) {
    if (openColorId === kfId) { setOpenColorId(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPos({ top: rect.bottom + 6, left: rect.left })
    setOpenColorId(kfId)
  }

  return (
    <div className="keyframe-panel">
      <div className="panel-header">
        <span className="panel-title">Keyframes</span>
        <span className="panel-count">{keyframes.length}</span>
      </div>

      {keyframes.length === 0 ? (
        <div className="panel-empty">
          <p>No keyframes yet.</p>
          <p className="panel-empty-hint">Press <kbd>K</kbd> or click <strong>Add Keyframe</strong> in the timeline.</p>
        </div>
      ) : (
        <ul className="keyframe-list">
          {keyframes.map((kf, i) => {
            const cueDur  = getCueDuration(i)
            const isActive = i === activeIdx
            const color   = kf.color || '#ff6b35'

            return (
              <li
                key={kf.id}
                className={`keyframe-row ${isActive ? 'keyframe-row--active' : ''}`}
                style={{ borderLeftColor: color }}
              >
                {/* Top row: index + timestamp + delete */}
                <div className="kf-row-top">
                  <span className="kf-index" style={{ color }}>{i + 1}</span>
                  <button className="kf-timestamp" onClick={() => onSeek(kf.time)} title="Seek to keyframe">
                    {formatTime(kf.time, displayMode, frameRate)}
                  </button>
                  <button className="kf-delete" onClick={() => onDelete(kf.id)} title="Delete keyframe">×</button>
                </div>

                {/* Colour dot + label on one line */}
                <div className="kf-label-line">
                  <div className="kf-color-picker-wrap">
                    <button
                      className="kf-color-dot"
                      style={{ background: color }}
                      onClick={e => handleColorDotClick(e, kf.id)}
                      title="Change colour"
                    />
                  </div>
                  <input
                    type="text"
                    className="kf-label-input"
                    value={kf.label}
                    placeholder="Cue label…"
                    readOnly={window.innerWidth <= 768}
                    onChange={e => onUpdate(kf.id, { label: e.target.value })}
                    onClick={e => handleLabelClick(e, kf)}
                  />
                </div>

                {/* Cue duration + nudge */}
                <div className="kf-row-bottom">
                  <div className="kf-cue-duration">
                    <span className="kf-cue-label">Cue duration</span>
                    <div className="kf-dur-input-wrap">
                      <input
                        type="number"
                        className="kf-dur-input"
                        min={0}
                        step={0.01}
                        value={editingDurId === kf.id ? durDraft : cueDur.toFixed(2)}
                        onFocus={() => handleDurFocus(kf, i)}
                        onChange={e => setDurDraft(e.target.value)}
                        onBlur={() => handleDurBlur(kf, i)}
                        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                        title="Edit cue duration (seconds)"
                      />
                      <span className="kf-dur-unit">s</span>
                    </div>
                  </div>
                  <div className="kf-nudge">
                    <button className="nudge-btn" onClick={() => handleNudge(kf.id, -0.1)}>−0.1</button>
                    <button className="nudge-btn" onClick={() => handleNudge(kf.id, +0.1)}>+0.1</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Label edit modal — used on mobile instead of inline editing */}
      {labelModalId && (() => {
        const kf = keyframes.find(k => k.id === labelModalId)
        return (
          <div className="modal-overlay" onMouseDown={() => setLabelModalId(null)}>
            <div className="modal-card" onMouseDown={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Edit cue label</h2>
                <button className="modal-close-btn" onClick={() => setLabelModalId(null)}>×</button>
              </div>
              <div className="modal-body">
                {kf && <p className="modal-desc" style={{ fontFamily: 'Courier New', color: kf.color || '#ff6b35' }}>
                  Cue {keyframes.indexOf(kf) + 1}
                </p>}
                <input
                  type="text"
                  className="modal-input"
                  value={labelModalDraft}
                  placeholder="Cue label…"
                  autoFocus
                  onChange={e => setLabelModalDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitLabelModal()
                    if (e.key === 'Escape') setLabelModalId(null)
                  }}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setLabelModalId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitLabelModal}>Save</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Colour popup — rendered at fixed position to escape overflow clipping */}
      {openColorId && (() => {
        const kf = keyframes.find(k => k.id === openColorId)
        if (!kf) return null
        const color = kf.color || '#ff6b35'
        return (
          <div className="kf-color-popup" style={{ top: popupPos.top, left: popupPos.left }}>
            <div className="kf-color-popup-swatches">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`kf-swatch ${color === c ? 'kf-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => { onUpdate(openColorId, { color: c }); setOpenColorId(null) }}
                  title={c}
                />
              ))}
            </div>
            <input
              type="color"
              className="kf-color-custom-popup"
              value={color}
              title="Custom colour"
              onChange={e => onUpdate(openColorId, { color: e.target.value })}
            />
          </div>
        )
      })()}
    </div>
  )
}
