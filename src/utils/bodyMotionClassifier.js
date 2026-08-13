import { LANDMARKS } from './landmarks'

const UP_MARGIN_RATIO = 0.12
const SIT_HIP_TO_KNEE_RATIO = 0.6
const LEG_FOOT_UP_RATIO = 0.6
const LEG_KNEE_RAISE_RATIO = 0.35

export const MOTION_LABELS = {
  'hands-up': 'Hands are up',
  'right-hand-up': 'Right hand is up',
  'left-hand-up': 'Left hand is up',
  sitting: 'Person is sitting',
  'legs-up': 'Both legs are up',
  'right-leg-up': 'Right leg is up',
  'left-leg-up': 'Left leg is up',
  standing: 'Hands are down',
}

export function classifyBodyMotion(landmarks) {
  if (!landmarks || landmarks.length === 0) return null

  const ls = landmarks[LANDMARKS.LEFT_SHOULDER]
  const rs = landmarks[LANDMARKS.RIGHT_SHOULDER]
  const lh = landmarks[LANDMARKS.LEFT_HIP]
  const rh = landmarks[LANDMARKS.RIGHT_HIP]
  const lw = landmarks[LANDMARKS.LEFT_WRIST]
  const rw = landmarks[LANDMARKS.RIGHT_WRIST]
  const lk = landmarks[LANDMARKS.LEFT_KNEE]
  const rk = landmarks[LANDMARKS.RIGHT_KNEE]
  const la = landmarks[LANDMARKS.LEFT_ANKLE]
  const ra = landmarks[LANDMARKS.RIGHT_ANKLE]

  if (!ls || !rs || !lh || !rh || !lw || !rw || !lk || !rk || !la || !ra) return null

  const torsoY = (Math.abs(ls.y - lh.y) + Math.abs(rs.y - rh.y)) / 2
  const upMargin = torsoY * UP_MARGIN_RATIO

  const rightUp = rs.y - rw.y > upMargin
  const leftUp = ls.y - lw.y > upMargin

  if (rightUp || leftUp) {
    if (rightUp && leftUp) return 'hands-up'
    return rightUp ? 'right-hand-up' : 'left-hand-up'
  }

  // Sitting: BOTH hips dropped to near knee height. A single high knee raise
  // must NOT be called sitting, and a chair sit must still be detected even
  // though its hip-knee-ankle angle reads ~180deg.
  const sitLimit = torsoY * SIT_HIP_TO_KNEE_RATIO
  const bothHipsLow =
    Math.abs(lh.y - lk.y) < sitLimit && Math.abs(rh.y - rk.y) < sitLimit

  if (bothHipsLow) return 'sitting'

  // Leg lifted — foot raised up to/near the knee, or knee tucked up to the hip.
  const rightLegUp =
    ra.y - rk.y < torsoY * LEG_FOOT_UP_RATIO || rk.y - rh.y < torsoY * LEG_KNEE_RAISE_RATIO
  const leftLegUp =
    la.y - lk.y < torsoY * LEG_FOOT_UP_RATIO || lk.y - lh.y < torsoY * LEG_KNEE_RAISE_RATIO

  if (rightLegUp || leftLegUp) {
    if (rightLegUp && leftLegUp) return 'legs-up'
    return rightLegUp ? 'right-leg-up' : 'left-leg-up'
  }

  return 'standing'
}