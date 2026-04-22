import { redis } from "../../services/redis.js";
import { logger } from "../../utils/logger.js";

/**
 * SESSION SERVICE (MEMORY)
 * Redis Schema: session:{wa_id} -> JSON Hash
 * {
 *   history: Array of { role: 'user' | 'assistant', content: string },
 *   last_intent: string,
 *   state: string
 * }
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SessionData {
  history: ChatMessage[];
  last_intent: string;
  state: string;
}

const SESSION_PREFIX = "session:";
const TTL_24H = 24 * 60 * 60;

export const sessionService = {
  async get(waId: string): Promise<SessionData> {
    try {
      const data = await redis.get(`${SESSION_PREFIX}${waId}`);
      if (!data) {
        return { history: [], last_intent: "none", state: "ready" };
      }
      return JSON.parse(data) as SessionData;
    } catch (err) {
      logger.error({ err, waId }, "Failed to get session from Redis");
      return { history: [], last_intent: "none", state: "ready" };
    }
  },

  async save(waId: string, data: SessionData): Promise<void> {
    try {
      // STRICT RULE: TTL = 24h
      await redis.set(
        `${SESSION_PREFIX}${waId}`,
        JSON.stringify(data),
        "EX",
        TTL_24H
      );
    } catch (err) {
      logger.error({ err, waId }, "Failed to save session to Redis");
    }
  },

  async updateHistory(waId: string, role: "user" | "assistant", content: string): Promise<void> {
    const session = await this.get(waId);
    
    session.history.push({ role, content });

    // STRICT RULE: Trimming last 10 messages (oldest first)
    if (session.history.length > 10) {
      session.history = session.history.slice(-10);
    }

    await this.save(waId, session);
  },
};
