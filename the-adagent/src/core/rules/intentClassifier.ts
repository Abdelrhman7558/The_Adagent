import { PATTERNS } from './patterns.js'
import type { IntentResult } from '../../types/routing.js'

export const intentClassifier = {
  classify(message: string, historyLength: number): IntentResult {
    const msg = message.trim()
    const words = msg.split(/\s+/).length

    if (PATTERNS.greeting.test(msg) && words <= 4)
      return { intent: 'greeting', responseMode: 'casual_reply', priority: 'low', useRag: false }

    if (PATTERNS.ack.test(msg) && words <= 3)
      return { intent: 'greeting', responseMode: 'casual_reply', priority: 'low', useRag: false }

    if (PATTERNS.objection.test(msg))
      return { intent: 'objection', responseMode: 'reassurance', priority: 'medium', useRag: true }

    if (PATTERNS.price.test(msg))
      return { intent: 'question', responseMode: 'direct_answer', priority: 'high', useRag: true }

    if (PATTERNS.caseStudy.test(msg))
      return { intent: 'question', responseMode: 'explanation', priority: 'medium', useRag: true }

    if (PATTERNS.process.test(msg))
      return { intent: 'question', responseMode: 'direct_answer', priority: 'medium', useRag: true }

    if (PATTERNS.service.test(msg))
      return { intent: 'interest', responseMode: 'explanation', priority: msg.length > 30 ? 'high' : 'medium', useRag: true }

    if (PATTERNS.booking.test(msg))
      return { intent: 'interest', responseMode: 'qualification', priority: 'high', useRag: false }

    if (PATTERNS.context.test(msg))
      return { intent: 'interest', responseMode: 'explanation', priority: 'medium', useRag: historyLength > 4 }

    if (PATTERNS.question.test(msg) || words >= 6)
      return { intent: 'question', responseMode: 'explanation', priority: 'medium', useRag: words >= 6 }

    if (words <= 3)
      return { intent: 'greeting', responseMode: 'casual_reply', priority: 'low', useRag: false }

    return { intent: 'interest', responseMode: 'qualification', priority: 'low', useRag: false }
  }
}
