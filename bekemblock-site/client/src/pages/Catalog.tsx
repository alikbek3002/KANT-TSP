import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScrollStage } from '../components/ScrollStage'
import type { Chapter, SceneFactory } from '../components/ScrollStage'
import type { Callout } from '../components/Callouts'
import { createCatalogStory } from '../three/catalogScene'
import { useI18n } from '../i18n'
import { formatSize, products } from '../data/catalog'
import type { Size } from '../data/catalog'
import './catalog.css'

// Точки на блоке, в метрах: длина ±0.3, высота ±0.15, толщина ±0.1
const L = 0.3
const H = 0.15
const T = 0.1

const wallSizes = products[0].sizes.filter((s) => s.h === 300)
const partitionSizes = products[0].sizes.filter((s) => s.h === 200)

export function Catalog({ onOrder }: { onOrder: () => void }) {
  const { t } = useI18n()
  const [size, setSize] = useState<Size>(wallSizes[2])
  const [handleSize, setHandleSize] = useState<((h: number, t: number) => void) | null>(null)

  // Сцена каталога — та же обвязка, что и на главной, только внутри четыре блока
  const createScene = useCallback<SceneFactory>((canvas, opts) => {
    const handle = createCatalogStory(canvas, opts, products)
    setHandleSize(() => handle.setSize)
    return handle
  }, [])

  const pick = (s: Size) => {
    setSize(s)
    handleSize?.(s.h, s.t)
  }

  const chapters: Chapter[] = products.map((p) => ({
    id: `cat-${p.density.toLowerCase()}`,
    label: p.density,
    eyebrow: `${p.weight} кг/м³ · стеновые и перегородочные`,
    title: `Газоблок ${p.density}`,
  }))

  const callouts = useMemo<Callout[]>(
    () =>
      products.flatMap<Callout>((p, i) => [
        { id: `${p.density}-w`, chapter: i, anchor: [L, H, T], at: [0.76, 0.36], side: 'right', title: `${p.weight} кг/м³`, text: p.purpose, delay: 0 },
        { id: `${p.density}-b`, chapter: i, anchor: [L, -H * 0.2, T], at: [0.76, 0.62], side: 'right', title: `Класс ${p.strength}`, text: 'прочность на сжатие, ГОСТ 31360-2007', delay: 0.08 },
        { id: `${p.density}-l`, chapter: i, anchor: [-L, H, T], at: [0.25, 0.36], side: 'left', title: `λ ${p.lambda.toFixed(2)} Вт/(м·К)`, text: 'теплопроводность в сухом состоянии', delay: 0.14 },
        { id: `${p.density}-p`, chapter: i, anchor: [-L * 0.5, -H, T], at: [0.26, 0.7], side: 'left', title: `Пора ${p.pore}`, text: `морозостойкость F${p.frost}`, delay: 0.2 },
        { id: `${p.density}-dl`, chapter: i, kind: 'dim', anchor: [-L, -H, T], anchorB: [L, -H, T], offset: 34, title: '600 мм', delay: 0.26 },
        { id: `${p.density}-dh`, chapter: i, kind: 'dim', anchor: [-L, -H, T], anchorB: [-L, H, T], offset: -34, title: `${size.h} мм`, delay: 0.3 },
        { id: `${p.density}-dt`, chapter: i, kind: 'dim', anchor: [L, H, T], anchorB: [L, H, -T], offset: -34, title: (f) => `${f.thickness} мм`, delay: 0.34 },
      ]),
    [size.h],
  )

  return (
    <>
      <ScrollStage trackId="cat-track" chapters={chapters} callouts={callouts} createScene={createScene} />

      <div id="cat-track" className="cat-track">
        {products.map((p, i) => (
          <section key={p.density} id={`cat-${p.density.toLowerCase()}`} className="cat-chap">
            {i === 0 && (
              <div className="cat-head">
                <p className="crumbs mono">
                  <Link to="/">{t('nav.home')}</Link> / {t('catalog.title')}
                </p>
                <p className="cat-head__lede">{t('catalog.lede')}</p>
              </div>
            )}

            <div className="cat-foot">
              <div className="cat-foot__sizes">
                <div className="cat-foot__group">
                  <span className="cat-foot__label mono">{t('ch.size.wall')} 600×300</span>
                  <div className="sizes">
                    {wallSizes.map((s) => (
                      <button key={formatSize(s)} type="button" className={s === size ? 'size-chip is-active' : 'size-chip'} onClick={() => pick(s)}>
                        {s.t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cat-foot__group">
                  <span className="cat-foot__label mono">{t('ch.size.partition')} 600×200</span>
                  <div className="sizes">
                    {partitionSizes.map((s) => (
                      <button key={formatSize(s)} type="button" className={s === size ? 'size-chip is-active' : 'size-chip'} onClick={() => pick(s)}>
                        {s.t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cat-foot__actions">
                <Link to={`/catalog/${p.density.toLowerCase()}`} className="btn btn--solid">
                  Газоблок {p.density} →
                </Link>
                <button type="button" className="btn" onClick={onOrder}>
                  {t('cta.order')}
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="cat-table">
        <div className="shell">
          <p className="eyebrow">Сводная таблица</p>
          <table className="spec-table mono">
            <thead>
              <tr>
                <th>{t('catalog.density')}</th>
                <th>кг/м³</th>
                <th>{t('catalog.strength')}</th>
                <th>λ, Вт/(м·К)</th>
                <th>{t('catalog.frost')}</th>
                <th>Пора</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.density}>
                  <td>
                    <Link to={`/catalog/${p.density.toLowerCase()}`}>{p.density}</Link>
                  </td>
                  <td>{p.weight}</td>
                  <td>{p.strength}</td>
                  <td>{p.lambda.toFixed(2)}</td>
                  <td>F{p.frost}</td>
                  <td>{p.pore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
