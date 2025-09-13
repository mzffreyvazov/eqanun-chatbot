export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Grok Vision',
    description: 'Advanced multimodal model with vision and text capabilities',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Grok Reasoning',
    description:
      'Uses advanced chain-of-thought reasoning for complex problems',
  },
  // Google Gemini (via Gateway)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast, low-latency multimodal model from Google',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Balanced quality/speed multimodal model from Google',
  },
];

// Resolve a UI model id to the underlying provider model id used by tokenlens.
// Keep this in sync with mappings in `lib/ai/providers.ts`.
export function resolveUnderlyingModelId(id: string): string {
  switch (id) {
    case 'chat-model':
      return 'xai/grok-2-vision-1212';
    case 'chat-model-reasoning':
      return 'xai/grok-3-mini';
    case 'gemini-2.5-flash':
      return 'google/gemini-2.5-flash';
    case 'gemini-2.0-flash':
      return 'google/gemini-2.0-flash';
    default:
      return id; // fallback: use id as-is
  }
}
