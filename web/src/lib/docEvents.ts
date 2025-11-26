import { getRedisClient, getRedisSubscriber } from "./redisClient";

export interface DocEvent {
  docId: string;
  type: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

type Listener = (event: DocEvent) => void;

const listeners = new Map<string, Set<Listener>>();
const subscribedChannels = new Set<string>();

function getChannelForDoc(docId: string): string {
  return `doc-events:${docId}`;
}

function getGlobalChannel(): string {
  return getChannelForDoc("__all__");
}

async function ensureRedisSubscription(docId: string): Promise<void> {
  const channel = getChannelForDoc(docId);
  if (subscribedChannels.has(channel)) return;

  const subscriber = await getRedisSubscriber();

  await subscriber.subscribe(channel, (message: string) => {
    try {
      const parsed = JSON.parse(message) as DocEvent;
      const set = listeners.get(docId);
      if (!set) return;
      for (const listener of set) {
        try {
          listener(parsed);
        } catch (error) {
          console.error("Error in doc event listener:", error);
        }
      }
    } catch (error) {
      console.error("Failed to parse doc event from Redis:", error, message);
    }
  });

  subscribedChannels.add(channel);
}

export function subscribeToDocEvents(docId: string, listener: Listener): () => void {
  let set = listeners.get(docId);
  if (!set) {
    set = new Set();
    listeners.set(docId, set);
  }
  set.add(listener);

  ensureRedisSubscription(docId).catch((error) => {
    console.error("Failed to subscribe to Redis doc channel:", error);
  });

  return () => {
    const current = listeners.get(docId);
    if (!current) return;

    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(docId);

      const channel = getChannelForDoc(docId);
      if (subscribedChannels.has(channel)) {
        getRedisSubscriber()
          .then((subscriber) => subscriber.unsubscribe(channel))
          .catch((error) => {
            console.error("Failed to unsubscribe from Redis doc channel:", error);
          });
        subscribedChannels.delete(channel);
      }
    }
  };
}

interface EmitEventInput {
  type: string;
  message: string;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

export function emitDocEvent(docId: string, event: EmitEventInput): void {
  const fullEvent: DocEvent = {
    docId,
    type: event.type,
    message: event.message,
    timestamp: event.timestamp ?? new Date().toISOString(),
    meta: event.meta,
  };

  const channel = getChannelForDoc(docId);
  const globalChannel = getGlobalChannel();

  getRedisClient()
    .then((client) =>
      Promise.all([
        client.publish(channel, JSON.stringify(fullEvent)),
        client.publish(globalChannel, JSON.stringify(fullEvent)),
      ]).then(() => void 0),
    )
    .catch((error) => {
      console.error("Failed to publish doc event to Redis:", error);
    });
}
