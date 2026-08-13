export default function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#logoGrad)" />
      <rect x="12" y="8.5" width="6" height="23.5" rx="3" fill="#fff" />
      <rect x="12" y="8.5" width="17" height="6" rx="3" fill="#fff" />
      <rect x="12" y="18.5" width="13.5" height="6" rx="3" fill="#fff" />
      <circle cx="30" cy="21.5" r="3.4" fill="#fff" />
    </svg>
  )
}