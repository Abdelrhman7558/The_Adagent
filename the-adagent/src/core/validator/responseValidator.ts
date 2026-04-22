import type { Depth } from '../../types/routing.js'

interface ValidationResult {
  ok: boolean
  text: string
  action: 'send' | 'sanitize' | 'truncate' | 'fallback'
}

const IDENTITY_LEAKS = ['أنا AI', 'أنا بوت', "I'm an AI", 'language model', 'ChatGPT', 'OpenAI', 'GPT', 'أنا ذكاء اصطناعي', 'Claude', 'Anthropic']
const FORMAL_MARKERS = ['نحن نسعى', 'يسعدنا', 'نود أن', 'بكل سرور', 'لا تتردد', 'تفضلوا', 'نأمل', 'بالتأكيد سأساعدك', 'سعيد بتواصلك']

const MAX_CHARS: Record<Depth, number> = {
  light: 150,
  standard: 350,
  deep: 600,
  critical: 400
}

const FALLBACKS: Record<string, string> = {
  default:    'خليني أتأكدلك من المعلومة دي وأرجعلك 🙏',
  pricing:    'الأسعار بتختلف حسب الاحتياج — تحب أحكيلك عن الباكدج بتاعتنا؟',
  services:   'عندنا خدمات مختلفة — تحب أحكيلك عنها؟',
  support:    'هوصّلك بحد من الفريق يفيدك أكتر',
  error:      'عذراً حصلت مشكلة بسيطة. حد من فريقنا هيرد عليك قريب 🙏',
}

export const responseValidator = {
  validate(response: string, depth: Depth, topic: string | null): ValidationResult {
    // Check 1: Empty / broken
    if (!response || response.trim().length < 2) {
      return { ok: false, text: this.getFallback(topic), action: 'fallback' }
    }

    let cleaned = response.trim()

    // Check 2: Identity leak — sanitize, don't reject
    for (const phrase of IDENTITY_LEAKS) {
      if (cleaned.includes(phrase)) {
        cleaned = cleaned.split(phrase).join('أنا أحمد من فريق Adstartup')
      }
    }

    // Check 3: Formal Arabic — reject
    for (const marker of FORMAL_MARKERS) {
      if (cleaned.includes(marker)) {
        return { ok: false, text: this.getFallback(topic), action: 'fallback' }
      }
    }

    // Check 4: Length — truncate at sentence boundary
    const maxLen = MAX_CHARS[depth]
    if (cleaned.length > maxLen * 1.5) {
      return { ok: true, text: truncateAtSentence(cleaned, maxLen), action: 'truncate' }
    }

    // All clear
    if (cleaned !== response.trim()) {
      return { ok: true, text: cleaned, action: 'sanitize' }
    }

    return { ok: true, text: cleaned, action: 'send' }
  },

  getFallback(topic: string | null): string {
    return FALLBACKS[topic || 'default'] || FALLBACKS.default
  }
}

function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const truncated = text.substring(0, maxLen)
  const lastBreak = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('؟'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('\n'),
    truncated.lastIndexOf('،')
  )
  return lastBreak > maxLen * 0.5
    ? truncated.substring(0, lastBreak + 1)
    : truncated + '...'
}
