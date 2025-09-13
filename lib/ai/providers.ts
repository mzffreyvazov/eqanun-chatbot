import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { google } from '@ai-sdk/google';
import { isTestEnvironment } from '../constants';

const useDirectGoogle = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

if (!isTestEnvironment) {
  // Helpful diagnostic: are we using direct Google provider?
  // This does not print any secret.
  console.log(
    `[AI] Direct Google provider: ${useDirectGoogle ? 'ENABLED' : 'DISABLED'}`,
  );
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require('./models.mock');
      return customProvider({
        languageModels: {
          'chat-model': chatModel,
          'chat-model-reasoning': reasoningModel,
          'title-model': titleModel,
          'artifact-model': artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        'chat-model': gateway.languageModel('xai/grok-2-vision-1212'),
        'chat-model-reasoning': wrapLanguageModel({
          model: gateway.languageModel('xai/grok-3-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        // Prefer direct Google for internal lightweight generations
        'title-model': useDirectGoogle
          ? google('gemini-2.5-flash')
          : gateway.languageModel('xai/grok-2-1212'),
        'artifact-model': useDirectGoogle
          ? google('gemini-2.5-flash')
          : gateway.languageModel('xai/grok-2-1212'),
        // Google Gemini: direct when API key is present, otherwise via Gateway
        'gemini-2.5-flash': useDirectGoogle
          ? google('gemini-2.5-flash')
          : gateway.languageModel('google/gemini-2.5-flash'),
        'gemini-2.0-flash': useDirectGoogle
          ? google('gemini-2.0-flash')
          : gateway.languageModel('google/gemini-2.0-flash'),
      },
    });
