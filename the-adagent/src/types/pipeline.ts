import type { RoutingDecision, Depth } from './routing.js'
import type { ChatState, CustomerProfile } from './memory.js'
import type { MessageType } from './wasender.js'

export interface PipelineInput {
  chatId: string
  message: string
  senderName: string
  senderPhone: string
  timestamp: number
  messageId: string
  messageType: MessageType
  mediaUrl?: string        // decrypted media URL (for images/audio)
  mediaDescription?: string // vision/whisper result
}

export interface PipelineContext {
  input: PipelineInput
  state: ChatState
  routing: RoutingDecision
  ragContext: string | null
  historyContext: string
}

export interface PipelineResult {
  depth: Depth
  latencyMs: number
  ragHit: boolean
  escalated: boolean
  layersActivated: number
  responseText: string
}
