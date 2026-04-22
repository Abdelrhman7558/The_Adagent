import { ENV } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

/**
 * Convert text to speech using ElevenLabs and return a public URL.
 * Returns null if ElevenLabs is not configured or fails.
 */
export async function textToSpeech(text: string): Promise<string | null> {
  if (!ENV.ELEVENLABS_API_KEY || !ENV.ELEVENLABS_VOICE_ID) {
    return null
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ENV.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ENV.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    )

    if (!response.ok) {
      logger.error({ status: response.status }, 'ElevenLabs TTS failed')
      return null
    }

    // Get the audio as a blob and upload it somewhere accessible
    // For now, we'll save to a temp file and serve it
    // In production, upload to S3/CloudFlare R2
    const audioBuffer = await response.arrayBuffer()

    // Use WaSenderAPI's upload endpoint
    const uploadRes = await fetch(`${ENV.WASENDER_API_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.WASENDER_API_KEY}`,
        'Content-Type': 'audio/mpeg',
      },
      body: Buffer.from(audioBuffer),
    })

    if (!uploadRes.ok) {
      logger.error({ status: uploadRes.status }, 'Failed to upload voice to WaSender')
      return null
    }

    const uploadResult = await uploadRes.json() as { url?: string }
    return uploadResult.url || null
  } catch (err) {
    logger.error({ err }, 'ElevenLabs TTS error')
    return null
  }
}
