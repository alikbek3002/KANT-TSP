/** Каталог живёт на сервере, чтобы прайс и характеристики правились без пересборки фронта. */
export interface Size {
  l: number
  h: number
  t: number
}

export interface Product {
  density: 'D400' | 'D500' | 'D600' | 'D700'
  weight: number
  strength: string
  lambda: number
  frost: number
  sizes: Size[]
}

const wall: Size[] = [100, 150, 200, 250, 300].map((t) => ({ l: 600, h: 300, t }))
const partition: Size[] = [100, 150, 200, 250, 300].map((t) => ({ l: 600, h: 200, t }))

export const products: Product[] = [
  { density: 'D400', weight: 400, strength: 'B2,0', lambda: 0.1, frost: 35, sizes: [...wall, ...partition] },
  { density: 'D500', weight: 500, strength: 'B2,5', lambda: 0.12, frost: 35, sizes: [...wall, ...partition] },
  { density: 'D600', weight: 600, strength: 'B3,5', lambda: 0.14, frost: 50, sizes: [...wall, ...partition] },
  { density: 'D700', weight: 700, strength: 'B5,0', lambda: 0.17, frost: 50, sizes: [...wall, ...partition] },
]
