export interface AiExecutionContext {
  userId?: string;
  userName?: string;
  userRole?: string;
  currentPath?: string;
  /** Set when the user has a linked providers profile */
  providerId?: string;
  /** User is in voice conversation mode — prefer short spoken-friendly replies */
  voiceMode?: boolean;
  /** Skip confirmation gate (internal — after user confirms) */
  skipConfirmation?: boolean;
  /** User's registered pets (loaded from DB for Pet Buddy) */
  userPetNames?: string[];
  userPetCount?: number;
  /** Pre-loaded health snapshot when on /health-journal or /veterinaria */
  preloadedHealthContext?: string;
  /** Long-term facts loaded from pet_buddy_facts */
  memoryFacts?: Array<{ pet_name?: string | null; fact_text: string; category: string }>;
  /** Rolling conversation summary */
  conversationSummary?: string;
  /** Enable streaming for final text responses */
  streamResponses?: boolean;
  /** Called with incremental text during streaming */
  onStreamDelta?: (delta: string, fullText: string) => void;
}

export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
};

export interface AiToolDefinition<TParams = Record<string, unknown>> {
  /** Unique tool id, e.g. marketplace.search_products */
  name: string;
  description: string;
  /** Keywords (Spanish) that help the local router pick this tool */
  keywords: string[];
  /** Only available when the user has a provider profile */
  requiresProvider?: boolean;
  /** JSON-schema-like param hints for LLM tool calling */
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
    additionalProperties?: boolean;
  };
  execute: (params: TParams, ctx: AiExecutionContext) => Promise<unknown>;
}

export interface AiModuleDefinition {
  id: string;
  name: string;
  description: string;
  /** Route prefix for deep links, e.g. /marketplace/products */
  basePath?: string;
  tools: AiToolDefinition[];
}

export interface PetBuddyPendingAction {
  id: string;
  toolName: string;
  params: Record<string, unknown>;
  title: string;
  fields: Array<{ label: string; value: string }>;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface PetBuddyMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Tools invoked for this response */
  toolsUsed?: string[];
  /** Optional navigation link */
  actionLink?: { label: string; path: string };
  /** Action awaiting user confirmation */
  pendingAction?: PetBuddyPendingAction;
}

export interface PetBuddyCartAction {
  action: 'add';
  item: {
    id?: string;
    type: 'product' | 'service';
    name: string;
    price: number;
    currency: string;
    quantity: number;
    provider_id: string;
    provider_name: string;
    image_url?: string;
    description?: string;
    delivery_fee?: number;
    has_delivery?: boolean;
    has_pickup?: boolean;
    product_size?: 'small' | 'medium' | 'large' | 'extra_large' | 'general';
    product_id?: string;
    product_category?: string;
    service_id?: string;
    service_data?: {
      service_id: string;
      appointment_date: string;
      time_slot_id: string;
      appointment_time?: string;
      slot_end_time?: string;
      client_name: string;
      client_phone: string;
      client_email: string;
      notes: string;
    };
  };
}

export interface PetBuddyResponse {
  message: string;
  toolsUsed: string[];
  actionLink?: { label: string; path: string };
  pendingAction?: PetBuddyPendingAction;
  streamed?: boolean;
  cartAction?: PetBuddyCartAction;
}
