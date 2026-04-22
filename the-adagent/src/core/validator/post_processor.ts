/**
 * POST-PROCESSOR
 * Output scrubbing and safety filters.
 * STRICT RULE: Remove all traces of AI identity.
 */

const FORBIDDEN_PHRASES = [
  /أنا ذكاء اصطناعي/gi,
  /أنا بوت/gi,
  /as an ai/gi,
  /language model/gi,
  /chatgpt/gi,
  /openai/gi,
  /i am a bot/gi,
  /i'm a bot/gi,
];

export const postProcessor = {
  scrub(text: string): string {
    let cleaned = text;

    for (const pattern of FORBIDDEN_PHRASES) {
      cleaned = cleaned.replace(pattern, "أنا من فريق Adstartup");
    }

    // Standardize whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  },
};
