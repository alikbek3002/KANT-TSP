import { useEffect, useRef } from 'react'
import { createBlockScene } from '../three/blockScene'
import type { SceneHandle } from '../three/blockScene'
import type { Product, Size } from '../data/catalog'
import { useI18n } from '../i18n'
import './block-viewer.css'

/** Блок, который можно покрутить мышью: карточка товара и каталог. */
export function BlockViewer({
  product,
  size,
  interactive = true,
}: {
  product: Product
  size: Size
  interactive?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handleRef = useRef<SceneHandle | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let handle: SceneHandle
    try {
      handle = createBlockScene(canvas, { mode: 'orbit', interactive })
    } catch {
      return
    }
    handleRef.current = handle
    return () => {
      handleRef.current = null
      handle.dispose()
    }
  }, [interactive])

  useEffect(() => {
    handleRef.current?.setDensity(product.density, product.tint, product.bump)
  }, [product])

  useEffect(() => {
    handleRef.current?.setSize(size.h, size.t)
  }, [size])

  return (
    <figure className="viewer">
      <canvas ref={canvasRef} className="viewer__canvas" />
      {interactive && <figcaption className="viewer__hint mono">{t('product.drag')}</figcaption>}
    </figure>
  )
}
