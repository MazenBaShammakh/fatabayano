import "server-only";
import { randomBytes } from "node:crypto";
import type { ShareCard } from "@/lib/types";
import { getRedis } from "./redis";

const TTL_SECONDS = 30 * 24 * 60 * 60;
const key = (id: string) => `card:${id}`;

export class StorageUnavailableError extends Error {
  constructor() {
    super("storage_unavailable");
    this.name = "StorageUnavailableError";
  }
}

function redis() {
  const r = getRedis();
  if (!r) throw new StorageUnavailableError();
  return r;
}

/** Stores a card for 30 days. Cards hold verified claims only, never the original message or image. */
export async function saveCard(card: ShareCard): Promise<string> {
  const id = randomBytes(9).toString("base64url");
  await redis().set(key(id), card, { ex: TTL_SECONDS });
  return id;
}

export async function loadCard(id: string): Promise<ShareCard | null> {
  if (!/^[\w-]{6,32}$/.test(id)) return null;
  return redis().get<ShareCard>(key(id));
}
