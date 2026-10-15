import { useCallback, useEffect, useRef, useState } from 'react'

const SENSITIVITY = 1.2
const EMAIL = 'ghost@tsushima.jp'
const NARRATIVE =
  'The wind carries no name. Honor is a weight; so is the blade. Will you walk the path of the Ghost?'

const navigation = ['Legend', 'Arsenal', 'Stances', 'Island']
const actions = ['Draw the Blade', 'Meet the Samurai', 'Explore the Island', 'Choose Your Stance']

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

function useTypewriter(text: string, speed = 38, startDelay = 900) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let characterIndex = 0
    let intervalId: number | undefined
    setDisplayed('')
    setDone(false)

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        characterIndex += 1
        setDisplayed(text.slice(0, characterIndex))

        if (characterIndex >= text.length) {
          window.clearInterval(intervalId)
          setDone(true)
        }
      }, speed)
    }, startDelay)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [text, speed, startDelay])

  return { displayed, done }
}

function HankoMark() {
  return (
    <span className="hanko-mark" aria-hidden="true">
      <span>対</span>
      <span>馬</span>
    </span>
  )
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="4" y="1" width="6.5" height="7.5" rx="0.75" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="3.5" width="6.5" height="7.5" rx="0.75" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const targetTimeRef = useRef(0)
  const displayedTimeRef = useRef(0)
  const seekingRef = useRef(false)
  const seekQueuedRef = useRef(false)
  const previousXRef = useRef<number | null>(null)
  const hintDismissedRef = useRef(false)
  const copiedTimeoutRef = useRef<number | undefined>(undefined)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [actionsVisible, setActionsVisible] = useState(false)
  const [hintVisible, setHintVisible] = useState(true)
  const [copied, setCopied] = useState(false)
  const { displayed, done } = useTypewriter(NARRATIVE)

  const queueSeek = useCallback(() => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    if (seekingRef.current) {
      seekQueuedRef.current = true
      return
    }

    const nextTime = clamp(displayedTimeRef.current, 0, video.duration)
    if (Math.abs(video.currentTime - nextTime) < 0.01) return

    seekingRef.current = true
    seekQueuedRef.current = false
    video.currentTime = nextTime
  }, [])

  const scrubFromX = useCallback((currentX: number, isMouseMovement: boolean) => {
    if (isMouseMovement && !hintDismissedRef.current) {
      hintDismissedRef.current = true
      setHintVisible(false)
    }

    const previousX = previousXRef.current
    previousXRef.current = currentX
    if (previousX === null) return

    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    const delta = currentX - previousX
    const timeDelta = (delta / window.innerWidth) * SENSITIVITY * video.duration
    targetTimeRef.current = clamp(targetTimeRef.current + timeDelta, 0, video.duration)
  }, [])

  const scrubFromScroll = useCallback((deltaY: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return

    targetTimeRef.current = clamp(
      targetTimeRef.current + (deltaY / window.innerHeight) * SENSITIVITY * video.duration,
      0,
      video.duration,
    )
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => scrubFromX(event.clientX, true)
    const handleWheel = (event: WheelEvent) => scrubFromScroll(event.deltaY)
    const handleTouchStart = (event: TouchEvent) => {
      previousXRef.current = event.touches[0]?.clientX ?? null
    }
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) scrubFromX(touch.clientX, false)
    }
    const resetPointer = () => {
      previousXRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('mouseleave', resetPointer)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', resetPointer, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mouseleave', resetPointer)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', resetPointer)
    }
  }, [scrubFromScroll, scrubFromX])

  useEffect(() => {
    let frameId: number

    const animate = () => {
      const video = videoRef.current
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const targetTime = clamp(targetTimeRef.current, 0, video.duration)
        const difference = targetTime - displayedTimeRef.current
        displayedTimeRef.current += difference * 0.12

        if (Math.abs(difference) < 0.004) {
          displayedTimeRef.current = targetTime
        }

        queueSeek()
      }

      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [queueSeek])

  useEffect(() => {
    const timer = window.setTimeout(() => setActionsVisible(true), 600)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current)
    }
  }, [])

  const handleMetadata = () => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    const openingFrame = Math.min(0.08, video.duration)
    targetTimeRef.current = openingFrame
    displayedTimeRef.current = openingFrame
    video.currentTime = openingFrame
  }

  const handleSeeked = () => {
    seekingRef.current = false
    if (seekQueuedRef.current || Math.abs(targetTimeRef.current - displayedTimeRef.current) > 0.01) {
      seekQueuedRef.current = false
      window.requestAnimationFrame(queueSeek)
    }
  }

  const handleCopy = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(EMAIL).catch(() => undefined)
    }

    setCopied(true)
    if (copiedTimeoutRef.current) window.clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500)
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <main className="page-shell">
      <div className="cinematic-fallback" aria-hidden="true" />
      <video
        ref={videoRef}
        className={`background-video ${videoReady ? 'is-ready' : ''}`}
        src="/ghost.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onLoadedMetadata={handleMetadata}
        onCanPlay={() => setVideoReady(true)}
        onError={() => setVideoReady(false)}
        onSeeked={handleSeeked}
      />

      <div className="video-overlay vignette-overlay" aria-hidden="true" />
      <div className="video-overlay bottom-overlay" aria-hidden="true" />
      <div className="video-overlay grain-overlay" aria-hidden="true" />

      <nav className="site-nav fixed top-0 z-10 flex w-full items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <a className="brand-lockup" href="#top" aria-label="Ghost of Tsushima home">
          <HankoMark />
          <span className="brand-wordmark text-[16px] sm:text-[19px]">GHOST OF TSUSHIMA</span>
        </a>

        <div className="hidden items-center gap-4 md:flex">
          {navigation.map((item, index) => (
            <span className="nav-item-wrap" key={item}>
              <a className="desktop-nav-link" href={`#${item.toLowerCase()}`}>
                {item}
              </a>
              {index < navigation.length - 1 && <span className="nav-separator">·</span>}
            </span>
          ))}
        </div>

        <a className="journey-cta hidden md:inline-flex" href="#journey">
          Begin the Journey
        </a>

        <button
          className={`hamburger flex md:hidden ${mobileMenuOpen ? 'is-open' : ''}`}
          type="button"
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <aside className={`mobile-menu fixed inset-0 z-9 flex md:hidden ${mobileMenuOpen ? 'is-open' : ''}`} aria-hidden={!mobileMenuOpen}>
        <div className="mobile-menu-inner">
          {navigation.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={closeMobileMenu}>
              {item}
            </a>
          ))}
          <a className="mobile-menu-cta" href="#journey" onClick={closeMobileMenu}>
            Begin the Journey
          </a>
        </div>
      </aside>

      <section id="top" className="hero-section relative z-2 flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:px-12 md:pb-16">
        <div className="vertical-accent hidden md:flex" aria-hidden="true">
          <span className="vertical-line" />
          <span>誉れを胸に、影となれ</span>
        </div>

        <div className="hero-content relative z-10 max-w-xl">
          <p className="intro-label pointer-events-none mb-4 select-none">
            Tsushima Island, 1274
            <br />
            The Way of the Ghost
          </p>

          <h1 className="hero-title">
            <span className="title-line title-line-first">GHOST</span>
            <span className="title-line title-line-second">OF TSUSHIMA</span>
          </h1>

          <p className="typewriter-copy mt-5 mb-6">
            {displayed}
            {!done && <span className="typewriter-cursor" aria-hidden="true" />}
          </p>

          <div className={`action-pills flex flex-wrap gap-y-1 ${actionsVisible ? 'is-visible' : ''}`}>
            {actions.map((action) => (
              <button className="action-pill bone-pill" type="button" key={action}>
                {action}
              </button>
            ))}
            <button className="action-pill order-pill" type="button" onClick={handleCopy} aria-label="Copy ghost@tsushima.jp">
              {copied ? (
                'Copied'
              ) : (
                <>
                  <span>
                    Join the Order: <span className="email-link">{EMAIL}</span>
                  </span>
                  <CopyIcon />
                </>
              )}
            </button>
          </div>
        </div>

        <div className={`scrub-hint hidden md:flex ${hintVisible ? '' : 'is-hidden'}`} aria-hidden="true">
          <span>Move your cursor to draw the blade</span>
          <span className="arrow-line">
            <i>‹</i>
            <b />
            <i>›</i>
          </span>
        </div>
      </section>
    </main>
  )
}
