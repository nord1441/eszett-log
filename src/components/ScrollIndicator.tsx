import { useState, useEffect } from 'react'

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

  return (
    <div className="scroll-indicator" aria-hidden="true">
      <div className="scroll-indicator__track">
        <div
          className="scroll-indicator__dot"
          style={{ top: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
