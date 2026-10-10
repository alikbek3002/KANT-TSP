import type { VercelRequest, VercelResponse } from '@vercel/node'

// Копия server/src/catalog.ts: функция Vercel собирается отдельно и не видит
// исходники сервера. Правишь каталог — правь оба файла.
const wall = [100, 150, 200, 250, 300].map((t) => ({ l: 600, h: 300, t }))
const partition = [100, 150, 200, 250, 300].map((t) => ({ l: 600, h: 200, t }))

const products = [
  { density: 'D400', weight: 400, strength: 'B2,0', lambda: 0.1, frost: 35, sizes: [...wall, ...partition] },
  { density: 'D500', weight: 500, strength: 'B2,5', lambda: 0.12, frost: 35, sizes: [...wall, ...partition] },
  { density: 'D600', weight: 600, strength: 'B3,5', lambda: 0.14, frost: 50, sizes: [...wall, ...partition] },
  { density: 'D700', weight: 700, strength: 'B5,0', lambda: 0.17, frost: 50, sizes: [...wall, ...partition] },
]

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).json({ products })
}
