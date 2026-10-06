import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

/** Upstash Redis from the Vercel Marketplace integration, or null when it is not configured. */
export function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}
