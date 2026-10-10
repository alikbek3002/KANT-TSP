import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// Та же проверка, что и в server/src/leads.ts. На Vercel диска нет, поэтому
// заявка уходит в Telegram и в лог функции.
const leadSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 12, 'Укажите номер телефона'),
  size: z.string().trim().max(40).nullable().optional(),
  comment: z.string().trim().max(1000).optional().default(''),
  source: z.string().trim().max(60).optional().default('site'),
})

const recent = new Map<string, number>()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Только POST' })

  const parsed = leadSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Проверьте поля формы' })
  }

  const key = parsed.data.phone.replace(/\D/g, '')
  if (Date.now() - (recent.get(key) ?? 0) < 60_000) {
    return res.status(429).json({ error: 'Заявка уже отправлена, мы скоро перезвоним' })
  }
  recent.set(key, Date.now())

  const lead = { ...parsed.data, at: new Date().toISOString() }
  console.log('lead', JSON.stringify(lead))

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat = process.env.TELEGRAM_CHAT_ID
  if (token && chat) {
    const text = [
      'Заявка с сайта bekemblock.kg',
      `Имя: ${lead.name}`,
      `Телефон: ${lead.phone}`,
      lead.size ? `Типоразмер: ${lead.size}` : null,
      lead.comment ? `Комментарий: ${lead.comment}` : null,
      `Страница: ${lead.source}`,
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text }),
      })
    } catch (err) {
      console.error('telegram:', err)
    }
  }

  return res.status(201).json({ ok: true })
}
