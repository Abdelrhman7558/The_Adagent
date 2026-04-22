// ===== WaSenderAPI Webhook Payload (Real format) =====

export interface WasenderWebhookKey {
  id: string
  fromMe: boolean
  remoteJid: string
  cleanedSenderPn?: string
  cleanedParticipantPn?: string
  senderLid?: string
}

export interface WasenderMediaInfo {
  url?: string
  mimetype?: string
  mediaKey?: string
  fileSha256?: string
  fileLength?: string
  fileName?: string
  seconds?: number
  ptt?: boolean  // push-to-talk (voice note)
}

export interface WasenderRawMessage {
  conversation?: string
  extendedTextMessage?: { text?: string }
  imageMessage?: WasenderMediaInfo & { caption?: string }
  videoMessage?: WasenderMediaInfo & { caption?: string }
  audioMessage?: WasenderMediaInfo
  documentMessage?: WasenderMediaInfo
  stickerMessage?: WasenderMediaInfo
}

export interface WasenderWebhookMessages {
  key: WasenderWebhookKey
  messageBody: string | null
  message: WasenderRawMessage
}

export interface WasenderWebhookPayload {
  event: string
  timestamp: number
  data: {
    messages: WasenderWebhookMessages
  }
}

// ===== Normalized message for pipeline =====

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'unknown'

export interface NormalizedMessage {
  id: string
  chatId: string          // remoteJid
  senderPhone: string     // cleanedSenderPn or cleanedParticipantPn
  fromMe: boolean
  text: string | null     // messageBody
  type: MessageType
  mediaInfo: WasenderMediaInfo | null
  timestamp: number
  isGroup: boolean
}

// ===== Send payloads =====

export interface WasenderSendText {
  to: string
  text: string
}

export interface WasenderSendAudio {
  to: string
  audioUrl: string
}

export interface WasenderSendImage {
  to: string
  imageUrl: string
  caption?: string
}
