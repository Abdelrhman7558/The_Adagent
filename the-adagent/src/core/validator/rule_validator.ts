import { logger } from "../../utils/logger.js";

/**
 * RULE VALIDATOR
 * Code-based checks for response compliance.
 */

const MAX_LENGTH = 1000;
const FALLBACK_RESPONSE = "خليني أتأكدلك من المعلومة دي وأرجعلك 🙏";

export interface ValidationResult {
  isValid: boolean;
  text: string;
}

export const ruleValidator = {
  validate(text: string): ValidationResult {
    // 1. Basic length check
    if (text.length > MAX_LENGTH) {
      logger.warn({ length: text.length }, "Response too long, applying fallback");
      return { isValid: false, text: FALLBACK_RESPONSE };
    }

    // 2. Empty check
    if (!text.trim()) {
      return { isValid: false, text: FALLBACK_RESPONSE };
    }

    // 3. Simple forbidden marker check (Code-based)
    const formalMarkers = ["نحن نسعى", "يسعدنا", "نود أن"];
    for (const marker of formalMarkers) {
      if (text.includes(marker)) {
        logger.warn({ marker }, "Formal marker detected, applying fallback");
        return { isValid: false, text: FALLBACK_RESPONSE };
      }
    }

    return { isValid: true, text };
  },
};
