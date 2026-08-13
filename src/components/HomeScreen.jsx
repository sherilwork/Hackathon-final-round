"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  LogOut,
  Move,
  PersonStanding,
  Play,
  Repeat,
  Zap,
} from 'lucide-react'
import LogoMark from './LogoMark'
import { exerciseRules } from '../config/exerciseRules'

// Exercises shown in the bottom tab bar (Plank and Warrior were removed from the tabs).
const TAB_EXERCISE_IDS = ['squat', 'bicepCurl', 'bodyMotion']

// Short labels for the bottom tab bar (full names can be long, e.g. Warrior 2).
const TAB_LABELS = {
  plank: 'Plank',
  squat: 'Squat',
  bicepCurl: 'Curl',
  virabhadrasana: 'Warrior',
  bodyMotion: 'Body Motion',
}

const TAB_ICONS = {
  plank: Activity,
  squat: PersonStanding,
  bicepCurl: Dumbbell,
  virabhadrasana: Flame,
  bodyMotion: Move,
}

// Demo stats shown on the dashboard.
const STATS = [
  { id: 'workouts', label: 'Workouts', value: '12', unit: 'this week', icon: CalendarCheck },
  { id: 'calories', label: 'Calories', value: '4.8k', unit: 'kcal burned', icon: Flame },
  { id: 'streak', label: 'Streak', value: '7', unit: 'days', icon: Zap, featured: true },
  { id: 'minutes', label: 'Minutes', value: '240', unit: 'active', icon: Clock },
]

export default function HomeScreen() {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(TAB_EXERCISE_IDS[0])
  const exercise = exerciseRules[selectedId]

  const startWorkout = () => router.push(`/workout?exercise=${selectedId}`)

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#F6FAF9] text-[#35324A]">
      <div className="relative z-10 mx-auto w-full max-w-[430px] px-5 pb-[140px] pt-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl shadow-md shadow-teal-500/25">
              <LogoMark className="h-10 w-10" />
            </div>
            <span className="font-headline text-[20px] font-bold italic tracking-tight text-teal-600">
              FITLAB
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-full border border-[#D9EFEC] bg-white px-3.5 py-2 text-xs font-semibold text-[#8A86A0] shadow-sm transition-colors hover:border-teal-300 hover:text-teal-600"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Log out
          </Link>
        </header>

        {/* Banner */}
        <section className="relative mt-6 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#2DD4BF] via-[#14B8A6] to-[#0B8A7C] px-6 pb-7 pt-6 text-white shadow-xl shadow-teal-500/25">
          <div className="dotted-pattern absolute -left-6 -top-6 h-24 w-24 opacity-25" />
          <div className="animate-float absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <Dumbbell
            className="absolute -bottom-6 -right-5 h-28 w-28 -rotate-12 text-white/10"
            strokeWidth={1.5}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur">
              <Zap className="h-3 w-3" /> Posture Coach
            </span>
            <h1 className="mt-4 font-headline text-[30px] font-bold italic leading-[1.08] tracking-tight">
              Ready to crush
              <br />
              today&apos;s workout?
            </h1>
            <p className="mt-2.5 max-w-[260px] text-[13px] leading-relaxed text-teal-50/90">
              Your camera watches your form and guides you through every rep.
            </p>
            <button
              type="button"
              onClick={startWorkout}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-teal-700 shadow-lg shadow-teal-900/20 transition-transform hover:shadow-teal-900/30 active:scale-[0.97]"
            >
              <Play className="h-4 w-4 fill-teal-700" /> Start Workout
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-7">
          <div className="flex items-end justify-between">
            <h2 className="font-headline text-[17px] font-bold tracking-tight text-[#2E2A47]">
              Your stats
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A9A4BE]">
              This week
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {STATS.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.id}
                  className={`rounded-[20px] border p-4 shadow-sm transition-transform active:scale-[0.98] ${
                    stat.featured
                      ? 'border-transparent bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-teal-500/25'
                      : 'border-[#D9EFEC] bg-white'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      stat.featured ? 'bg-white/20' : 'bg-[#EAF9F7] text-teal-600'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                  </div>
                  <p
                    className={`mt-3 font-headline text-[24px] font-bold leading-none ${
                      stat.featured ? 'text-white' : 'text-[#2E2A47]'
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={`mt-1 text-[12px] font-semibold ${
                      stat.featured ? 'text-teal-50' : 'text-[#35324A]'
                    }`}
                  >
                    {stat.label}
                  </p>
                  <p className={`text-[11px] ${stat.featured ? 'text-teal-100/80' : 'text-[#A9A4BE]'}`}>
                    {stat.unit}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Exercise library */}
        <section className="mt-7">
          <div className="flex items-end justify-between">
            <h2 className="font-headline text-[17px] font-bold tracking-tight text-[#2E2A47]">
              Workout library
            </h2>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A9A4BE]">
              Tap to select
            </span>
          </div>

          <div className="mt-3 rounded-[24px] border border-[#D9EFEC] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9F7] text-teal-600">
                {selectedId === 'bodyMotion' ? (
                  <Move className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Dumbbell className="h-5 w-5" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-headline text-[18px] font-bold tracking-tight text-[#2E2A47]">
                  {exercise.name}
                </h3>
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-600">
                  {exercise.type === 'hold' ? (
                    <Clock className="h-3 w-3" />
                  ) : exercise.type === 'rep' ? (
                    <Repeat className="h-3 w-3" />
                  ) : (
                    <Move className="h-3 w-3" />
                  )}
                  {exercise.type === 'hold' ? 'Hold' : exercise.type === 'rep' ? 'Reps' : 'Tracking'}
                </span>
              </div>
            </div>

            <p className="mt-3.5 text-[13px] leading-relaxed text-[#8A86A0]">{exercise.description}</p>

            <ul className="mt-4 space-y-2 border-t border-[#F0F7F6] pt-4">
              {exercise.checks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-2.5 text-[13px] font-medium text-[#5A5672]"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-500" strokeWidth={2} />
                  {check.label}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={startWorkout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-teal-500 to-teal-600 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-teal-500/30 transition-transform active:scale-[0.98]"
            >
              Start {TAB_LABELS[selectedId] || exercise.name}
              <Play className="h-4 w-4 fill-white" />
            </button>
          </div>
        </section>
      </div>

      {/* Bottom exercise tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto w-full max-w-[430px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-3 gap-1 rounded-[26px] border border-[#D9EFEC] bg-white/90 p-1.5 shadow-[0_-6px_30px_rgba(20,184,166,0.14)] backdrop-blur-xl">
            {TAB_EXERCISE_IDS.map((id) => {
              // Fall back to a generic icon/label so the tab bar never crashes
              // if a new exercise is added to exerciseRules without entries here.
              const Icon = TAB_ICONS[id] ?? Activity
              const label = TAB_LABELS[id] ?? exerciseRules[id].name
              const active = id === selectedId
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-[20px] py-2.5 transition-all ${
                    active
                      ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-md shadow-teal-500/30'
                      : 'text-[#8A86A0] hover:bg-[#EAF9F7] hover:text-teal-600'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  <span className={`text-[11px] font-semibold ${active ? 'text-white' : ''}`}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
