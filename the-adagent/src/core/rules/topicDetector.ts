import { TOPIC_RULES } from './patterns.js'

export const topicDetector = {
  detect(message: string): string | null {
    for (const rule of TOPIC_RULES) {
      if (rule.pattern.test(message)) return rule.topic
    }
    return null
  }
}
