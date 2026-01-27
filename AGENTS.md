# AGENTS.md - AI Coding Agent Guidelines

This document provides essential context for AI coding agents working in this repository.

## Project Overview

- **Framework**: Next.js 16 with App Router, React 19 RC, TypeScript 5.6 (strict mode)
- **AI Integration**: Vercel AI SDK 6.x with streaming support
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: NextAuth.js 5 (beta) + Supabase JWT authentication
- **UI**: shadcn/ui + Radix UI + Tailwind CSS v4
- **Linting**: Biome (NOT ESLint/Prettier)
- **Testing**: Playwright E2E tests
- **Package Manager**: pnpm 9.12.3

## Build/Lint/Test Commands

### Development
```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server with Turbo (localhost:3000)
pnpm build            # Run migrations + production build
pnpm start            # Start production server
```

### Database (Drizzle ORM)
```bash
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Run pending migrations
pnpm db:studio        # Open Drizzle Studio GUI
pnpm db:push          # Push schema directly to database
pnpm db:pull          # Pull schema from database
```

### Linting & Formatting (Biome)
```bash
pnpm lint             # Lint with auto-fix
pnpm lint:fix         # Lint + format
pnpm format           # Format only
```

### Testing (Playwright)
```bash
pnpm test                                    # Run all E2E tests
pnpm exec playwright test tests/e2e/chat.test.ts   # Run single test file
pnpm exec playwright test -g "test name"     # Run test by name pattern
pnpm exec playwright test --project=e2e      # Run only e2e project
pnpm exec playwright test --project=routes   # Run only routes project
pnpm exec playwright test --headed           # Run with browser visible
pnpm exec playwright test --debug            # Debug mode
```

Test files are in `tests/` with projects: `e2e` (tests/e2e/) and `routes` (tests/routes/).

## Code Style Guidelines

### Formatting (Biome Configuration)
- **Indentation**: 2 spaces
- **Line width**: 80 characters
- **Semicolons**: Always required
- **Quotes**: Single quotes for JS/TS, double quotes for JSX attributes
- **Trailing commas**: Always (in arrays, objects, parameters)
- **Arrow parentheses**: Always required `(x) => x`
- **Line endings**: LF (Unix-style)

### Import Organization
```typescript
// 1. External packages first
import { useEffect, useState } from 'react';
import useSWR from 'swr';

// 2. Internal imports with @/ path alias
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';

// 3. Use `type` keyword for type-only imports
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
```

### Naming Conventions
- **Files**: kebab-case (`chat-header.tsx`, `use-artifact.ts`)
- **Components**: PascalCase (`ChatHeader`, `MultimodalInput`)
- **Hooks**: camelCase with `use` prefix (`useArtifact`, `useChatVisibility`)
- **Functions/Variables**: camelCase (`generateUUID`, `fetchWithErrorHandlers`)
- **Types/Interfaces**: PascalCase (`ChatMessage`, `UIArtifact`)
- **Constants**: camelCase or SCREAMING_SNAKE_CASE for true constants
- **Database tables**: PascalCase in schema (`User`, `Chat`, `Message_v2`)

### TypeScript Patterns
- Strict mode enabled - no implicit any
- Use explicit return types for exported functions
- Prefer `type` over `interface` for consistency
- Use Zod for runtime validation (see `app/(chat)/api/chat/schema.ts`)

```typescript
// Type exports alongside schema
export type User = InferSelectModel<typeof user>;

// Explicit typing for function parameters
export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  // ...
}
```

### Error Handling
Use the custom `ChatSDKError` class for application errors:

```typescript
import { ChatSDKError } from '@/lib/errors';

// In API routes - return error responses
if (!session?.user) {
  return new ChatSDKError('unauthorized:chat').toResponse();
}

// Error codes follow pattern: `${ErrorType}:${Surface}`
// ErrorType: 'bad_request' | 'unauthorized' | 'forbidden' | 'not_found' | 'rate_limit' | 'offline'
// Surface: 'chat' | 'auth' | 'api' | 'database' | 'document' | etc.

// In client code - throw and catch
try {
  const response = await fetch(url);
  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }
} catch (error) {
  if (error instanceof ChatSDKError) {
    toast({ type: 'error', description: error.message });
  }
}
```

### React Patterns
- Use `'use client'` directive for client components
- Prefer `useMemo` and `useCallback` for expensive operations
- Use SWR for server state management
- Streaming with AI SDK's `useChat` hook

```typescript
'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useMemo } from 'react';
```

### Component Props Pattern
```typescript
export function Chat({
  id,
  initialMessages,
  session,
}: {
  id: string;
  initialMessages: ChatMessage[];
  session: Session;
}) {
  // Component implementation
}
```

## Architecture & Directory Structure

```
app/
├── (auth)/           # Auth routes (login, register)
├── (chat)/           # Chat routes and API endpoints
│   └── api/          # API routes (chat, vote, document, etc.)
artifacts/            # AI document handlers (code, text, sheet, image)
├── {type}/server.ts  # Server-side handler with createDocumentHandler()
├── {type}/client.tsx # Client-side rendering component
components/
├── ui/               # shadcn/ui components
├── *.tsx             # Feature components (chat, artifact, sidebar)
hooks/                # Custom React hooks (use-*.ts)
lib/
├── ai/               # AI providers, models, prompts, tools
├── db/               # Drizzle schema, queries, migrations
├── redis/            # Redis client for resumable streaming
├── supabase/         # Supabase client configuration
├── errors.ts         # ChatSDKError class
├── utils.ts          # Utility functions (cn, fetcher, generateUUID)
tests/
├── e2e/              # End-to-end tests
├── routes/           # API route tests
├── pages/            # Page object models
├── fixtures.ts       # Test fixtures
```

### API Route Pattern
```typescript
// app/(chat)/api/example/route.ts
import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }
  // Handle request...
}
```

## Testing Guidelines

Tests use Playwright with Page Object pattern:

```typescript
// tests/e2e/chat.test.ts
import { ChatPage } from '../pages/chat';
import { test, expect } from '../fixtures';

test.describe('Chat activity', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.createNewChat();
  });

  test('Send a user message and receive response', async () => {
    await chatPage.sendUserMessage('Why is grass green?');
    await chatPage.isGenerationComplete();
    const assistantMessage = await chatPage.getRecentAssistantMessage();
    expect(assistantMessage.content).toContain("expected text");
  });
});
```

- Test environment uses `PLAYWRIGHT=True` for mock AI models
- Timeout: 240 seconds per test
- Browser: Chromium only

## Environment Variables

Key variables (see `.env.example`):
- `POSTGRES_URL` - Database connection string
- `AUTH_SECRET` - NextAuth.js secret
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Supabase credentials
- `AI_GATEWAY_API_KEY` - For non-Vercel deployments
- `REDIS_URL` - Optional, for resumable streaming

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Database schema | `lib/db/schema.ts` |
| Database queries | `lib/db/queries.ts` |
| AI providers | `lib/ai/providers.ts` |
| AI models config | `lib/ai/models.ts` |
| Error handling | `lib/errors.ts` |
| Utility functions | `lib/utils.ts` |
| Auth configuration | `app/(auth)/auth.ts` |
| Biome config | `biome.jsonc` |
| TypeScript config | `tsconfig.json` |
