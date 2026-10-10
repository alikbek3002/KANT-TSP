import * as THREE from 'three'
import type { Density } from '../data/catalog'
import {
  BLOCK,
  THICKNESSES,
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

export { BLOCK } from './blockAssets'

export interface Telemetry {
  angle: number
  density: Density
  thickness: number
  chapter: number
}

/** Точка блока на экране, в CSS-пикселях канваса. `depth` > 1 — за камерой. */
export interface Projected {
  x: number
  y: number
  depth: number
}

export interface FrameInfo {
  local: number
  chapter: number
  weights: number[]
  intro: number
  thickness: number
  project: (x: number, y: number, z: number, out?: Projected, chapter?: number) => Projected
  width: number
  height: number
}

export interface SceneOptions {
  mode: 'scroll' | 'orbit'
  interactive?: boolean
  chapters?: number
  onTelemetry?: (t: Telemetry) => void
  onFrame?: (f: FrameInfo) => void
  onReady?: () => void
}

export interface SceneHandle {
  setProgress: (p: number) => void
  setDensity: (d: Density, tint: string, bump: number) => void
  setSize: (heightMm: number, thicknessMm: number) => void
  dispose: () => void
}

const TINTS: Record<Density, string> = { D400: '#ffffff', D500: '#fcfbfa', D600: '#f7f6f3', D700: '#f1f0ec' }
const RAW = new THREE.Color('#8e9a86')

/** Поза сцены в каждой главе. Между главами интерполируется, поэтому блок не
 *  просто крутится, а каждый раз поворачивается к тому, о чём глава. */
interface Pose {
  yaw: number
  pitch: number
  dist: number
  x: number
  y: number
}

const POSES: Pose[] = [
  { yaw: -0.62, pitch: 0.17, dist: 2.35, x: 0, y: -0.09 }, // 01 герой: по центру, три четверти
  { yaw: -1.15, pitch: 0.5, dist: 1.38, x: 0.16, y: -0.04 }, // 02 структура: уходит вправо и наезжает на угол
  { yaw: -0.18, pitch: 0.24, dist: 1.75, x: -0.14, y: -0.03 }, // 03 производство: влево, длинной гранью к зрителю
  { yaw: -1.05, pitch: 0.22, dist: 1.95, x: 0.16, y: 0 }, // 04 размеры: снова вправо, торцом
  { yaw: -0.5, pitch: 0.16, dist: 3.7, x: 0.32, y: 0.34 }, // 05 завод: в свой слот на штабеле
  { yaw: -0.62, pitch: 0.12, dist: 2.7, x: 0, y: 0.2 }, // 06 контакт: вверх, под ним форма
]

interface PosePlus extends Pose {
  /** 0 → 1 → 0 внутри перехода: сила дуги и крена */
  hop: number
  /** знак направления перехода по x — крен в сторону движения */
  dir: number
}

function poseAt(local: number): PosePlus {
  const i = Math.max(0, Math.min(POSES.length - 2, Math.floor(local)))
  const f = clamp01(local - i)
  const t = smooth(f)
  const a = POSES[i]
  const b = POSES[i + 1]
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    dist: lerp(a.dist, b.dist, t),
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    hop: Math.sin(f * Math.PI),
    dir: Math.sign(b.x - a.x) || 1,
  }
}

/** Толщина в главе про размеры: не плавная резина, а пять реальных размеров,
 *  между которыми блок быстро перещёлкивается. */
function steppedThickness(k: number): { mm: number; scale: number } {
  const n = THICKNESSES.length
  const pos = clamp01(k) * (n - 1)
  const i = Math.min(n - 2, Math.floor(pos))
  const f = pos - i
  const e = smooth(clamp01((f - 0.55) / 0.45))
  const mm = lerp(THICKNESSES[i], THICKNESSES[i + 1], e)
  return { mm: e > 0.5 ? THICKNESSES[i + 1] : THICKNESSES[i], scale: mm / 200 }
}

/** следы стальных струн: тонкие линии поперёк массива, видны только в главе про резку */
function cutLines(): THREE.LineSegments {
  const pts: number[] = []
  const hl = BLOCK.l / 2
  const hh = BLOCK.h / 2
  const ht = BLOCK.t / 2
  for (let i = 1; i <= 3; i++) {
    const x = -hl + (BLOCK.l * i) / 4
    pts.push(x, hh + 0.001, -ht, x, hh + 0.001, ht)
    pts.push(x, -hh, ht + 0.001, x, hh, ht + 0.001)
    pts.push(x, -hh, -ht - 0.001, x, hh, -ht - 0.001)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const mat = new THREE.LineBasicMaterial({ color: 0x1f232c, transparent: true, opacity: 0 })
  return new THREE.LineSegments(geo, mat)
}

export function createBlockScene(canvas: HTMLCanvasElement, opts: SceneOptions): SceneHandle {
  const chapters = opts.chapters ?? 6
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const renderer = makeRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40)
  camera.position.set(0, 0.06, 1.85)
  setupLights(scene)

  const root = new THREE.Group()
  scene.add(root)
  const shadow = contactShadow()
  root.add(shadow)

  const pivot = new THREE.Group()
  root.add(pivot)

  const cuts = cutLines()
  pivot.add(cuts)

  let edges: THREE.LineSegments | null = null
  let stack: THREE.Group | null = null
  let stackMat: THREE.MeshStandardMaterial | null = null
  let material: THREE.MeshStandardMaterial | null = null
  let uvFix: ThicknessUV | null = null

  const textures = loadTextures(renderer)
  const baseTint = new THREE.Color(TINTS.D500)
  let targetTint = baseTint.clone()
  let targetBump = 0.85
  let density: Density = 'D500'

  // Появление: блок выезжает снизу, тень проявляется под ним.
  let introStart = 0
  let intro = reduced ? 1 : 0
  pivot.visible = false

  loadGeometry().then((geometry) => {
    uvFix = new ThicknessUV(geometry)
    material = makeMaterial(textures, TINTS.D500, 0.85)
    pivot.add(new THREE.Mesh(geometry, material))

    edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 25),
      new THREE.LineBasicMaterial({ color: 0x009edd, transparent: true, opacity: 0 }),
    )
    pivot.add(edges)

    // Штабель живёт внутри pivot и повёрнут вместе с блоком: блок — верхний
    // правый передний в кладке 2 × 2 × 3, остальные одиннадцать встают вокруг.
    stack = new THREE.Group()
    stackMat = makeMaterial(textures, '#e9e8e4', 0.5)
    stackMat.transparent = true
    stackMat.opacity = 0
    const gx = BLOCK.l + 0.012
    const gy = BLOCK.h + 0.008
    const gz = BLOCK.t + 0.012
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        for (let depth = 0; depth < 2; depth++) {
          if (row === 2 && col === 1 && depth === 0) continue
          const b = new THREE.Mesh(geometry, stackMat)
          b.position.set((col - 1) * gx, (row - 2) * gy, -depth * gz)
          stack.add(b)
        }
      }
    }
    // деревянный поддон под кладкой
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(gx * 2 + 0.06, 0.035, gz * 2 + 0.06),
      new THREE.MeshStandardMaterial({ color: '#b9924f', roughness: 0.9, transparent: true, opacity: 0 }),
    )
    pallet.position.set(-gx / 2, -2 * gy - BLOCK.h / 2 - 0.02, -gz / 2)
    stack.add(pallet)
    stack.visible = false
    pivot.add(stack)

    pivot.visible = true
    introStart = performance.now()
    opts.onReady?.()
  })

  // ——— управление ———
  let progress = 0
  let shownProgress = 0
  let dragYaw = 0
  let dragPitch = 0
  let dragging = false
  let lastX = 0
  let lastY = 0
  let currentThickness = 200
  let sizeScaleY = 1
  let sizeScaleZ = 1

  const onDown = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    dragYaw += (e.clientX - lastX) * 0.006
    dragPitch = Math.max(-0.5, Math.min(0.5, dragPitch + (e.clientY - lastY) * 0.004))
    lastX = e.clientX
    lastY = e.clientY
  }
  const onUp = (e: PointerEvent) => {
    dragging = false
    canvas.releasePointerCapture?.(e.pointerId)
    canvas.style.cursor = 'grab'
  }
  const interactive = opts.interactive !== false
  if (interactive) {
    canvas.style.cursor = 'grab'
    canvas.style.touchAction = 'pan-y'
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
  } else {
    canvas.style.pointerEvents = 'none'
  }

  let narrow = false
  let width = 1
  let height = 1

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

  const tmpColor = new THREE.Color()
  const tmpVec = new THREE.Vector3()
  const weights: number[] = new Array(chapters).fill(0)
  let lastTelemetry = ''
  let raf = 0
  let lastLocal = 0
  let velocity = 0
  let roll = 0

  const project = (x: number, y: number, z: number, out: Projected = { x: 0, y: 0, depth: 0 }) => {
    tmpVec.set(x, y, z)
    pivot.localToWorld(tmpVec)
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

  const setStackOpacity = (v: number) => {
    if (!stack) return
    stack.visible = v > 0.02
    stack.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && 'opacity' in m) m.opacity = v
    })
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    const t = now / 1000

    if (introStart && intro < 1) {
      intro = reduced ? 1 : easeOutCubic(clamp01((now - introStart) / 1400))
    }

    shownProgress = reduced ? progress : lerp(shownProgress, progress, 0.08)
    const p = shownProgress

    if (opts.mode === 'orbit') {
      if (!dragging && !reduced) dragYaw += 0.0022
      pivot.rotation.y = -0.62 + dragYaw
      pivot.rotation.x = 0.16 + dragPitch
      pivot.scale.set(1, sizeScaleY, sizeScaleZ)
      uvFix?.apply(sizeScaleZ)
      root.position.y = lerp(-0.7, 0, intro)
      root.updateMatrixWorld()
      shadow.position.y = lowestY(pivot) - root.position.y - 0.004
      ;(shadow.material as THREE.MeshBasicMaterial).opacity = intro
      camera.position.set(0, 0.06, narrow ? 1.9 : 1.45)
      camera.lookAt(0, 0, 0)
    } else {
      const local = p * (chapters - 1)
      const ch = Math.round(local)
      for (let i = 0; i < chapters; i++) weights[i] = Math.max(0, 1 - Math.abs(local - i))

      const pose = poseAt(local)
      const bobY = reduced ? 0 : Math.sin(t * 0.9) * 0.006
      const bobYaw = reduced ? 0 : Math.sin(t * 0.5) * 0.02

      // Инерция: скорость прокрутки кренит блок, как будто его двигают.
      velocity = lerp(velocity, local - lastLocal, 0.2)
      lastLocal = local
      const targetRoll = reduced ? 0 : -velocity * 6 - pose.hop * pose.dir * 0.09
      roll = lerp(roll, Math.max(-0.28, Math.min(0.28, targetRoll)), 0.15)

      pivot.rotation.y = pose.yaw + bobYaw + dragYaw
      pivot.rotation.x = pose.pitch + dragPitch
      pivot.rotation.z = roll
      if (!dragging) {
        dragYaw = lerp(dragYaw, 0, 0.04)
        dragPitch = lerp(dragPitch, 0, 0.04)
      }

      const wProps = weights[1]
      const wLine = weights[2]
      const wSize = weights[3]
      const wPlant = weights[4]
      const wContact = weights[5]

      // 03 — производство: блок отматывается к сырому массиву и снова доходит до готового
      if (material) {
        tmpColor.copy(targetTint).lerp(RAW, wLine)
        material.color.copy(tmpColor)
        material.bumpScale = lerp(targetBump, targetBump * 1.6, wLine)
      }
      if (edges) {
        ;(edges.material as THREE.LineBasicMaterial).opacity = wProps * 0.55 + wContact * 0.35
      }
      ;(cuts.material as THREE.LineBasicMaterial).opacity = wLine * 0.5

      // 04 — размеры: пять реальных толщин, вход и выход из главы — к базовым 200
      const stepped = steppedThickness((local - 2.5) / 1)
      const gate = smooth(clamp01((wSize - 0.15) / 0.3))
      const thicknessScale = lerp(1, stepped.scale, gate)
      pivot.scale.set(1, 1, thicknessScale)
      cuts.scale.z = thicknessScale
      uvFix?.apply(thicknessScale)
      currentThickness = gate > 0.5 ? stepped.mm : 200

      // появление: снизу вверх, тень догоняет
      const rise = lerp(-0.75, 0, intro)
      // между главами блок идёт дугой: чуть подпрыгивает и приближается
      const hopY = pose.hop * 0.07
      root.position.set(pose.x, pose.y + rise + bobY + hopY, pose.hop * 0.08)
      root.updateMatrixWorld()
      shadow.position.y = lowestY(pivot) - root.position.y - 0.004
      ;(shadow.material as THREE.MeshBasicMaterial).opacity = intro * (1 - wPlant * 0.6)
      shadow.scale.setScalar(lerp(0.6, 1, intro))

      // 05 — завод: вокруг блока проявляется кладка, он занимает свой слот
      setStackOpacity(smooth(clamp01((wPlant - 0.2) / 0.5)))

      const dist = pose.dist * (narrow ? 1.7 : 1)
      camera.position.set(0, narrow ? -0.15 : 0.06, dist)
      camera.lookAt(0, narrow ? -0.05 : 0, 0)

      if (opts.onTelemetry) {
        const angle = Math.round(((pivot.rotation.y * 180) / Math.PI) % 360)
        const sig = `${angle}|${currentThickness}|${ch}|${density}`
        if (sig !== lastTelemetry) {
          lastTelemetry = sig
          opts.onTelemetry({
            angle: ((angle % 360) + 360) % 360,
            density,
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
    }

    renderer.render(scene, camera)
  }
  raf = requestAnimationFrame(frame)

  return {
    setProgress: (v: number) => {
      progress = clamp01(v)
    },
    setDensity: (d: Density, tint: string, bump: number) => {
      density = d
      targetTint = new THREE.Color(tint)
      targetBump = bump
      if (material && opts.mode === 'orbit') {
        material.color.copy(targetTint)
        material.bumpScale = bump
      }
    },
    setSize: (heightMm: number, thicknessMm: number) => {
      currentThickness = thicknessMm
      sizeScaleZ = thicknessMm / 200
      sizeScaleY = heightMm / 300
    },
    dispose: () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (interactive) {
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerup', onUp)
        canvas.removeEventListener('pointercancel', onUp)
      }
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      textures.map.dispose()
      textures.bumpMap.dispose()
      renderer.dispose()
    },
  }
}
