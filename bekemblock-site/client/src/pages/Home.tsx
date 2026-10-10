import { Link } from 'react-router-dom'
import { ScrollStage } from '../components/ScrollStage'
import type { Chapter } from '../components/ScrollStage'
import type { Callout } from '../components/Callouts'
import { LeadForm } from '../components/LeadForm'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/dict'
import { contacts, products } from '../data/catalog'
import './home.css'

const CLIENTS = [
  { src: '/img/client-avangard.webp', name: 'Avangard' },
  { src: '/img/client-kut.webp', name: 'Кут' },
  { src: '/img/client-nurzaman.webp', name: 'Nurzaman' },
  { src: '/img/client-a-plus-development.webp', name: 'A Plus Development' },
  { src: '/img/client-elizaveta.webp', name: 'Elizaveta Development' },
]

// Координаты выносок — точки на самом блоке, в метрах: длина ±0.3, высота ±0.15, толщина ±0.1.
const L = 0.3
const H = 0.15
const T = 0.1

export function Home({ onOrder }: { onOrder: () => void }) {
  const { t } = useI18n()

  const chapters: Chapter[] = [
    { id: 'ch-hero', label: 'Блок' },
    { id: 'ch-props', label: t('ch.props.eyebrow'), eyebrow: t('ch.props.eyebrow'), title: t('ch.props.title') },
    { id: 'ch-line', label: t('ch.line.eyebrow'), eyebrow: t('ch.line.eyebrow'), title: t('ch.line.title'), side: 'right' },
    { id: 'ch-size', label: t('ch.size.eyebrow'), eyebrow: t('ch.size.eyebrow'), title: t('ch.size.title') },
    { id: 'ch-plant', label: t('ch.plant.eyebrow'), eyebrow: t('ch.plant.eyebrow'), title: t('ch.plant.title') },
    { id: 'ch-contact', label: t('ch.contact.eyebrow'), eyebrow: t('ch.contact.eyebrow'), title: t('ch.contact.title') },
  ]

  const stages = ['s1', 's2', 's3', 's4', 's5'] as const

  const callouts: Callout[] = [
    // 01 — герой: паспорт блока
    { id: 'h-size', chapter: 0, anchor: [L, H, T], at: [0.76, 0.43], side: 'right', title: '600 × 300 × 200 мм', text: 'стеновой блок D500', delay: 0 },
    { id: 'h-gost', chapter: 0, anchor: [-L, H, T], at: [0.25, 0.43], side: 'left', title: 'ГОСТ 31360-2007', text: 'автоклавный ячеистый бетон', delay: 0.08 },
    { id: 'h-plant', chapter: 0, anchor: [-L * 0.4, -H, T], at: [0.26, 0.74], side: 'left', title: 'г. Кант', text: 'Ыссык-Атинский район, Восточная промзона', delay: 0.16 },
    { id: 'h-b', chapter: 0, anchor: [L, -H * 0.3, T], at: [0.76, 0.74], side: 'right', title: 'B2,5 · 500 кг/м³', text: 'класс прочности на сжатие', delay: 0.22 },

    // 02 — структура: камера у верхней грани
    { id: 'p-pore', chapter: 1, anchor: [-L * 0.3, H, T * 0.2], at: [0.22, 0.4], side: 'left', title: 'Пора 0,5–2 мм', text: t('ch.props.heat.d'), delay: 0 },
    { id: 'p-fire', chapter: 1, anchor: [L * 0.8, H, -T * 0.4], at: [0.79, 0.3], side: 'right', title: t('ch.props.fire.t'), text: t('ch.props.fire.d'), delay: 0.1 },
    { id: 'p-eco', chapter: 1, anchor: [L, H * 0.1, T], at: [0.8, 0.64], side: 'right', title: t('ch.props.eco.t'), text: t('ch.props.eco.d'), delay: 0.2 },
    { id: 'p-lambda', chapter: 1, anchor: [-L * 0.9, -H * 0.2, T], at: [0.22, 0.7], side: 'left', title: 'λ 0,12 Вт/(м·К)', text: t('ch.props.gost.d'), delay: 0.28 },

    // 03 — производство: стадии стоят вдоль длины блока
    ...stages.map<Callout>((s, i) => ({
      id: `l-${s}`,
      chapter: 2,
      anchor: [-L + (L * 2 * (i + 0.5)) / 5, H, T],
      at: [0.15 + i * 0.175, 0.26],
      side: 'up',
      title: `${String(i + 1).padStart(2, '0')} ${t(`ch.line.${s}.t` as Key)}`,
      text: t(`ch.line.${s}.d` as Key),
      delay: i * 0.06,
    })),

    // 04 — размеры: чертёжные размерные линии по рёбрам
    { id: 's-len', chapter: 3, kind: 'dim', anchor: [-L, -H, T], anchorB: [L, -H, T], offset: 38, title: '600 мм', delay: 0 },
    { id: 's-h', chapter: 3, kind: 'dim', anchor: [-L, -H, T], anchorB: [-L, H, T], offset: -38, title: '300 мм', delay: 0.08 },
    { id: 's-t', chapter: 3, kind: 'dim', anchor: [L, H, T], anchorB: [L, H, -T], offset: -38, title: (f) => `${f.thickness} мм`, delay: 0.16 },
    { id: 's-cat', chapter: 3, anchor: [-L, H, -T], at: [0.24, 0.3], side: 'left', title: 'D400 — D700', text: t('ch.size.note'), href: '/catalog', delay: 0.24 },

    // 05 — завод и цифры
    { id: 'f-1', chapter: 4, anchor: [-L * 2.9, H, T], at: [0.16, 0.3], side: 'left', title: '1 завод', text: t('ch.plant.s1'), delay: 0 },
    { id: 'f-2', chapter: 4, anchor: [L, H, T], at: [0.8, 0.3], side: 'right', title: '300 000 м³', text: t('ch.plant.s2'), delay: 0.08 },
    { id: 'f-3', chapter: 4, anchor: [-L * 2.9, -H * 4.9, T], at: [0.16, 0.7], side: 'left', title: '60 лет', text: t('ch.plant.s3'), delay: 0.16 },
    { id: 'f-4', chapter: 4, anchor: [L, -H * 4.9, T], at: [0.8, 0.7], side: 'right', title: 'Склад', text: t('ch.plant.s4'), delay: 0.24 },

    // 06 — контакт
    { id: 'c-phone', chapter: 5, anchor: [L, H * 0.2, T], at: [0.74, 0.34], side: 'right', title: contacts.phone, text: 'звоните в рабочее время', href: `tel:${contacts.phoneHref}`, delay: 0 },
    { id: 'c-addr', chapter: 5, anchor: [-L, H * 0.2, T], at: [0.3, 0.34], side: 'left', title: 'г. Кант', text: contacts.address, delay: 0.08 },
  ]

  return (
    <>
      <ScrollStage trackId="track" chapters={chapters} callouts={callouts} />

      <div id="track" className="track">
        {/* 01 — герой: заголовок сверху, блок в центре, кнопки внизу */}
        <section id="ch-hero" className="chap chap--hero">
          <div className="hero">
            <p className="eyebrow">ОсОО «Бекем Блок» · Кант</p>
            <h1 className="hero__title">{t('hero.title')}</h1>
          </div>
          <div className="hero__foot">
            <p className="hero__lede">{t('hero.lede')}</p>
            <div className="hero__actions">
              <Link to="/catalog" className="btn btn--solid">
                {t('cta.catalog')}
              </Link>
              <button type="button" className="btn" onClick={onOrder}>
                {t('cta.call')}
              </button>
            </div>
          </div>
        </section>

        <section id="ch-props" className="chap" />
        <section id="ch-line" className="chap" />

        <section id="ch-size" className="chap chap--foot">
          <nav className="densities mono">
            {products.map((p) => (
              <Link key={p.density} to={`/catalog/${p.density.toLowerCase()}`} className="densities__item">
                <b>{p.density}</b>
                <span>
                  {p.strength} · λ {p.lambda.toFixed(2)}
                </span>
              </Link>
            ))}
          </nav>
        </section>

        <section id="ch-plant" className="chap chap--foot">
          <p className="plant__note">{t('ch.plant.body')}</p>
        </section>

        <section id="ch-contact" className="chap chap--foot">
          <div className="contact">
            <LeadForm source="home" compact />
          </div>
        </section>
      </div>

      <section className="clients">
        <div className="shell">
          <p className="eyebrow">Нам доверяют</p>
          <ul className="clients__row">
            {CLIENTS.map((c) => (
              <li key={c.name}>
                <img src={c.src} alt={c.name} loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
