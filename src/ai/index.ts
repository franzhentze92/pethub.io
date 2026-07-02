export type { AiModuleDefinition, AiToolDefinition, AiExecutionContext, ConversationTurn, PetBuddyMessage } from './types';
export { aiRegistry } from './registry';
export { initAiModules } from './modules';
export { askPetBuddy } from './orchestrator';
export { askPetBuddyAgent } from './agentOrchestrator';

/**
 * Pet Buddy AI Layer
 *
 * To add a new module:
 * 1. Create src/ai/modules/yourModule.module.ts
 * 2. Register in src/ai/modules/index.ts → initAiModules()
 * 3. Add keywords (Spanish) on each tool for local routing
 * 4. Add format case in src/ai/responseFormatter.ts
 *
 * OpenAI: configure OPENAI_API_KEY as a Supabase Edge Function secret.
 * Deploy: supabase functions deploy pet-buddy
 */
