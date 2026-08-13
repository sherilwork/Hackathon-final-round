export const exerciseRules = {
  plank: {
    name: "Plank",
    description: "Body should form a straight line from shoulders to ankles",
    type: "hold",
    checks: [
      {
        id: "backAlignment",
        label: "Back Alignment",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
        idealAngle: 180,
        tolerance: 30,
        isPrimary: true,
        feedbackTooLow: "Hips are dropping - lift your core",
        feedbackTooHigh: "Hips are too high - lower your body"
      },
      {
        id: "elbowSupport",
        label: "Arm Support",
        points: ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        idealAngle: 90,
        tolerance: 35,
        feedbackTooLow: "Adjust elbow position",
        feedbackTooHigh: "Adjust elbow position"
      }
    ]
  },
  squat: {
    name: "Squat",
    description: "Knees should bend to roughly 90 degrees, back should stay upright",
    type: "rep",
    repDetection: { trackCheckId: "kneeAngle", downThreshold: 100, upThreshold: 160, minMotionRange: 30, scoringDownAngle: 100, scoringUpAngle: 160 },
    checks: [
      {
        id: "kneeAngle",
        label: "Knee Bend",
        points: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
        idealAngle: 90,
        tolerance: 45,
        isPrimary: true,
        feedbackTooLow: "Squatting too deep",
        feedbackTooHigh: "Squat lower"
      },
      {
        id: "hipAngle",
        label: "Hip Hinge",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        idealAngle: 90,
        tolerance: 40,
        feedbackTooLow: "Leaning too far forward",
        feedbackTooHigh: "Bend forward slightly at hips"
      },
      {
        id: "backStraightness",
        label: "Back Straightness",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
        idealAngle: 170,
        tolerance: 35,
        feedbackTooLow: "Keep your back straighter",
        feedbackTooHigh: "Keep your back straighter"
      }
    ]
  },
  bicepCurl: {
    name: "Bicep Curl",
    description: "Elbow should stay fixed near torso while forearm curls up and down",
    type: "rep",
    repDetection: { trackCheckId: "elbowAngle", downThreshold: 50, upThreshold: 150, minMotionRange: 30, scoringDownAngle: 80, scoringUpAngle: 150 },
    checks: [
      {
        id: "elbowAngle",
        label: "Elbow Bend",
        points: ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        idealAngle: 90,
        tolerance: 70,
        isPrimary: true,
        feedbackTooLow: "Fully curl the weight up",
        feedbackTooHigh: "Fully extend the arm down"
      },
      {
        id: "upperArmStability",
        label: "Upper Arm Stability",
        points: ["RIGHT_SHOULDER", "LEFT_SHOULDER", "LEFT_ELBOW"],
        idealAngle: 92,
        tolerance: 40,
        feedbackTooLow: "Keep elbow close to your body",
        feedbackTooHigh: "Keep elbow close to your body, don't swing it"
      }
    ]
  },
  bodyMotion: {
    name: "Body Motion",
    description: "Full-body movement tracking — watch your overall posture and fluidity as you move.",
    type: "tracking",
    checks: [
      {
        id: "uprightPosture",
        label: "Overall Posture",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
        idealAngle: 175,
        tolerance: 30,
        isPrimary: true,
        feedbackTooLow: "Stand tall and straighten your back",
        feedbackTooHigh: "Relax — don't arch your back"
      },
      {
        id: "shoulderBalance",
        label: "Balance & Stability",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "RIGHT_HIP"],
        idealAngle: 90,
        tolerance: 30,
        feedbackTooLow: "Center your weight — keep your hips level",
        feedbackTooHigh: "Center your weight — keep your hips level"
      },
      {
        id: "kneeMobility",
        label: "Movement Fluidity",
        points: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
        idealAngle: 90,
        tolerance: 70,
        feedbackTooLow: "Bend your knees for smoother movement",
        feedbackTooHigh: "Extend your knees for smoother movement"
      }
    ]
  },
  virabhadrasana: {
    name: "Virabhadrasana (Warrior 2)",
    description: "Front knee bent ~90deg, back leg straight, arms extended horizontally, torso upright",
    type: "hold",
    checks: [
      {
        id: "frontKneeAngle",
        label: "Front Knee Bend",
        points: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
        idealAngle: 90,
        tolerance: 35,
        isPrimary: true,
        feedbackTooLow: "Front knee bent too much",
        feedbackTooHigh: "Bend front knee more, aim for 90 degrees"
      },
      {
        id: "backLegStraight",
        label: "Back Leg Straightness",
        points: ["RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE"],
        idealAngle: 175,
        tolerance: 25,
        feedbackTooLow: "Straighten your back leg",
        feedbackTooHigh: "Straighten your back leg"
      },
      {
        id: "armExtension",
        label: "Arm Extension",
        points: ["LEFT_ELBOW", "LEFT_SHOULDER", "RIGHT_ELBOW"],
        idealAngle: 180,
        tolerance: 30,
        feedbackTooLow: "Extend both arms to shoulder height",
        feedbackTooHigh: "Extend both arms to shoulder height"
      },
      {
        id: "torsoUpright",
        label: "Torso Alignment",
        points: ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        idealAngle: 90,
        tolerance: 35,
        feedbackTooLow: "Keep torso upright, don't lean forward",
        feedbackTooHigh: "Keep torso upright"
      }
    ]
  }
}
