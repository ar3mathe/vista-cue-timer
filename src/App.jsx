import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAudioContext } from './hooks/useAudioContext.js'
import { useWaveform } from './hooks/useWaveform.js'
import { useBpmDetection } from './hooks/useBpmDetection.js'
import { useBlankTimer } from './hooks/useBlankTimer.js'
import VideoUploader from './components/VideoUploader.jsx'
import VideoPlayer from './components/VideoPlayer.jsx'
import WaveformTimeline from './components/WaveformTimeline.jsx'
import KeyframePanel from './components/KeyframePanel.jsx'
import Metronome from './components/Metronome.jsx'
import TimecodeToolbar from './components/TimecodeToolbar.jsx'
import SessionControls from './components/SessionControls.jsx'

const DEFAULT_COLOR = '#ff6b35'

export default function App() {
  const [sourceFile, setSourceFile] = useState(null)     // File | null
  const [sourceMode, setSourceMode] = useState(null)     // 'video' | 'audio' | 'blank' | null
  const [sourceObjectUrl, setSourceObjectUrl] = useState(null)
  const [keyframes, setKeyframes] = useState([])
  const [bpm, setBpm] = useState(120)
  const [displayMode, setDisplayMode] = useState('seconds')
  const [frameRate, setFrameRate] = useState(25)
  const [sourceDuration, setSourceDuration] = useState(0)
  const [blankDuration, setBlankDuration] = useState(60)
  const [seekTo, setSeekTo] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [sessionMatchStatus, setSessionMatchStatus] = useState(null)

  const objectUrlRef = useRef(null)

  const { getAudioContext } = useAudioContext()
  const { waveformData, audioBuffer, isDecoding, decodeError } = useWaveform({ sourceFile, getAudioContext })
  const { detectedBpm, detectionStatus, beatPositions, dismissDetectedBpm } = useBpmDetection({ audioBuffer })
  const blankTimer = useBlankTimer({ getAudioContext })

  // Derived current time and duration based on mode
  const displayCurrentTime = sourceMode === 'blank' ? blankTimer.elapsed : currentTime
  const displayDuration = sourceMode === 'blank' ? blankDuration : sourceDuration

  // Manage object URL lifecycle
  useEffect(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (sourceFile) {
      const url = URL.createObjectURL(sourceFile)
      objectUrlRef.current = url
      setSourceObjectUrl(url)
    } else {
      setSourceObjectUrl(null)
    }
  }, [sourceFile])

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  // Reset blank timer when leaving blank mode
  useEffect(() => {
    if (sourceMode !== 'blank') blankTimer.reset()
  }, [sourceMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Global K key shortcut for all modes
  useEffect(() => {
    function onKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'KeyK') {
        e.preventDefault()
        addKeyframe(displayCurrentTime)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [displayCurrentTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Called by VideoUploader with (file, mode)
  const handleFileSelected = useCallback((file, mode) => {
    blankTimer.reset()
    setSourceFile(file ?? null)
    setSourceMode(file ? mode : null)
    if (!file) {
      setKeyframes([])
      setSourceDuration(0)
      setCurrentTime(0)
      setSessionMatchStatus(null)
    }
  }, [blankTimer])

  // Called by VideoUploader blank option
  const handleStartBlank = useCallback((duration) => {
    blankTimer.reset()
    setSourceFile(null)
    setSourceMode('blank')
    setBlankDuration(duration)
    setKeyframes([])
    setCurrentTime(0)
    setSourceDuration(0)
    setSessionMatchStatus(null)
  }, [blankTimer])

  // Called by blank controls to change duration
  const handleChangeDuration = useCallback((newDuration) => {
    setBlankDuration(newDuration)
    blankTimer.setDuration(newDuration)
  }, [blankTimer])

  // Remove blank timeline
  const handleRemoveBlank = useCallback(() => {
    blankTimer.reset()
    setSourceMode(null)
    setKeyframes([])
    setCurrentTime(0)
    setSessionMatchStatus(null)
  }, [blankTimer])

  const addKeyframe = useCallback((time) => {
    const snappedTime = Math.round(time * 2) / 2
    const newKf = { id: crypto.randomUUID(), time: snappedTime, label: '', color: DEFAULT_COLOR }
    setKeyframes(prev => [...prev, newKf].sort((a, b) => a.time - b.time))
  }, [])

  const updateKeyframe = useCallback((id, patch) => {
    setKeyframes(prev =>
      prev
        .map(kf => kf.id === id ? { ...kf, ...patch } : kf)
        .sort((a, b) => a.time - b.time)
    )
  }, [])

  const deleteKeyframe = useCallback((id) => {
    setKeyframes(prev => prev.filter(kf => kf.id !== id))
  }, [])

  const handleSeek = useCallback((time) => {
    if (sourceMode === 'blank') {
      blankTimer.seek(time)
    } else {
      setSeekTo(time)
    }
  }, [sourceMode, blankTimer])

  const handleSeekHandled = useCallback(() => setSeekTo(null), [])

  const handleSessionLoad = useCallback((session) => {
    setKeyframes(session.keyframes.sort((a, b) => a.time - b.time))
    setBpm(session.bpm)
    setDisplayMode(session.displayMode)
    setFrameRate(session.frameRate)

    if (session.sourceMode === 'blank') {
      blankTimer.reset()
      setSourceFile(null)
      setSourceMode('blank')
      setBlankDuration(session.blankDuration || 60)
      setCurrentTime(0)
      setSessionMatchStatus('matched')
    } else {
      const loadedName = session.fileName ?? session.videoName ?? ''
      if (sourceFile && loadedName === sourceFile.name) {
        setSessionMatchStatus('matched')
      } else {
        setSessionMatchStatus('unmatched')
      }
    }
    setTimeout(() => setSessionMatchStatus(null), 4000)
  }, [sourceFile, blankTimer])

  const fileName = sourceFile?.name ?? ''

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-brand">myCue</div>
        <TimecodeToolbar
          displayMode={displayMode}
          frameRate={frameRate}
          onDisplayModeChange={setDisplayMode}
          onFrameRateChange={setFrameRate}
        />
        <SessionControls
          keyframes={keyframes}
          bpm={bpm}
          displayMode={displayMode}
          frameRate={frameRate}
          fileName={fileName}
          sourceDuration={sourceDuration}
          sourceMode={sourceMode}
          blankDuration={blankDuration}
          onLoad={handleSessionLoad}
          sessionMatchStatus={sessionMatchStatus}
        />
        <Metronome
          bpm={bpm}
          onBpmChange={setBpm}
          getAudioContext={getAudioContext}
          detectedBpm={detectedBpm}
          detectionStatus={detectionStatus}
          onApplyBpm={(val) => { setBpm(val); dismissDetectedBpm() }}
          onDismissBpm={dismissDetectedBpm}
        />
      </header>

      <main className="main-layout">
        <div className="left-column">
          {sourceMode === 'blank' ? (
            <VideoPlayer
              sourceMode="blank"
              displayMode={displayMode}
              frameRate={frameRate}
              blankIsPlaying={blankTimer.isPlaying}
              blankElapsed={blankTimer.elapsed}
              blankDuration={blankDuration}
              onBlankPlayPause={() => blankTimer.isPlaying ? blankTimer.pause() : blankTimer.play(blankDuration)}
              onBlankSeek={blankTimer.seek}
              onBlankReset={blankTimer.reset}
              onChangeDuration={handleChangeDuration}
              onRemove={handleRemoveBlank}
              onAddKeyframe={addKeyframe}
            />
          ) : !sourceFile ? (
            <VideoUploader onFileSelected={handleFileSelected} onStartBlank={handleStartBlank} />
          ) : (
            <VideoPlayer
              sourceObjectUrl={sourceObjectUrl}
              sourceMode={sourceMode}
              fileName={fileName}
              displayMode={displayMode}
              frameRate={frameRate}
              seekTo={seekTo}
              onSeekHandled={handleSeekHandled}
              onDurationChange={setSourceDuration}
              onTimeUpdate={setCurrentTime}
              onAddKeyframe={addKeyframe}
              onRemove={() => handleFileSelected(null, null)}
            />
          )}

          <WaveformTimeline
            waveformData={waveformData}
            isDecoding={isDecoding}
            decodeError={decodeError}
            keyframes={keyframes}
            currentTime={displayCurrentTime}
            duration={displayDuration}
            displayMode={displayMode}
            frameRate={frameRate}
            sourceMode={sourceMode}
            onSeek={handleSeek}
            onDragKeyframe={updateKeyframe}
            onAddKeyframe={addKeyframe}
            hasVideo={!!sourceFile}
            beatPositions={beatPositions}
          />
        </div>

        <aside className="right-column">
          <KeyframePanel
            keyframes={keyframes}
            displayMode={displayMode}
            frameRate={frameRate}
            videoDuration={displayDuration}
            currentTime={displayCurrentTime}
            onUpdate={updateKeyframe}
            onDelete={deleteKeyframe}
            onClearAll={() => setKeyframes([])}
            onSeek={handleSeek}
          />
        </aside>
      </main>
    </div>
  )
}
