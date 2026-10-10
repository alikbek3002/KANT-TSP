import 'dotenv/config'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import { products } from './catalog.js'
import { leadSchema, notifyTelegram, saveLead } from './leads.js'

const app = express()
app.use(express.json({ limit: '16kb' }))
app.use(cors())

// Простое ограничение: один номер не чаще раза в минуту.
const recent = new Map<string, number>()

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/catalog', (_req, res) => res.json({ products }))

app.get('/api/catalog/:density', (req, res) => {
  const found = products.find((p) => p.density.toLowerCase() === req.params.density.toLowerCase())
  if (!found) return res.status(404).json({ error: 'Такой плотности нет в каталоге' })
  res.json(found)
})

app.post('/api/leads', async (req, res) => {
  const parsed = leadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' })
  }

  const key = parsed.data.phone.replace(/\D/g, '')
  const last = recent.get(key) ?? 0
  if (Date.now() - last < 60_000) {
    return res.status(429).json({ error: 'Заявка уже отправлена, мы скоро перезвоним' })
  }
  recent.set(key, Date.now())

  const lead = {
    ...parsed.data,
    at: new Date().toISOString(),
    ip: req.ip,
  }

  try {
    await saveLead(lead)
  } catch (err) {
    console.error('save lead:', err)
    return res.status(500).json({ error: 'Не удалось сохранить заявку' })
  }

  void notifyTelegram(lead)
  res.status(201).json({ ok: true })
})

// В проде тот же процесс отдаёт собранный фронт.
const dist = resolve(process.cwd(), '../client/dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/.*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')))
}

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => console.log(`bekemblock api: http://localhost:${port}`))
