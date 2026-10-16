import { createServer } from 'node:http';
import mongoose from 'mongoose';
import app from './app.js';
import config from './config.js';
import { createRedisPair } from './lib/redis.js';
import { createSocketServer } from './sockets/index.js';

async function main() {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB connected (${config.mongoUri})`);

  const { pubClient, subClient } = await createRedisPair();
  console.log('Redis pub/sub connected');

  const httpServer = createServer(app);
  createSocketServer(httpServer, { pubClient, subClient });

  httpServer.listen(config.port, () => {
    console.log(`Relay [${config.instanceId}] http://127.0.0.1:${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start. Is Redis + Mongo running? Try: pnpm docker:up');
  console.error(err);
  process.exit(1);
});
