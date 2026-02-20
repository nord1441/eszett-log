import { useRef, useEffect, useState, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const prevKey = useRef(location.key)

  useEffect(() => {
    if (location.key !== prevKey.current) {
      prevKey.current = location.key
      setPhase('exit')
    }
  }, [location.key])

  useEffect(() => {
    if (phase === 'exit') {
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setPhase('enter')
        window.scrollTo(0, 0)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [phase, children])

  // Update children immediately when phase is enter and children change
  // (e.g., data loading within the same route)
  useEffect(() => {
    if (phase === 'enter') {
      setDisplayChildren(children)
    }
  }, [children, phase])

  return (
    <div className={`page-transition page-transition--${phase}`}>
      {displayChildren}
    </div>
  )
}
