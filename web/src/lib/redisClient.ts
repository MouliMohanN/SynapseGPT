import { createClient, type RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let redisSubscriber: RedisClientType | null = null;

function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: getRedisUrl() });
    redisClient.on("error", (err: unknown) => {
      console.error("Redis client error", err);
    });
    await redisClient.connect();
  }
  return redisClient;
}

export async function getRedisSubscriber(): Promise<RedisClientType> {
  if (!redisSubscriber) {
    redisSubscriber = createClient({ url: getRedisUrl() });
    redisSubscriber.on("error", (err: unknown) => {
      console.error("Redis subscriber error", err);
    });
    await redisSubscriber.connect();
  }
  return redisSubscriber;
}
