import { useCallback, useEffect, useRef, useState } from 'react'

const TRANSITION_FRAMES = 3
const DEFAULT_MIN_MOTION_RANGE = 30

export function useRepCounter(repDetection, { onRepComplete } = {}) {
  const [goodReps, setGoodReps] = useState(0)
  const [badReps, setBadReps] = useState(0)
  const [pulseCount, setPulseCount] = useState(0)
  const configRef = useRef(repDetection)
  const onRepCompleteRef = useRef(onRepComplete)
  const stateRef = useRef({
    phase: 'up',
    downFrames: 0,
    upFrames: 0,
    maxAngle: null,
    minAngle: null,
    upPeak: null,
    cycleGoodFrames: 0,
    cycleBadFrames: 0,
    cycleMissingFrames: 0
  })

  useEffect(() => {
    configRef.current = repDetection
  }, [repDetection])

  useEffect(() => {
    onRepCompleteRef.current = onRepComplete
  }, [onRepComplete])

  const reset = useCallback(() => {
    stateRef.current = {
      phase: 'up',
      downFrames: 0,
      upFrames: 0,
      maxAngle: null,
      minAngle: null,
      upPeak: null,
      cycleGoodFrames: 0,
      cycleBadFrames: 0,
      cycleMissingFrames: 0
    }
    setGoodReps(0)
    setBadReps(0)
    setPulseCount(0)
  }, [])

  const classifyRep = useCallback((state) => {
    const config = configRef.current || {}
    const { cycleGoodFrames, cycleBadFrames, cycleMissingFrames, minAngle, upPeak } = state
    const total = cycleGoodFrames + cycleBadFrames + cycleMissingFrames

    const scoringDownAngle = config.scoringDownAngle ?? 0
    const scoringUpAngle = config.scoringUpAngle ?? 180
    const reachedDown = minAngle != null && minAngle <= scoringDownAngle
    const reachedUp = upPeak != null && upPeak >= scoringUpAngle

    let classification
    if (cycleMissingFrames > total / 2) {
      classification = 'bad'
    } else if (!reachedDown || !reachedUp) {
      classification = 'bad'
    } else {
      classification = cycleGoodFrames > cycleBadFrames ? 'good' : 'bad'
    }

    const correctPct = total > 0 ? Math.round((cycleGoodFrames / total) * 100) : 0
    console.log(
      `[repCounter] ${classification.toUpperCase()} rep | correct form ${correctPct}% | ` +
        `${cycleGoodFrames} good, ${cycleBadFrames} bad, ${cycleMissingFrames} missing frames | ` +
        `min ${minAngle != null ? Math.round(minAngle) : '-'}deg, peak ${upPeak != null ? Math.round(upPeak) : '-'}deg`
    )

    if (classification === 'good') {
      setGoodReps((n) => n + 1)
      setPulseCount((n) => n + 1)
    } else {
      setBadReps((n) => n + 1)
    }

    if (onRepCompleteRef.current) {
      onRepCompleteRef.current({ classification })
    }
  }, [])

  const updateFrame = useCallback(
    (actualAngle, overallStatus) => {
      const config = configRef.current
      if (!config) return

      const state = stateRef.current
      const isCorrect = overallStatus === 'correct'
      const minMotionRange = config.minMotionRange ?? DEFAULT_MIN_MOTION_RANGE

      if (actualAngle != null) {
        const { downThreshold, upThreshold } = config

        if (state.phase === 'up') {
          state.maxAngle =
            state.maxAngle == null ? actualAngle : Math.max(state.maxAngle, actualAngle)
          state.upPeak = state.upPeak == null ? actualAngle : Math.max(state.upPeak, actualAngle)

          const droppedRelative = state.maxAngle - actualAngle >= minMotionRange
          const crossedAbsDown = state.maxAngle >= upThreshold && actualAngle <= downThreshold
          state.downFrames = droppedRelative || crossedAbsDown ? state.downFrames + 1 : 0

          if (state.downFrames >= TRANSITION_FRAMES) {
            console.log(
              `[repCounter] Down phase started at angle ${Math.round(actualAngle)}deg ` +
                `(max ${Math.round(state.maxAngle)}deg)`
            )
            state.phase = 'down'
            state.downFrames = 0
            state.upPeak = state.maxAngle
            state.minAngle = actualAngle
            state.cycleGoodFrames = 0
            state.cycleBadFrames = 0
            state.cycleMissingFrames = 0
          }
        } else {
          state.minAngle =
            state.minAngle == null ? actualAngle : Math.min(state.minAngle, actualAngle)

          const roseRelative = actualAngle - state.minAngle >= minMotionRange
          const crossedAbsUp = state.minAngle <= downThreshold && actualAngle >= upThreshold
          state.upFrames = roseRelative || crossedAbsUp ? state.upFrames + 1 : 0

          if (state.upFrames >= TRANSITION_FRAMES) {
            state.phase = 'up'
            state.upFrames = 0
            state.maxAngle = actualAngle
            state.upPeak = actualAngle
            console.log(
              `[repCounter] Cycle complete: returned to up position at angle ${Math.round(actualAngle)}deg`
            )
            classifyRep(state)
          }
        }
      }

      if (state.phase === 'down') {
        if (actualAngle == null) {
          state.cycleMissingFrames++
        } else if (isCorrect) {
          state.cycleGoodFrames++
        } else {
          state.cycleBadFrames++
        }
      }
    },
    [classifyRep]
  )

  return { goodReps, badReps, pulseCount, reset, updateFrame }
}