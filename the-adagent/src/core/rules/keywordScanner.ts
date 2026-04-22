import type { TriggerResult } from '../../types/routing.js'

interface TriggerConfig {
  escalate: boolean
  type: 'support' | 'sales'
}

const ESCALATION: Map<string, TriggerConfig> = new Map([
  ['مدير',        { escalate: true, type: 'support' }],
  ['شكوى',        { escalate: true, type: 'support' }],
  ['استرجاع',     { escalate: true, type: 'support' }],
  ['غلط',         { escalate: true, type: 'support' }],
  ['مش راضي',    { escalate: true, type: 'support' }],
  ['urgent',      { escalate: true, type: 'support' }],
  ['كلمني حد',   { escalate: true, type: 'support' }],
  ['عايز حد',    { escalate: true, type: 'support' }],
  ['تكلم معايا',  { escalate: true, type: 'support' }],
  ['مش كويس',    { escalate: true, type: 'support' }],
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
  ['نمشي',         { escalate: true, type: 'sales' }],
  ['يلا نبدأ',     { escalate: true, type: 'sales' }],
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
