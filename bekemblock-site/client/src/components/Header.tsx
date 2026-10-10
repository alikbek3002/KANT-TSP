import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useI18n, langs } from '../i18n'
import type { Lang } from '../i18n'
import { contacts } from '../data/catalog'
import './header.css'

const LANG_LABEL: Record<Lang, string> = { ru: 'RU', kg: 'KG', en: 'EN' }

export function Header({ onOrder }: { onOrder: () => void }) {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { to: '/catalog', label: t('nav.catalog') },
    { to: '/technology', label: t('nav.tech') },
    { to: '/about', label: t('nav.about') },
    { to: '/vacancies', label: t('nav.vacancies') },
    { to: '/contacts', label: t('nav.contacts') },
  ]

  return (
    <header className={solid ? 'hdr is-solid' : 'hdr'}>
      <div className="hdr__inner">
        <Link to="/" className="hdr__brand" onClick={() => setOpen(false)}>
          <img src="/img/mark.webp" alt="" width="26" height="26" />
          <span>
            <b>BEKEM</b>BLOCK
          </span>
        </Link>

        <nav className={open ? 'hdr__nav is-open' : 'hdr__nav'}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => (isActive ? 'hdr__link is-active' : 'hdr__link')}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hdr__side">
          <div className="hdr__langs mono" role="group" aria-label="Язык сайта">
            {langs.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={l === lang ? 'hdr__lang is-active' : 'hdr__lang'}
                aria-pressed={l === lang}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>

          <a className="hdr__phone mono" href={`tel:${contacts.phoneHref}`}>
            {contacts.phone}
          </a>

          <button type="button" className="btn btn--solid hdr__cta" onClick={onOrder}>
            {t('cta.call')}
          </button>

          <button
            type="button"
            className="hdr__burger"
            aria-expanded={open}
            aria-label="Меню"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  )
}
