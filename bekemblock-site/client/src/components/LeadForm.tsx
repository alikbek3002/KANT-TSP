import { useState } from 'react'
import { useI18n } from '../i18n'
import { contacts, formatSize, products } from '../data/catalog'
import './lead-form.css'

type State = 'idle' | 'sending' | 'ok' | 'error'

const allSizes = Array.from(
  new Set(products.flatMap((p) => p.sizes.map(formatSize))),
)

/** Кыргызский номер: +996 XXX XX XX XX */
function maskPhone(raw: string) {
  const digits = raw.replace(/\D/g, '').replace(/^996/, '').slice(0, 9)
  const parts = [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5, 7), digits.slice(7, 9)]
  return `+996 ${parts.filter(Boolean).join(' ')}`.trimEnd()
}

export function LeadForm({
  source,
  defaultSize,
  compact,
}: {
  source: string
  defaultSize?: string
  compact?: boolean
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+996 ')
  const [size, setSize] = useState(defaultSize ?? '')
  const [comment, setComment] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(t('form.errName'))
    if (phone.replace(/\D/g, '').length < 12) return setError(t('form.errPhone'))
    setError('')
    setState('sending')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, size: size || null, comment, source }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setState('ok')
    } catch {
      setState('error')
    }
  }

  if (state === 'ok') {
    return (
      <div className="lead lead--done">
        <p className="lead__ok">{t('form.ok')}</p>
        <a className="mono lead__phone" href={`tel:${contacts.phoneHref}`}>
          {contacts.phone}
        </a>
      </div>
    )
  }

  return (
    <form className={compact ? 'lead lead--compact' : 'lead'} onSubmit={submit} noValidate>
      <label className="lead__field">
        <span className="lead__label mono">{t('form.name')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </label>

      <label className="lead__field">
        <span className="lead__label mono">{t('form.phone')}</span>
        <input
          className="mono"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          inputMode="tel"
          autoComplete="tel"
          required
        />
      </label>

      <label className="lead__field">
        <span className="lead__label mono">{t('form.size')}</span>
        <select className="mono" value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">{t('form.sizeAny')}</option>
          {allSizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {!compact && (
        <label className="lead__field lead__field--wide">
          <span className="lead__label mono">{t('form.comment')}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </label>
      )}

      {error && <p className="lead__err mono">{error}</p>}
      {state === 'error' && (
        <p className="lead__err mono">
          {t('form.err')}
          <a href={`tel:${contacts.phoneHref}`}>{contacts.phone}</a>
        </p>
      )}

      <button type="submit" className="btn btn--solid lead__submit" disabled={state === 'sending'}>
        {state === 'sending' ? t('form.sending') : t('cta.send')}
      </button>
    </form>
  )
}
