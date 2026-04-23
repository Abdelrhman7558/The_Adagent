export interface ChatMessage {
  role: 'customer' | 'agent'
  content: string
  ts: number
  type?: 'text' | 'image' | 'audio'  // what type of message was received
  mediaDescription?: string           // vision/transcription result
}

export interface CustomerProfile {
  name?: string
  company?: string
  industry?: string
  role?: string
  phone?: string
  field?: string        // from lead form (e.g. "fashion", "electronics")
  platform?: string     // noon, amazon, jumia etc
  source?: string       // e.g. "adstartup_ad"
  business_type?: string // e.g. "website", "social_media"
}

export interface CompressedSummary {
  summary: string
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'hesitant' | 'negative'
  stage: 'discovery' | 'exploration' | 'evaluation' | 'closing' | 'post_sale'
  openQuestions: string[]
  lastCta: string | null
}

export interface ChatState {
  history: ChatMessage[]
  summary: CompressedSummary | null
  profile: CustomerProfile
  turnCount: number
  escalated?: boolean
}
