import { ENV } from '../../config/env.js'
import { CONSTANTS } from '../../config/constants.js'
import { logger } from '../../utils/logger.js'

const API = ENV.WASENDER_API_URL
const HEADERS = {
  'Authorization': `Bearer ${ENV.WASENDER_API_KEY}`,
  'Content-Type': 'application/json',
}

export const wasender = {
  /** Send a text message */
  async sendText(to: string, text: string): Promise<void> {
    const messages = splitIfNeeded(text, CONSTANTS.MAX_MESSAGE_LENGTH)

    for (let i = 0; i < messages.length; i++) {
      await apiCall('/api/send-message', { to, text: messages[i] })
      if (i < messages.length - 1) {
        await sleep(CONSTANTS.SPLIT_DELAY_MS)
      }
    }
  },

  /** Send an audio file via URL */
  async sendAudio(to: string, audioUrl: string): Promise<void> {
    await apiCall('/api/send-message', { to, audioUrl })
  },

  /** Send an image with optional caption */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<void> {
    await apiCall('/api/send-message', { to, imageUrl, caption })
  },

  /** Decrypt an incoming media file — returns a public URL (valid 1 hour) */
  async decryptMedia(webhookMessageData: any): Promise<string | null> {
    try {
      const res = await fetch(`${API}/api/decrypt-media`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ data: { messages: webhookMessageData } }),
      })

      if (!res.ok) {
        const body = await res.text()
        logger.error({ status: res.status, body }, 'Decrypt media failed')
        return null
      }

      const json = await res.json() as { success: boolean; publicUrl?: string }
      return json.publicUrl || null
    } catch (err) {
      logger.error({ err }, 'Decrypt media error')
      return null
    }
  },

  /** Send typing indicator */
  async sendTyping(to: string): Promise<void> {
    try {
      await apiCall('/api/send-presence-update', { jid: to, type: 'composing' })
    } catch {
      // Non-critical, ignore errors
    }
  },

  /** Mark a message as read */
  async markAsRead(messageId: string, chatId: string): Promise<void> {
    try {
      await apiCall('/api/messages/read', { messageId, chatId })
    } catch {
      // Non-critical, ignore errors
    }
  },

  /** Notify the team via escalation message */
  /** Notify the team via escalation message */
  async notifyTeam(
    chatId: string,
    senderName: string,
    summary: string,
    escalationType: string,
    triggerInfo: string
  ): Promise<void> {
    if (!ENV.ENABLE_ESCALATION || !ENV.TEAM_CHAT_ID) return

    const alert = `🚨 *طلب تدخل بشري* 🚨\n\n` +
      `👤 *العميل:* ${senderName}\n` +
      `📞 *الرقم:* +${chatId.replace('@s.whatsapp.net', '').replace('@c.us', '')}\n` +
      `📌 *السبب:* ${triggerInfo} (${escalationType})\n\n` +
      `📝 *الملخص:*\n${summary}`;

    try {
      await this.sendText(ENV.TEAM_CHAT_ID, alert)
      logger.info({ chatId, escalationType }, 'Team notified')
    } catch (err) {
      logger.error({ err, chatId }, 'Failed to notify team')
    }
  },
}

// ===== Internal helpers =====

async function apiCall(path: string, body: Record<string, any>): Promise<any> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    logger.error({ path, status: response.status, body: text }, 'WaSenderAPI call failed')
    throw new Error(`WaSenderAPI ${path} failed: ${response.status}`)
  }

  return response.json()
}

function splitIfNeeded(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]

  const parts: string[] = []
  let remaining = text

  while (remaining.length > maxLen) {
    let splitIndex = remaining.lastIndexOf('\n', maxLen)
    if (splitIndex < maxLen * 0.3) {
      splitIndex = remaining.lastIndexOf('. ', maxLen)
    }
    if (splitIndex < maxLen * 0.3) {
      splitIndex = remaining.lastIndexOf(' ', maxLen)
    }
    if (splitIndex < maxLen * 0.3) {
      splitIndex = maxLen
    }

    parts.push(remaining.slice(0, splitIndex).trim())
    remaining = remaining.slice(splitIndex).trim()
  }

  if (remaining) parts.push(remaining)
  return parts
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
