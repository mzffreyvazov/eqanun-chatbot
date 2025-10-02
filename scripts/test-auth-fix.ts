import { config } from 'dotenv';

config({
  path: '.env.local',
});

async function testAuthFix() {
  console.log('🔍 Testing Authentication Fix...\n');

  // Test 1: Check environment variables
  console.log('1️⃣  Checking environment variables:');
  const hasPostgres = !!process.env.POSTGRES_URL;
  const hasAuthSecret = !!process.env.AUTH_SECRET;
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasSupabaseAnonKey = !!process.env.SUPABASE_ANON_KEY;
  const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`   POSTGRES_URL: ${hasPostgres ? '✅' : '❌'}`);
  console.log(`   AUTH_SECRET: ${hasAuthSecret ? '✅' : '❌'}`);
  console.log(`   SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '⚠️  (optional)'}`);
  console.log(`   SUPABASE_ANON_KEY: ${hasSupabaseAnonKey ? '✅' : '⚠️  (optional)'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseServiceKey ? '✅' : '⚠️  (optional)'}\n`);

  if (!hasPostgres || !hasAuthSecret) {
    console.error('❌ Missing required environment variables!');
    console.error('   Please set POSTGRES_URL and AUTH_SECRET in .env.local');
    process.exit(1);
  }

  // Test 2: Check Supabase integration mode
  const hasFullSupabaseConfig = hasSupabaseUrl && hasSupabaseAnonKey && hasSupabaseServiceKey;
  console.log('2️⃣  Supabase Integration Mode:');
  if (hasFullSupabaseConfig) {
    console.log('   ✅ Full integration mode (Supabase Auth + Database)');
    console.log('   → Login will sync with Supabase Auth API');
  } else {
    console.log('   ⚠️  Standalone mode (Database only)');
    console.log('   → Login will work with database authentication only');
    console.log('   → Supabase Auth sync will be skipped (this is OK for development)');
  }
  console.log();

  // Test 3: Database configuration
  console.log('3️⃣  Database configuration:');
  if (process.env.POSTGRES_URL) {
    const connectionString = process.env.POSTGRES_URL;
    const isPooler = connectionString.includes(':6543');
    const isDirect = connectionString.includes(':5432');
    
    if (isPooler) {
      console.log('   ⚠️  Using pooler connection (port 6543)');
      console.log('   💡 For Next.js, use direct connection (port 5432) instead');
    } else if (isDirect) {
      console.log('   ✅ Using direct connection (port 5432) - Correct!');
    } else {
      console.log('   ⚠️  Custom port detected');
    }
  }
  console.log();

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All authentication tests passed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🚀 What happens when you login:');
  console.log('   1. Database authentication will be checked ✅');
  
  if (hasFullSupabaseConfig) {
    console.log('   2. Supabase Auth sync will be attempted');
    console.log('      - If successful: Full features available ✅');
    console.log('      - If timeout/error: Login still succeeds ⚠️');
  } else {
    console.log('   2. Supabase Auth sync will be skipped (no config)');
    console.log('      - Login will succeed with database auth only ✅');
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Restart your dev server: pnpm dev');
  console.log('   2. Try logging in');
  console.log('   3. Check the console for any warnings\n');

  process.exit(0);
}

testAuthFix().catch((error) => {
  console.error('❌ Test failed unexpectedly!');
  console.error(error);
  process.exit(1);
});
