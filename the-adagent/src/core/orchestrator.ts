import { ruleEngine } from './rules/index.js'
import { memoryStore } from './memory/store.js'
import { profileExtractor } from './memory/profileExtractor.js'
import { retriever } from './rag/retriever.js'
import { llmClient } from './llm/client.js'
import { promptBuilder } from './llm/promptBuilder.js'
import { responseValidator } from './validator/responseValidator.js'
import { wasender } from '../services/whatsapp/wasender.js'
import { textToSpeech } from './media/voiceResponder.js'
import { logger } from '../utils/logger.js'
import { metrics } from '../utils/metrics.js'
import { ENV } from '../config/env.js'
import type { PipelineInput, PipelineResult } from '../types/pipeline.js'

export async function processMessage(input: PipelineInput): Promise<PipelineResult> {
  const start = Date.now()

  // ===== 1. LOAD STATE =====
  const state = await memoryStore.load(input.chatId)
  logger.debug({ chatId: input.chatId, turns: state.turnCount }, 'State loaded')

  // HARD STOP: If previously escalated, block AI
  if (state.escalated) {
    logger.info({ chatId: input.chatId }, 'Message ignored — already escalated to human')
    await wasender.sendText(input.chatId, 'زميلي هيكمل معاك دلوقتي.')
    return { depth: 'standard', latencyMs: Date.now() - start, ragHit: false, escalated: true, layersActivated: 1, responseText: 'زميلي هيكمل معاك دلوقتي.' }
  }

  // ===== 2. RULE ENGINE =====
  const routing = ruleEngine.evaluate(input.message, state.history.length)
  logger.debug({ chatId: input.chatId, depth: routing.depth, intent: routing.intent, topic: routing.topic }, 'Routing decided')

  // ===== 3. SEND TYPING INDICATOR =====
  wasender.sendTyping(input.chatId).catch(() => {})
  wasender.markAsRead(input.messageId, input.chatId).catch(() => {})

  // ===== 4. PROFILE EXTRACTION =====
  const profileUpdates = profileExtractor.extract(input.message)
  if (Object.keys(profileUpdates).length > 0) {
    await memoryStore.updateProfile(input.chatId, profileUpdates)
    Object.assign(state.profile, profileUpdates)
  }

  // ===== 5. RAG RETRIEVAL (if layer enabled) =====
  let ragContext: string | null = null
  if (routing.layers.includes('rag_search')) {
    ragContext = await retriever.retrieve(input.message, routing.topic)
    if (ragContext) {
      logger.debug({ chatId: input.chatId, topicMatched: routing.topic }, 'RAG hit')
    }
  }

  // ===== 6. BUILD PROMPT =====
  const historyContext = promptBuilder.buildHistory(state, routing.depth)

  const systemPrompt = promptBuilder.getSystemPrompt()
  const userPrompt = promptBuilder.buildUserPrompt({
    message: input.message,
    history: historyContext,
    ragContext,
    profile: state.profile,
    routing,
    mediaDescription: input.mediaDescription
  })

  // ===== 7. LLM GENERATION =====
  let responseText = await llmClient.generate(routing.depth, systemPrompt, userPrompt)

  // ===== 8. VALIDATION =====
  if (!responseText) {
    responseText = responseValidator.getFallback(routing.topic)
    logger.warn({ chatId: input.chatId }, 'LLM returned null; using fallback')
  } else {
    const validation = responseValidator.validate(responseText, routing.depth, routing.topic)
    responseText = validation.text

    if (validation.action !== 'send') {
      logger.debug({ chatId: input.chatId, action: validation.action }, 'Response modified by validator')
    }
  }

  // ===== 9. INTRODUCE HUMAN DELAY =====
  const delayMs = 10000; // 10 seconds
  logger.debug({ chatId: input.chatId, delayMs }, 'Sleeping to simulate human delay...')
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // ===== 10. SEND RESPONSE =====
  const shouldVoiceReply = ENV.ENABLE_VOICE_REPLY && input.messageType === 'audio'

  if (shouldVoiceReply) {
    const audioUrl = await textToSpeech(responseText)
    if (audioUrl) {
      await wasender.sendAudio(input.chatId, audioUrl)
    } else {
      await wasender.sendText(input.chatId, responseText)
    }
  } else {
    await wasender.sendText(input.chatId, responseText)
  }

  // ===== 10. ESCALATION =====
  const escalatePhrase = 'لحظة، هخليك مع حد من الفريق دلوقتي.'
  const shouldEscalate = routing.escalate || responseText.includes(escalatePhrase)
  
  if (shouldEscalate) {
    logger.info({ chatId: input.chatId }, 'Generating escalation summary')
    
    // Ensure the responseText is the hardcoded phrase if it was triggered by rule engine
    if (!responseText.includes(escalatePhrase)) {
      responseText = escalatePhrase
    }

    const summaryPrompt = "أنت مساعد. لخص المحادثة التالية في 3 نقاط واضحة ومباشرة لتسليمها لمدير المبيعات:"
    const historyText = state.history.map(m => `${m.role === 'customer' ? 'العميل' : 'المندوب'}: ${m.content}`).join('\n') + `\nالعميل: ${input.message}`
    
    let summary = await llmClient.generate('standard', summaryPrompt, historyText)
    if (!summary) summary = input.message // Fallback to last message if summary fails

    // Mark state as escalated
    await memoryStore.setEscalated(input.chatId);

    await wasender.notifyTeam(
      input.chatId,
      state.profile.name || input.senderPhone || 'بدون اسم',
      summary,
      routing.escalationType || 'support',
      routing.keywordMatched || 'Sales Flow Escalation'
    )
  }

  // ===== 12. SAVE STATE =====
  await memoryStore.appendAndTrim(
    input.chatId,
    input.message,
    responseText,
    input.messageType,
    input.mediaDescription
  )

  // ===== 12. METRICS =====
  const latencyMs = Date.now() - start
  const result: PipelineResult = {
    depth: routing.depth,
    latencyMs,
    ragHit: !!ragContext,
    escalated: routing.escalate,
    layersActivated: routing.layers.length,
    responseText
  }

  metrics.record({
    chatId: input.chatId,
    depth: result.depth,
    layers: result.layersActivated,
    ragHit: result.ragHit,
    latencyMs: result.latencyMs,
    escalated: result.escalated
  })

  logger.info({
    chatId: input.chatId,
    depth: result.depth,
    latencyMs: result.latencyMs,
    ragHit: result.ragHit,
    escalated: result.escalated
  }, '✅ Pipeline complete')

  return result
}
