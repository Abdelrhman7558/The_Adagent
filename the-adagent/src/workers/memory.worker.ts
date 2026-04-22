import { compressor } from '../core/memory/compressor.js'
import { logger } from '../utils/logger.js'
import { CONSTANTS } from '../config/constants.js'

export async function startMemoryWorkerIfAvailable(): Promise<any | null> {
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
    const worker = new Worker('memory', async (job: any) => {
      const { chatId } = job.data
      logger.info({ chatId }, '🧠 Compressing memory')
      await compressor.compress(chatId)
    }, {
      connection,
      concurrency: CONSTANTS.MEMORY_CONCURRENCY,
    })

    worker.on('failed', (job: any, err: Error) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Memory job failed')
    })

    logger.info('BullMQ memory worker started ✓')
    return worker
  } catch {
    logger.info('BullMQ memory worker not started — compression skipped')
    return null
  }
}
