import pino from 'pino'
import { ENV } from '../config/env.js'

export const logger = pino({
  level: ENV.LOG_LEVEL,
  transport: ENV.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
})
