import Fastify from 'fastify'
import { webhookRoute } from './routes/webhook.route.js'
import { healthRoute } from './routes/health.route.js'
import { logger } from '../utils/logger.js'
import { ENV } from '../config/env.js'

export async function createServer() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    bodyLimit: 1048576,
  })

  app.setErrorHandler((error, _request, reply) => {
    logger.error({ err: error }, 'Unhandled route error')
    reply.code(500).send({ error: 'Internal server error' })
  })

  await app.register(webhookRoute)
  await app.register(healthRoute)

  return app
}

export async function startServer() {
  const app = await createServer()
  await app.listen({ port: ENV.PORT, host: '0.0.0.0' })
  logger.info({ port: ENV.PORT }, 'Fastify server started')
  return app
}
