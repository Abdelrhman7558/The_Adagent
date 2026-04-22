import { intentDetector } from "../src/core/rules/intent_detector.js";
import { router } from "../src/core/rules/router.js";
import { sessionService } from "../src/core/memory/session.js";
import { retriever } from "../src/core/rag/retriever.js";
import { promptManager } from "../src/core/llm/prompt_manager.js";
import { generatorService } from "../src/core/llm/generator.js";
import { postProcessor } from "../src/core/validator/post_processor.js";
import { ruleValidator } from "../src/core/validator/rule_validator.js";
import { logger } from "../src/utils/logger.js";
import { redis } from "../src/services/redis.js";

async function runTest(waId: string, message: string, scenario: string) {
  console.log(`\n🧪 SCENARIO ${scenario}: "${message}"`);
  console.log("--------------------------------------------------");
  const t0 = performance.now();

  // 1. Load Session
  const session = await sessionService.get(waId);
  const t_memory = performance.now();

  // 2. Intent Detection
  const detection = intentDetector.detect(message);
  const t_rule = performance.now();

  // 3. Router
  const decision = router.route(detection, session.history.length);

  // 4. Path Execution
  let responseText: string | null = null;
  let ragContext: string | null = null;
  let t_rag = t_rule;
  let t_llm = t_rule;

  switch (decision.path) {
    case "critical":
      responseText = "تمام، حد من فريقنا هيتواصل معاك فوراً لمتابعة طلبك 🙏";
      break;
    case "fast":
      // No RAG, No LLM as per strict rule for HELP
      if (detection.intent === "greeting") {
         responseText = "أهلاً بك! أنا مساعد Adstartup الذكي، اقدر أساعدك في إيه النهاردة؟";
      } else {
         responseText = "أهلاً! معاك Adstartup، بنساعد البيزنس يكبر على أمازون ونون وجوميا. تحب تسأل عن إيه؟";
      }
      break;
    case "standard":
      ragContext = await retriever.retrieve(message);
      t_rag = performance.now();
      const systemStd = await promptManager.loadSystemPrompt();
      const userStd = promptManager.formatUserPrompt(ragContext, "", message);
      console.log("LLM Input (Standard):", { systemPrompt: systemStd.slice(0, 100) + "...", userPrompt: userStd });
      responseText = await generatorService.generate({ systemPrompt: systemStd, userPrompt: userStd });
      t_llm = performance.now();
      break;
    case "deep":
      ragContext = await retriever.retrieve(message);
      t_rag = performance.now();
      const historyStr = promptManager.formatHistory(session.history);
      const systemDeep = await promptManager.loadSystemPrompt();
      const userDeep = promptManager.formatUserPrompt(contextDeep, historyStr, message);
       console.log("LLM Input (Deep):", { context: ragContext, history: historyStr });
      responseText = await generatorService.generate({ systemPrompt: systemDeep, userPrompt: userDeep });
      t_llm = performance.now();
      break;
  }

  // 5. Validation
  const scrubbed = postProcessor.scrub(responseText || "");
  const validated = ruleValidator.validate(scrubbed);
  const t_end = performance.now();

  // Logs
  console.log("Intent Detected:", detection.intent);
  console.log("Priority:", detection.priority);
  console.log("Path Chosen:", decision.path);
  if (ragContext) console.log("RAG Chunks:", ragContext);
  console.log("Final Response:", validated.text);
  
  // Timing
  console.log(`Timing Breakdown:`);
  console.log(`- Rule Engine: ${(t_rule - t_memory).toFixed(2)} ms`);
  console.log(`- RAG: ${(t_rag - t_rule).toFixed(2)} ms`);
  console.log(`- LLM: ${(t_llm - t_rag).toFixed(2)} ms`);
  console.log(`- Total: ${(t_end - t0).toFixed(2)} ms`);
  
  // Update Session
  await sessionService.updateHistory(waId, "user", message);
  await sessionService.updateHistory(waId, "assistant", validated.text);
}

async function verify() {
  const waId = "test_user_" + Date.now();

  // Case 1: FAST PATH
  await runTest(waId, "HELP", "1. FAST PATH");

  // Case 2: STANDARD PATH
  await runTest(waId, "عايز أبيع على أمازون", "2. STANDARD PATH");

  // Case 3: DEEP PATH
  // Simulation: User first says something about clothing
  await sessionService.updateHistory(waId, "user", "ببيع ملابس");
  await sessionService.updateHistory(waId, "assistant", "تمام جداً، الملابس من أكتر الفئات اللي عليها طلب. تحب تبدأ على أمازون ولا نون؟");
  await runTest(waId, "عايز أبدأ على نون", "3. DEEP PATH");

  // Case 4: CRITICAL PATH
  await runTest(waId, "عايز أوقف الخدمة", "4. CRITICAL PATH");

  // Redis Check
  const finalSession = await sessionService.get(waId);
  console.log("\n📊 REDIS SESSION CHECK");
  console.log(`session:${waId}:`, JSON.stringify(finalSession, null, 2));

  process.exit(0);
}

verify();
