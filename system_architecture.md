# Monjez AI Agent — TypeScript Implementation Blueprint

> "All intelligence is deterministic code. LLM is only a language renderer."

---

## 1. PROJECT STRUCTURE

```
/monjez-agent
│
├── src/
│   ├── index.ts
│   │
│   ├── api/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── webhook.route.ts
│   │   │   └── health.route.ts
│   │   ├── schemas/
│   │   │   └── wasender.schema.ts
│   │   └── middleware/
│   │       └── auth.middleware.ts
│   │
│   ├── workers/
│   │   ├── message.worker.ts
│   │   └── memory.worker.ts
│   │
│   ├── core/
│   │   ├── orchestrator.ts
│   │   │
│   │   ├── rules/
│   │   │   ├── index.ts
│   │   │   ├── keywordScanner.ts
│   │   │   ├── intentClassifier.ts
│   │   │   ├── topicDetector.ts
│   │   │   ├── depthRouter.ts
│   │   │   └── patterns.ts
│   │   │
│   │   ├── rag/
│   │   │   ├── indexer.ts
│   │   │   ├── retriever.ts
│   │   │   └── embedder.ts
│   │   │
│   │   ├── memory/
│   │   │   ├── store.ts
│   │   │   ├── compressor.ts
│   │   │   └── profileExtractor.ts
│   │   │
│   │   ├── llm/
│   │   │   ├── client.ts
│   │   │   ├── promptBuilder.ts
│   │   │   └── prompts/
│   │   │       └── responseAgent.prompt.md
│   │   │
│   │   └── validator/
│   │       └── responseValidator.ts
│   │
│   ├── services/
│   │   ├── whatsapp/
│   │   │   └── wasender.ts
│   │   ├── queue/
│   │   │   ├── producer.ts
│   │   │   └── connections.ts
│   │   ├── redis.ts
│   │   └── chromadb.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── constants.ts
│   │   └── models.ts
│   │
│   ├── types/
│   │   ├── routing.ts
│   │   ├── memory.ts
│   │   ├── wasender.ts
│   │   ├── rag.ts
│   │   └── pipeline.ts
│   │
│   └── utils/
│       ├── logger.ts
│       ├── rateLimiter.ts
│       ├── dedup.ts
│       └── metrics.ts
│
├── knowledge/
│   └── obsidian/
│
├── scripts/
│   ├── indexVault.ts
│   ├── healthCheck.ts
│   └── testPipeline.ts
│
├── tests/
│   ├── unit/
│   │   ├── keywordScanner.test.ts
│   │   ├── intentClassifier.test.ts
│   │   ├── depthRouter.test.ts
│   │   ├── topicDetector.test.ts
│   │   ├── responseValidator.test.ts
│   │   ├── promptBuilder.test.ts
│   │   └── profileExtractor.test.ts
│   └── integration/
│       ├── pipeline.test.ts
│       ├── rag.test.ts
│       └── webhook.test.ts
│
├── docker-compose.yml
├── Dockerfile
├── ecosystem.config.js
├── tsconfig.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 2. MODULE IMPLEMENTATION DESIGN

---

### 2.1 types/routing.ts

```typescript
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
```

### 2.2 types/memory.ts

```typescript
export interface ChatMessage {
  role: 'customer' | 'agent'
  content: string
  ts: number
}

export interface CustomerProfile {
  name?: string
  company?: string
  industry?: string
  role?: string
  phone?: string
}

export interface CompressedSummary {
  summary: string
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'hesitant' | 'negative'
  stage: 'discovery' | 'exploration' | 'evaluation' | 'closing' | 'post_sale'
  openQuestions: string[]
  lastCta: string | null
}

export interface ChatState {
  history: ChatMessage[]
  summary: CompressedSummary | null
  profile: CustomerProfile
  turnCount: number
}
```

### 2.3 types/pipeline.ts

```typescript
import type { RoutingDecision, Depth } from './routing'
import type { ChatState, CustomerProfile } from './memory'

export interface PipelineInput {
  chatId: string
  message: string
  senderName: string
  timestamp: number
  messageId: string
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
}
```

### 2.4 types/wasender.ts

```typescript
export interface WasenderWebhookPayload {
  event: string
  data: {
    chatId: string
    message: {
      id: string
      body: string
      type: string
      timestamp: number
    }
    sender: {
      name: string
      phone: string
    }
  }
}

export interface WasenderSendPayload {
  chatId: string
  message: string
  type: 'text'
}
```

### 2.5 types/rag.ts

```typescript
export interface ChunkMetadata {
  id: string
  sourceFile: string
  topic: string
  language: 'en' | 'ar'
  updatedAt: number
}

export interface RetrievalResult {
  content: string
  distance: number
  metadata: ChunkMetadata
}
```

---

### Module Specifications

```
┌─────────────────────┬──────────────────────────────────┬──────────────────────┬─────────────────────┬────────┬────────────────────────┐
│ Module              │ Responsibility                   │ Input                │ Output              │ Sync   │ Dependencies           │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ core/rules          │ Deterministic routing decisions  │ message: string      │ RoutingDecision     │ SYNC   │ none (pure functions)  │
│                     │ keyword + regex + table lookup   │ historyLength: number│                     │        │                        │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ workers/message     │ BullMQ job consumer              │ PipelineInput        │ PipelineResult      │ ASYNC  │ orchestrator           │
│                     │ calls orchestrator               │ (from queue)         │                     │        │                        │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ core/rag            │ Embed message → vector search    │ message: string      │ string | null       │ ASYNC  │ OpenAI embed API       │
│                     │ → formatted context              │ topic: string | null │ (formatted chunks)  │        │ ChromaDB               │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ core/memory         │ Redis chat state CRUD            │ chatId: string       │ ChatState           │ ASYNC  │ Redis                  │
│                     │ profile extraction (regex)       │ message: string      │                     │        │                        │
│                     │ compression (background LLM)     │                      │                     │        │                        │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ core/llm            │ Prompt assembly + single LLM     │ PipelineContext      │ string (response)   │ ASYNC  │ OpenAI chat API        │
│                     │ call for response generation     │                      │                     │        │ responseAgent.prompt   │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ core/validator      │ String-based response checks     │ response: string     │ ValidatedResponse   │ SYNC   │ none (pure function)   │
│                     │ identity leak, formal, length    │ depth: Depth         │                     │        │                        │
├─────────────────────┼──────────────────────────────────┼──────────────────────┼─────────────────────┼────────┼────────────────────────┤
│ services/whatsapp   │ Wasender send API wrapper        │ chatId + message     │ void                │ ASYNC  │ Wasender HTTP API      │
│                     │ split, delay, team notify        │                      │                     │        │                        │
└─────────────────────┴──────────────────────────────────┴──────────────────────┴─────────────────────┴────────┴────────────────────────┘
```

---

## 3. EXECUTION PIPELINE

```typescript
// core/orchestrator.ts

import { keywordScanner } from './rules/keywordScanner'
import { intentClassifier } from './rules/intentClassifier'
import { topicDetector } from './rules/topicDetector'
import { depthRouter } from './rules/depthRouter'
import { memoryStore } from './memory/store'
import { profileExtractor } from './memory/profileExtractor'
import { retriever } from './rag/retriever'
import { llmClient } from './llm/client'
import { promptBuilder } from './llm/promptBuilder'
import { responseValidator } from './validator/responseValidator'
import { wasender } from '../services/whatsapp/wasender'
import { metrics } from '../utils/metrics'
import { logger } from '../utils/logger'
import type { PipelineInput, PipelineResult, PipelineContext } from '../types/pipeline'
import type { RoutingDecision } from '../types/routing'

export async function processMessage(input: PipelineInput): Promise<PipelineResult> {
  const t0 = performance.now()

  // ────────────────────────────────────────────────────
  // PHASE 1: STATE LOAD (Redis pipeline, ~3ms)
  // ────────────────────────────────────────────────────

  const state = await memoryStore.load(input.chatId)

  // ────────────────────────────────────────────────────
  // PHASE 2: RULE ENGINE (deterministic, ~2ms)
  // ────────────────────────────────────────────────────

  const keyword = keywordScanner.scan(input.message)

  const intent = keyword.triggered
    ? { intent: 'objection' as const, responseMode: 'reassurance' as const, priority: 'high' as const, useRag: false }
    : intentClassifier.classify(input.message, state.history.length)

  const topic = topicDetector.detect(input.message)

  const route = depthRouter.route({
    ...intent,
    historyLength: state.history.length,
    keyword
  })

  const routing: RoutingDecision = {
    ...intent,
    depth: route.depth,
    layers: route.layers,
    topic,
    escalate: route.escalate,
    escalationType: route.escalationType,
    keywordMatched: keyword.matched
  }

  // ────────────────────────────────────────────────────
  // PHASE 3: DATA FETCH (conditional, parallel, ~180ms)
  // ────────────────────────────────────────────────────

  let ragContext: string | null = null

  if (route.layers.includes('rag_search')) {
    try {
      ragContext = await retriever.retrieve(input.message, topic)
    } catch (err) {
      logger.error({ err, chatId: input.chatId }, 'RAG retrieval failed')
      ragContext = null
    }
  }

  // memory_fetch: state already loaded in Phase 1 — zero cost

  // ────────────────────────────────────────────────────
  // PHASE 4: PROMPT ASSEMBLY (sync, <1ms)
  // ────────────────────────────────────────────────────

  const historyContext = promptBuilder.buildHistory(state, routing.depth)
  const systemPrompt = promptBuilder.getSystemPrompt()
  const userPrompt = promptBuilder.buildUserPrompt({
    message: input.message,
    history: historyContext,
    ragContext,
    profile: state.profile,
    routing
  })

  // ────────────────────────────────────────────────────
  // PHASE 5: LLM CALL (single, ~450ms)
  // ────────────────────────────────────────────────────

  let response: string | null = null

  try {
    response = await llmClient.generate(routing.depth, systemPrompt, userPrompt)
  } catch (err) {
    logger.error({ err, chatId: input.chatId }, 'LLM generation failed')
    response = null
  }

  // ────────────────────────────────────────────────────
  // PHASE 6: VALIDATION (rule-based, sync, <1ms)
  // ────────────────────────────────────────────────────

  const validated = response
    ? responseValidator.validate(response, routing.depth, topic)
    : { ok: false, text: responseValidator.getFallback(topic), action: 'fallback' as const }

  const finalResponse = validated.text

  // ────────────────────────────────────────────────────
  // PHASE 7: SEND (Wasender API, ~80ms)
  // ────────────────────────────────────────────────────

  await wasender.sendMessage(input.chatId, finalResponse)

  // ────────────────────────────────────────────────────
  // PHASE 8: STATE SAVE (Redis pipeline, ~3ms)
  // ────────────────────────────────────────────────────

  await memoryStore.appendAndTrim(input.chatId, input.message, finalResponse)
  const newTurnCount = state.turnCount + 1

  // ────────────────────────────────────────────────────
  // PHASE 9: BACKGROUND DISPATCH (non-blocking)
  // ────────────────────────────────────────────────────

  const latencyMs = performance.now() - t0

  setImmediate(() => {
    backgroundTasks(input, routing, newTurnCount, latencyMs, ragContext)
  })

  return {
    depth: routing.depth,
    latencyMs,
    ragHit: ragContext !== null,
    escalated: routing.escalate,
    layersActivated: routing.layers.length
  }
}

async function backgroundTasks(
  input: PipelineInput,
  routing: RoutingDecision,
  turnCount: number,
  latencyMs: number,
  ragContext: string | null
): Promise<void> {
  // Memory compression (every 8 turns)
  if (turnCount >= 8 && turnCount % 8 === 0) {
    const { memoryQueue } = await import('../services/queue/producer')
    await memoryQueue.add('compress', { chatId: input.chatId }, {
      priority: 10,
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 }
    })
  }

  // Escalation alert
  if (routing.escalate) {
    await wasender.notifyTeam(
      input.chatId,
      input.senderName,
      input.message,
      routing.escalationType,
      routing.keywordMatched
    )
  }

  // Profile extraction
  const profileUpdate = profileExtractor.extract(input.message)
  if (Object.keys(profileUpdate).length > 0) {
    await memoryStore.updateProfile(input.chatId, profileUpdate)
  }

  // Metrics
  metrics.record({
    chatId: input.chatId,
    depth: routing.depth,
    layers: routing.layers.length,
    ragHit: ragContext !== null,
    latencyMs,
    escalated: routing.escalate
  })
}
```

---

## 4. RULE ENGINE IMPLEMENTATION

### 4.1 core/rules/patterns.ts

```typescript
// Compiled once at startup, reused for all messages

export const PATTERNS = {
  greeting:  /^(مرحبا|أهلا|هاي|hi|hello|السلام عليكم|صباح|مساء|هلا|يا هلا|hey|yo)\b/i,
  ack:       /^(تمام|أوك|ماشي|شكرا|حاضر|ok|thanks|اه|أيوه|good|طيب|اوكي|👍|😊)\s*[!.]*$/i,
  price:     /(بكام|سعر|تكلفة|price|cost|كام|أسعار|pricing|رسوم|اشتراك|budget|ميزانية)/i,
  service:   /(خدم|بتعمل|Core Build|Care Plan|Revenue|automation|أتمتة|systems|بتقدم|خدماتكم|AI)/i,
  process:   /(إزاي|كيف|خطوات|المدة|timeline|how long|process|steps|بتشتغل|مراحل|كام يوم)/i,
  caseStudy: /(مثال|عملتوا|client|case|project|نتيجة|result|proof|portfolio|شغلكم)/i,
  objection: /(غالي|مش متأكد|أشك|محتاج أفكر|مش واثق|expensive|مش فاهم الفرق|مش مقتنع)/i,
  context:   /(زي ما قلت|اللي فات|قبل كده|اتفقنا|قلتلك|كنا بنتكلم|فاكر)/i,
  question:  /[?؟]\s*$/,
} as const

export const TOPIC_RULES = [
  { pattern: /(بكام|سعر|تكلفة|price|pricing|cost|أسعار|Core Build|Care Plan|اشتراك|رسوم)/i,  topic: 'pricing' },
  { pattern: /(خدم|بتعمل|systems|automation|أتمتة|Revenue|Operational|Financial|بتقدم)/i,      topic: 'services' },
  { pattern: /(إزاي بتشتغل|خطوات|مراحل|process|timeline|engagement|onboarding)/i,              topic: 'process' },
  { pattern: /(مثال|عملتوا|case|project|client|result|نتيجة|proof|portfolio)/i,                  topic: 'case_studies' },
  { pattern: /(مين انتو|فريق|شركة|company|about|team|philosophy|فلسفة)/i,                       topic: 'company' },
  { pattern: /(دعم|support|maintenance|صيانة|مشكلة تقنية)/i,                                    topic: 'support' },
] as const
```

### 4.2 core/rules/keywordScanner.ts

```typescript
import type { TriggerResult } from '../../types/routing'

interface TriggerConfig {
  escalate: boolean
  type: 'support' | 'sales'
}

const ESCALATION: Map<string, TriggerConfig> = new Map([
  ['مدير',        { escalate: true, type: 'support' }],
  ['شكوى',        { escalate: true, type: 'support' }],
  ['فلوس',        { escalate: true, type: 'support' }],
  ['استرجاع',     { escalate: true, type: 'support' }],
  ['غلط',         { escalate: true, type: 'support' }],
  ['مش راضي',    { escalate: true, type: 'support' }],
  ['urgent',      { escalate: true, type: 'support' }],
  ['كلمني حد',   { escalate: true, type: 'support' }],
  ['هبلّغ',       { escalate: true, type: 'support' }],
  ['أسوأ',        { escalate: true, type: 'support' }],
])

const SALES: Map<string, TriggerConfig> = new Map([
  ['جاهز أدفع',    { escalate: true, type: 'sales' }],
  ['عايز أبدأ',    { escalate: true, type: 'sales' }],
  ['ابعتلي العقد',  { escalate: true, type: 'sales' }],
  ['عايز أحجز',    { escalate: true, type: 'sales' }],
  ['امتى نبدأ',    { escalate: true, type: 'sales' }],
  ['مستعد',        { escalate: true, type: 'sales' }],
])

export const keywordScanner = {
  scan(message: string): TriggerResult {
    const msg = message.trim()

    for (const [kw, cfg] of ESCALATION) {
      if (msg.includes(kw)) {
        return { triggered: true, matched: kw, force: 'critical', escalate: cfg.escalate, escalationType: cfg.type }
      }
    }

    for (const [kw, cfg] of SALES) {
      if (msg.includes(kw)) {
        return { triggered: true, matched: kw, force: 'critical', escalate: cfg.escalate, escalationType: cfg.type }
      }
    }

    return { triggered: false, matched: null, force: null, escalate: false, escalationType: null }
  }
}
```

### 4.3 core/rules/intentClassifier.ts

```typescript
import { PATTERNS } from './patterns'
import type { IntentResult } from '../../types/routing'

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

    if (PATTERNS.context.test(msg))
      return { intent: 'interest', responseMode: 'explanation', priority: 'medium', useRag: historyLength > 4 }

    if (PATTERNS.question.test(msg) || words >= 6)
      return { intent: 'question', responseMode: 'explanation', priority: 'medium', useRag: words >= 6 }

    if (words <= 3)
      return { intent: 'greeting', responseMode: 'casual_reply', priority: 'low', useRag: false }

    return { intent: 'interest', responseMode: 'qualification', priority: 'low', useRag: false }
  }
}
```

### 4.4 core/rules/topicDetector.ts

```typescript
import { TOPIC_RULES } from './patterns'

export const topicDetector = {
  detect(message: string): string | null {
    for (const rule of TOPIC_RULES) {
      if (rule.pattern.test(message)) return rule.topic
    }
    return null
  }
}
```

### 4.5 core/rules/depthRouter.ts

```typescript
import type { IntentResult, TriggerResult, DepthResult, Layer } from '../../types/routing'

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
```

### 4.6 core/rules/index.ts

```typescript
import { keywordScanner } from './keywordScanner'
import { intentClassifier } from './intentClassifier'
import { topicDetector } from './topicDetector'
import { depthRouter } from './depthRouter'
import type { RoutingDecision } from '../../types/routing'

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
```

---

## 5. RAG IMPLEMENTATION

### 5.1 core/rag/embedder.ts

```typescript
import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'
import { openai } from '../../services/openai'
import { ENV } from '../../config/env'

const cache = new LRUCache<string, number[]>({ max: 500, ttl: 1000 * 60 * 60 })

export const embedder = {
  async embed(text: string): Promise<number[]> {
    const key = createHash('md5').update(text).digest('hex')
    const cached = cache.get(key)
    if (cached) return cached

    const result = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })

    const embedding = result.data[0].embedding
    cache.set(key, embedding)
    return embedding
  },

  async batchEmbed(texts: string[]): Promise<number[][]> {
    const result = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts
    })
    return result.data.map(d => d.embedding)
  }
}
```

### 5.2 core/rag/retriever.ts

```typescript
import { embedder } from './embedder'
import { chromadb } from '../../services/chromadb'
import { CONSTANTS } from '../../config/constants'
import { logger } from '../../utils/logger'

export const retriever = {
  async retrieve(message: string, topic: string | null): Promise<string | null> {
    const embedding = await embedder.embed(message)

    // Primary: topic-filtered search
    let results = await chromadb.query(CONSTANTS.CHROMA_COLLECTION, {
      queryEmbeddings: [embedding],
      nResults: 3,
      where: topic ? { topic: { $eq: topic } } : undefined
    })

    // Fallback: unfiltered if empty or low relevance
    if (
      !results.documents?.[0]?.length ||
      (results.distances?.[0]?.[0] ?? 999) > 0.8
    ) {
      results = await chromadb.query(CONSTANTS.CHROMA_COLLECTION, {
        queryEmbeddings: [embedding],
        nResults: 3
      })
    }

    // No relevant results
    if (
      !results.documents?.[0]?.length ||
      (results.distances?.[0]?.[0] ?? 999) > 1.0
    ) {
      logger.debug({ message: message.slice(0, 50), topic }, 'RAG: no relevant results')
      return null
    }

    return results.documents[0]
      .filter(Boolean)
      .join('\n---\n')
  }
}
```

### 5.3 core/rag/indexer.ts

```typescript
import { glob } from 'glob'
import { readFileSync } from 'fs'
import path from 'path'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { embedder } from './embedder'
import { chromadb } from '../../services/chromadb'
import { CONSTANTS } from '../../config/constants'
import { logger } from '../../utils/logger'

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['\n## ', '\n### ', '\n\n', '\n', '. ', ' ']
})

function detectTopic(filePath: string, content: string): string {
  const lower = filePath.toLowerCase()
  if (lower.includes('pricing') || lower.includes('price')) return 'pricing'
  if (lower.includes('service') || lower.includes('system')) return 'services'
  if (lower.includes('process') || lower.includes('engagement')) return 'process'
  if (lower.includes('case') || lower.includes('project')) return 'case_studies'
  if (lower.includes('about') || lower.includes('philosophy')) return 'company'
  if (lower.includes('support') || lower.includes('care')) return 'support'
  return 'general'
}

function detectLanguage(content: string): 'ar' | 'en' {
  const arabicChars = (content.match(/[\u0600-\u06FF]/g) || []).length
  return arabicChars > content.length * 0.3 ? 'ar' : 'en'
}

export const indexer = {
  async indexVault(vaultPath: string): Promise<number> {
    const files = glob.sync(`${vaultPath}/**/*.md`)
    let totalChunks = 0

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const topic = detectTopic(file, content)
      const language = detectLanguage(content)
      const chunks = await splitter.splitText(content)

      if (chunks.length === 0) continue

      const embeddings = await embedder.batchEmbed(chunks)
      const baseName = path.basename(file, '.md')

      await chromadb.upsert(CONSTANTS.CHROMA_COLLECTION, {
        ids: chunks.map((_, i) => `${baseName}:${i}`),
        embeddings,
        documents: chunks,
        metadatas: chunks.map((_, i) => ({
          sourceFile: file,
          topic,
          language,
          updatedAt: Date.now()
        }))
      })

      totalChunks += chunks.length
      logger.info({ file: baseName, chunks: chunks.length, topic }, 'Indexed file')
    }

    logger.info({ totalChunks, files: files.length }, 'Vault indexing complete')
    return totalChunks
  },

  async reindexFile(filePath: string): Promise<void> {
    const baseName = path.basename(filePath, '.md')

    // Delete existing chunks for this file
    await chromadb.delete(CONSTANTS.CHROMA_COLLECTION, {
      where: { sourceFile: { $eq: filePath } }
    })

    // Re-index
    const content = readFileSync(filePath, 'utf-8')
    const topic = detectTopic(filePath, content)
    const language = detectLanguage(content)
    const chunks = await splitter.splitText(content)
    const embeddings = await embedder.batchEmbed(chunks)

    await chromadb.upsert(CONSTANTS.CHROMA_COLLECTION, {
      ids: chunks.map((_, i) => `${baseName}:${i}`),
      embeddings,
      documents: chunks,
      metadatas: chunks.map(() => ({
        sourceFile: filePath,
        topic,
        language,
        updatedAt: Date.now()
      }))
    })

    logger.info({ file: baseName, chunks: chunks.length }, 'Re-indexed file')
  }
}
```

---

## 6. MEMORY SYSTEM

### 6.1 core/memory/store.ts

```typescript
import { redis } from '../../services/redis'
import type { ChatState, ChatMessage, CustomerProfile, CompressedSummary } from '../../types/memory'
import { CONSTANTS } from '../../config/constants'

const KEY = {
  history:   (id: string) => `chat:${id}:history`,
  summary:   (id: string) => `chat:${id}:summary`,
  profile:   (id: string) => `chat:${id}:profile`,
  turnCount: (id: string) => `chat:${id}:turn_count`,
}

export const memoryStore = {
  async load(chatId: string): Promise<ChatState> {
    const pipe = redis.pipeline()
    pipe.lrange(KEY.history(chatId), -CONSTANTS.MAX_HISTORY, -1)
    pipe.get(KEY.summary(chatId))
    pipe.hgetall(KEY.profile(chatId))
    pipe.get(KEY.turnCount(chatId))

    const results = await pipe.exec()
    if (!results) return { history: [], summary: null, profile: {}, turnCount: 0 }

    const [historyRes, summaryRes, profileRes, turnRes] = results

    return {
      history: ((historyRes?.[1] as string[]) || []).map(h => JSON.parse(h) as ChatMessage),
      summary: summaryRes?.[1] ? JSON.parse(summaryRes[1] as string) as CompressedSummary : null,
      profile: (profileRes?.[1] as CustomerProfile) || {},
      turnCount: parseInt((turnRes?.[1] as string) || '0', 10)
    }
  },

  async appendAndTrim(chatId: string, customerMsg: string, agentMsg: string): Promise<void> {
    const now = Date.now()
    const pipe = redis.pipeline()

    pipe.rpush(KEY.history(chatId), JSON.stringify({ role: 'customer', content: customerMsg, ts: now }))
    pipe.rpush(KEY.history(chatId), JSON.stringify({ role: 'agent', content: agentMsg, ts: now }))
    pipe.ltrim(KEY.history(chatId), -CONSTANTS.MAX_HISTORY, -1)
    pipe.incr(KEY.turnCount(chatId))
    pipe.expire(KEY.history(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.summary(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.profile(chatId), CONSTANTS.CHAT_TTL)
    pipe.expire(KEY.turnCount(chatId), CONSTANTS.CHAT_TTL)

    await pipe.exec()
  },

  async updateProfile(chatId: string, fields: Partial<CustomerProfile>): Promise<void> {
    if (Object.keys(fields).length === 0) return
    await redis.hset(KEY.profile(chatId), fields as Record<string, string>)
  },

  async saveSummary(chatId: string, summary: CompressedSummary): Promise<void> {
    await redis.set(KEY.summary(chatId), JSON.stringify(summary), 'EX', CONSTANTS.CHAT_TTL)
  }
}
```

### 6.2 core/memory/compressor.ts

```typescript
import { memoryStore } from './store'
import { llmClient } from '../llm/client'
import { logger } from '../../utils/logger'
import type { CompressedSummary } from '../../types/memory'

const COMPRESS_PROMPT = `You are a conversation memory compressor. Compress the chat history into structured JSON.
Output ONLY valid JSON:
{
  "summary": "2-4 sentence summary in English",
  "topics": ["discussed topics"],
  "sentiment": "positive | neutral | hesitant | negative",
  "stage": "discovery | exploration | evaluation | closing | post_sale",
  "openQuestions": ["unanswered questions max 2"],
  "lastCta": "last call-to-action offered or null"
}
No markdown. No explanation.`

export const compressor = {
  async compress(chatId: string): Promise<void> {
    const state = await memoryStore.load(chatId)
    if (state.history.length < 8) return

    const historyText = state.history
      .map(m => `${m.role === 'customer' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n')

    const previousContext = state.summary
      ? `Previous summary:\n${JSON.stringify(state.summary)}\n\n`
      : ''

    const input = `${previousContext}Chat History:\n${historyText}`

    try {
      const result = await llmClient.generate('light', COMPRESS_PROMPT, input)
      if (!result) return

      const parsed = JSON.parse(result) as CompressedSummary
      await memoryStore.saveSummary(chatId, parsed)
      logger.info({ chatId }, 'Memory compressed')
    } catch (err) {
      logger.error({ err, chatId }, 'Memory compression failed')
    }
  }
}
```

### 6.3 core/memory/profileExtractor.ts

```typescript
import type { CustomerProfile } from '../../types/memory'

const NAME_PATTERNS = [
  /(?:اسمي|انا|أنا|name is|i'm|i am)\s+([^\s,.!?]{2,20})/i,
]

const COMPANY_PATTERNS = [
  /(?:شركة|شركتي|company|بنشتغل في|عندي)\s+([^\s,.!?]{2,30})/i,
]

const INDUSTRY_PATTERNS: [RegExp, string][] = [
  [/(ecommerce|e-commerce|إيكومرس|متجر|أونلاين)/i, 'ecommerce'],
  [/(saas|ساس|سوفتوير|software)/i, 'saas'],
  [/(agency|وكالة|إيجنسي|marketing)/i, 'agency'],
  [/(fintech|فينتك|مالية|بنك)/i, 'fintech'],
  [/(logistics|لوجستيك|شحن|توصيل)/i, 'logistics'],
]

const ROLE_PATTERNS: [RegExp, string][] = [
  [/(founder|مؤسس|صاحب)/i, 'founder'],
  [/(ceo|مدير تنفيذي|رئيس)/i, 'ceo'],
  [/(cto|تقني|مدير تقني)/i, 'cto'],
  [/(marketing|تسويق)/i, 'marketing_manager'],
]

export const profileExtractor = {
  extract(message: string): Partial<CustomerProfile> {
    const result: Partial<CustomerProfile> = {}

    for (const pattern of NAME_PATTERNS) {
      const match = message.match(pattern)
      if (match?.[1]) { result.name = match[1]; break }
    }

    for (const pattern of COMPANY_PATTERNS) {
      const match = message.match(pattern)
      if (match?.[1]) { result.company = match[1]; break }
    }

    for (const [pattern, industry] of INDUSTRY_PATTERNS) {
      if (pattern.test(message)) { result.industry = industry; break }
    }

    for (const [pattern, role] of ROLE_PATTERNS) {
      if (pattern.test(message)) { result.role = role; break }
    }

    return result
  }
}
```

---

## 7. LLM SERVICE

### 7.1 core/llm/client.ts

```typescript
import OpenAI from 'openai'
import { ENV } from '../../config/env'
import { MODEL_CONFIG } from '../../config/models'
import { logger } from '../../utils/logger'
import type { Depth } from '../../types/routing'

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY })

export const llmClient = {
  async generate(depth: Depth, systemPrompt: string, userPrompt: string): Promise<string | null> {
    const config = MODEL_CONFIG[depth]

    // Attempt 1
    try {
      return await callWithTimeout(config, systemPrompt, userPrompt, ENV.LLM_TIMEOUT_MS)
    } catch (err: any) {
      logger.warn({ err: err.message, depth }, 'LLM attempt 1 failed')

      // Attempt 2 (shorter timeout)
      try {
        return await callWithTimeout(config, systemPrompt, userPrompt, ENV.LLM_RETRY_TIMEOUT_MS)
      } catch (retryErr: any) {
        logger.error({ err: retryErr.message, depth }, 'LLM attempt 2 failed')
        return null
      }
    }
  }
}

async function callWithTimeout(
  config: typeof MODEL_CONFIG[Depth],
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }, { signal: controller.signal })

    return response.choices[0]?.message?.content?.trim() || ''
  } finally {
    clearTimeout(timer)
  }
}
```

### 7.2 core/llm/promptBuilder.ts

```typescript
import { readFileSync } from 'fs'
import path from 'path'
import type { ChatState } from '../../types/memory'
import type { RoutingDecision, Depth } from '../../types/routing'
import type { CustomerProfile } from '../../types/memory'

// Load once at startup
const SYSTEM_PROMPT = readFileSync(
  path.join(__dirname, 'prompts', 'responseAgent.prompt.md'),
  'utf-8'
)

interface UserPromptInput {
  message: string
  history: string
  ragContext: string | null
  profile: CustomerProfile
  routing: RoutingDecision
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
      .map(m => `${m.role === 'customer' ? 'العميل' : 'الوكيل'}: ${m.content}`)
      .join('\n')

    if ((depth === 'deep' || depth === 'critical') && summary) {
      return `[ملخص المحادثة السابقة]\n${summary.summary}\n\n[آخر الرسائل]\n${recentText}`
    }

    return recentText
  },

  buildUserPrompt(input: UserPromptInput): string {
    const { message, history, ragContext, profile, routing } = input
    const parts: string[] = []

    // Routing metadata
    parts.push(`[Control]`)
    parts.push(`intent: ${routing.intent}`)
    parts.push(`response_mode: ${routing.responseMode}`)
    parts.push(`priority: ${routing.priority}`)
    parts.push(`processing_depth: ${routing.depth}`)

    // Profile
    if (profile.name || profile.company || profile.industry) {
      parts.push(`\n[ملف العميل]`)
      if (profile.name) parts.push(`الاسم: ${profile.name}`)
      if (profile.company) parts.push(`الشركة: ${profile.company}`)
      if (profile.industry) parts.push(`المجال: ${profile.industry}`)
      if (profile.role) parts.push(`الدور: ${profile.role}`)
    }

    // Chat history
    if (history) {
      parts.push(`\n[تاريخ المحادثة]\n${history}`)
    }

    // RAG context
    if (ragContext) {
      parts.push(`\n[معلومات من قاعدة المعرفة]\n${ragContext}`)
    }

    // Current message
    parts.push(`\n[رسالة العميل]\n${message}`)

    return parts.join('\n')
  }
}
```

### 7.3 config/models.ts

```typescript
import type { Depth } from '../types/routing'

export const MODEL_CONFIG: Record<Depth | 'compress', {
  model: string
  maxTokens: number
  temperature: number
}> = {
  light:    { model: 'gpt-4o-mini', maxTokens: 100,  temperature: 0.8 },
  standard: { model: 'gpt-4o-mini', maxTokens: 250,  temperature: 0.7 },
  deep:     { model: 'gpt-4o',      maxTokens: 450,  temperature: 0.7 },
  critical: { model: 'gpt-4o',      maxTokens: 350,  temperature: 0.5 },
  compress: { model: 'gpt-4o-mini', maxTokens: 300,  temperature: 0.2 },
}
```

---

## 8. VALIDATION SERVICE

### core/validator/responseValidator.ts

```typescript
import type { Depth } from '../../types/routing'

interface ValidationResult {
  ok: boolean
  text: string
  action: 'send' | 'sanitize' | 'truncate' | 'fallback'
}

const IDENTITY_LEAKS = ['أنا AI', 'أنا بوت', "I'm an AI", 'language model', 'ChatGPT', 'OpenAI', 'GPT', 'أنا ذكاء اصطناعي']
const FORMAL_MARKERS = ['نحن نسعى', 'يسعدنا', 'نود أن', 'بكل سرور', 'لا تتردد', 'تفضلوا', 'نأمل']

const MAX_CHARS: Record<Depth, number> = {
  light: 120,
  standard: 280,
  deep: 550,
  critical: 350
}

const FALLBACKS: Record<string, string> = {
  default:    'خليني أتأكدلك من المعلومة دي وأرجعلك 🙏',
  pricing:    'الأسعار بتختلف حسب الاحتياج — تحب أرتبلك مكالمة سريعة مع الفريق؟',
  services:   'عندنا أنظمة مختلفة — تحب أحكيلك عنها أو أوريك مثال؟',
  technical:  'ده سؤال تقني — هوصّلك بحد من الفريق التقني يفيدك أكتر',
  error:      'عذراً حصلت مشكلة بسيطة. حد من فريقنا هيرد عليك قريب 🙏',
}

export const responseValidator = {
  validate(response: string, depth: Depth, topic: string | null): ValidationResult {
    // Check 1: Empty / broken
    if (!response || response.trim().length < 2) {
      return { ok: false, text: this.getFallback(topic), action: 'fallback' }
    }

    // Check 2: Identity leak — sanitize, don't reject
    for (const phrase of IDENTITY_LEAKS) {
      if (response.includes(phrase)) {
        return {
          ok: true,
          text: response.split(phrase).join('أنا من فريق Monjez'),
          action: 'sanitize'
        }
      }
    }

    // Check 3: Formal Arabic — reject
    for (const marker of FORMAL_MARKERS) {
      if (response.includes(marker)) {
        return { ok: false, text: this.getFallback(topic), action: 'fallback' }
      }
    }

    // Check 4: Length — truncate at sentence boundary
    const maxLen = MAX_CHARS[depth]
    if (response.length > maxLen * 1.5) {
      return { ok: true, text: truncateAtSentence(response, maxLen), action: 'truncate' }
    }

    // All clear
    return { ok: true, text: response, action: 'send' }
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
```

---

## 9. DEPLOYMENT SPECIFICATION

### 9.1 config/env.ts

```typescript
import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback
}

export const ENV = {
  PORT:                  parseInt(optional('PORT', '3000')),
  NODE_ENV:              optional('NODE_ENV', 'development'),
  LOG_LEVEL:             optional('LOG_LEVEL', 'info'),

  WASENDER_API_KEY:      required('WASENDER_API_KEY'),
  WASENDER_WEBHOOK_SECRET: optional('WASENDER_WEBHOOK_SECRET', ''),
  TEAM_CHAT_ID:          required('TEAM_CHAT_ID'),

  OPENAI_API_KEY:        required('OPENAI_API_KEY'),

  REDIS_URL:             optional('REDIS_URL', 'redis://localhost:6379'),

  CHROMA_URL:            optional('CHROMA_URL', 'http://localhost:8000'),
  CHROMA_COLLECTION:     optional('CHROMA_COLLECTION', 'monjez_kb'),

  VAULT_PATH:            optional('VAULT_PATH', './knowledge/obsidian'),

  LLM_TIMEOUT_MS:        parseInt(optional('LLM_TIMEOUT_MS', '8000')),
  LLM_RETRY_TIMEOUT_MS:  parseInt(optional('LLM_RETRY_TIMEOUT_MS', '4000')),

  ENABLE_COMPRESSION:    optional('ENABLE_COMPRESSION', 'true') === 'true',
  ENABLE_ESCALATION:     optional('ENABLE_ESCALATION', 'true') === 'true',
  ENABLE_METRICS:        optional('ENABLE_METRICS', 'true') === 'true',
} as const
```

### 9.2 config/constants.ts

```typescript
export const CONSTANTS = {
  // Memory
  MAX_HISTORY:          30,      // 15 message pairs
  CHAT_TTL:             86400,   // 24 hours
  COMPRESS_INTERVAL:    8,       // every 8 turns

  // Rate limiting
  RATE_LIMIT_WINDOW:    3,       // 3 seconds per chat
  DEDUP_TTL:            60,      // 60 second dedup window

  // RAG
  CHROMA_COLLECTION:    'monjez_kb',
  RAG_TOP_K:            3,
  RAG_RELEVANCE_THRESHOLD: 0.8,
  RAG_FALLBACK_THRESHOLD:  1.0,

  // Wasender
  MAX_MESSAGE_LENGTH:   500,     // split threshold
  SPLIT_DELAY_MS:       600,     // delay between split messages

  // Queue
  MESSAGE_CONCURRENCY:  20,
  MEMORY_CONCURRENCY:   5,
  MAX_ATTEMPTS:         3,

  // Validator
  MAX_CHARS: {
    light:    120,
    standard: 280,
    deep:     550,
    critical: 350,
  } as const,
} as const
```

### 9.3 ecosystem.config.js (PM2)

```javascript
module.exports = {
  apps: [{
    name: 'monjez-agent',
    script: './dist/index.js',
    instances: process.env.WORKERS || 1,
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
    autorestart: true,
    watch: false,
  }]
}
```

### 9.4 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports: ['3000:3000']
    env_file: .env
    depends_on:
      redis: { condition: service_healthy }
      chromadb: { condition: service_started }
    restart: unless-stopped
    volumes:
      - ./knowledge:/app/knowledge:ro
    deploy:
      resources:
        limits: { memory: 512M, cpus: '1.0' }

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes: ['redis_data:/data']
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1000
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 3

  chromadb:
    image: chromadb/chroma:0.4.24
    ports: ['8000:8000']
    volumes: ['chroma_data:/chroma/chroma']
    environment:
      - ANONYMIZED_TELEMETRY=false

volumes:
  redis_data:
  chroma_data:
```

### 9.5 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ecosystem.config.js ./
COPY src/core/llm/prompts/ dist/core/llm/prompts/

RUN npm install -g pm2

EXPOSE 3000
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]
```

### 9.6 Performance Targets

```
┌────────────────────┬───────────┐
│ Metric             │ Target    │
├────────────────────┼───────────┤
│ P50 latency        │ <550ms    │
│ P95 latency        │ <850ms    │
│ P99 latency        │ <1100ms   │
│ Weighted average   │ <620ms    │
│ LLM calls/message  │ 1.125     │
│ Rule engine time   │ <2ms      │
│ Queue throughput   │ 150/min   │
│ Error rate         │ <0.5%     │
│ Uptime             │ 99.9%     │
└────────────────────┴───────────┘
```
