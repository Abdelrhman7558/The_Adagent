import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { dedup } from '../../utils/dedup.js'
import { enqueueMessage } from '../../services/queue/bullmq.js'
import { logger } from '../../utils/logger.js'
import { ENV } from '../../config/env.js'
import type { WasenderWebhookPayload, NormalizedMessage, MessageType, WasenderMediaInfo } from '../../types/wasender.js'

export async function webhookRoute(app: FastifyInstance): Promise<void> {
  app.post('/wh', async (request: FastifyRequest, reply: FastifyReply) => {
    // ===== 1. VERIFY SIGNATURE =====
    if (ENV.WASENDER_WEBHOOK_SECRET) {
      const signature = request.headers['x-webhook-signature']
      if (signature !== ENV.WASENDER_WEBHOOK_SECRET) {
        logger.warn({ signature }, 'Invalid webhook signature')
        return reply.code(401).send({ error: 'Invalid signature' })
      }
    }

    // ===== 2. PARSE PAYLOAD =====
    const payload = request.body as WasenderWebhookPayload

    // Only process message events
    if (!payload?.event?.includes('message') || !payload?.data?.messages) {
      return reply.code(200).send({ status: 'skipped', reason: 'non-message-event' })
    }

    const { key, messageBody, message: rawMessage } = payload.data.messages

    // ===== 3. LOG EVERYTHING (for Team Chat ID capture) =====
    logger.info({
      event: payload.event,
      fromMe: key.fromMe,
      remoteJid: key.remoteJid,
      cleanedSenderPn: key.cleanedSenderPn,
      messageBody: messageBody?.slice(0, 100),
      messageId: key.id
    }, '📩 Webhook received')

    // ===== 4. FILTERS =====

    // Skip own messages
    if (key.fromMe) {
      return reply.code(200).send({ status: 'skipped', reason: 'own-message' })
    }

    // Skip group messages
    if (key.remoteJid?.includes('@g.us')) {
      return reply.code(200).send({ status: 'skipped', reason: 'group' })
    }

    // ===== 5. DETECT MESSAGE TYPE =====
    let type: MessageType = 'text'
    let mediaInfo: WasenderMediaInfo | null = null

    if (rawMessage?.imageMessage) {
      type = 'image'
      mediaInfo = rawMessage.imageMessage
    } else if (rawMessage?.audioMessage) {
      type = 'audio'
      mediaInfo = rawMessage.audioMessage
    } else if (rawMessage?.videoMessage) {
      type = 'video'
      mediaInfo = rawMessage.videoMessage
    } else if (rawMessage?.documentMessage) {
      type = 'document'
      mediaInfo = rawMessage.documentMessage
    } else if (rawMessage?.stickerMessage) {
      type = 'sticker'
      mediaInfo = rawMessage.stickerMessage
    }

    // Skip if no text and no media
    if (!messageBody?.trim() && !mediaInfo) {
      return reply.code(200).send({ status: 'skipped', reason: 'empty' })
    }

    // ===== 6. DEDUP =====
    const isNew = await dedup.isNew(key.id)
    if (!isNew) {
      return reply.code(200).send({ status: 'skipped', reason: 'duplicate' })
    }

    // ===== 7. RATE LIMIT =====
    const canReply = await dedup.canRespond(key.remoteJid)
    if (!canReply) {
      return reply.code(200).send({ status: 'skipped', reason: 'rate-limited' })
    }

    // ===== 8. ENQUEUE =====
    const normalized: NormalizedMessage = {
      id: key.id,
      chatId: key.remoteJid,
      senderPhone: key.cleanedSenderPn || key.cleanedParticipantPn || key.remoteJid,
      fromMe: key.fromMe,
      text: messageBody?.trim() || null,
      type,
      mediaInfo,
      timestamp: payload.timestamp || Date.now(),
      isGroup: key.remoteJid?.includes('@g.us') || false
    }

    await enqueueMessage(normalized)

    logger.debug({ chatId: normalized.chatId, type: normalized.type }, 'Message enqueued')

    // ACK immediately
    return reply.code(200).send({ status: 'received' })
  })
}
