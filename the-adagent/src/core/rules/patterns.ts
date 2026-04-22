// Compiled once at startup, reused for all messages

export const PATTERNS = {
  greeting:  /^(مرحبا|أهلا|هاي|hi|hello|السلام عليكم|صباح|مساء|هلا|يا هلا|hey|yo|أهلاً|هلو|ازيك|إزيك|عامل ايه|ازاي)\\b/i,
  ack:       /^(تمام|أوك|ماشي|شكرا|حاضر|ok|thanks|اه|أيوه|good|طيب|اوكي|👍|😊|بالظبط|صح|مظبوط|أه|ايوه)\\s*[!.]*$/i,
  price:     /(بكام|سعر|تكلفة|price|cost|كام|أسعار|pricing|رسوم|اشتراك|budget|ميزانية|ريتينر|retainer|شهري|monthly|عمولة|commission)/i,
  service:   /(خدم|بتعمل|بتقدم|بتديروا|management|marketplace|ماركت بليس|أمازون|نون|جوميا|amazon|noon|jumia|raneen|طلبات|تالابات|listings|إدارة)/i,
  process:   /(إزاي|كيف|خطوات|المدة|timeline|how long|process|steps|بتشتغلوا|مراحل|كام يوم|onboarding|بداية)/i,
  caseStudy: /(مثال|عملتوا|client|case|project|نتيجة|result|proof|portfolio|شغلكم|نجاح|success)/i,
  objection: /(غالي|مش متأكد|أشك|محتاج أفكر|مش واثق|expensive|مش فاهم|مش مقتنع|كتير|مش دلوقتي|بعدين|مش جاهز|مكلف)/i,
  context:   /(زي ما قلت|اللي فات|قبل كده|اتفقنا|قلتلك|كنا بنتكلم|فاكر)/i,
  question:  /[?؟]\\s*$/,
  booking:   /(حجز|نبدأ|نكمل|أبدأ|ابدأ|book|start|جاهز|ready|مستعد|عايز أبدأ|نمشي|يلا)/i,
  category:  /(ملابس|fashion|إلكترونيات|electronics|بيت|home|أكل|food|مستحضرات|beauty|عطور|perfume)/i,
} as const

export const TOPIC_RULES = [
  { pattern: /(بكام|سعر|تكلفة|price|pricing|cost|أسعار|ريتينر|retainer|اشتراك|رسوم|شهري|عمولة|commission)/i,  topic: 'pricing' },
  { pattern: /(خدم|بتعمل|management|marketplace|بتقدم|بتديروا|listings|إدارة|أمازون|نون|جوميا)/i,              topic: 'services' },
  { pattern: /(إزاي بتشتغل|خطوات|مراحل|process|timeline|engagement|onboarding|بداية)/i,                       topic: 'process' },
  { pattern: /(مثال|عملتوا|case|project|client|result|نتيجة|proof|portfolio|نجاح)/i,                           topic: 'case_studies' },
  { pattern: /(مين انتو|فريق|شركة|company|about|team|Adstartup)/i,                                            topic: 'company' },
  { pattern: /(دعم|support|maintenance|مشكلة|شكوى|complaint)/i,                                                topic: 'support' },
  { pattern: /(حجز|نبدأ|book|start|onboard|عقد|contract)/i,                                                    topic: 'closing' },
  { pattern: /(عمولة|commission|فاتورة|billing|دفع|payment)/i,                                                 topic: 'commission' },
  { pattern: /(إعلان|حملة|campaign|ads|sponsored|ممول)/i,                                                      topic: 'ads' },
  { pattern: /(رجوع|returns|استرجاع|refund)/i,                                                                 topic: 'returns' },
] as const
