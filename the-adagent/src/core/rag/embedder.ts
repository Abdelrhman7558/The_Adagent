import OpenAI from 'openai'
import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'
import { ENV } from '../../config/env.js'

const openai = new OpenAI({
  apiKey: ENV.OPENROUTER_API_KEY,
  baseURL: ENV.OPENROUTER_BASE_URL,
})

const cache = new LRUCache<string, number[]>({ max: 500, ttl: 1000 * 60 * 60 })

export const embedder = {
  async embed(text: string): Promise<number[]> {
    const key = createHash('md5').update(text).digest('hex')
    const cached = cache.get(key)
    if (cached) return cached

    const result = await openai.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: text
    })

    const embedding = result.data[0].embedding
    cache.set(key, embedding)
    return embedding
  },

  async batchEmbed(texts: string[]): Promise<number[][]> {
    const result = await openai.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: texts
    })
    return result.data.map(d => d.embedding)
  }
}
