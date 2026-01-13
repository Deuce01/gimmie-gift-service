import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
    DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
    PORT: z.string().regex(/^\d+$/).transform(Number).default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CACHE_TTL_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('300'),
    CACHE_CHECK_PERIOD_SECONDS: z.string().regex(/^\d+$/).transform(Number).default('60'),
    RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
    OPENAI_API_KEY: z.string().min(1).optional(),
});

// Validate and parse environment variables
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('[ERROR] Environment validation failed:');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            console.error('\n[INFO] Please check your .env file and ensure all required variables are set.');
            console.error('       Refer to .env.example for the correct format.\n');
        }
        process.exit(1);
    }
};

// Export validated configuration
export const env = parseEnv();

// Type for the configuration
export type EnvConfig = z.infer<typeof envSchema>;
