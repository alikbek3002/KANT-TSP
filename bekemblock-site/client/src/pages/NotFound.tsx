import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import './page.css'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="page shell">
      <div className="page__head">
        <p className="eyebrow mono">404</p>
        <h1>{t('404.title')}</h1>
      </div>
      <Link className="btn" to="/">
        {t('404.back')}
      </Link>
    </div>
  )
}
