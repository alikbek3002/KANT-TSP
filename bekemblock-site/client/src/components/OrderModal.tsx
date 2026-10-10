import { useEffect } from 'react'
import { LeadForm } from './LeadForm'
import { useI18n } from '../i18n'
import './order-modal.css'

export function OrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('cta.call')}>
      <button type="button" className="modal__scrim" onClick={onClose} aria-label="Закрыть" />
      <div className="modal__panel">
        <p className="eyebrow">{t('cta.call')}</p>
        <h2>{t('ch.contact.title')}</h2>
        <p className="lede modal__lede">{t('ch.contact.body')}</p>
        <LeadForm source="modal" compact />
        <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
    </div>
  )
}
