import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlockViewer } from '../components/BlockViewer'
import { LeadForm } from '../components/LeadForm'
import { byDensity, formatSize, products } from '../data/catalog'
import { useI18n } from '../i18n'
import './page.css'

export function Product() {
  const { density = 'd500' } = useParams()
  const { t } = useI18n()
  const product = byDensity(density)
  const [sizeIdx, setSizeIdx] = useState(2)

  if (!product) {
    return (
      <div className="page shell">
        <h1>{t('404.title')}</h1>
        <Link className="btn" to="/catalog">
          {t('catalog.title')}
        </Link>
      </div>
    )
  }

  const size = product.sizes[sizeIdx] ?? product.sizes[0]

  return (
    <div className="page shell">
      <div className="page__head">
        <p className="crumbs mono">
          <Link to="/">{t('nav.home')}</Link> / <Link to="/catalog">{t('catalog.title')}</Link> /{' '}
          Газоблок {product.density}
        </p>
        <h1>Газоблок {product.density}</h1>
        <p className="lede">
          {product.kinds.includes('wall') ? t('product.purpose.wall') : t('product.purpose.partition')}.
        </p>
      </div>

      <div className="split">
        <BlockViewer product={product} size={size} />

        <div className="prose">
          <h2>{t('product.spec')}</h2>
          <dl className="kv">
            <dt>{t('catalog.density')}</dt>
            <dd>
              {product.density} — {product.weight} кг/м³
            </dd>
            <dt>{t('catalog.strength')}</dt>
            <dd>{product.strength}</dd>
            <dt>{t('catalog.lambda')}</dt>
            <dd>{product.lambda.toFixed(2)} Вт/(м·К)</dd>
            <dt>{t('catalog.frost')}</dt>
            <dd>
              {product.frost} {t('catalog.cycles')}
            </dd>
            <dt>ГОСТ</dt>
            <dd>31360-2007</dd>
          </dl>

          <h2>{t('product.pick')}</h2>
          <div className="sizes">
            {product.sizes.map((s, i) => (
              <button
                key={formatSize(s)}
                type="button"
                className={i === sizeIdx ? 'size-chip is-active' : 'size-chip'}
                onClick={() => setSizeIdx(i)}
              >
                {formatSize(s)}
              </button>
            ))}
          </div>

          <h2>{t('cta.order')}</h2>
          <LeadForm source={`product:${product.density}`} defaultSize={formatSize(size)} compact />
        </div>
      </div>

      <div className="section-gap">
        <p className="eyebrow">{t('product.other')}</p>
        <div className="cards" style={{ marginTop: '1rem' }}>
          {products
            .filter((p) => p.density !== product.density)
            .map((p) => (
              <Link key={p.density} to={`/catalog/${p.density.toLowerCase()}`} className="card">
                <div className="card__body">
                  <h3 className="card__title">Газоблок {p.density}</h3>
                  <p className="card__meta">
                    {p.strength} · λ {p.lambda.toFixed(2)} · {p.frost} {t('catalog.cycles')}
                  </p>
                </div>
                <span className="card__foot">{t('cta.more')}</span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
