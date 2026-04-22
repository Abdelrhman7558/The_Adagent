import { ENV } from '../config/env.js'
import { logger } from '../utils/logger.js'
import net from 'net'

// In-memory fallback when Redis is not available
const memStore = new Map<string, { value: string; expiry: number | null }>()
const listStore = new Map<string, string[]>()
const hashStore = new Map<string, Record<string, string>>()

let useInMemory = false
let redisClient: any = null

/**
 * Quick TCP check to see if Redis is reachable.
 */
async function isRedisReachable(): Promise<boolean> {
  return new Promise((resolve) => {
    const url = new URL(ENV.REDIS_URL || 'redis://localhost:6379')
    const socket = net.createConnection({
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    })
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 1500)
    socket.on('connect', () => { clearTimeout(timeout); socket.destroy(); resolve(true) })
    socket.on('error', () => { clearTimeout(timeout); socket.destroy(); resolve(false) })
  })
}

function isExpired(key: string): boolean {
  const entry = memStore.get(key)
  if (!entry) return true
  if (entry.expiry && Date.now() > entry.expiry) { memStore.delete(key); return true }
  return false
}

// Unified Redis-compatible interface
export const redis = {
  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    if (useInMemory) {
      let expiry: number | null = null; let nx = false
      for (let i = 0; i < args.length; i++) {
        if (args[i] === 'EX' && args[i + 1]) expiry = Date.now() + args[i + 1] * 1000
        if (args[i] === 'NX') nx = true
      }
      if (nx && memStore.has(key) && !isExpired(key)) return null
      memStore.set(key, { value, expiry })
      return 'OK'
    }
    return redisClient.set(key, value, ...args)
  },

  async get(key: string): Promise<string | null> {
    if (useInMemory) {
      if (isExpired(key)) return null
      return memStore.get(key)?.value || null
    }
    return redisClient.get(key)
  },

  async exists(key: string): Promise<number> {
    if (useInMemory) return isExpired(key) ? 0 : 1
    return redisClient.exists(key)
  },

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (useInMemory) {
      if (!listStore.has(key)) listStore.set(key, [])
      const list = listStore.get(key)!; list.push(...values); return list.length
    }
    return redisClient.rpush(key, ...values)
  },

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (useInMemory) {
      const list = listStore.get(key) || []
      return stop === -1 ? list.slice(start) : list.slice(start, stop + 1)
    }
    return redisClient.lrange(key, start, stop)
  },

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (useInMemory) {
      const list = listStore.get(key) || []
      listStore.set(key, stop === -1 ? list.slice(start) : list.slice(start, stop + 1))
      return 'OK'
    }
    return redisClient.ltrim(key, start, stop)
  },

  async incr(key: string): Promise<number> {
    if (useInMemory) {
      const cur = parseInt(memStore.get(key)?.value || '0') + 1
      memStore.set(key, { value: String(cur), expiry: memStore.get(key)?.expiry || null })
      return cur
    }
    return redisClient.incr(key)
  },

  async expire(key: string, seconds: number): Promise<number> {
    if (useInMemory) {
      const entry = memStore.get(key)
      if (entry) entry.expiry = Date.now() + seconds * 1000
      return entry ? 1 : 0
    }
    return redisClient.expire(key, seconds)
  },

  async hset(key: string, fields: Record<string, string>): Promise<number> {
    if (useInMemory) {
      const existing = hashStore.get(key) || {}
      Object.assign(existing, fields)
      hashStore.set(key, existing)
      return Object.keys(fields).length
    }
    return redisClient.hset(key, fields)
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    if (useInMemory) return hashStore.get(key) || {}
    return redisClient.hgetall(key)
  },

  pipeline() {
    const ops: Array<{ method: string; args: any[] }> = []
    const pipeProxy: any = {
      lrange: (...args: any[]) => { ops.push({ method: 'lrange', args }); return pipeProxy },
      get: (...args: any[]) => { ops.push({ method: 'get', args }); return pipeProxy },
      hgetall: (...args: any[]) => { ops.push({ method: 'hgetall', args }); return pipeProxy },
      rpush: (...args: any[]) => { ops.push({ method: 'rpush', args }); return pipeProxy },
      ltrim: (...args: any[]) => { ops.push({ method: 'ltrim', args }); return pipeProxy },
      incr: (...args: any[]) => { ops.push({ method: 'incr', args }); return pipeProxy },
      expire: (...args: any[]) => { ops.push({ method: 'expire', args }); return pipeProxy },
      set: (...args: any[]) => { ops.push({ method: 'set', args }); return pipeProxy },
      async exec(): Promise<any[]> {
        if (!useInMemory && redisClient) {
          const realPipe = redisClient.pipeline()
          for (const op of ops) (realPipe as any)[op.method](...op.args)
          return realPipe.exec()
        }
        const results: any[] = []
        for (const op of ops) {
          try { results.push([null, await (redis as any)[op.method](...op.args)]) }
          catch (err) { results.push([err, null]) }
        }
        return results
      }
    }
    return pipeProxy
  },

  async ping(): Promise<string> {
    if (useInMemory) return 'PONG'
    return redisClient.ping()
  },
}

export async function verifyRedis(): Promise<void> {
  const reachable = await isRedisReachable()
  if (!reachable) {
    logger.warn('Redis not reachable — using in-memory store')
    useInMemory = true
    return
  }

  try {
    const IORedis = (await import('ioredis')).default
    const Redis = (IORedis as any).default || IORedis
    redisClient = new (Redis as any)(ENV.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => { if (times > 2) return null; return 500 },
    })
    redisClient.on('error', () => {})  // suppress unhandled
    await redisClient.ping()
    logger.info('Redis connected ✓')
  } catch (err) {
    logger.warn('Redis connection failed — using in-memory store')
    useInMemory = true
    if (redisClient) { try { redisClient.disconnect() } catch {} }
    redisClient = null
  }
}
