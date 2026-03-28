const CURRENT_VERSION = 2

/**
 * Serialize session state to a plain JS object ready for JSON.stringify.
 */
export function serializeSession(keyframes, bpm, displayMode, frameRate, fileName, sourceDuration, sourceMode, blankDuration) {
  return {
    version: CURRENT_VERSION,
    fileName: fileName ?? '',
    sourceDuration: sourceDuration ?? 0,
    sourceMode: sourceMode ?? 'video',
    blankDuration: blankDuration ?? 60,
    bpm,
    displayMode,
    frameRate,
    keyframes: keyframes.map(kf => ({
      id: kf.id,
      time: kf.time,
      label: kf.label,
      color: kf.color,
    })),
  }
}

/**
 * Validate and parse a session JSON object.
 * Throws a descriptive Error on failure.
 * @returns {{ keyframes, bpm, displayMode, frameRate, fileName, sourceDuration, sourceMode }}
 */
export function deserializeSession(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Invalid session file: not a JSON object.')
  }
  if (obj.version !== CURRENT_VERSION) {
    throw new Error(
      `Unsupported session version: ${obj.version}. Expected version ${CURRENT_VERSION}.`
    )
  }
  if (!Array.isArray(obj.keyframes)) {
    throw new Error('Invalid session file: "keyframes" must be an array.')
  }
  for (const kf of obj.keyframes) {
    if (typeof kf.time !== 'number' || typeof kf.label !== 'string') {
      throw new Error('Invalid session file: keyframe missing required "time" (number) or "label" (string).')
    }
  }

  // Support old sessions that used videoName/videoDuration field names
  const fileName = typeof obj.fileName === 'string' ? obj.fileName
    : typeof obj.videoName === 'string' ? obj.videoName
    : ''
  const sourceDuration = typeof obj.sourceDuration === 'number' ? obj.sourceDuration
    : typeof obj.videoDuration === 'number' ? obj.videoDuration
    : 0

  const sourceMode = obj.sourceMode === 'audio' ? 'audio'
    : obj.sourceMode === 'blank' ? 'blank'
    : 'video'

  return {
    keyframes: obj.keyframes.map(kf => ({
      id: kf.id ?? crypto.randomUUID(),
      time: kf.time,
      label: kf.label,
      color: kf.color ?? '#ff6b35',
    })),
    bpm: typeof obj.bpm === 'number' ? obj.bpm : 120,
    displayMode: obj.displayMode === 'smpte' ? 'smpte' : 'seconds',
    frameRate: typeof obj.frameRate === 'number' ? obj.frameRate : 25,
    blankDuration: typeof obj.blankDuration === 'number' ? obj.blankDuration : 60,
    sourceMode,
    fileName,
    sourceDuration,
  }
}
