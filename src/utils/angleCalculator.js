import { LANDMARKS } from './landmarks'

export function calculateAngle(pointA, pointB, pointC) {
  const v1 = {
    x: pointA.x - pointB.x,
    y: pointA.y - pointB.y
  }
  const v2 = {
    x: pointC.x - pointB.x,
    y: pointC.y - pointB.y
  }

  const angle = Math.abs(
    Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y)
  )

  return (angle * 180) / Math.PI
}

export function angleFromPoints(landmarks, pointNames) {
  const [pointA, pointB, pointC] = pointNames.map((name) => landmarks[LANDMARKS[name]])
  if (!pointA || !pointB || !pointC) return null
  return calculateAngle(pointA, pointB, pointC)
}

export function mirrorPoints(pointNames) {
  return pointNames.map((name) => name.replace(/^LEFT_/, 'RIGHT_').replace(/^RIGHT_/, 'LEFT_'))
}
