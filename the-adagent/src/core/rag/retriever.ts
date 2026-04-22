import { embedder } from './embedder.js'
import { getOrCreateCollection } from '../../services/chromadb.js'
import { CONSTANTS } from '../../config/constants.js'
import { logger } from '../../utils/logger.js'

export const retriever = {
  async retrieve(message: string, topic: string | null): Promise<string | null> {
    try {
      const collection = await getOrCreateCollection(CONSTANTS.CHROMA_COLLECTION)
      const embedding = await embedder.embed(message)

      // Primary: topic-filtered search
      let results = await collection.query({
        queryEmbeddings: [embedding],
        nResults: 3,
        where: topic ? { topic: { $eq: topic } } : undefined
      })

      // Fallback: unfiltered if empty or low relevance
      if (
        !results.documents?.[0]?.length ||
        (results.distances?.[0]?.[0] ?? 999) > CONSTANTS.RAG_RELEVANCE_THRESHOLD
      ) {
        results = await collection.query({
          queryEmbeddings: [embedding],
          nResults: 3
        })
      }

      // No relevant results
      if (
        !results.documents?.[0]?.length ||
        (results.distances?.[0]?.[0] ?? 999) > CONSTANTS.RAG_FALLBACK_THRESHOLD
      ) {
        logger.debug({ message: message.slice(0, 50), topic }, 'RAG: no relevant results')
        return null
      }

      return results.documents[0]
        .filter(Boolean)
        .join('\n---\n')
    } catch (err) {
      logger.error({ err }, 'RAG retrieval failed')
      return null
    }
  }
}
