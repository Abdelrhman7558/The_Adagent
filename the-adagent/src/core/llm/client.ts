import OpenAI from 'openai'
import { ENV } from '../../config/env.js'
import { MODEL_CONFIG, VISION_MODEL } from '../../config/models.js'
import { logger } from '../../utils/logger.js'
import type { Depth } from '../../types/routing.js'
import { calendarService } from '../../services/calendar/calendar.js'

const openai = new OpenAI({
  apiKey: ENV.OPENROUTER_API_KEY,
  baseURL: ENV.OPENROUTER_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://adstartup.co',
    'X-Title': 'Adstartup WhatsApp Agent',
  },
})

export const llmClient = {
  async generate(depth: Depth, systemPrompt: string, userPrompt: string): Promise<string | null> {
    const config = MODEL_CONFIG[depth]

    // Tool calls disabled since user prefers manual preference collection via prompt
    const enableTools = false;

    // Attempt 1
    try {
      return await callWithTimeout(config, systemPrompt, userPrompt, ENV.LLM_TIMEOUT_MS, enableTools)
    } catch (err: any) {
      logger.warn({ err: err.message, depth }, 'LLM attempt 1 failed')

      // Attempt 2 (shorter timeout, no tools to ensure speed)
      try {
        return await callWithTimeout(config, systemPrompt, userPrompt, ENV.LLM_RETRY_TIMEOUT_MS, false)
      } catch (retryErr: any) {
        logger.error({ err: retryErr.message, depth }, 'LLM attempt 2 failed')
        return null
      }
    }
  },

  /** Analyze an image using GPT-4o Vision */
  async analyzeImage(imageUrl: string, context?: string): Promise<string | null> {
    try {
      const response = await openai.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد بتحلل صور منتجات. وصّف الصورة باختصار بالعربي المصري. لو فيها منتج، قول نوعه وأي تفاصيل مهمة.'
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: context || 'وصّف الصورة دي باختصار' }
            ]
          }
        ],
        max_tokens: 200,
      })
      return response.choices[0]?.message?.content?.trim() || null
    } catch (err) {
      logger.error({ err }, 'Vision analysis failed')
      return null
    }
  },

    async transcribeAudio(audioUrl: string): Promise<string | null> {
      try {
        if (!ENV.OPENAI_API_KEY && !ENV.GROQ_API_KEY) {
          logger.warn('Audio transcription failed: No OPENAI_API_KEY or GROQ_API_KEY provided');
          return null;
        }

        const audioRes = await fetch(audioUrl);
        if (!audioRes.ok) {
          logger.error({ status: audioRes.status }, 'Failed to download audio');
          return null;
        }
        const audioBlob = await audioRes.blob();

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.ogg');
        formData.append('model', ENV.GROQ_API_KEY ? 'whisper-large-v3-turbo' : 'whisper-1');
        formData.append('language', 'ar');

        const apiUrl = ENV.GROQ_API_KEY 
          ? 'https://api.groq.com/openai/v1/audio/transcriptions'
          : 'https://api.openai.com/v1/audio/transcriptions';
          
        const apiKey = ENV.GROQ_API_KEY ? ENV.GROQ_API_KEY : ENV.OPENAI_API_KEY;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.error({ status: response.status, body: errText }, 'Audio transcription API failed');
          return null;
        }

        const result = await response.json();
        return result.text || null;
      } catch (err) {
        logger.error({ err }, 'Audio transcription failed');
        return null;
      }
    },
}

async function callWithTimeout(
  config: typeof MODEL_CONFIG[Depth],
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number,
  enableTools: boolean = false
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'check_available_slots',
        description: 'Get a list of available meeting slots for the next 5 days. Use this when the user asks for a meeting or you want to propose times.',
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_appointment',
        description: 'Book an appointment if the user agrees to a specific time.',
        parameters: {
          type: 'object',
          properties: {
            timeStr: { type: 'string', description: 'The exact string of the chosen time (e.g. 2026-04-22T14:00:00.000Z or the arabic string)' }
          },
          required: ['timeStr']
        }
      }
    }
  ];

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: config.model,
      messages,
      tools: enableTools ? tools : undefined,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }, { signal: controller.signal })

    const choice = response.choices[0]

    // Handle Tool Call
    if (choice?.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      const toolCall = choice.message.tool_calls[0]
      messages.push(choice.message) // Append assistant message with tool_calls

      let toolResult = "";
      try {
        if (toolCall.function.name === 'check_available_slots') {
          const slots = await calendarService.getAvailableSlots();
          toolResult = slots.length > 0 ? `Available slots:\n${slots.join('\n')}` : "No slots available.";
        } else if (toolCall.function.name === 'book_appointment') {
          // Just dummy booking logic parsing out the english/ISO standard. 
          // For a real production app, parsing exact ISO from Arabic text is necessary.
          const args = JSON.parse(toolCall.function.arguments);
          const link = await calendarService.bookAppointment('Adstartup Consultation', 'WhatsApp Client Booking', args.timeStr) || 'Link generated';
          toolResult = `Successfully booked. Meeting link: ${link}`;
        }
      } catch (err) {
        toolResult = "Failed to execute tool.";
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: toolResult
      });

      // Second Call to get natural response
      const finalResp = await openai.chat.completions.create({
        model: config.model,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature
      }, { signal: controller.signal });

      return finalResp.choices[0]?.message?.content?.trim() || '';
    }

    return choice?.message?.content?.trim() || ''
  } finally {
    clearTimeout(timer)
  }
}
