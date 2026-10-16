import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: Number(process.env.PORT) || 3000,
  instanceId: process.env.INSTANCE_ID || `server-${process.pid}`,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/relay',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS) || 7,
  nodeEnv: process.env.NODE_ENV || 'development',
  rooms: [
    { slug: 'general', name: 'General', description: 'Say hello and hang out' },
    { slug: 'random', name: 'Random', description: 'Off-topic chatter' },
    { slug: 'engineering', name: 'Engineering', description: 'Build and debug together' },
  ],
};

export default config;
