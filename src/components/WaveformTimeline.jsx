import React, { useRef, useEffect, useCallback, useState } from 'react'
import { formatTime } from '../utils/formatTime.js'

const WAVEFORM_PLAYED   = 'rgba(255, 255, 255, 0.92)'
const WAVEFORM_UNPLAYED = 'rgba(185, 185, 185, 0.55)'
const DEFAULT_MARKER_COLOR = '#ff6b35'
const ACTIVE_GLOW_COLOR = '#ffdd57'
const PLAYHEAD_COLOR = '#1a72e8'   // dark system blue
const RULER_LINE_COLOR = 'rgba(255,255,255,0.15)'
const RULER_MAJOR_COLOR = 'rgba(255,255,255,0.5)'
const RULER_MINOR_COLOR = 'rgba(255,255,255,0.2)'
const END_MARKER_COLOR = 'rgba(255, 160, 40, 0.85)'
const HANDLE_SIZE = 8

// Top area: holds the handle diamond + badge
const BADGE_AREA_HEIGHT = 34
const TICK_AREA_HEIGHT = 26
const MIN_TICK_SPACING = 60
const BADGE_H = 18
const BADGE_RADIUS = 4
const BADGE_PAD_X = 6
const BADGE_MAX_W = 90

function computeTickInterval(duration, canvasWidth) {
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
  for (const interval of candidates) {
    if ((interval / duration) * canvasWidth >= MIN_TICK_SPACING) return interval
  }
  return 600
}

// Compact label for ruler — no milliseconds on whole-second values
function formatRulerLabel(t, displayMode, frameRate) {
  if (displayMode === 'smpte') return formatTime(t, displayMode, frameRate)
  const mins = Math.floor(t / 60)
  const secs = t % 60
  const wholeSecs = Math.floor(secs)
  const frac = secs - wholeSecs
  const mm = String(mins)
  const ss = String(wholeSecs).padStart(2, '0')
  if (frac < 0.005) return `${mm}:${ss}`
  // Show one decimal for sub-second intervals
  return `${mm}:${ss}.${String(Math.round(frac * 10)).padStart(1, '0')}`
}

function truncateToWidth(ctx, text, maxPx) {
  if (!text) return ''
  if (ctx.measureText(text).width <= maxPx) return text
  let t = text
  while (t.length > 0 && ctx.measureText(t + '…').width > maxPx) t = t.slice(0, -1)
  return t + '…'
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export default function WaveformTimeline({
  waveformData,
  isDecoding,
  decodeError,
  keyframes,
  currentTime,
  duration,
  displayMode,
  frameRate,
  sourceMode,
  onSeek,
  onDragKeyframe,
  onAddKeyframe,
  hasVideo,
  beatPositions,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [showBeats, setShowBeats] = useState(true)

  const isDraggingKeyframeRef = useRef(false)
  const draggingIdRef = useRef(null)

  const propsRef = useRef({})
  propsRef.current = { waveformData, keyframes, currentTime, duration, displayMode, frameRate, isDecoding, decodeError, beatPositions, showBeats, sourceMode }

  // ─── Drawing ─────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { waveformData, keyframes, currentTime, duration, displayMode, frameRate, isDecoding, decodeError, beatPositions, showBeats, sourceMode } = propsRef.current

    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    const waveTop = BADGE_AREA_HEIGHT
    const waveH = H - BADGE_AREA_HEIGHT - TICK_AREA_HEIGHT
    const waveBottom = waveTop + waveH
    const waveMid = waveTop + waveH / 2

    // 1. Clear
    ctx.clearRect(0, 0, W, H)

    // 2. Waveform / ruler / status messages
    if (sourceMode === 'blank') {
      // ── Blank mode: draw ruler using same dot-and-bar style ─────────────────
      if (duration > 0) {
        // Fill dark background
        ctx.fillStyle = '#0d0d0d'
        ctx.fillRect(0, waveTop, W, waveH)

        // Center baseline
        ctx.fillStyle = RULER_LINE_COLOR
        ctx.fillRect(0, waveMid, W, 1)

        // End marker (amber line at right edge)
        ctx.fillStyle = END_MARKER_COLOR
        ctx.fillRect(W - 2, waveTop, 2, waveH)

        // Dot-and-bar ruler along center baseline
        const majorInterval = computeTickInterval(duration, W)
        const subInterval = majorInterval / 2
        let minorInterval = majorInterval / 10
        while ((minorInterval / duration) * W < 4.5 && minorInterval < subInterval) {
          minorInterval *= 2
        }

        const dotY = waveMid
        const totalSteps = Math.ceil(duration / minorInterval)

        // Minor dots along center line
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        for (let step = 0; step <= totalSteps; step++) {
          const t = step * minorInterval
          if (t > duration + 0.001) break
          const x = Math.round((t / duration) * W)
          ctx.beginPath()
          ctx.arc(x, dotY, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }

        // Sub-major ticks
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        const subSteps = Math.ceil(duration / subInterval)
        for (let step = 1; step <= subSteps; step++) {
          const t = step * subInterval
          if (t > duration + 0.001) break
          const modMajor = t % majorInterval
          if (modMajor < 0.01 || Math.abs(modMajor - majorInterval) < 0.01) continue
          const x = Math.round((t / duration) * W)
          ctx.fillRect(x, waveMid - 8, 1, 16)
        }

        // Major ticks + labels above and below baseline
        ctx.font = '10px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        const majSteps = Math.ceil(duration / majorInterval)
        for (let step = 0; step <= majSteps; step++) {
          const t = step * majorInterval
          if (t > duration + 0.001) break
          const x = Math.round((t / duration) * W)
          ctx.fillRect(x, waveMid - 14, 1, 28)
          const label = formatRulerLabel(t, displayMode, frameRate)
          const tw = ctx.measureText(label).width
          const lx = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, x))
          ctx.clearRect(lx - tw / 2 - 3, waveMid + 8, tw + 6, 16)
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.fillText(label, lx, waveMid + 17)
          ctx.fillStyle = 'rgba(255,255,255,0.6)'
        }
        ctx.textBaseline = 'alphabetic'
      }
    } else if (isDecoding) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font = '13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Decoding audio…', W / 2, H / 2)
    } else if (decodeError) {
      ctx.fillStyle = 'rgba(255,100,100,0.7)'
      ctx.font = '13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('⚠ Audio unavailable', W / 2, H / 2)
    } else if (!waveformData) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.font = '13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(hasVideo ? 'Loading waveform…' : 'Load a video to see the waveform', W / 2, H / 2)
    } else {
      // Black waveform background
      ctx.fillStyle = '#000'
      ctx.fillRect(0, waveTop, W, waveH)

      const barW = Math.max(1, W / waveformData.length)
      const playheadX = duration > 0 ? (currentTime / duration) * W : 0
      for (let i = 0; i < waveformData.length; i++) {
        const amp = waveformData[i]
        const barH = amp * (waveH / 2)
        const x = i * barW
        ctx.fillStyle = x <= playheadX ? WAVEFORM_PLAYED : WAVEFORM_UNPLAYED
        ctx.fillRect(x, waveMid - barH, barW - 0.5, barH)
        ctx.fillRect(x, waveMid, barW - 0.5, barH)
      }
    }

    // Time axis — dot-and-bar ruler (skip in blank mode; it draws its own ruler above)
    if (sourceMode !== 'blank' && duration > 0) {
      const majorInterval = computeTickInterval(duration, W)
      const subInterval = majorInterval / 2

      // Minor dot interval: aim for ~4 dots between each position pair, min 4px gap
      let minorInterval = majorInterval / 10
      while ((minorInterval / duration) * W < 4.5 && minorInterval < subInterval) {
        minorInterval *= 2
      }

      ctx.font = '10px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const tickAreaTop = waveBottom + 1
      const tickMidY = waveBottom + Math.round(TICK_AREA_HEIGHT / 2) + 1

      // Pass 1 — minor dots at ALL minor positions
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      const totalSteps = Math.ceil(duration / minorInterval)
      for (let step = 0; step <= totalSteps; step++) {
        const t = step * minorInterval
        if (t > duration + 0.001) break
        const x = Math.round((t / duration) * W)
        ctx.beginPath()
        ctx.arc(x, tickMidY, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Pass 2 — sub-major ticks (|) at midpoints between labels
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      const subSteps = Math.ceil(duration / subInterval)
      for (let step = 1; step <= subSteps; step++) {
        const t = step * subInterval
        if (t > duration + 0.001) break
        // Skip if this is a major interval position (label will cover it)
        const modMajor = t % majorInterval
        const isMajor = modMajor < 0.01 || Math.abs(modMajor - majorInterval) < 0.01
        if (isMajor) continue
        const x = Math.round((t / duration) * W)
        const barH = Math.round(TICK_AREA_HEIGHT * 0.55)
        ctx.fillRect(x, tickAreaTop + Math.round((TICK_AREA_HEIGHT - barH) / 2), 1, barH)
      }

      // Pass 3 — major labels, erasing dots behind them
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      const majSteps = Math.ceil(duration / majorInterval)
      for (let step = 0; step <= majSteps; step++) {
        const t = step * majorInterval
        if (t > duration + 0.001) break
        const x = Math.round((t / duration) * W)
        const label = formatRulerLabel(t, displayMode, frameRate)
        const tw = ctx.measureText(label).width
        // Clamp label so it stays fully within canvas at edges
        const lx = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, x))
        // Clear behind label so dots don't bleed through
        ctx.clearRect(lx - tw / 2 - 3, tickAreaTop, tw + 6, TICK_AREA_HEIGHT)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText(label, lx, tickMidY)
      }

      ctx.textBaseline = 'alphabetic'
    }

    // 2b. Beat position ticks (drawn before keyframe markers)
    if (showBeats && duration > 0 && beatPositions && beatPositions.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
      const tickH = 10
      for (const beat of beatPositions) {
        if (beat < 0 || beat > duration) continue
        const x = Math.round((beat / duration) * W)
        ctx.fillRect(x, waveTop, 1, tickH)
      }
    }

    // 3. Keyframe marker lines + handles
    if (duration > 0) {
      keyframes.forEach((kf) => {
        const color = kf.color || DEFAULT_MARKER_COLOR
        const x = Math.round((kf.time / duration) * W)

        // Marker line
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, waveTop)
        ctx.lineTo(x, waveBottom)
        ctx.stroke()

        // Diamond handle at top of waveform area
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(x, waveTop - HANDLE_SIZE)
        ctx.lineTo(x + HANDLE_SIZE * 0.65, waveTop)
        ctx.lineTo(x, waveTop + HANDLE_SIZE * 0.5)
        ctx.lineTo(x - HANDLE_SIZE * 0.65, waveTop)
        ctx.closePath()
        ctx.fill()
      })
    }

    // 4. Label badges (below handle, at top of waveform)
    if (duration > 0) {
      ctx.font = 'bold 10px system-ui'
      keyframes.forEach((kf) => {
        if (!kf.label) return
        const color = kf.color || DEFAULT_MARKER_COLOR
        const x = Math.round((kf.time / duration) * W)
        const truncated = truncateToWidth(ctx, kf.label, BADGE_MAX_W - BADGE_PAD_X * 2)
        const textW = ctx.measureText(truncated).width
        const bW = Math.min(textW + BADGE_PAD_X * 2, BADGE_MAX_W)
        const bX = Math.max(2, Math.min(W - bW - 2, x - bW / 2))
        const bY = 4

        // Badge background
        ctx.fillStyle = color
        drawRoundRect(ctx, bX, bY, bW, BADGE_H, BADGE_RADIUS)
        ctx.fill()

        // Badge text
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.fillText(truncated, bX + BADGE_PAD_X, bY + BADGE_H - 5)
      })
    }

    // 5. Active keyframe highlight
    if (duration > 0) {
      let nearestIdx = -1
      let nearestDist = Infinity
      keyframes.forEach((kf, i) => {
        const dist = Math.abs(kf.time - currentTime)
        if (dist < nearestDist) { nearestDist = dist; nearestIdx = i }
      })
      if (nearestDist <= 0.1 && nearestIdx >= 0) {
        const kf = keyframes[nearestIdx]
        const x = Math.round((kf.time / duration) * W)

        ctx.strokeStyle = ACTIVE_GLOW_COLOR
        ctx.lineWidth = 2.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(x, waveTop)
        ctx.lineTo(x, waveBottom)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // 6. Playhead (always on top)
    if (duration > 0) {
      const x = (currentTime / duration) * W
      ctx.strokeStyle = PLAYHEAD_COLOR
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, waveTop)
      ctx.lineTo(x, waveBottom)
      ctx.stroke()
    }
  }, [hasVideo])

  // ─── Resize ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => {
    draw()
  }, [waveformData, keyframes, currentTime, duration, displayMode, frameRate, isDecoding, decodeError, beatPositions, showBeats, sourceMode, draw])

  // ─── Mouse interaction ────────────────────────────────────────────────────────

  function getCanvasX(e) {
    return e.clientX - canvasRef.current.getBoundingClientRect().left
  }

  function timeAtX(x) {
    const W = canvasRef.current.clientWidth
    return Math.max(0, Math.min(duration, (x / W) * duration))
  }

  function hitTestKeyframe(x) {
    const W = canvasRef.current.clientWidth
    if (!duration) return null
    for (const kf of keyframes) {
      if (Math.abs(x - (kf.time / duration) * W) <= 10) return kf.id
    }
    return null
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    const x = getCanvasX(e)
    const hitId = hitTestKeyframe(x)
    if (hitId) {
      isDraggingKeyframeRef.current = true
      draggingIdRef.current = hitId
    } else if (duration > 0) {
      onSeek(timeAtX(x))
    }
  }

  function handleMouseMove(e) {
    // Update cursor
    const canvas = canvasRef.current
    if (canvas) {
      const x = getCanvasX(e)
      const hitId = hitTestKeyframe(x)
      canvas.style.cursor = isDraggingKeyframeRef.current ? 'grabbing' : hitId ? 'grab' : 'crosshair'
    }
    // Drag
    if (!isDraggingKeyframeRef.current) return
    const x = getCanvasX(e)
    onDragKeyframe(draggingIdRef.current, { time: timeAtX(x) })
  }

  function handleMouseUp() {
    isDraggingKeyframeRef.current = false
    draggingIdRef.current = null
  }

  const showAddButton = (hasVideo || sourceMode === 'blank') && onAddKeyframe

  return (
    <div ref={containerRef} className="waveform-container">
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {showAddButton && (
        <button
          className="add-keyframe-btn"
          onClick={() => onAddKeyframe(propsRef.current.currentTime)}
          title="Add keyframe at current time (K)"
        >
          <span className="add-keyframe-btn-icon">◆</span>
          Add Keyframe
        </button>
      )}
      {beatPositions && beatPositions.length > 0 && (
        <button
          className={`show-beats-btn ${showBeats ? 'show-beats-btn--on' : ''}`}
          onClick={() => setShowBeats(v => !v)}
          title={showBeats ? 'Hide beat markers' : 'Show beat markers'}
        >
          ♩ {showBeats ? 'Beats on' : 'Beats off'}
        </button>
      )}
      {/* Spacer so the fixed pill button doesn't overlap the ruler on mobile */}
      {showAddButton && <div className="add-keyframe-spacer" />}
    </div>
  )
}
