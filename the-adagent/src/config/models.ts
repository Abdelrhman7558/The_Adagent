import type { Depth } from '../types/routing.js'

export const MODEL_CONFIG: Record<Depth | 'compress', {
  model: string
  maxTokens: number
  temperature: number
}> = {
  light:    { model: 'openai/gpt-4o-mini', maxTokens: 120,  temperature: 0.7 },
  standard: { model: 'openai/gpt-4o-mini', maxTokens: 250,  temperature: 0.6 },
  deep:     { model: 'openai/gpt-4o',      maxTokens: 450,  temperature: 0.5 },
  critical: { model: 'openai/gpt-4o',      maxTokens: 350,  temperature: 0.4 },
  compress: { model: 'openai/gpt-4o-mini', maxTokens: 300,  temperature: 0.2 },
}

export const VISION_MODEL = 'openai/gpt-4o'
export const EMBEDDING_MODEL = 'openai/text-embedding-3-small'
