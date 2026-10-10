import { useEffect, useRef } from 'react'
import type { FrameInfo, Projected } from '../three/blockScene'
import './callouts.css'

/** Выноска — подпись, у которой линия растёт из точки на самом блоке и
 *  заходит под заголовок подписи как подчёркивание, по-чертёжному. */
export interface Callout {
  id: string
  chapter: number
  kind?: 'point' | 'dim'
  /** точка блока в метрах: длина ±0.3, высота ±0.15, толщина ±0.1 */
  anchor: [number, number, number]
  anchorB?: [number, number, number]
  /** где стоит подпись: доли ширины и высоты экрана */
  at?: [number, number]
  side?: 'left' | 'right' | 'up'
  /** для размерной: на сколько пикселей отнести линию от ребра (знак — сторона) */
  offset?: number
  title: string | ((f: FrameInfo) => string)
  text?: string
  href?: string
  delay?: number
}

type Subscribe = (fn: (f: FrameInfo) => void) => () => void

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

export function Callouts({ items, subscribe }: { items: Callout[]; subscribe: Subscribe }) {
  const paths = useRef<(SVGPathElement | null)[]>([])
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const titles = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    const a: Projected = { x: 0, y: 0, depth: 0 }
    const b: Projected = { x: 0, y: 0, depth: 0 }
    // ширину заголовка меряем один раз — подчёркивание должно быть ровно под ним
    const widths = new Map<string, number>()
    let measuredFor = 0

    return subscribe((f) => {
      if (measuredFor !== f.width) {
        widths.clear()
        measuredFor = f.width
      }
      const introGate = smooth(clamp01((f.intro - 0.75) / 0.25))

      items.forEach((c, i) => {
        const path = paths.current[i]
        const label = labels.current[i]
        const dot = dots.current[i]
        if (!path || !label) return

        const w = f.weights[c.chapter] ?? 0
        let reveal = smooth(clamp01((w - 0.28 - (c.delay ?? 0)) / 0.32))
        if (c.chapter === 0) reveal *= introGate

        if (reveal <= 0.001) {
          path.style.strokeDashoffset = '1'
          label.style.opacity = '0'
          if (dot) dot.style.opacity = '0'
          return
        }

        const title = titles.current[i]
        if (title && typeof c.title === 'function') {
          const next = c.title(f)
          if (title.textContent !== next) {
            title.textContent = next
            widths.delete(c.id)
          }
        }
        const side = c.side ?? 'right'
        label.className = c.kind === 'dim' ? 'callout callout--dim' : `callout callout--${side}`
        let tw = widths.get(c.id)
        if (tw === undefined) {
          tw = title?.offsetWidth ?? 80
          widths.set(c.id, tw)
        }

        f.project(c.anchor[0], c.anchor[1], c.anchor[2], a, c.chapter)
        let lx: number
        let ly: number

        if (c.kind === 'dim' && c.anchorB) {
          f.project(c.anchorB[0], c.anchorB[1], c.anchorB[2], b, c.chapter)
          const dx = b.x - a.x
          const dy = b.y - a.y
          const len = Math.hypot(dx, dy) || 1
          const off = c.offset ?? 32
          const nx = (-dy / len) * off
          const ny = (dx / len) * off
          const ax = a.x + nx
          const ay = a.y + ny
          const bx = b.x + nx
          const by = b.y + ny
          const tx = (-dy / len) * 5
          const ty = (dx / len) * 5
          path.setAttribute(
            'd',
            `M${a.x} ${a.y}L${ax + nx * 0.2} ${ay + ny * 0.2}` +
              `M${b.x} ${b.y}L${bx + nx * 0.2} ${by + ny * 0.2}` +
              `M${ax} ${ay}L${bx} ${by}` +
              `M${ax - tx} ${ay - ty}L${ax + tx} ${ay + ty}` +
              `M${bx - tx} ${by - ty}L${bx + tx} ${by + ty}`,
          )
          lx = (ax + bx) / 2 + (nx / Math.abs(off)) * 14
          ly = (ay + by) / 2 + (ny / Math.abs(off)) * 14
          if (dot) dot.style.opacity = '0'
        } else {
          const at = c.at ?? [0.5, 0.5]
          lx = at[0] * f.width
          ly = at[1] * f.height
          // линия: от точки на блоке к началу подписи, затем под заголовком
          if (side === 'left') {
            path.setAttribute('d', `M${a.x} ${a.y}L${lx} ${ly}L${lx - tw - 6} ${ly}`)
          } else if (side === 'right') {
            path.setAttribute('d', `M${a.x} ${a.y}L${lx} ${ly}L${lx + tw + 6} ${ly}`)
          } else {
            path.setAttribute('d', `M${a.x} ${a.y}L${lx} ${ly}M${lx - tw / 2 - 4} ${ly}L${lx + tw / 2 + 4} ${ly}`)
          }
          if (dot) {
            dot.setAttribute('cx', String(a.x))
            dot.setAttribute('cy', String(a.y))
            dot.style.opacity = String(Math.min(1, reveal * 3))
          }
        }

        path.style.strokeDashoffset = String(1 - reveal)
        const textIn = smooth(clamp01((reveal - 0.5) / 0.5))
        label.style.opacity = String(textIn)
        label.style.transform = `translate(${lx}px, ${ly}px) translateY(${(1 - textIn) * 5}px)`
      })
    })
  }, [items, subscribe])

  return (
    <div className="callouts" aria-hidden="true">
      <svg className="callouts__svg">
        {items.map((c, i) => (
          <g key={c.id}>
            <path
              ref={(el) => {
                paths.current[i] = el
              }}
              pathLength={1}
              className="callouts__line"
            />
            {c.kind !== 'dim' && (
              <circle
                ref={(el) => {
                  dots.current[i] = el
                }}
                r="3"
                className="callouts__dot"
              />
            )}
          </g>
        ))}
      </svg>

      {items.map((c, i) => {
        const body = (
          <>
            <b
              className="callout__title mono"
              ref={(el) => {
                titles.current[i] = el
              }}
            >
              {typeof c.title === 'function' ? '' : c.title}
            </b>
            {c.text && <span className="callout__text">{c.text}</span>}
          </>
        )
        return (
          <div
            key={c.id}
            className="callout"
            ref={(el) => {
              labels.current[i] = el
            }}
          >
            {c.href ? (
              <a href={c.href} className="callout__link">
                {body}
              </a>
            ) : (
              body
            )}
          </div>
        )
      })}
    </div>
  )
}
