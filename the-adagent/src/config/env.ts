import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback
}

export const ENV = {
  PORT:                  parseInt(optional('PORT', '3000')),
  NODE_ENV:              optional('NODE_ENV', 'development'),
  LOG_LEVEL:             optional('LOG_LEVEL', 'info'),

  // WaSenderAPI
  WASENDER_API_KEY:      required('WASENDER_API_KEY'),
  WASENDER_API_URL:      optional('WASENDER_API_URL', 'https://www.wasenderapi.com'),
  WASENDER_WEBHOOK_SECRET: optional('WASENDER_WEBHOOK_SECRET', ''),
  TEAM_CHAT_ID:          optional('TEAM_CHAT_ID', ''),

  // Audio Transcription (Whisper) keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',

  // OpenRouter (OpenAI-compatible)
  OPENROUTER_API_KEY:    required('OPENROUTER_API_KEY'),
  OPENROUTER_BASE_URL:   optional('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),

  // ElevenLabs
  ELEVENLABS_API_KEY:    optional('ELEVENLABS_API_KEY', ''),
  ELEVENLABS_VOICE_ID:   optional('ELEVENLABS_VOICE_ID', ''),

  // Redis
  REDIS_URL:             optional('REDIS_URL', 'redis://localhost:6379'),

  // ChromaDB
  CHROMA_URL:            optional('CHROMA_URL', 'http://localhost:8000'),
  CHROMA_COLLECTION:     optional('CHROMA_COLLECTION', 'adstartup_kb'),

  // Google Calendar
  GOOGLE_CALENDAR_ID:    optional('GOOGLE_CALENDAR_ID', ''),

  // Knowledge Base
  VAULT_PATH:            optional('VAULT_PATH', './knowledge/obsidian/Adstartup-KB'),

  // LLM
  LLM_TIMEOUT_MS:        parseInt(optional('LLM_TIMEOUT_MS', '15000')),
  LLM_RETRY_TIMEOUT_MS:  parseInt(optional('LLM_RETRY_TIMEOUT_MS', '8000')),

  // Features
  ENABLE_COMPRESSION:    optional('ENABLE_COMPRESSION', 'true') === 'true',
  ENABLE_ESCALATION:     optional('ENABLE_ESCALATION', 'true') === 'true',
  ENABLE_METRICS:        optional('ENABLE_METRICS', 'true') === 'true',
  ENABLE_VOICE_REPLY:    optional('ENABLE_VOICE_REPLY', 'false') === 'true',
} as const
