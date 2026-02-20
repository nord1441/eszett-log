import { useState, useEffect } from 'react'

const R = 12
const CENTER = 18
const DOT_R = 3

export function ScrollIndicator() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const angle = -Math.PI / 2 + progress * Math.PI * 2
  const cx = CENTER + R * Math.cos(angle)
  const cy = CENTER + R * Math.sin(angle)

  return (
    <div className="scroll-indicator" aria-hidden="true">
      <svg width={CENTER * 2} height={CENTER * 2}>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={DOT_R}
          fill="var(--accent)"
        />
      </svg>
    </div>
  )
}
