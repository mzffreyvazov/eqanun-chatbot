import { config } from 'dotenv';
import postgres from 'postgres';

config({
  path: '.env.local',
});

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  // Check if POSTGRES_URL exists
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL environment variable is not set');
    console.error('   Please check your .env.local file');
    process.exit(1);
  }

  console.log('✅ POSTGRES_URL is set');
  console.log(`   Connection string: ${process.env.POSTGRES_URL.replace(/:[^:@]+@/, ':****@')}\n`);

  try {
    // Create a test connection
    const sql = postgres(process.env.POSTGRES_URL, {
      max: 1,
      onnotice: () => {}, // Suppress notices
    });

    console.log('🔄 Attempting to connect to database...');

    // Test query
    const result = await sql`SELECT current_database(), current_user, version()`;
    
    console.log('✅ Successfully connected to PostgreSQL!\n');
    console.log('Database info:');
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);
    console.log(`   Version: ${result[0].version.split(' ').slice(0, 2).join(' ')}\n`);

    // Check if User table exists
    console.log('🔍 Checking for User table...');
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'User'
    `;

    if (tables.length === 0) {
      console.error('❌ User table does not exist!');
      console.error('   Run: pnpm db:migrate');
      await sql.end();
      process.exit(1);
    }

    console.log('✅ User table exists\n');

    // Check table structure
    console.log('🔍 Checking User table structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `;

    console.log('   Columns:');
    for (const col of columns) {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    }

    console.log('\n✅ Database connection test passed!');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 The database server is not running or not accessible.');
        console.error('   - Make sure PostgreSQL is running');
        console.error('   - Check if the host and port are correct in POSTGRES_URL');
      } else if (error.message.includes('password authentication failed')) {
        console.error('\n💡 Authentication failed.');
        console.error('   - Check username and password in POSTGRES_URL');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('\n💡 The database does not exist.');
        console.error('   - Create the database first');
        console.error('   - Then run: pnpm db:migrate');
      }
    }
    
    process.exit(1);
  }
}

testConnection();
