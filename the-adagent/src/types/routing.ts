export interface TriggerResult {
  triggered: boolean
  matched: string | null
  force: 'critical' | null
  escalate: boolean
  escalationType: 'support' | 'sales' | null
}

export interface IntentResult {
  intent: 'greeting' | 'question' | 'interest' | 'objection' | 'confusion'
  responseMode: 'casual_reply' | 'direct_answer' | 'explanation' | 'qualification' | 'reassurance'
  priority: 'low' | 'medium' | 'high'
  useRag: boolean
}

export type Depth = 'light' | 'standard' | 'deep' | 'critical'
export type Layer = 'memory_fetch' | 'rag_search' | 'response_agent'

export interface DepthResult {
  depth: Depth
  layers: Layer[]
  escalate: boolean
  escalationType: 'support' | 'sales' | null
}

export interface RoutingDecision extends IntentResult {
  depth: Depth
  layers: Layer[]
  topic: string | null
  escalate: boolean
  escalationType: 'support' | 'sales' | null
  keywordMatched: string | null
}
