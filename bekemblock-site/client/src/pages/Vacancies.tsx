import { LeadForm } from '../components/LeadForm'
import { useI18n } from '../i18n'
import './page.css'

const JOBS = [
  { title: 'Оператор производственной линии', note: 'Сменный график, обучение на месте' },
  { title: 'Электрик', note: 'Обслуживание оборудования цеха' },
  { title: 'Водитель погрузчика', note: 'Склад готовой продукции' },
  { title: 'Лаборант', note: 'Контроль качества по ГОСТ 31360-2007' },
]

export function Vacancies() {
  const { t } = useI18n()
  return (
    <div className="page shell">
      <div className="page__head">
        <h1>{t('vacancies.title')}</h1>
        <p className="lede">
          Завод в Канте набирает людей на производство. Оставьте номер — перезвоним и расскажем
          условия.
        </p>
      </div>

      <div className="split">
        <ul className="line" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {JOBS.map((j, i) => (
            <li key={j.title} className="line__step">
              <span className="line__num mono">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 className="line__title">{j.title}</h2>
                <p className="line__text">{j.note}</p>
              </div>
            </li>
          ))}
        </ul>

        <LeadForm source="vacancies" compact />
      </div>
    </div>
  )
}
