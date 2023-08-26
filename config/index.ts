import dotenv from 'dotenv';

dotenv.config();

export default {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
};
