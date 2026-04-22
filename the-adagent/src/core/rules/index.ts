import { keywordScanner } from './keywordScanner.js'
import { intentClassifier } from './intentClassifier.js'
import { topicDetector } from './topicDetector.js'
import { depthRouter } from './depthRouter.js'
import type { RoutingDecision } from '../../types/routing.js'

export const ruleEngine = {
  evaluate(message: string, historyLength: number): RoutingDecision {
    const keyword = keywordScanner.scan(message)

    const intent = keyword.triggered
      ? { intent: 'objection' as const, responseMode: 'reassurance' as const, priority: 'high' as const, useRag: false }
      : intentClassifier.classify(message, historyLength)

    const topic = topicDetector.detect(message)
    const route = depthRouter.route({ ...intent, historyLength, keyword })

    return {
      ...intent,
      depth: route.depth,
      layers: route.layers,
      topic,
      escalate: route.escalate,
      escalationType: route.escalationType,
      keywordMatched: keyword.matched
    }
  }
}
