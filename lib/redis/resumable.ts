import {
	createResumableStreamContext,
	type ResumableStreamContext,
} from "resumable-stream";
import { after } from "next/server";
import { ensureRedisClients } from "./client";

const globalKey = Symbol.for("eqanun.redis.resumable");

export async function getResumableStreamContext(): Promise<ResumableStreamContext | null> {
	const connections = await ensureRedisClients();
	if (!connections || !connections.publisher || !connections.subscriber) {
		return null;
	}

	const globalState = (globalThis as any)[globalKey] as
		| ResumableStreamContext
		| undefined;
	if (globalState) return globalState;

	const context = createResumableStreamContext({
		waitUntil: after,
		publisher: connections.publisher,
		subscriber: connections.subscriber,
	});

	(globalThis as any)[globalKey] = context;
	return context;
}
