import { SYSTEM_PROMPT } from './prompts/responseAgent.prompt.js'
import type { ChatState } from '../../types/memory.js'
import type { RoutingDecision, Depth } from '../../types/routing.js'
import type { CustomerProfile } from '../../types/memory.js'


interface UserPromptInput {
  message: string
  history: string
  ragContext: string | null
  profile: CustomerProfile
  routing: RoutingDecision
  mediaDescription?: string
}

export const promptBuilder = {
  getSystemPrompt(): string {
    return SYSTEM_PROMPT
  },

  buildHistory(state: ChatState, depth: Depth): string {
    const { history, summary } = state

    const sliceMap: Record<Depth, number> = {
      light: 4,
      standard: 10,
      deep: 6,
      critical: 6,
    }

    const recentSlice = history.slice(-sliceMap[depth])
    const recentText = recentSlice
      .map(m => {
        let line = `${m.role === 'customer' ? 'العميل' : 'أحمد'}: ${m.content}`
        if (m.mediaDescription) line += ` [صورة/صوت: ${m.mediaDescription}]`
        return line
      })
      .join('\n')

    if ((depth === 'deep' || depth === 'critical') && summary) {
      return `[ملخص المحادثة السابقة]\n${summary.summary}\n\n[آخر الرسائل]\n${recentText}`
    }

    return recentText
  },

  buildUserPrompt(input: UserPromptInput): string {
    const { message, history, ragContext, profile, routing, mediaDescription } = input
    const parts: string[] = []

    // Routing metadata
    parts.push(`[Control]`)
    parts.push(`intent: ${routing.intent}`)
    parts.push(`response_mode: ${routing.responseMode}`)
    parts.push(`priority: ${routing.priority}`)
    parts.push(`processing_depth: ${routing.depth}`)

    // Profile
    if (profile.name || profile.company || profile.industry || profile.platform || profile.business_type || profile.source) {
      parts.push(`\n[ملف العميل]`)
      if (profile.name) parts.push(`الاسم: ${profile.name}`)
      if (profile.company) parts.push(`الشركة: ${profile.company}`)
      if (profile.industry) parts.push(`المجال: ${profile.industry}`)
      if (profile.platform) parts.push(`المنصة: ${profile.platform}`)
      if (profile.business_type) parts.push(`نوع العمل: ${profile.business_type}`)
      if (profile.source) parts.push(`المصدر: ${profile.source}`)
    }

    // Chat history
    if (history) {
      parts.push(`\n[تاريخ المحادثة]\n${history}`)
    }

    // RAG context
    if (ragContext) {
      parts.push(`\n[معلومات من قاعدة المعرفة]\n${ragContext}`)
    }

    // Media description
    if (mediaDescription) {
      parts.push(`\n[وصف الميديا المرسلة]\n${mediaDescription}`)
    }

    // Current message
    parts.push(`\n[رسالة العميل]\n${message}`)

    return parts.join('\n')
  }
}
