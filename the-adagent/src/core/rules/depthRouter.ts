import type { IntentResult, TriggerResult, DepthResult, Layer } from '../../types/routing.js'

interface RouteInput extends IntentResult {
  historyLength: number
  keyword: TriggerResult
}

export const depthRouter = {
  route(input: RouteInput): DepthResult {
    const { priority, useRag, historyLength, keyword } = input

    // Override: keyword trigger
    if (keyword.triggered) {
      return {
        depth: 'critical',
        layers: ['memory_fetch', 'response_agent'] as Layer[],
        escalate: true,
        escalationType: keyword.escalationType
      }
    }

    // Fast path: light
    if (!useRag && priority !== 'high' && historyLength < 8) {
      return { depth: 'light', layers: ['response_agent'], escalate: false, escalationType: null }
    }

    // High priority + RAG: deep
    if (useRag && priority === 'high') {
      return {
        depth: 'deep',
        layers: ['memory_fetch', 'rag_search', 'response_agent'] as Layer[],
        escalate: false,
        escalationType: null
      }
    }

    // Standard RAG + long history
    if (useRag && historyLength >= 8) {
      return {
        depth: 'standard',
        layers: ['memory_fetch', 'rag_search', 'response_agent'] as Layer[],
        escalate: false,
        escalationType: null
      }
    }

    // Standard RAG
    if (useRag) {
      return {
        depth: 'standard',
        layers: ['rag_search', 'response_agent'] as Layer[],
        escalate: false,
        escalationType: null
      }
    }

    // Long history without RAG
    if (historyLength >= 8) {
      return {
        depth: 'standard',
        layers: ['memory_fetch', 'response_agent'] as Layer[],
        escalate: false,
        escalationType: null
      }
    }

    // Default: light
    return { depth: 'light', layers: ['response_agent'], escalate: false, escalationType: null }
  }
}
