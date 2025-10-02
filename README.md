<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
  - [Redis](https://redis.io) for resumable streaming capabilities (optional)
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Generate%20a%20random%20secret%20to%20use%20for%20authentication&envLink=https%3A%2F%2Fgenerate-secret.vercel.app%2F32&project-name=my-awesome-chatbot&repository-name=my-awesome-chatbot&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000) (or the port specified in the `PORT` environment variable in `.env.local`).

## Supabase Authentication for the RAG Service

The RAG backend now validates requests with Supabase-issued JWTs. Every interactive feature that calls the retrieval service (chat, artifacts, file uploads) requires a valid Supabase session. Configure the following environment variables (see [`.env.example`](.env.example)):

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` – base credentials used by the app
- `SUPABASE_SERVICE_ROLE_KEY` – required for server-side provisioning of users and password sync
- `SUPABASE_JWT_SECRET` and `SUPABASE_JWT_AUDIENCE` – shared with the FastAPI backend for token verification
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` – expose Supabase configuration to the browser when needed
- `AUTH_PROVIDER=supabase` and `ENABLE_JWT_AUTH=true` – instruct the backend to validate Supabase tokens

> 🔐 **Important:** Sign-in and guest flows will fail if Supabase credentials are missing or incorrect because the chatbot must attach a Supabase access token to every retrieval request.

When users authenticate, the NextAuth credentials provider synchronizes their account with Supabase, ensuring a fresh access token is saved in the session and automatically refreshed on subsequent requests. Guest users receive temporary Supabase identities backed by the service role key so they can interact with the RAG pipeline without creating a full account.

## Redis Setup (Optional)

Redis enables resumable streaming capabilities, allowing chat responses to continue seamlessly even if the connection is interrupted. This is particularly useful for long-running AI responses.

### Setting Up Redis

**Option 1: Cloud Redis (Recommended for Production)**

1. Create a Redis database on [Upstash](https://upstash.com), [Redis Cloud](https://redis.com/cloud/), or [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
2. Copy the connection URL (should start with `redis://` or `rediss://` for TLS)
3. Add to your environment variables:
   ```bash
   REDIS_URL="rediss://default:password@your-host:port"
   ```

**Option 2: Local Redis (Development)**

1. Install and run Redis locally:

   ```bash
   # Using Docker
   docker run --name eqanun-redis -p 6379:6379 -d redis:7-alpine

   # Or install directly: https://redis.io/docs/getting-started/
   ```

2. Add to your `.env.local`:
   ```bash
   REDIS_URL="redis://localhost:6379"
   ```

### Verifying Redis Integration

- When Redis is configured, you'll see resumable stream activity in the console logs
- Streams are automatically stored in Redis with a 24-hour TTL
- To inspect Redis keys: `redis-cli keys 'resumable-stream*'`

### Running Without Redis

The application gracefully degrades when Redis is not available:

- Streaming still works but won't be resumable
- A warning message will appear in console logs
- No runtime errors or functionality loss
