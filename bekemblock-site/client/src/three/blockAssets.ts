import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** Модель приходит в метрах: 600 × 300 × 200 мм. Текстура тайлится 6⅔ раза —
 *  это масштаб из KHR_texture_transform, который выставил дизайнер. */
export const TILE = 20 / 3
export const BLOCK = { l: 0.6, h: 0.3, t: 0.2 }
export const THICKNESSES = [100, 150, 200, 250, 300]

/** Файлы в /model кэшируются навсегда — при замене текстуры или модели поднимай версию */
const ASSET_VERSION = 3

export interface BlockTextures {
  map: THREE.Texture
  bumpMap: THREE.Texture
}

export function loadTextures(renderer: THREE.WebGLRenderer): BlockTextures {
  const loader = new THREE.TextureLoader()
  const map = loader.load(`/model/aac-basecolor.webp?v=${ASSET_VERSION}`)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(TILE, TILE)
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const bumpMap = loader.load(`/model/aac-bump.webp?v=${ASSET_VERSION}`)
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping
  bumpMap.repeat.set(TILE, TILE)
  return { map, bumpMap }
}

export function loadGeometry(): Promise<THREE.BufferGeometry> {
  return new Promise((resolve) => {
    new GLTFLoader().load(
      `/model/block.glb?v=${ASSET_VERSION}`,
      (gltf) => {
        const src = gltf.scene.getObjectByProperty('type', 'Mesh') as THREE.Mesh | undefined
        const geometry = (src?.geometry ?? new THREE.BoxGeometry(BLOCK.l, BLOCK.h, BLOCK.t)).clone()
        geometry.computeBoundingBox()
        const bb = geometry.boundingBox!
        // модель стоит на нуле — переносим в центр, чтобы вращать вокруг середины блока
        geometry.translate(
          -(bb.max.x + bb.min.x) / 2,
          -(bb.max.y + bb.min.y) / 2,
          -(bb.max.z + bb.min.z) / 2,
        )
        resolve(geometry)
      },
      undefined,
      () => resolve(new THREE.BoxGeometry(BLOCK.l, BLOCK.h, BLOCK.t)),
    )
  })
}

export function makeMaterial(tex: BlockTextures, tint: string, bump = 0.6) {
  return new THREE.MeshStandardMaterial({
    map: tex.map,
    bumpMap: tex.bumpMap,
    bumpScale: bump,
    color: new THREE.Color(tint),
    roughness: 0.96,
    metalness: 0,
  })
}

/**
 * Толщину блока меняем масштабом по z. Чтобы поры на торцах и верхней грани
 * не растягивались вместе с геометрией, пересчитываем UV: на каждой грани
 * находим ту координату текстуры, что идёт вдоль z, и масштабируем её так же.
 */
export class ThicknessUV {
  private base: Float32Array
  private axis: Int8Array
  private uv: THREE.BufferAttribute
  private last = 1

  constructor(geometry: THREE.BufferGeometry) {
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const nor = geometry.attributes.normal as THREE.BufferAttribute
    this.uv = geometry.attributes.uv as THREE.BufferAttribute
    this.base = new Float32Array(this.uv.array as Float32Array)
    this.axis = new Int8Array(pos.count).fill(-1)

    const groups = new Map<string, number[]>()
    for (let i = 0; i < pos.count; i++) {
      const key = `${Math.round(nor.getX(i) * 4)},${Math.round(nor.getY(i) * 4)},${Math.round(nor.getZ(i) * 4)}`
      let g = groups.get(key)
      if (!g) groups.set(key, (g = []))
      g.push(i)
    }

    groups.forEach((idx, key) => {
      const nz = Number(key.split(',')[2]) / 4
      if (Math.abs(nz) > 0.6 || idx.length < 3) return
      // какая из uv-координат растёт вдоль z на этой грани
      let mz = 0
      let mu = 0
      let mv = 0
      idx.forEach((i) => {
        mz += pos.getZ(i)
        mu += this.uv.getX(i)
        mv += this.uv.getY(i)
      })
      mz /= idx.length
      mu /= idx.length
      mv /= idx.length
      let czu = 0
      let czv = 0
      let vz = 0
      idx.forEach((i) => {
        const dz = pos.getZ(i) - mz
        vz += dz * dz
        czu += dz * (this.uv.getX(i) - mu)
        czv += dz * (this.uv.getY(i) - mv)
      })
      if (vz < 1e-8) return
      const a = Math.abs(czu) > Math.abs(czv) ? 0 : 1
      idx.forEach((i) => {
        this.axis[i] = a
      })
    })
  }

  apply(scaleZ: number) {
    if (Math.abs(scaleZ - this.last) < 1e-4) return
    this.last = scaleZ
    const arr = this.uv.array as Float32Array
    for (let i = 0; i < this.axis.length; i++) {
      const a = this.axis[i]
      if (a < 0) continue
      arr[i * 2 + a] = this.base[i * 2 + a] * scaleZ
    }
    this.uv.needsUpdate = true
  }
}

/** мягкая тень — в сцене нет пола, а опора взгляду нужна */
export function contactShadow(): THREE.Mesh {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 126)
  g.addColorStop(0, 'rgba(31,35,44,0.26)')
  g.addColorStop(0.4, 'rgba(31,35,44,0.09)')
  g.addColorStop(1, 'rgba(31,35,44,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  // Плоскость тени каждый кадр ставится ниже самой нижней точки блока (см. lowestY),
  // поэтому блок всегда целиком над ней и тест глубины прячет её за блоком, а не поверх.
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = -BLOCK.h / 2 - 0.004
  return mesh
}

/** Самая нижняя точка блока в мировых координатах — чтобы тень лежала под ним при любом наклоне */
const corner = new THREE.Vector3()
export function lowestY(pivot: THREE.Object3D): number {
  let min = Infinity
  for (let i = 0; i < 8; i++) {
    corner.set(
      (i & 1 ? 1 : -1) * (BLOCK.l / 2),
      (i & 2 ? 1 : -1) * (BLOCK.h / 2),
      (i & 4 ? 1 : -1) * (BLOCK.t / 2),
    )
    pivot.localToWorld(corner)
    if (corner.y < min) min = corner.y
  }
  return min
}

export function setupLights(scene: THREE.Scene) {
  // Светлый цех: рассеянный свет от белых стен, белый ключевой сверху-слева,
  // голубой логотипа работает контровым по дальнему ребру.
  // Блок белый: много рассеянного света, ключевой мягче, контровой лишь намёком —
  // иначе на белом появляется голубой отлив, которого у настоящего блока нет
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e9ec, 1.35))
  const key = new THREE.DirectionalLight(0xffffff, 1.7)
  key.position.set(-1.4, 2.0, 1.5)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x9fd6f0, 0.9)
  rim.position.set(2.2, 1.0, -1.5)
  scene.add(rim)
  const fill = new THREE.DirectionalLight(0xf2eee6, 0.7)
  fill.position.set(0.8, -1.2, 0.9)
  scene.add(fill)
}

export function makeRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  return renderer
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
