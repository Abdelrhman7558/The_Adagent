import type { CustomerProfile } from '../../types/memory.js'

const NAME_PATTERNS = [
  /(?:اسمي|انا|أنا|name is|i'm|i am)\s+([^\s,.!?]{2,20})/i,
]

const COMPANY_PATTERNS = [
  /(?:شركة|شركتي|company|بنشتغل في|عندي|براند)\s+([^\s,.!?]{2,30})/i,
]

const INDUSTRY_PATTERNS: [RegExp, string][] = [
  [/(ecommerce|e-commerce|إيكومرس|متجر|أونلاين)/i, 'ecommerce'],
  [/(ملابس|fashion|قماش|تيشرت|لبس)/i, 'fashion'],
  [/(إلكترونيات|electronics|موبايل|لابتوب)/i, 'electronics'],
  [/(أكل|food|أغذية|مواد غذائية)/i, 'food'],
  [/(مستحضرات|beauty|تجميل|عطور|perfume)/i, 'beauty'],
  [/(بيت|home|أثاث|furniture|مفروشات)/i, 'home'],
  [/(logistics|لوجستيك|شحن|توصيل)/i, 'logistics'],
]

const PLATFORM_PATTERNS: [RegExp, string][] = [
  [/(أمازون|amazon)/i, 'amazon'],
  [/(نون|noon)/i, 'noon'],
  [/(جوميا|jumia)/i, 'jumia'],
  [/(طلبات|talabat)/i, 'talabat'],
  [/(رنين|raneen)/i, 'raneen'],
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

    for (const [pattern, platform] of PLATFORM_PATTERNS) {
      if (pattern.test(message)) { result.platform = platform; break }
    }

    return result
  }
}
