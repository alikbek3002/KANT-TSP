import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { z } from 'zod'

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 12, 'Укажите номер телефона'),
  size: z.string().trim().max(40).nullable().optional(),
  comment: z.string().trim().max(1000).optional().default(''),
  source: z.string().trim().max(60).optional().default('site'),
})

export type Lead = z.infer<typeof leadSchema> & { at: string; ip?: string }

const FILE = resolve(process.cwd(), 'data/leads.jsonl')

export async function saveLead(lead: Lead) {
  await mkdir(dirname(FILE), { recursive: true })
  await appendFile(FILE, JSON.stringify(lead) + '\n', 'utf8')
}

/** Дубль в Telegram — чтобы менеджер увидел заявку сразу, а не в файле. */
export async function notifyTelegram(lead: Lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return

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
