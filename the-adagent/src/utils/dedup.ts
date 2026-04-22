import { redis } from '../services/redis.js'
import { CONSTANTS } from '../config/constants.js'
import { logger } from './logger.js'

export const dedup = {
  /**
   * Check if a message ID is new (not seen before).
   * Returns true if new, false if duplicate.
   */
  async isNew(messageId: string): Promise<boolean> {
    const key = `dedup:${messageId}`
    const result = await redis.set(key, '1', 'EX', CONSTANTS.DEDUP_TTL, 'NX')
    return result === 'OK'
  },

  /**
   * Per-chat rate limiter.
   * Returns true if the chat can receive a response, false if rate-limited.
   */
  async canRespond(chatId: string): Promise<boolean> {
    const key = `rate:${chatId}`
    const exists = await redis.exists(key)
    if (exists) {
      logger.debug({ chatId }, 'Rate limited')
      return false
    }
    await redis.set(key, '1', 'EX', CONSTANTS.RATE_LIMIT_WINDOW)
    return true
  },
}
