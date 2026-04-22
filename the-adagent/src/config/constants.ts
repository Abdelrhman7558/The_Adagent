export const CONSTANTS = {
  // Memory
  MAX_HISTORY:          20,      // 10 message pairs
  CHAT_TTL:             86400,   // 24 hours
  COMPRESS_INTERVAL:    8,       // every 8 turns

  // Rate limiting
  RATE_LIMIT_WINDOW:    3,       // 3 seconds per chat
  DEDUP_TTL:            120,     // 120 second dedup window

  // RAG
  CHROMA_COLLECTION:    'adstartup_kb',
  RAG_TOP_K:            3,
  RAG_RELEVANCE_THRESHOLD: 0.8,
  RAG_FALLBACK_THRESHOLD:  1.0,

  // Wasender
  MAX_MESSAGE_LENGTH:   500,     // split threshold
  SPLIT_DELAY_MS:       800,     // delay between split messages
  TYPING_DELAY_MS:      1500,    // typing indicator duration

  // Queue
  MESSAGE_CONCURRENCY:  10,
  MEMORY_CONCURRENCY:   5,
  MAX_ATTEMPTS:         3,

  // Validator
  MAX_CHARS: {
    light:    150,
    standard: 350,
    deep:     600,
    critical: 400,
  } as const,
} as const
