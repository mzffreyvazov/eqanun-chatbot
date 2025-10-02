import { createClient, } from "redis";

type RedisClients = {
	base: ReturnType<typeof createClient> | null;
	publisher: ReturnType<typeof createClient> | null;
	subscriber: ReturnType<typeof createClient> | null;
};

const globalKey = Symbol.for("eqanun.redis.clients");
const failedKey = Symbol.for("eqanun.redis.failed");
const defaultState: RedisClients = {
	base: null,
	publisher: null,
	subscriber: null,
};

function getState(): RedisClients {
	const globalState = (globalThis as any)[globalKey];
	if (globalState) return globalState satisfies RedisClients;
	(globalThis as any)[globalKey] = defaultState;
	return defaultState;
}

function getFailedState(): boolean {
	return !!(globalThis as any)[failedKey];
}

function setFailedState(failed: boolean): void {
	(globalThis as any)[failedKey] = failed;
}

function createRedisClient(url: string) {
	const client = createClient({
		url,
		socket: { 
			reconnectStrategy: false, // Don't auto-reconnect on auth failures
			connectTimeout: 5000, // 5 second timeout
		},
	});
	// Suppress error events to prevent unhandled errors
	client.on("error", () => {
		// Errors are handled in ensureRedisClients, ignore here
	});
	return client;
}

export async function ensureRedisClients() {
	const url = process.env.REDIS_URL;
	if (!url) {
		if (!getFailedState()) {
			console.warn('[redis] REDIS_URL not configured, resumable streams disabled');
			setFailedState(true);
		}
		return null;
	}

	// If we've already failed to connect, don't try again
	if (getFailedState()) {
		return null;
	}

	try {
		const state = getState();
		if (!state.base) {
			const client = createRedisClient(url);
			await client.connect();
			state.base = client;
		}
		if (!state.publisher) {
			const publisher = state.base.duplicate();
			await publisher.connect();
			state.publisher = publisher;
		}
		if (!state.subscriber) {
			const subscriber = state.base.duplicate();
			await subscriber.connect();
			state.subscriber = subscriber;
		}

		// Connection successful, clear failed state
		setFailedState(false);
		console.log('[redis] Connected successfully');
		return state;
	} catch (error) {
		// Mark as failed to prevent repeated attempts
		setFailedState(true);
		
		console.error('\n=== REDIS CONNECTION ERROR ===');
		console.error('[redis] Failed to connect:', error instanceof Error ? error.message : error);
		console.error('[redis] Resumable streams DISABLED - App will continue with direct streaming');
		console.error('[redis] To fix: Update REDIS_URL in .env.local with authentication:');
		console.error('[redis] Format: redis://default:PASSWORD@host:port');
		console.error('[redis] Get password from: https://app.redislabs.com/');
		console.error('=== END REDIS ERROR ===\n');
		
		// Reset state so we don't keep trying failed connections
		const state = getState();
		if (state.base) {
			try {
				await state.base.quit();
			} catch (e) {
				// Ignore quit errors
			}
		}
		state.base = null;
		state.publisher = null;
		state.subscriber = null;
		
		return null;
	}
}

export type RedisConnections = Awaited<ReturnType<typeof ensureRedisClients>>;
