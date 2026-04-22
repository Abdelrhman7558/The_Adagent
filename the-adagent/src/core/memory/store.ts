import { redis } from '../../services/redis.js'
import type { ChatState, ChatMessage, CustomerProfile, CompressedSummary } from '../../types/memory.js'
import { CONSTANTS } from '../../config/constants.js'

const KEY = {
  history:   (id: string) => `chat:${id}:history`,
  summary:   (id: string) => `chat:${id}:summary`,
  profile:   (id: string) => `chat:${id}:profile`,
  turnCount: (id: string) => `chat:${id}:turn_count`,
  escalated: (id: string) => `chat:${id}:escalated`,
}

export const memoryStore = {
  async load(chatId: string): Promise<ChatState> {
    const pipe = redis.pipeline()
    pipe.lrange(KEY.history(chatId), -CONSTANTS.MAX_HISTORY, -1)
    pipe.get(KEY.summary(chatId))
    pipe.hgetall(KEY.profile(chatId))
    pipe.get(KEY.turnCount(chatId))
    pipe.get(KEY.escalated(chatId))

    const results = await pipe.exec()
    if (!results) return { history: [], summary: null, profile: {}, turnCount: 0 }

    const [historyRes, summaryRes, profileRes, turnRes, escalatedRes] = results

    return {
      history: ((historyRes?.[1] as string[]) || []).map(h => JSON.parse(h) as ChatMessage),
      summary: summaryRes?.[1] ? JSON.parse(summaryRes[1] as string) as CompressedSummary : null,
      profile: (profileRes?.[1] as CustomerProfile) || {},
      turnCount: parseInt((turnRes?.[1] as string) || '0', 10),
      escalated: escalatedRes?.[1] === '1'
    }
  },

  async appendAndTrim(chatId: string, customerMsg: string, agentMsg: string, msgType?: string, mediaDescription?: string): Promise<void> {
    const now = Date.now()
    const pipe = redis.pipeline()

    const customerEntry: ChatMessage = { role: 'customer', content: customerMsg, ts: now }
    if (msgType && msgType !== 'text') customerEntry.type = msgType as any
    if (mediaDescription) customerEntry.mediaDescription = mediaDescription

    pipe.rpush(KEY.history(chatId), JSON.stringify(customerEntry))
    pipe.rpush(KEY.history(chatId), JSON.stringify({ role: 'agent', content: agentMsg, ts: now }))
    pipe.ltrim(KEY.history(chatId), -CONSTANTS.MAX_HISTORY, -1)
    pipe.incr(KEY.turnCount(chatId))
    pipe.expire(KEY.history(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.summary(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.profile(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.turnCount(chatId), CONSTANTS.CHAT_TTL)

    await pipe.exec()
  },

  async updateProfile(chatId: string, fields: Partial<CustomerProfile>): Promise<void> {
    if (Object.keys(fields).length === 0) return
    await redis.hset(KEY.profile(chatId), fields as Record<string, string>)
  },

  async saveSummary(chatId: string, summary: CompressedSummary): Promise<void> {
    await redis.set(KEY.summary(chatId), JSON.stringify(summary), 'EX', CONSTANTS.CHAT_TTL)
  },

  async setEscalated(chatId: string): Promise<void> {
    await redis.set(KEY.escalated(chatId), '1', 'EX', CONSTANTS.CHAT_TTL)
  }
}
