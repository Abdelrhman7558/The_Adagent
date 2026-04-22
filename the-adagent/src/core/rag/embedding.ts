import { ENV } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * EMBEDDING SERVICE (MOCKED FOR REAL EXECUTION DEMO)
 */
export const embeddingService = {
  async generate(text: string): Promise<number[]> {
    logger.debug({ textLength: text.length }, "Mocked embedding generation");
    return Array(1536).fill(0.01);
  },
};
