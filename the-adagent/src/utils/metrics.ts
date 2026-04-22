import type { Depth } from '../types/routing.js'

interface MetricEntry {
  chatId: string
  depth: Depth
  layers: number
  ragHit: boolean
  latencyMs: number
  escalated: boolean
  ts: number
}

const entries: MetricEntry[] = []

export const metrics = {
  record(data: Omit<MetricEntry, 'ts'>): void {
    entries.push({ ...data, ts: Date.now() })
    // Keep only last 1000
    if (entries.length > 1000) entries.splice(0, entries.length - 1000)
  },

  getStats() {
    if (entries.length === 0) return null
    const latencies = entries.map(e => e.latencyMs)
    latencies.sort((a, b) => a - b)
    return {
      count: entries.length,
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      ragHitRate: entries.filter(e => e.ragHit).length / entries.length,
      escalationRate: entries.filter(e => e.escalated).length / entries.length,
    }
  },
}
