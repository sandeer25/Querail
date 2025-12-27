import { buildServer } from './server';
import { config, validateConfig } from './config';
import { initDatabase } from '@ai-control/database';

async function start() {
  try {
    // Validate config
    validateConfig();

    // Initialize database
    console.log('🔄 Initializing database...');
    initDatabase(config.databaseUrl);
    console.log('✅ Database initialized');

    // Build and start server
    console.log('🔄 Starting server...');
    const server = await buildServer();

    await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`✅ Server running on http://localhost:${config.port}`);
    console.log(`📊 Environment: ${config.env}`);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();