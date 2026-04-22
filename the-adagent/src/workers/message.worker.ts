import { logger } from '../utils/logger.js'
import { processMessage } from '../core/orchestrator.js'
import { wasender } from '../services/whatsapp/wasender.js'
import { llmClient } from '../core/llm/client.js'
import { memoryStore } from '../core/memory/store.js'
import { CONSTANTS } from '../config/constants.js'
import { enqueueCompression } from '../services/queue/bullmq.js'
import type { NormalizedMessage } from '../types/wasender.js'
import type { PipelineInput } from '../types/pipeline.js'

/**
 * Process a single message through the full pipeline.
 * Used both by BullMQ worker and direct processing mode.
 */
export async function processIncomingMessage(msg: NormalizedMessage): Promise<void> {
  logger.info({ chatId: msg.chatId, type: msg.type, messageId: msg.id }, '🔧 Processing message')

  try {
    // ===== MEDIA PREPROCESSING =====
    let mediaDescription: string | undefined
    let messageText = msg.text || ''
    let mediaUrl: string | undefined

    if (msg.type === 'image' && msg.mediaInfo) {
      mediaUrl = await wasender.decryptMedia({ key: { id: msg.id }, message: { imageMessage: msg.mediaInfo } }) || undefined
      if (mediaUrl) {
        mediaDescription = await llmClient.analyzeImage(mediaUrl, messageText || undefined) || 'صورة'
        if (!messageText) messageText = '[صورة]'
      }
    } else if (msg.type === 'audio' && msg.mediaInfo) {
      mediaUrl = await wasender.decryptMedia({ key: { id: msg.id }, message: { audioMessage: msg.mediaInfo } }) || undefined
      if (mediaUrl) {
        const transcription = await llmClient.transcribeAudio(mediaUrl)
        if (transcription) {
          messageText = transcription
          mediaDescription = `[رسالة صوتية: ${transcription}]`
        } else {
          messageText = '[رسالة صوتية]'
          mediaDescription = 'رسالة صوتية غير مفهومة'
        }
      }
    }

    if (!messageText) messageText = `[${msg.type}]`

    // ===== RUN PIPELINE =====
    const input: PipelineInput = {
      chatId: msg.chatId,
      message: messageText,
      senderName: msg.senderPhone,
      senderPhone: msg.senderPhone,
      timestamp: msg.timestamp,
      messageId: msg.id,
      messageType: msg.type,
      mediaUrl,
      mediaDescription,
    }

    const result = await processMessage(input)

    // ===== TRIGGER COMPRESSION IF NEEDED =====
    const state = await memoryStore.load(msg.chatId)
    if (state.turnCount > 0 && state.turnCount % CONSTANTS.COMPRESS_INTERVAL === 0) {
      await enqueueCompression(msg.chatId)
    }

    logger.info({
      chatId: msg.chatId,
      depth: result.depth,
      latency: result.latencyMs,
      ragHit: result.ragHit,
    }, '✅ Message processed')
  } catch (err) {
    logger.error({ err, chatId: msg.chatId }, '❌ Message processing failed')
    throw err
  }
}

/**
 * Start BullMQ worker if Redis is available.
 */
export async function startMessageWorkerIfAvailable(): Promise<any | null> {
  try {
    const IORedis = (await import('ioredis')).default
    const Redis = (IORedis as any).default || IORedis
    const connection = new (Redis as any)(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => { if (times > 1) return null; return 500 },
      enableOfflineQueue: false,
    })
    connection.on('error', () => {})
    await connection.ping()

    const { Worker } = await import('bullmq')
    const worker = new Worker('messages', async (job: any) => {
      await processIncomingMessage(job.data)
    }, {
      connection,
      concurrency: CONSTANTS.MESSAGE_CONCURRENCY,
    })

    worker.on('failed', (job: any, err: Error) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Message job failed')
    })

    logger.info('BullMQ message worker started ✓')
    return worker
  } catch {
    logger.info('BullMQ worker not started — using direct processing')
    return null
  }
}
