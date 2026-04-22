import { memoryStore } from './store.js'
import { llmClient } from '../llm/client.js'
import { logger } from '../../utils/logger.js'
import type { CompressedSummary } from '../../types/memory.js'

const COMPRESS_PROMPT = `You are a conversation memory compressor. Compress the chat history into structured JSON.
Output ONLY valid JSON:
{
  "summary": "2-4 sentence summary in Egyptian Arabic",
  "topics": ["discussed topics"],
  "sentiment": "positive | neutral | hesitant | negative",
  "stage": "discovery | exploration | evaluation | closing | post_sale",
  "openQuestions": ["unanswered questions max 2"],
  "lastCta": "last call-to-action offered or null"
}
No markdown. No explanation.`

export const compressor = {
  async compress(chatId: string): Promise<void> {
    const state = await memoryStore.load(chatId)
    if (state.history.length < 8) return

    const historyText = state.history
      .map(m => `${m.role === 'customer' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n')

    const previousContext = state.summary
      ? `Previous summary:\n${JSON.stringify(state.summary)}\n\n`
      : ''

    const input = `${previousContext}Chat History:\n${historyText}`

    try {
      const result = await llmClient.generate('light', COMPRESS_PROMPT, input)
      if (!result) return

      const parsed = JSON.parse(result) as CompressedSummary
      await memoryStore.saveSummary(chatId, parsed)
      logger.info({ chatId }, 'Memory compressed')
    } catch (err) {
      logger.error({ err, chatId }, 'Memory compression failed')
    }
  }
}
