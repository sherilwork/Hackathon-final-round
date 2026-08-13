import { calculateAngle, mirrorPoints } from './angleCalculator'
import { LANDMARKS } from './landmarks'

export const SIGNIFICANT_EXTRA_DEGREES = 15

export function checkPosture(landmarks, exercise, { mirror = false } = {}) {
  const checks = exercise.checks.map((check) => {
    const [pointAName, pointBName, pointCName] = mirror ? mirrorPoints(check.points) : check.points
    const pointA = landmarks[LANDMARKS[pointAName]]
    const pointB = landmarks[LANDMARKS[pointBName]]
    const pointC = landmarks[LANDMARKS[pointCName]]

    if (!pointA || !pointB || !pointC) {
      return {
        id: check.id,
        label: check.label,
        actualAngle: null,
        status: 'incorrect',
        isPrimary: !!check.isPrimary,
        significantlyOff: true,
        feedback: 'Joint not visible - adjust camera position'
      }
    }

    const actualAngle = calculateAngle(pointA, pointB, pointC)
    const deviation = Math.abs(actualAngle - check.idealAngle)
    const isCorrect = deviation <= check.tolerance
    const significantlyOff = deviation > check.tolerance + SIGNIFICANT_EXTRA_DEGREES

    return {
      id: check.id,
      label: check.label,
      actualAngle: Math.round(actualAngle),
      status: isCorrect ? 'correct' : 'incorrect',
      isPrimary: !!check.isPrimary,
      significantlyOff,
      feedback: isCorrect
        ? null
        : actualAngle < check.idealAngle
          ? check.feedbackTooLow
          : check.feedbackTooHigh
    }
  })

  const significantlyOffCount = checks.filter((check) => check.significantlyOff).length
  const incorrectCount = checks.filter((check) => check.status === 'incorrect').length
  const overallStatus =
    significantlyOffCount > 0 || incorrectCount >= Math.ceil(checks.length / 2)
      ? 'incorrect'
      : 'correct'

  return {
    overallStatus,
    checks
  }
}
