import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // Redis (Upstash)
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  },

  // Vendor API Keys
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // Auth
  apiKeySalt: process.env.API_KEY_SALT || 'default-salt',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logQueries: process.env.LOG_QUERIES === 'true',
};

// Validate required config
export function validateConfig() {
  const required = [
    { key: 'databaseUrl', value: config.databaseUrl, name: 'DATABASE_URL' },
  ];

  const missing = required.filter(r => !r.value);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(m => console.error(`   - ${m.name}`));
    process.exit(1);
  }

  // Warn if OpenAI key is missing (but don't fail)
  if (!config.openaiApiKey) {
    console.warn('⚠️  OPENAI_API_KEY not set - using mock inference service');
  }
}