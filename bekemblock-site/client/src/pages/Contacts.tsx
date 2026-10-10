import { LeadForm } from '../components/LeadForm'
import { contacts } from '../data/catalog'
import { useI18n } from '../i18n'
import './page.css'

export function Contacts() {
  const { t } = useI18n()
  return (
    <div className="page shell">
      <div className="page__head">
        <h1>{t('contacts.title')}</h1>
        <p className="lede">{t('ch.contact.body')}</p>
      </div>

      <div className="split">
        <dl className="kv">
          <dt>{t('contacts.phone')}</dt>
          <dd>
            <a href={`tel:${contacts.phoneHref}`} style={{ color: 'var(--accent)' }}>
              {contacts.phone}
            </a>
          </dd>
          <dt>{t('contacts.address')}</dt>
          <dd>{contacts.address}</dd>
          <dt>{t('contacts.company')}</dt>
          <dd>{contacts.company}</dd>
        </dl>

        <LeadForm source="contacts" />
      </div>
    </div>
  )
}
