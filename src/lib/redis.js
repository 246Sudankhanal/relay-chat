import { createClient } from 'redis';
import config from '../config.js';

export async function createRedisPair() {
  const pubClient = createClient({ url: config.redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('Redis publisher error:', err.message);
  });
  subClient.on('error', (err) => {
    console.error('Redis subscriber error:', err.message);
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);
  return { pubClient, subClient };
}
