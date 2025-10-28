/**
 * DESIGN DECISION: Create patterns table directly via Supabase client
 * WHY: CLI db push failing, use direct SQL execution instead
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../products/lumina-desktop/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  console.log('🚀 Creating patterns table in Supabase...\n');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251016_create_patterns_table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Executing migration SQL...');
  console.log(`   File: ${migrationPath}`);
  console.log(`   Size: ${sql.length} chars\n`);

  // Execute SQL directly
  const { data, error } = await supabase.rpc('exec', {
    sql: sql
  });

  if (error) {
    console.error('❌ Failed to create table:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Details:', error.details);
    process.exit(1);
  }

  console.log('✓ Migration executed successfully!');
  console.log('\n📊 Table "patterns" created with:');
  console.log('   - Vector embeddings (1024 dimensions)');
  console.log('   - HNSW index for semantic search');
  console.log('   - Full-text search (tsvector)');
  console.log('   - Auto-update triggers');
  console.log('   - Row Level Security policies');
  console.log('\n✨ Ready to upload patterns!');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
