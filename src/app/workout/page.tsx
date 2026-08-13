import PoseDetector from '../../components/PoseDetector'

export const metadata = {
  title: 'FITLAB — Workout',
  description: 'Real-time posture detection and coaching with FITLAB.',
}

// Accepts an optional ?exercise=id deep link (e.g. from the Home screen tabs).
export default async function WorkoutPage({
  searchParams,
}: {
  // Next 15: duplicate query keys arrive as an array — narrow to a single string.
  searchParams: Promise<{ exercise?: string | string[] }>
}) {
  const { exercise } = await searchParams
  const initialExercise = typeof exercise === 'string' ? exercise : undefined
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#F6FAF9]">
      <PoseDetector initialExercise={initialExercise} />
    </main>
  )
}
