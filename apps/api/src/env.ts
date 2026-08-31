import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6380'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required. Please set JWT_SECRET in your environment or .env file.'
  }).min(1, 'JWT_SECRET cannot be empty.'),
  ENCRYPTION_KEY: z.string({
    required_error: 'ENCRYPTION_KEY is required. Please set ENCRYPTION_KEY in your environment or .env file.'
  }).min(1, 'ENCRYPTION_KEY cannot be empty.')
});

export const env = envSchema.parse(process.env);
