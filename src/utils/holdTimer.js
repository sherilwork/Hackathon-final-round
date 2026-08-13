import { useCallback, useRef, useState } from 'react'

const POSE_LOST_RESET_MS = 2000

export function useHoldTimer() {
  const [currentHold, setCurrentHold] = useState(0)
  const [bestHold, setBestHold] = useState(0)
  const refsRef = useRef({
    holdStart: null,
    accumulated: 0,
    lastPoseTime: null,
    lastDisplayed: -1,
    bestSec: 0
  })

  const reset = useCallback(() => {
    refsRef.current = {
      holdStart: null,
      accumulated: 0,
      lastPoseTime: null,
      lastDisplayed: -1,
      bestSec: 0
    }
    setCurrentHold(0)
    setBestHold(0)
  }, [])

  const updateFrame = useCallback((overallStatus, poseDetected) => {
    const now = performance.now()
    const r = refsRef.current

    if (poseDetected) {
      r.lastPoseTime = now
    } else if (r.lastPoseTime != null && now - r.lastPoseTime > POSE_LOST_RESET_MS) {
      r.holdStart = null
      r.accumulated = 0
    }

    if (overallStatus === 'correct') {
      if (r.holdStart == null) {
        r.holdStart = now
      }
    } else if (r.holdStart != null) {
      r.accumulated += now - r.holdStart
      r.holdStart = null
    }

    const currentMs = r.accumulated + (r.holdStart != null ? now - r.holdStart : 0)
    const currentSec = Math.floor(currentMs / 1000)
    if (currentSec !== r.lastDisplayed) {
      r.lastDisplayed = currentSec
      setCurrentHold(currentSec)
      if (currentSec > r.bestSec) {
        r.bestSec = currentSec
        setBestHold(currentSec)
      }
    }
  }, [])

  return { currentHold, bestHold, reset, updateFrame }
}
