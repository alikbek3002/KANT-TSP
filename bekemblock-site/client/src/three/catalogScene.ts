import * as THREE from 'three'
import type { Product } from '../data/catalog'
import type { FrameInfo, Projected, SceneHandle, SceneOptions } from './blockScene'
import {
  ThicknessUV,
  clamp01,
  contactShadow,
  easeOutCubic,
  lerp,
  loadGeometry,
  loadTextures,
  lowestY,
  makeMaterial,
  makeRenderer,
  setupLights,
  smooth,
} from './blockAssets'

/** Расстояние между блоками в ряду, м */
const SPACING = 1.15
const DIM = new THREE.Color('#cfd1d3')

interface Slot {
  group: THREE.Group
  material: THREE.MeshStandardMaterial
  edges: THREE.LineSegments
  shadow: THREE.Mesh
  tint: THREE.Color
}

/**
 * Каталог как история: четыре блока стоят в ряд, камера едет вдоль ряда по
 * мере прокрутки. Активный блок приподнимается и поворачивается в три четверти,
 * соседи приглушены. Контракт тот же, что у сцены главной, поэтому выноски
 * и рейка глав работают без изменений.
 */
export function createCatalogStory(
  canvas: HTMLCanvasElement,
  opts: SceneOptions,
  products: Product[],
): SceneHandle {
  const chapters = products.length
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const renderer = makeRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40)
  setupLights(scene)
  canvas.style.pointerEvents = 'none'

  const textures = loadTextures(renderer)
  const slots: Slot[] = []
  let uvFix: ThicknessUV | null = null
  let introStart = 0
  let intro = reduced ? 1 : 0

  loadGeometry().then((geometry) => {
    uvFix = new ThicknessUV(geometry)
    products.forEach((p, i) => {
      const group = new THREE.Group()
      group.position.x = i * SPACING
      group.visible = false
      const material = makeMaterial(textures, p.tint, p.bump)
      group.add(new THREE.Mesh(geometry, material))
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 25),
        new THREE.LineBasicMaterial({ color: 0x009edd, transparent: true, opacity: 0 }),
      )
      group.add(edges)
      const shadow = contactShadow()
      scene.add(shadow)
      shadow.position.x = group.position.x
      scene.add(group)
      slots.push({ group, material, edges, shadow, tint: new THREE.Color(p.tint) })
    })
    introStart = performance.now()
    opts.onReady?.()
  })

  let progress = 0
  let shownProgress = 0
  let narrow = false
  let width = 1
  let height = 1
  let sizeScaleY = 1
  let sizeScaleZ = 1
  let currentThickness = 200

  const resize = () => {
    width = canvas.clientWidth || 1
    height = canvas.clientHeight || 1
    narrow = width / height < 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  const tmpVec = new THREE.Vector3()
  const tmpColor = new THREE.Color()
  const weights: number[] = new Array(chapters).fill(0)
  let lastTelemetry = ''
  let camX = 0
  let raf = 0

  const project = (x: number, y: number, z: number, out: Projected = { x: 0, y: 0, depth: 0 }, chapter?: number) => {
    const slot = slots[chapter ?? Math.round(shownProgress * (chapters - 1))]
    tmpVec.set(x, y, z)
    if (slot) slot.group.localToWorld(tmpVec)
    tmpVec.project(camera)
    out.x = ((tmpVec.x + 1) / 2) * width
    out.y = ((1 - tmpVec.y) / 2) * height
    out.depth = tmpVec.z
    return out
  }

  const frameInfo: FrameInfo = {
    local: 0,
    chapter: 0,
    weights,
    intro: 0,
    thickness: 200,
    project,
    width,
    height,
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const t = now / 1000
    if (introStart && intro < 1) intro = reduced ? 1 : easeOutCubic(clamp01((now - introStart) / 1400))

    shownProgress = reduced ? progress : lerp(shownProgress, progress, 0.08)
    const local = shownProgress * (chapters - 1)
    const ch = Math.round(local)
    for (let i = 0; i < chapters; i++) weights[i] = Math.max(0, 1 - Math.abs(local - i))
    const frac = local - Math.floor(local)
    const hop = Math.sin(frac * Math.PI)

    // камера едет вдоль ряда; в момент перехода чуть приподнимается, как будто
    // перешагивает к следующему блоку
    camX = local * SPACING
    const dist = (narrow ? 3.2 : 1.95) + hop * 0.25
    camera.position.set(camX, (narrow ? -0.15 : 0.05) + hop * 0.05, dist)
    camera.lookAt(camX, narrow ? -0.05 : -0.01, 0)

    slots.forEach((s, i) => {
      const w = weights[i]
      const rise = easeOutCubic(clamp01(intro * 1.5 - i * 0.18))
      s.group.visible = rise > 0.001
      s.group.position.y = lerp(-0.7, 0, rise) + w * 0.05 + (reduced ? 0 : Math.sin(t * 0.9 + i) * 0.004 * w)
      s.group.rotation.y = -0.35 + w * -0.3 + (reduced ? 0 : Math.sin(t * 0.5 + i) * 0.02 * w)
      s.group.rotation.x = 0.12 + w * 0.06
      s.group.scale.set(1, sizeScaleY, sizeScaleZ)
      // соседи уходят в серый, активный — в свой оттенок
      tmpColor.copy(DIM).lerp(s.tint, smooth(w))
      s.material.color.copy(tmpColor)
      s.group.updateMatrixWorld()
      s.shadow.position.y = lowestY(s.group) - 0.004
      ;(s.edges.material as THREE.LineBasicMaterial).opacity = w * 0.45
      ;(s.shadow.material as THREE.MeshBasicMaterial).opacity = rise * lerp(0.5, 1, w)
      s.shadow.scale.setScalar(lerp(0.7, 1, rise))
    })
    uvFix?.apply(sizeScaleZ)

    if (opts.onTelemetry) {
      const active = slots[ch]
      const angle = active ? Math.round(((active.group.rotation.y * 180) / Math.PI) % 360) : 0
      const sig = `${angle}|${currentThickness}|${ch}`
      if (sig !== lastTelemetry) {
        lastTelemetry = sig
        opts.onTelemetry({
          angle: ((angle % 360) + 360) % 360,
          density: products[ch].density,
          thickness: currentThickness,
          chapter: ch,
        })
      }
    }

    if (opts.onFrame) {
      frameInfo.local = local
      frameInfo.chapter = ch
      frameInfo.intro = intro
      frameInfo.thickness = currentThickness
      frameInfo.width = width
      frameInfo.height = height
      opts.onFrame(frameInfo)
    }

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    setProgress: (v) => {
      progress = clamp01(v)
    },
    setDensity: () => {},
    setSize: (heightMm, thicknessMm) => {
      currentThickness = thicknessMm
      sizeScaleY = heightMm / 300
      sizeScaleZ = thicknessMm / 200
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material as THREE.Material | undefined
        mat?.dispose()
      })
      textures.map.dispose()
      textures.bumpMap.dispose()
      renderer.dispose()
    },
  }
}
