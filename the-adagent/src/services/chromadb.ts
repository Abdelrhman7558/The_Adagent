import { ChromaClient } from 'chromadb'
import { ENV } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const chromaClient = new ChromaClient({ path: ENV.CHROMA_URL })

export async function verifyChroma(): Promise<void> {
  try {
    await chromaClient.heartbeat()
    logger.info('ChromaDB connected ✓')
  } catch (err) {
    logger.warn({ err }, 'ChromaDB not available — RAG will be disabled')
  }
}

export async function getOrCreateCollection(name: string) {
  return chromaClient.getOrCreateCollection({ name })
}
