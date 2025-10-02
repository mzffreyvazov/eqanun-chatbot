/**
 * Test Redis Connection
 * 
 * This script tests your Redis connection to help diagnose authentication issues.
 * Run with: npx tsx scripts/test-redis-connection.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from 'redis';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  
  console.log('\n=== REDIS CONNECTION TEST ===\n');
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in environment variables');
    console.log('\nPlease set REDIS_URL in your .env.local file');
    console.log('Format: redis://[username:]password@host:port');
    console.log('Example: redis://default:mypassword@host.redis.com:19403\n');
    process.exit(1);
  }
  
  // Parse URL safely (hide password in logs)
  try {
    const url = new URL(redisUrl);
    console.log('Testing connection to:');
    console.log(`  Host: ${url.hostname}`);
    console.log(`  Port: ${url.port}`);
    console.log(`  Protocol: ${url.protocol.replace(':', '')}`);
    console.log(`  Username: ${url.username || 'default'}`);
    console.log(`  Password: ${url.password ? '***' + url.password.slice(-4) : '(none)'}`);
    console.log('');
  } catch (e) {
    console.warn('Could not parse Redis URL (this is OK, will try to connect anyway)');
  }
  
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 10000,
      reconnectStrategy: false,
    },
  });
  
  // Set up error handler
  let errorOccurred = false;
  client.on('error', (err) => {
    errorOccurred = true;
    console.error('\n❌ Redis Error:', err.message);
    
    if (err.message.includes('NOAUTH')) {
      console.error('\n🔍 DIAGNOSIS: Authentication Required');
      console.error('Your Redis URL is missing authentication credentials.');
      console.error('\nTO FIX:');
      console.error('1. Go to https://app.redislabs.com/');
      console.error('2. Find your database password');
      console.error('3. Update REDIS_URL in .env.local:');
      console.error('   redis://default:YOUR_PASSWORD@host:port');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
      console.error('\n🔍 DIAGNOSIS: Cannot reach Redis server');
      console.error('Check your network connection and Redis host/port.');
    } else if (err.message.includes('WRONGPASS')) {
      console.error('\n🔍 DIAGNOSIS: Incorrect password');
      console.error('The password in your REDIS_URL is wrong.');
      console.error('Get the correct password from https://app.redislabs.com/');
    }
  });
  
  try {
    console.log('Connecting to Redis...');
    await client.connect();
    
    if (errorOccurred) {
      console.error('\n❌ Connection failed\n');
      await client.quit().catch(() => {});
      process.exit(1);
    }
    
    console.log('✅ Connected successfully!\n');
    
    // Test basic operations
    console.log('Testing PING command...');
    const pong = await client.ping();
    console.log(`✅ PING response: ${pong}\n`);
    
    console.log('Testing SET command...');
    await client.set('test:connection', 'success', { EX: 10 });
    console.log('✅ SET successful\n');
    
    console.log('Testing GET command...');
    const value = await client.get('test:connection');
    console.log(`✅ GET response: ${value}\n`);
    
    console.log('🎉 All tests passed! Your Redis connection is working correctly.\n');
    
    await client.quit();
    process.exit(0);
  } catch (error) {
    if (!errorOccurred) {
      console.error('\n❌ Connection failed:', error instanceof Error ? error.message : error);
    }
    
    try {
      await client.quit();
    } catch (e) {
      // Ignore quit errors
    }
    
    console.log('\n');
    process.exit(1);
  }
}

testRedisConnection();
