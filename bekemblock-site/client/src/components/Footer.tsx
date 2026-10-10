import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { contacts } from '../data/catalog'
import './footer.css'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="ftr">
      <div className="shell ftr__inner">
        <div className="ftr__brand">
          <img src="/img/mark.webp" alt="" width="28" height="28" />
          <p className="ftr__rights">{t('footer.rights')}</p>
        </div>

        <nav className="ftr__nav">
          <Link to="/catalog">{t('nav.catalog')}</Link>
          <Link to="/technology">{t('nav.tech')}</Link>
          <Link to="/about">{t('nav.about')}</Link>
          <Link to="/vacancies">{t('nav.vacancies')}</Link>
          <Link to="/contacts">{t('nav.contacts')}</Link>
        </nav>

        <div className="ftr__contacts mono">
          <a href={`tel:${contacts.phoneHref}`}>{contacts.phone}</a>
          <span>{contacts.address}</span>
        </div>
      </div>
    </footer>
  )
}
