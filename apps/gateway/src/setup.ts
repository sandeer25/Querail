import { initDatabase, getDatabase, OrganizationsRepository, ApiKeysRepository } from '@ai-control/database';
import { config, validateConfig } from './config';

async function setup() {
  try {
    validateConfig();
    
    console.log('Setting up test organization...');
    
    // Initialize database
    initDatabase(config.databaseUrl);
    const db = getDatabase();
    
    const orgsRepo = new OrganizationsRepository(db);
    const apiKeysRepo = new ApiKeysRepository(db);
    
    // Create test organization
    const org = await orgsRepo.create({
      name: 'Test Organization',
      defaultBudget: 1.0,
      allowedVendors: ['openai'],
    });
    
    console.log('Organization created:', org.id);
    
    // Create API key
    const { apiKey, rawKey } = await apiKeysRepo.create({
      organizationId: org.id,
      name: 'Test API Key',
    });
    
    console.log('API Key created!');
    console.log('\n SAVE THIS INFORMATION:\n');
    console.log(`Organization ID: ${org.id}`);
    console.log(`API Key: ${rawKey}`);
    console.log('\n Save the API key now - you won\'t see it again!\n');
    
    await db.close();
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();