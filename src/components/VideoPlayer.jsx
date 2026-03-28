import React, { useRef, useEffect, useState, useCallback } from 'react'
import { formatTime } from '../utils/formatTime.js'

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

export default function VideoPlayer({
  sourceObjectUrl,
  sourceMode,
  fileName,
  displayMode,
  frameRate,
  seekTo,
  onSeekHandled,
  onDurationChange,
  onTimeUpdate,
  onAddKeyframe,
  // Blank mode props
  blankIsPlaying,
  blankElapsed,
  blankDuration,
  onBlankPlayPause,
  onBlankSeek,
  onBlankReset,
  onChangeDuration,
  onRemove,
}) {
  const mediaRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Blank duration editing state
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationInputVal, setDurationInputVal] = useState('')

  // Set src directly on DOM element to avoid double-decode
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (sourceObjectUrl) {
      media.src = sourceObjectUrl
    } else {
      media.src = ''
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    }
  }, [sourceObjectUrl])

  useEffect(() => {
    if (seekTo === null || seekTo === undefined) return
    const media = mediaRef.current
    if (media) media.currentTime = seekTo
    onSeekHandled()
  }, [seekTo, onSeekHandled])

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    setDuration(media.duration)
    onDurationChange(media.duration)
  }, [onDurationChange])

  const handleTimeUpdate = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    setCurrentTime(media.currentTime)
    onTimeUpdate(media.currentTime)
  }, [onTimeUpdate])

  const handlePlayPause = useCallback(() => {
    const media = mediaRef.current
    if (!media) return
    if (media.paused) media.play()
    else media.pause()
  }, [])

  const handleScrubChange = useCallback((e) => {
    const media = mediaRef.current
    if (!media) return
    media.currentTime = Number(e.target.value)
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        if (sourceMode === 'blank') {
          onBlankPlayPause?.()
        } else {
          handlePlayPause()
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        if (sourceMode === 'blank') {
          onBlankSeek?.(Math.max(0, (blankElapsed ?? 0) - 5))
        } else {
          const media = mediaRef.current
          if (media) media.currentTime = Math.max(0, media.currentTime - 5)
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        if (sourceMode === 'blank') {
          onBlankSeek?.(Math.min(blankDuration ?? 0, (blankElapsed ?? 0) + 5))
        } else {
          const media = mediaRef.current
          if (media) media.currentTime = Math.min(media.duration || 0, media.currentTime + 5)
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sourceMode, handlePlayPause, onBlankPlayPause, onBlankSeek, blankElapsed, blankDuration])

  const sharedMediaProps = {
    ref: mediaRef,
    onLoadedMetadata: handleLoadedMetadata,
    onTimeUpdate: handleTimeUpdate,
    onPlay: () => setIsPlaying(true),
    onPause: () => setIsPlaying(false),
    onEnded: () => setIsPlaying(false),
  }

  function handleDurationEditSubmit(e) {
    e.preventDefault()
    const secs = parseDurationInput(durationInputVal)
    if (secs && secs >= 10 && secs <= 10800) {
      onChangeDuration?.(secs)
      setEditingDuration(false)
    }
  }

  // ── Blank mode ─────────────────────────────────────────────────────────────
  if (sourceMode === 'blank') {
    return (
      <div className="video-player video-player--blank">
        <div className="video-controls">
          <button className="play-pause-btn" onClick={onBlankPlayPause}>
            {blankIsPlaying ? '⏸' : '▶'}
          </button>

          <span className="time-display">
            {formatTime(blankElapsed ?? 0, displayMode, frameRate)}
          </span>

          <input
            type="range"
            className="scrubber"
            min={0}
            max={blankDuration || 0}
            step={0.01}
            value={blankElapsed ?? 0}
            onChange={e => onBlankSeek?.(Number(e.target.value))}
          />

          {editingDuration ? (
            <form className="blank-duration-edit" onSubmit={handleDurationEditSubmit}>
              <input
                type="text"
                className="blank-duration-input"
                value={durationInputVal}
                placeholder="e.g. 2:30"
                onChange={e => setDurationInputVal(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-primary blank-dur-confirm">✓</button>
              <button type="button" className="btn btn-secondary blank-dur-cancel" onClick={() => setEditingDuration(false)}>✕</button>
            </form>
          ) : (
            <span
              className="time-total blank-total-clickable"
              onClick={() => { setDurationInputVal(''); setEditingDuration(true) }}
              title="Click to change duration"
            >
              {formatTime(blankDuration ?? 0, displayMode, frameRate)}
            </span>
          )}

          <button
            className="btn btn-secondary blank-reset-btn"
            onClick={onBlankReset}
            title="Reset to start"
          >
            ↺
          </button>

          <button
            className="btn btn-danger blank-remove-btn"
            onClick={onRemove}
            title="Remove blank timeline"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // ── File modes (video / audio) ──────────────────────────────────────────────
  return (
    <div className="video-player">
      {sourceMode === 'audio' ? (
        <audio {...sharedMediaProps} style={{ display: 'none' }} />
      ) : (
        <video {...sharedMediaProps} className="video-element" />
      )}

      <div className="video-controls">
        <button className="play-pause-btn" onClick={handlePlayPause}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="time-display">
          {formatTime(currentTime, displayMode, frameRate)}
        </span>

        <input
          type="range"
          className="scrubber"
          min={0}
          max={duration || 0}
          step={0.001}
          value={currentTime}
          onChange={handleScrubChange}
        />

        <span className="time-total">
          {formatTime(duration, displayMode, frameRate)}
        </span>

        {onRemove && (
          <button
            className="btn btn-danger blank-remove-btn"
            onClick={onRemove}
            title="Remove file"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
