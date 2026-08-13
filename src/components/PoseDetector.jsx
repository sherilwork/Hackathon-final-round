"use client"

import { useCallback, useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Timer, Trophy, CheckCircle2, XCircle, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { exerciseRules } from '../config/exerciseRules'
import { checkPosture } from '../utils/postureChecker'
import { useRepCounter } from '../utils/repCounter'
import { useHoldTimer } from '../utils/holdTimer'
import { classifyBodyMotion, MOTION_LABELS } from '../utils/bodyMotionClassifier'
import { angleFromPoints, mirrorPoints } from '../utils/angleCalculator'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

// Keep in sync with the installed @mediapipe/tasks-vision version (package.json).
const TASKS_VISION_VERSION = '1.0.1'

// Minimum gap between voice announcements on the tracking (Body Motion) screen.
// The motion classifier flips several times per second while the user moves;
// without this cap, speak() gets called on nearly every frame and the
// cancel()/re-queue logic makes the voice sound broken or silent.
const MOTION_SPEAK_GAP_MS = 1200
// When a status change is throttled by the gap above, a trailing settle timer
// re-announces the LATEST status once the user stops changing poses, so a
// settled state (e.g. returning to standing) is never silently dropped.
const MOTION_SETTLE_MS = 800
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'

// Standard MediaPipe pose skeleton connections (index pairs into the 33 landmarks).
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
]

let landmarkerPromise = null

// Creates the PoseLandmarker once (module-level singleton). Uses the modern
// MediaPipe Tasks API, which avoids the legacy Emscripten abort
// ("Module.arguments has been replaced with plain arguments") in modern browsers.
async function loadPoseLandmarker() {
  if (landmarkerPromise) return landmarkerPromise
  landmarkerPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
    )
    const options = {
      baseOptions: {
        modelAssetPath: POSE_MODEL_URL,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    }
    try {
      return await PoseLandmarker.createFromOptions(vision, options)
    } catch {
      // Some GPUs/browsers reject the GPU delegate — retry on CPU.
      options.baseOptions.delegate = 'CPU'
      try {
        return await PoseLandmarker.createFromOptions(vision, options)
      } catch (err) {
        landmarkerPromise = null
        throw err
      }
    }
  })()
  return landmarkerPromise
}

function drawPose(ctx, landmarks, width, height) {
  ctx.strokeStyle = '#00FF00'
  ctx.lineWidth = 2
  for (const [a, b] of POSE_CONNECTIONS) {
    const from = landmarks[a]
    const to = landmarks[b]
    if (!from || !to) continue
    ctx.beginPath()
    ctx.moveTo(from.x * width, from.y * height)
    ctx.lineTo(to.x * width, to.y * height)
    ctx.stroke()
  }
  ctx.fillStyle = '#FF0000'
  for (const landmark of landmarks) {
    if (!landmark) continue
    ctx.beginPath()
    ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI)
    ctx.fill()
  }
}

// Maps raw getUserMedia errors to a message a fitness user can act on.
function cameraErrorMessage(err) {
  const name = err && err.name
  const msg = (err && err.message) || ''
  if (name === 'NotAllowedError' || name === 'PermissionError') {
    if (/permission dismissed/i.test(msg)) {
      return 'Camera permission was dismissed. Allow camera access in your browser, then click Retry.'
    }
    return 'Camera access was denied. Allow camera access in your browser, then click Retry.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Your camera is already in use by another app. Close it, then click Retry.'
  }
  if (name === 'OverconstrainedError' || /constraints/i.test(msg)) {
    return 'The camera could not start with the requested settings. Click Retry.'
  }
  if (name === 'SecurityError') {
    return 'Camera access is blocked by browser security settings.'
  }
  return msg || String(err)
}

export default function PoseDetector({ initialExercise }) {
  // Support deep links like /workout?exercise=squat while guarding against
  // unknown ids (falls back to the default plank).
  const safeInitialExercise =
    initialExercise && exerciseRules[initialExercise] ? initialExercise : 'plank'
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [poseDetected, setPoseDetected] = useState(false)
  const [error, setError] = useState(null)
  const [fps, setFps] = useState(0)
  const [facingMode, setFacingMode] = useState('user')
  const [poseReady, setPoseReady] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)
  const [motionStatus, setMotionStatus] = useState(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const fpsFrameCount = useRef(0)
  const fpsLastTimeRef = useRef(performance.now())
  const poseRef = useRef(null)
  const cameraRef = useRef(null)
  const facingModeRef = useRef('user')
  const resultsHandlerRef = useRef(null)
  const poseErrorLoggedRef = useRef(false)
  const repHistoryRef = useRef({ left: [], right: [] })
  const repSideRef = useRef('left')
  const motionStatusRef = useRef(null)
  const lastAnnouncedStatusRef = useRef(null)
  const lastMotionSpokenAtRef = useRef(0)
  const settleTimerRef = useRef(null)
  const voicePrimedRef = useRef(false)
  const [voicePrimed, setVoicePrimed] = useState(false)

  // Picks the arm/leg that is actually moving (left vs right) so rep exercises
  // track whichever side the user exercises with. Falls back to the other side
  // if the chosen one briefly loses landmarks.
  const selectRepSide = (leftAngle, rightAngle) => {
    const history = repHistoryRef.current
    if (leftAngle != null) {
      history.left.push(leftAngle)
      if (history.left.length > 12) history.left.shift()
    }
    if (rightAngle != null) {
      history.right.push(rightAngle)
      if (history.right.length > 12) history.right.shift()
    }
    const range = (arr) => (arr.length ? Math.max(...arr) - Math.min(...arr) : 0)
    const leftRange = range(history.left)
    const rightRange = range(history.right)
    let side = repSideRef.current
    if (side === 'left' && rightRange > leftRange * 1.5 + 12) side = 'right'
    if (side === 'right' && leftRange > rightRange * 1.5 + 12) side = 'left'
    repSideRef.current = side
    const angle = side === 'right' ? rightAngle : leftAngle
    return angle != null ? angle : (leftAngle ?? rightAngle)
  }

  // Defer anything that depends on browser-only APIs until after hydration,
  // so the server and client HTML match.
  useEffect(() => {
    setIsEmbedded(typeof window !== 'undefined' && window.self !== window.top)
  }, [])

  const [supportsSpeech, setSupportsSpeech] = useState(false)
  useEffect(() => {
    setSupportsSpeech(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  // Single-exercise workout screen: the exercise is fixed from the deep link
  // (or defaults to plank). Exercise selection happens on the Home screen.
  const exercise = exerciseRules[safeInitialExercise]

  const repCounter = useRepCounter(exercise.type === 'rep' ? exercise.repDetection : null, {
    onRepComplete: ({ classification }) => speak(classification === 'good' ? 'Good' : 'Bad')
  })
  const holdTimer = useHoldTimer()

  const startCamera = async () => {
    const videoElement = videoRef.current
    // Request a portrait stream so the camera view matches the portrait
    // viewport (480x640 = 3:4) without cropping the user out of frame.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingModeRef.current, width: 480, height: 640 },
      audio: false
    })

    if (cameraRef.current) {
      cameraRef.current.stop()
    }

    videoElement.srcObject = stream

    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => resolve()
    })

    await videoElement.play()

    let rafId = null
    const sendFrame = async () => {
      if (!videoElement.paused && !videoElement.ended && poseRef.current) {
        try {
          const result = await poseRef.current.detectForVideo(videoElement, performance.now())
          const landmarks =
            result && result.landmarks && result.landmarks.length > 0 ? result.landmarks[0] : null
          resultsHandlerRef.current?.(landmarks)
        } catch (err) {
          if (!poseErrorLoggedRef.current) {
            poseErrorLoggedRef.current = true
            console.error('Pose detection error:', err)
          }
        }
      }
      rafId = requestAnimationFrame(sendFrame)
    }
    rafId = requestAnimationFrame(sendFrame)

    cameraRef.current = {
      stop: () => {
        if (rafId) {
          cancelAnimationFrame(rafId)
        }
        if (videoElement.srcObject) {
          videoElement.srcObject.getTracks().forEach((track) => track.stop())
        }
      }
    }

    setCameraActive(true)
  }

  const handleFlipCamera = async () => {
    const next = facingModeRef.current === 'user' ? 'environment' : 'user'
    facingModeRef.current = next
    setFacingMode(next)
    setCameraActive(false)
    try {
      await startCamera()
      setError(null)
    } catch (err) {
      facingModeRef.current = next === 'user' ? 'environment' : 'user'
      setFacingMode(facingModeRef.current)
      setCameraActive(false)
      setError(
        isEmbedded
          ? `${cameraErrorMessage(err)} This embedded preview cannot grant camera access — open the app in a new tab.`
          : cameraErrorMessage(err)
      )
    }
  }

  useEffect(() => {
    const initializePose = async () => {
      try {
        const videoElement = videoRef.current
        const canvasElement = canvasRef.current
        const canvasCtx = canvasElement.getContext('2d')

        const landmarker = await loadPoseLandmarker()

        // Processes each detected frame: draws the skeleton overlay and feeds
        // the landmarks into the posture checker, rep counter and hold timer.
        resultsHandlerRef.current = (landmarksList) => {
          canvasCtx.save()
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
          canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

          if (landmarksList && landmarksList.length > 0) {
            setPoseDetected(true)
            drawPose(canvasCtx, landmarksList, canvasElement.width, canvasElement.height)

            if (exercise.type === 'tracking') {
              const status = classifyBodyMotion(landmarksList)
              setMotionStatus(status)
              motionStatusRef.current = status
              if (status) {
                const now = performance.now()
                const gapOk =
                  lastMotionSpokenAtRef.current === 0 ||
                  now - lastMotionSpokenAtRef.current >= MOTION_SPEAK_GAP_MS
                const isNew = status !== lastAnnouncedStatusRef.current
                // Announce each NEW motion, but at most once per MOTION_SPEAK_GAP_MS.
                // Speaking on every status flip would spam cancel()+re-queue and
                // the voice would never be heard clearly.
                if (voiceEnabledRef.current && isNew && gapOk) {
                  if (settleTimerRef.current) {
                    window.clearTimeout(settleTimerRef.current)
                    settleTimerRef.current = null
                  }
                  lastAnnouncedStatusRef.current = status
                  lastMotionSpokenAtRef.current = now
                  speak(MOTION_LABELS[status])
                } else if (voiceEnabledRef.current && isNew && !settleTimerRef.current) {
                  // Throttled — schedule a trailing announce so the status the
                  // user finally settles into is still spoken.
                  settleTimerRef.current = window.setTimeout(() => {
                    settleTimerRef.current = null
                    const latest = motionStatusRef.current
                    if (
                      latest &&
                      latest !== lastAnnouncedStatusRef.current &&
                      voiceEnabledRef.current &&
                      performance.now() - lastMotionSpokenAtRef.current >= MOTION_SPEAK_GAP_MS
                    ) {
                      lastAnnouncedStatusRef.current = latest
                      lastMotionSpokenAtRef.current = performance.now()
                      speak(MOTION_LABELS[latest])
                    }
                  }, MOTION_SETTLE_MS)
                }
              }
            }

            const result = checkPosture(landmarksList, exercise)

            if (exercise.type === 'rep' && exercise.repDetection) {
              const trackedCheck = exercise.checks.find(
                (c) => c.id === exercise.repDetection.trackCheckId
              )
              const leftAngle = angleFromPoints(landmarksList, trackedCheck.points)
              const rightAngle = angleFromPoints(landmarksList, mirrorPoints(trackedCheck.points))
              const leftPosture = checkPosture(landmarksList, exercise)
              const rightPosture = checkPosture(landmarksList, exercise, { mirror: true })
              const actualAngle = selectRepSide(leftAngle, rightAngle)
              const activeStatus =
                (repSideRef.current === 'right' ? rightPosture : leftPosture).overallStatus
              repCounter.updateFrame(actualAngle, activeStatus)
            } else if (exercise.type === 'hold') {
              holdTimer.updateFrame(result.overallStatus, true)
            }
          } else {
            setPoseDetected(false)
            if (exercise.type === 'tracking') {
              setMotionStatus(null)
              motionStatusRef.current = null
              lastAnnouncedStatusRef.current = null
              lastMotionSpokenAtRef.current = 0
              if (settleTimerRef.current) {
                window.clearTimeout(settleTimerRef.current)
                settleTimerRef.current = null
              }
            }
            if (exercise.type === 'rep') {
              repCounter.updateFrame(null, null)
            } else if (exercise.type === 'hold') {
              holdTimer.updateFrame(null, false)
            }
          }

          canvasCtx.restore()

          fpsFrameCount.current++
          const currentTime = performance.now()
          const elapsed = currentTime - fpsLastTimeRef.current
          if (elapsed >= 1000) {
            setFps(Math.round((fpsFrameCount.current * 1000) / elapsed))
            fpsFrameCount.current = 0
            fpsLastTimeRef.current = currentTime
          }
        }

        poseRef.current = landmarker
        setPoseReady(true)
        await startCamera()
      } catch (err) {
        if (err && err.name === 'NotAllowedError') {
          console.info('Camera permission not granted (expected in embedded previews):', err.message)
        } else {
          console.error('Error initializing pose detection:', err)
        }
        setError(
          isEmbedded
            ? `${cameraErrorMessage(err)} This embedded preview cannot grant camera access — open the app in a new tab.`
            : cameraErrorMessage(err)
        )
        setCameraActive(false)
      }
    }

    initializePose()

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (poseRef.current) {
        poseRef.current.close()
        poseRef.current = null
      }
      landmarkerPromise = null
    }
  }, [])

  const retryCamera = async () => {
    setError(null)
    try {
      await startCamera()
    } catch (err) {
      setCameraActive(false)
      setError(
        isEmbedded
          ? `${cameraErrorMessage(err)} This embedded preview cannot grant camera access — open the app in a new tab.`
          : cameraErrorMessage(err)
      )
    }
  }

  const resetDetectors = () => {
    repHistoryRef.current = { left: [], right: [] }
    repSideRef.current = 'left'
    if (exercise.type === 'rep') {
      repCounter.reset()
    } else {
      holdTimer.reset()
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0')
    return `${minutes}:${secs}`
  }

  // Voice assistant: reads text out loud (used for motion statuses and rep
  // results). Robust against browsers that silently drop speech if speak() is
  // called in the same tick as cancel(), and against Chrome's async voice list.
  const voiceEnabledRef = useRef(voiceEnabled)
  const speechRef = useRef([])
  const audioRef = useRef(null)
  const audioCtxRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled
  }, [voiceEnabled])

  // Chrome blocks programmatic audio until the page has user interaction.
  // On the first tap/keypress we unlock an AudioContext + play a silent clip,
  // so the TTS fallback can then play automatically.
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (Ctx) audioCtxRef.current = new Ctx()
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
      if (!audioRef.current) {
        const silent = new Audio(
          'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAADABAAZGF0YQAAAAA='
        )
        silent.volume = 0
        audioRef.current = silent
      }
      audioRef.current.play().catch(() => {})
    } catch (err) {
      console.warn('[voice] audio unlock failed:', err)
    }
  }, [])

  // Plays TTS via an <audio> element as a fallback for browsers without a
  // usable speechSynthesis (no voices, or speech blocked in an iframe).
  const speakWithAudio = useCallback(
    (text) => {
      try {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume()
        }
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=en`
        const audio = new Audio(url)
        audioRef.current = audio
        audio.volume = 1
        audio.onplaying = () => setIsSpeaking(true)
        audio.onended = () => setIsSpeaking(false)
        audio.onerror = () => {
          audioRef.current = null
          setIsSpeaking(false)
          console.warn('[voice] audio fallback error', text)
        }
        audio.play().catch((err) => {
          audioRef.current = null
          setIsSpeaking(false)
          console.warn('[voice] audio fallback play blocked:', err.message)
        })
        console.info('[voice] >', text, '(audio fallback)')
      } catch (err) {
        console.warn('[voice] audio fallback failed:', err)
      }
    },
    [unlockAudio]
  )

  // Releases our strong reference once an utterance finishes. Keeping the
  // utterance in a ref is required on some browsers (Chrome) that otherwise
  // garbage-collect it mid-speech and go silent.
  const releaseUtterance = useCallback((utterance) => {
    speechRef.current = speechRef.current.filter((u) => u !== utterance)
  }, [])

  const speak = useCallback(
    (text) => {
      if (!voiceEnabledRef.current) return
      if (typeof window === 'undefined') return
      if (!text) return
      const synth = 'speechSynthesis' in window ? window.speechSynthesis : null
      const hasUsableSynth = !!synth && synth.getVoices().length > 0
      if (!hasUsableSynth) {
        speakWithAudio(text)
        return
      }
      const say = () => {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 1.05
        const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('en'))
        if (voice) utterance.voice = voice
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => {
          releaseUtterance(utterance)
          setIsSpeaking(false)
        }
        utterance.onerror = (e) => {
          releaseUtterance(utterance)
          setIsSpeaking(false)
          if (!e || e.error !== 'canceled') {
            // Speech engine failed (e.g. blocked in an iframe) — retry via audio.
            console.warn('[voice] utterance error:', text)
            speakWithAudio(text)
          }
        }
        speechRef.current.push(utterance)
        synth.speak(utterance)
        setIsSpeaking(true)
        console.info('[voice] >', text)
      }
      if (synth.speaking || synth.pending || speechRef.current.length > 0) {
        // Already talking — interrupt it, but wait a tick so the canceled
        // utterance fully clears (Chrome/Android drop audio otherwise).
        synth.cancel()
        window.setTimeout(say, 120)
      } else {
        say()
      }
    },
    [releaseUtterance, speakWithAudio]
  )

  // Unlock speech on the first user gesture (browsers block speechSynthesis
  // until then) and pre-load voices, which Chrome fetches asynchronously.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const prime = () => {
      unlockAudio()
      synth.resume()
      synth.cancel()
      synth.getVoices()
    }
    const loadVoices = () => synth.getVoices()
    // One-time engine warm-up: wakes up Chrome's TTS engine so the first real
    // utterance after opening the tab is not dropped.
    const warmUp = window.setTimeout(() => {
      if (!synth.speaking && !synth.pending) {
        const utterance = new SpeechSynthesisUtterance(' ')
        speechRef.current.push(utterance)
        utterance.onend = utterance.onerror = () => releaseUtterance(utterance)
        synth.speak(utterance)
      }
    }, 400)
    window.addEventListener('pointerdown', prime)
    window.addEventListener('touchstart', prime)
    window.addEventListener('keydown', prime)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.clearTimeout(warmUp)
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('touchstart', prime)
      window.removeEventListener('keydown', prime)
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [releaseUtterance, unlockAudio])

  // Voice engines (speechSynthesis AND the audio fallback) refuse to start
  // until the page has had a real user gesture — and the tap that navigated
  // here happened before this screen mounted, so it doesn't count. Prime on
  // the first tap/keypress anywhere on this screen, then immediately announce
  // the current motion so the user gets instant confirmation the voice works.
  // (The listeners below deliberately duplicate the ones in the speech-unlock
  // effect above: that one early-returns on browsers without speechSynthesis,
  // while this one must run everywhere so the audio fallback is primed too.)
  useEffect(() => {
    const prime = () => {
      unlockAudio()
      if (!voicePrimedRef.current) {
        voicePrimedRef.current = true
        setVoicePrimed(true)
        const current = motionStatusRef.current
        if (current && voiceEnabledRef.current) {
          lastAnnouncedStatusRef.current = current
          lastMotionSpokenAtRef.current = performance.now()
          speak(MOTION_LABELS[current])
        }
      }
    }
    window.addEventListener('pointerdown', prime)
    window.addEventListener('touchstart', prime)
    window.addEventListener('keydown', prime)
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('touchstart', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [unlockAudio, speak])

  // Stop talking when leaving the screen.
  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 touch-none select-none overflow-hidden bg-black text-[#35324A]">
      {/* Invisible video feed — feeds the visible canvas below. */}
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        width={480}
        height={640}
        playsInline
      />

      {/* Decorative background (login/signup style) — peeks through the translucent bottom sheet */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="animate-drift-slow absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="animate-drift-medium absolute -left-28 top-1/3 h-80 w-80 rounded-full bg-[#D9F3F0] blur-3xl" />
        <div className="animate-drift-fast absolute -bottom-24 right-1/4 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="dotted-pattern absolute right-6 top-28 h-16 w-16 opacity-30" />
        <div className="dotted-pattern absolute bottom-36 left-5 h-12 w-12 opacity-25" />
      </div>

      {/* FULL-SCREEN CAMERA — edge-to-edge, fills the entire screen */}
      <div className="absolute inset-0 z-10 bg-black">
        <div className="animate-pulse-ring relative h-full w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            width={480}
            height={640}
            className={`absolute inset-0 h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />

          {/* Legibility gradients so floating UI stays readable over any frame */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 via-black/15 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Live indicator + flip camera (top-right, below the exercise name) */}
          <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+5.2rem)] z-10 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur">
              <span className="animate-pulse h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">Live</span>
            </span>
            <button
              type="button"
              onClick={handleFlipCamera}
              disabled={!poseReady}
              className="rounded-full bg-black/55 p-2 text-white backdrop-blur transition-all hover:scale-105 hover:bg-black/75 active:scale-95 disabled:opacity-40"
              title="Switch camera"
              aria-label="Switch camera"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Camera status (top-right, under the live chip) */}
          <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+7rem)] z-10 flex items-center gap-1.5 text-[10px] font-semibold text-white">
            <span className="rounded-full bg-black/55 px-2 py-1 backdrop-blur">
              Camera: {cameraActive ? 'Active' : 'Inactive'}
            </span>
            <span className="rounded-full bg-black/55 px-2 py-1 backdrop-blur">{fps} FPS</span>
          </div>

          {/* Pose hint — centered on the camera (hidden when an error is shown) */}
          {!poseDetected && !error && (
            <div className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-center px-6">
              <span className="animate-fade-in rounded-full bg-black/55 px-4 py-2 text-center text-[12px] font-semibold text-white/90 backdrop-blur">
                Step into the frame to start
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Exercise name — the only content at the top */}
      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.9rem)] z-20 px-5">
        <h1 className="animate-fade-up text-center font-headline text-[28px] font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
          {exercise.name}
        </h1>
      </div>

      {/* Back to home */}
      <Link
        href="/home"
        className="absolute left-4 top-[calc(env(safe-area-inset-top)+1.1rem)] z-20 rounded-full bg-black/55 p-2.5 text-white backdrop-blur transition-all hover:scale-105 hover:bg-black/75 active:scale-95"
        aria-label="Back to home"
        title="Back to home"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      {/* Solid bottom sheet — stays fixed; camera fills everything above it */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="animate-fade-up mx-auto flex max-h-[52vh] w-full max-w-[430px] flex-col touch-pan-y overflow-y-auto rounded-t-[28px] border-t border-[#D9EFEC] bg-[#F6FAF9]/95 px-5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-12px_40px_rgba(15,40,45,0.18)] backdrop-blur-xl">
          {/* Environment warnings */}
          {isEmbedded && (
            <button
              type="button"
              onClick={() => window.open(window.location.href, '_blank', 'noopener')}
              className="mb-2 flex w-full flex-col items-center gap-1 rounded-[14px] border border-amber-200 bg-amber-50/95 px-3 py-2.5 text-center backdrop-blur"
            >
              <span className="text-[11px] font-bold text-amber-700">
                You&apos;re in a preview iframe — camera &amp; voice can be blocked here
              </span>
              <span className="text-[10px] font-semibold text-amber-600 underline">
                Open in full screen for working camera + voice →
              </span>
            </button>
          )}
          {!supportsSpeech && (
            <div className="mb-2 rounded-[14px] border border-red-200 bg-red-50/95 px-3 py-2 text-center text-[10px] font-semibold text-red-600 backdrop-blur">
              This browser lacks the Web Speech API — voice falls back to audio playback (needs a tap to start).
            </div>
          )}
          {exercise.type === 'rep' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[#D9EFEC] bg-white/85 px-3 py-2 shadow-md shadow-teal-500/10 backdrop-blur-xl transition-transform active:scale-[0.98]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8A86A0]">Good</span>
                </div>
                <p key={repCounter.pulseCount} className="rep-pop font-headline text-[22px] font-bold leading-none text-teal-600">
                  {repCounter.goodReps}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[#D9EFEC] bg-white/85 px-3 py-2 shadow-md shadow-orange-500/10 backdrop-blur-xl transition-transform active:scale-[0.98]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                    <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8A86A0]">Bad</span>
                </div>
                <p key={`bad-${repCounter.pulseCount}`} className="rep-pop font-headline text-[22px] font-bold leading-none text-orange-500">
                  {repCounter.badReps}
                </p>
              </div>
            </div>
          ) : exercise.type === 'hold' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[#D9EFEC] bg-white/85 px-3 py-2 shadow-md shadow-teal-500/10 backdrop-blur-xl transition-transform active:scale-[0.98]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600">
                    <Timer className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8A86A0]">Hold</span>
                </div>
                <p className="font-headline text-[20px] font-bold leading-none text-teal-600">
                  {formatTime(holdTimer.currentHold)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-[16px] border border-[#D9EFEC] bg-white/85 px-3 py-2 shadow-md shadow-teal-500/10 backdrop-blur-xl transition-transform active:scale-[0.98]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600">
                    <Trophy className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8A86A0]">Best</span>
                </div>
                <p className="font-headline text-[20px] font-bold leading-none text-teal-600">
                  {formatTime(holdTimer.bestHold)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-[18px] border border-[#D9EFEC] bg-white/85 px-4 py-4 shadow-md shadow-teal-500/10 backdrop-blur-xl">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A86A0]">
                Body Motion
              </span>
              <p className="animate-fade-up text-center font-headline text-[26px] font-bold leading-tight tracking-tight text-teal-600">
                {motionStatus ? MOTION_LABELS[motionStatus] : 'Step into the frame'}
              </p>
              {voiceEnabled && !voicePrimed && (
                <p className="animate-fade-up rounded-full bg-teal-500/10 px-3 py-1 text-center text-[10px] font-bold text-teal-700">
                  Tap anywhere on the screen once to enable the voice coach 🔊
                </p>
              )}
            </div>
          )}

          {/* Reset */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !voiceEnabled
                setVoiceEnabled(next)
                if (next) speak('Voice assistant on')
              }}
              aria-pressed={voiceEnabled}
              title={voiceEnabled ? 'Voice assistant on' : 'Voice assistant off'}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold shadow-sm backdrop-blur transition-all hover:border-teal-300 active:scale-95 ${
                voiceEnabled
                  ? 'border-[#D9EFEC] bg-white/80 text-teal-600'
                  : 'border-[#D9EFEC] bg-white/40 text-[#A9A4BE]'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              Voice {voiceEnabled ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => speak('Voice is working')}
              disabled={!voiceEnabled}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D9EFEC] bg-white/80 px-3 py-1 text-[10px] font-bold text-[#8A86A0] shadow-sm backdrop-blur transition-all hover:border-teal-300 hover:text-teal-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSpeaking ? (
                <span className="h-2 w-2 animate-ping rounded-full bg-teal-500" />
              ) : (
                <Volume2 className="h-3 w-3" strokeWidth={2.2} />
              )}
              {isSpeaking ? 'Speaking…' : 'Test voice'}
            </button>
            {exercise.type !== 'tracking' && (
              <button
                type="button"
                onClick={resetDetectors}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D9EFEC] bg-white/80 px-3 py-1 text-[10px] font-bold text-[#8A86A0] shadow-sm backdrop-blur transition-all hover:border-teal-300 hover:text-teal-600 active:scale-95"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
                Reset
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Error banner — centered overlay, never clipped */}
      {error && (
        <div className="absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 px-4">
          <div className="animate-fade-up mx-auto max-w-md rounded-[18px] border border-red-200 bg-red-50/95 p-3.5 text-center shadow-lg shadow-red-500/10 backdrop-blur">
            <p className="text-[12px] font-medium leading-relaxed text-red-600">{error}</p>
            <button
              type="button"
              onClick={retryCamera}
              className="mt-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-red-500/30 transition-transform active:scale-95"
            >
              Retry Camera
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
