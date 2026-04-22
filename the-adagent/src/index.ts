import { startServer } from './api/server.js'
import { startMessageWorkerIfAvailable, processIncomingMessage } from './workers/message.worker.js'
import { startMemoryWorkerIfAvailable } from './workers/memory.worker.js'
import { initQueues, setDirectProcessor } from './services/queue/bullmq.js'
import { verifyRedis } from './services/redis.js'
import { verifyChroma } from './services/chromadb.js'
import { logger } from './utils/logger.js'
import { ENV } from './config/env.js'

async function boot(): Promise<void> {
  logger.info('=========================================')
  logger.info('  Adstartup AI Agent — Starting up')
  logger.info('=========================================')

  // Step 1: Verify external services (graceful fallback)
  logger.info('Verifying Redis connection...')
  await verifyRedis()

  logger.info('Verifying ChromaDB connection...')
  await verifyChroma()

  // Step 2: Initialize queues
  const bullmqAvailable = await initQueues()

  // Step 3: Start workers or set direct processor
  let messageWorker: any = null
  let memoryWorker: any = null

  if (bullmqAvailable) {
    logger.info('Starting BullMQ workers...')
    messageWorker = await startMessageWorkerIfAvailable()
    if (ENV.ENABLE_COMPRESSION) {
      memoryWorker = await startMemoryWorkerIfAvailable()
    }
  }

  if (!messageWorker) {
    // Direct processing mode — process inline
    logger.info('📌 Direct processing mode — no queue')
    setDirectProcessor(processIncomingMessage)
  }

  // Step 4: Start API server
  logger.info('Starting Fastify server...')
  const server = await startServer()

  logger.info('=========================================')
  logger.info(`  ✅ Agent ready on port ${ENV.PORT}`)
  logger.info(`  Environment: ${ENV.NODE_ENV}`)
  logger.info(`  Queue mode: ${bullmqAvailable ? 'BullMQ' : 'Direct'}`)
  logger.info(`  Voice reply: ${ENV.ENABLE_VOICE_REPLY}`)
  logger.info(`  Escalation: ${ENV.ENABLE_ESCALATION}`)
  logger.info('=========================================')

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received')
    await server.close()
    if (messageWorker) await messageWorker.close()
    if (memoryWorker) await memoryWorker.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

boot().catch((err) => {
  logger.fatal({ err }, 'Failed to start agent')
  process.exit(1)
})
