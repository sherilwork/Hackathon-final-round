"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import LogoMark from './LogoMark'

function HeroIllustration() {
  return (
    <div className="relative h-[148px] w-[148px]">
      <div className="dotted-pattern absolute -left-4 -top-3 h-16 w-16 opacity-70" />
      <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-[#E4F7F5] to-[#CFEFEC]" />
      <svg viewBox="0 0 148 148" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="fitnessGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <g transform="rotate(-45 74 74)">
          <rect x="50" y="70" width="48" height="8" rx="4" fill="#5EEAD4" />
          <rect x="38" y="61" width="12" height="26" rx="6" fill="url(#fitnessGrad)" />
          <rect x="98" y="61" width="12" height="26" rx="6" fill="url(#fitnessGrad)" />
        </g>
      </svg>
    </div>
  )
}

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    router.push('/home')
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#F6FAF9] text-[#35324A]">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6">
        <div className="mt-6 flex items-center gap-3">
          <div className="rounded-2xl shadow-lg shadow-teal-500/30">
            <LogoMark className="h-12 w-12" />
          </div>
          <span className="font-headline text-[26px] font-bold italic tracking-tight text-teal-600">
            FITLAB
          </span>
        </div>

        <div className="relative mt-7">
          <div className="relative z-10 max-w-[240px]">
            <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#2E2A47]">
              Welcome back!
            </h1>
            <p className="mt-1 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 bg-clip-text text-[27px] font-bold leading-snug tracking-tight text-transparent">
              Let&apos;s crush your goals
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[#8A86A0]">
              Log in to continue your fitness journey with FITLAB
            </p>
          </div>
          <div className="absolute -top-2 right-0">
            <HeroIllustration />
          </div>
        </div>

        <form className="mt-9 space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B86A0]"
              strokeWidth={1.8}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[54px] w-full rounded-[18px] border border-[#D9EFEC] bg-white pl-12 pr-4 text-[15px] font-medium text-[#35324A] shadow-sm outline-none transition placeholder:text-[#A9A4BE] focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B86A0]"
              strokeWidth={1.8}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[54px] w-full rounded-[18px] border border-[#D9EFEC] bg-white pl-12 pr-12 text-[15px] font-medium text-[#35324A] shadow-sm outline-none transition placeholder:text-[#A9A4BE] focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B86A0] transition-colors hover:text-teal-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={1.8} />
              )}
            </button>
          </div>
          <div className="text-right">
            <button
              type="button"
              className="text-[13px] font-semibold text-teal-600"
            >
              Forgot Password?
            </button>
          </div>
          <button
            type="submit"
            className="h-[54px] w-full rounded-[18px] bg-gradient-to-r from-teal-500 to-teal-600 text-[16px] font-semibold text-white shadow-lg shadow-teal-500/35 transition-transform active:scale-[0.98]"
          >
            Log In
          </button>
        </form>

        <p className="mt-auto pb-[104px] pt-12 text-center text-[13px] font-medium text-[#8A86A0]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-teal-600">
            Sign Up
          </Link>
        </p>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[190px] overflow-hidden">
        <svg
          className="absolute inset-x-0 bottom-0 h-full w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#EAF9F7"
            d="M0,220 C120,180 240,260 360,230 C480,200 600,160 720,190 C840,220 960,250 1080,230 C1200,210 1320,180 1440,200 L1440,320 L0,320 Z"
          />
        </svg>
        <svg
          className="absolute inset-x-0 bottom-0 h-[75%] w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#D9F3F0"
            d="M0,240 C140,200 260,280 400,250 C540,220 660,190 820,220 C980,250 1100,270 1240,240 C1340,215 1400,225 1440,235 L1440,320 L0,320 Z"
          />
        </svg>
        <svg
          className="absolute inset-x-0 bottom-0 h-[50%] w-full"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#C5EBE7"
            d="M0,250 C160,220 320,290 480,260 C640,230 800,200 960,235 C1120,270 1280,290 1440,260 L1440,320 L0,320 Z"
          />
        </svg>
        <div className="dotted-pattern absolute bottom-3 left-3 h-[52px] w-[52px] opacity-60" />
      </div>
    </div>
  )
}