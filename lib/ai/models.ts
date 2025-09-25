export const DEFAULT_CHAT_MODEL: string = 'gemini-2.5-flash';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Google-dan sürətli, az gecikməli multimodal model',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Google-dan balanslaşdırılmış keyfiyyət/sürət multimodal modeli',
  },
];

// Resolve a UI model id to the underlying provider model id used by tokenlens.
// Keep this in sync with mappings in `lib/ai/providers.ts`.
export function resolveUnderlyingModelId(id: string): string {
  switch (id) {
    case 'gemini-2.5-flash':
      return 'google/gemini-2.5-flash';
    case 'gemini-2.0-flash':
      return 'google/gemini-2.0-flash';
    default:
      return id; // fallback: use id as-is
  }
}
