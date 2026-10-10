import { useCallback, useEffect, useRef, useState } from 'react'
import { createBlockScene } from '../three/blockScene'
import type { FrameInfo, SceneHandle, SceneOptions } from '../three/blockScene'
import { Callouts } from './Callouts'
import type { Callout } from './Callouts'
import './scroll-stage.css'

export interface Chapter {
  id: string
  label: string
  eyebrow?: string
  title?: string
  /** с какой стороны стоит заголовок — противоположной блоку */
  side?: 'left' | 'right'
}

export type SceneFactory = (canvas: HTMLCanvasElement, opts: SceneOptions) => SceneHandle

type FrameFn = (f: FrameInfo) => void

/** Сцена главной: блок закреплён на экране, по мере прокрутки трека меняет позу,
 *  а из него растут выноски текущей главы. */
export function ScrollStage({
  trackId,
  chapters,
  callouts,
  createScene = createBlockScene,
}: {
  trackId: string
  chapters: Chapter[]
  callouts: Callout[]
  createScene?: SceneFactory
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef<HTMLSpanElement>(null)
  const sizeRef = useRef<HTMLSpanElement>(null)
  const densityRef = useRef<HTMLSpanElement>(null)
  const headsRef = useRef<(HTMLDivElement | null)[]>([])
  const listeners = useRef(new Set<FrameFn>())
  const [active, setActive] = useState(0)
  const [ready, setReady] = useState(false)

  const subscribe = useCallback((fn: FrameFn) => {
    listeners.current.add(fn)
    return () => {
      listeners.current.delete(fn)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let handle: SceneHandle
    try {
      handle = createScene(canvas, {
        mode: 'scroll',
        chapters: chapters.length,
        onReady: () => setReady(true),
        onTelemetry: (t) => {
          if (angleRef.current) angleRef.current.textContent = `θ ${String(t.angle).padStart(3, '0')}°`
          if (sizeRef.current) sizeRef.current.textContent = `600×300×${t.thickness}`
          if (densityRef.current) densityRef.current.textContent = t.density
          setActive((prev) => (prev === t.chapter ? prev : t.chapter))
        },
        onFrame: (f) => {
          // заголовки глав живут ровно столько, сколько их глава в кадре
          headsRef.current.forEach((el, i) => {
            if (!el) return
            const w = f.weights[i] ?? 0
            const v = Math.min(1, Math.max(0, (w - 0.3) / 0.3))
            el.style.opacity = String(v)
            el.style.transform = `translateY(${(1 - v) * 10}px)`
          })
          listeners.current.forEach((fn) => fn(f))
        },
      })
    } catch {
      return
    }

    const track = document.getElementById(trackId)
    const onScroll = () => {
      if (!track) return
      const top = track.offsetTop
      const span = track.offsetHeight - window.innerHeight
      handle.setProgress(span > 0 ? (window.scrollY - top) / span : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      handle.dispose()
    }
  }, [trackId, chapters.length, createScene])

  return (
    <div className="stage" aria-hidden="true">
      <canvas ref={canvasRef} className={ready ? 'stage__canvas is-ready' : 'stage__canvas'} />

      <Callouts items={callouts} subscribe={subscribe} />

      {chapters.map((c, i) =>
        c.title ? (
          <div
            key={c.id}
            className={c.side === 'right' ? 'chapter-head chapter-head--right' : 'chapter-head'}
            ref={(el) => {
              headsRef.current[i] = el
            }}
          >
            {c.eyebrow && <p className="eyebrow">{c.eyebrow}</p>}
            <h2 className="chapter-head__title">{c.title}</h2>
          </div>
        ) : null,
      )}

      <div className="telemetry mono">
        <span ref={angleRef}>θ 000°</span>
        <span className="telemetry__sep">·</span>
        <span ref={densityRef}>D500</span>
        <span className="telemetry__sep">·</span>
        <span ref={sizeRef}>600×300×200</span>
      </div>

      <nav className="chapter-rail mono">
        {chapters.map((c, i) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className={i === active ? 'chapter-rail__item is-active' : 'chapter-rail__item'}
          >
            <span className="chapter-rail__num">{String(i + 1).padStart(2, '0')}</span>
            <span className="chapter-rail__label">{c.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
