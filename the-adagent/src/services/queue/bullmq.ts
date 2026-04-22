import { logger } from '../../utils/logger.js'
import type { NormalizedMessage } from '../../types/wasender.js'
import net from 'net'

let messageQueue: any = null
let memoryQueue: any = null
let directProcessor: ((msg: NormalizedMessage) => Promise<void>) | null = null

export function setDirectProcessor(fn: (msg: NormalizedMessage) => Promise<void>): void {
  directProcessor = fn
}

/**
 * Quick TCP check to see if Redis is reachable before creating BullMQ.
 */
async function isRedisReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
    const socket = net.createConnection({
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    })
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 1500)

    socket.on('connect', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timeout)
      socket.destroy()
      resolve(false)
    })
  })
}

export async function initQueues(): Promise<boolean> {
  const redisUp = await isRedisReachable()
  if (!redisUp) {
    logger.warn('Redis not reachable — BullMQ disabled, using direct processing')
    return false
  }

  try {
    const IORedis = (await import('ioredis')).default
    const Redis = (IORedis as any).default || IORedis
    const connection = new (Redis as any)(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => {
        if (times > 2) return null
        return Math.min(times * 500, 2000)
      },
    })
    connection.on('error', () => {})

    const { Queue } = await import('bullmq')
    messageQueue = new Queue('messages', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    })
    memoryQueue = new Queue('memory', {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      },
    })

    logger.info('BullMQ queues initialized ✓')
    return true
  } catch (err) {
    logger.warn('BullMQ initialization failed — using direct processing')
    return false
  }
}

export async function enqueueMessage(msg: NormalizedMessage): Promise<void> {
  if (messageQueue) {
    await messageQueue.add('process', msg, { jobId: msg.id })
    return
  }

  if (directProcessor) {
    directProcessor(msg).catch(err => {
      logger.error({ err, chatId: msg.chatId }, 'Direct processing failed')
    })
  } else {
    logger.error('No message processor available!')
  }
}

export async function enqueueCompression(chatId: string): Promise<void> {
  if (memoryQueue) {
    await memoryQueue.add('compress', { chatId })
    return
  }
  logger.debug({ chatId }, 'Compression skipped (no queue)')
}

export { messageQueue, memoryQueue }
