#!/usr/bin/env python3
"""
Import CodeSearchNet Functions to Supabase

DESIGN DECISION: Bulk import 412K functions with embeddings to codesearchnet_functions table
WHY: Enable immediate dogfooding with 412K searchable functions from Day 3

REASONING CHAIN:
1. Load embeddings from disk (numpy array: 412,178 × 1024)
2. Load metadata from disk (JSON: function names, docstrings, code)
3. Connect to Supabase PostgreSQL database
4. Batch insert 1,000 functions per transaction (for speed)
5. Validate: SELECT COUNT(*) → 412,178
6. Result: 412K searchable functions ready for unified search

PATTERN: Pattern-BOOTSTRAP-001 (CodeSearchNet Bootstrap)
PERFORMANCE: ~1-2 hours for 412K functions (bulk insert)
"""

import os
import sys
import json
import numpy as np
from pathlib import Path
from tqdm import tqdm

def main():
    print("=" * 80)
    print("Import CodeSearchNet to Supabase")
    print("=" * 80)
    print()

    # Check dependencies
    try:
        import psycopg2
        from psycopg2.extras import execute_batch
    except ImportError:
        print("❌ ERROR: psycopg2 not installed")
        print()
        print("Install with:")
        print("  pip install psycopg2-binary")
        sys.exit(1)

    # Check environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ ERROR: DATABASE_URL not set")
        print()
        print("Set environment variable:")
        print("  export DATABASE_URL=<your-connection-string>")
        print()
        print("Or add to .env.local and source it:")
        print("  source .env.local")
        print()
        print("Get connection string from:")
        print("  Supabase Dashboard → Settings → Database")
        sys.exit(1)

    # Load embeddings
    embeddings_path = Path("./data/codesearchnet/python_embeddings.npy")
    if not embeddings_path.exists():
        print(f"❌ ERROR: Embeddings not found at {embeddings_path}")
        print()
        print("Run re-embedding script first:")
        print("  python scripts/re_embed_codesearchnet.py")
        sys.exit(1)

    print(f"📂 Loading embeddings from {embeddings_path}...")
    embeddings = np.load(embeddings_path)
    print(f"✅ Loaded embeddings: {embeddings.shape} (412,178 × 1024)")
    print()

    # Load metadata
    metadata_path = Path("./data/codesearchnet/python_metadata.json")
    if not metadata_path.exists():
        print(f"❌ ERROR: Metadata not found at {metadata_path}")
        print()
        print("Run re-embedding script first:")
        print("  python scripts/re_embed_codesearchnet.py")
        sys.exit(1)

    print(f"📂 Loading metadata from {metadata_path}...")
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    print(f"✅ Loaded metadata: {len(metadata):,} records")
    print()

    # Validation
    assert len(embeddings) == len(metadata), "Embedding/metadata count mismatch"
    print(f"✅ Validation: {len(embeddings):,} functions ready for import")
    print()

    # Connect to Supabase
    print("🔌 Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False  # Use transactions for speed
        cursor = conn.cursor()
        print("✅ Connected successfully")
        print()
    except Exception as e:
        print(f"❌ ERROR: Failed to connect to database")
        print(f"Error: {str(e)}")
        print()
        print("Troubleshooting:")
        print("  1. Check DATABASE_URL is correct")
        print("  2. Check Supabase project is running")
        print("  3. Check network connection")
        sys.exit(1)

    # Check if table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'codesearchnet_functions'
        );
    """)
    table_exists = cursor.fetchone()[0]

    if not table_exists:
        print("❌ ERROR: codesearchnet_functions table not found")
        print()
        print("Run schema setup first:")
        print("  1. Open Supabase SQL Editor")
        print("  2. Run scripts/setup_supabase_schema.sql")
        conn.close()
        sys.exit(1)

    print("✅ codesearchnet_functions table found")
    print()

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM codesearchnet_functions;")
    existing_count = cursor.fetchone()[0]

    if existing_count > 0:
        print(f"⚠️  WARNING: Table already contains {existing_count:,} rows")
        response = input("Delete existing data and re-import? (yes/no): ")
        if response.lower() == 'yes':
            print("🗑️  Deleting existing data...")
            cursor.execute("DELETE FROM codesearchnet_functions;")
            conn.commit()
            print("✅ Existing data deleted")
            print()
        else:
            print("❌ Import cancelled")
            conn.close()
            sys.exit(0)

    # Prepare insert query
    insert_query = """
        INSERT INTO codesearchnet_functions (
            function_id,
            function_name,
            repo,
            path,
            language,
            docstring,
            code,
            embedding,
            confidence,
            docstring_quality
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s::vector, %s, %s
        );
    """

    # Prepare data
    print("📝 Preparing data for bulk insert...")
    records = []

    for i in range(len(metadata)):
        meta = metadata[i]
        embedding_list = embeddings[i].tolist()

        # Calculate docstring quality score (simple heuristic)
        docstring = meta['docstring']
        if docstring and len(docstring.strip()) > 20:
            docstring_quality = min(0.95, 0.5 + (len(docstring) / 500))
        else:
            docstring_quality = 0.3

        record = (
            meta['function_id'],
            meta['function_name'],
            meta['repo'],
            meta['path'],
            meta['language'],
            meta['docstring'],
            meta['code'],
            embedding_list,  # Will be converted to vector by PostgreSQL
            0.75,  # Confidence (lower than custom patterns at 0.95)
            round(docstring_quality, 2)
        )
        records.append(record)

    print(f"✅ Prepared {len(records):,} records")
    print()

    # Batch insert
    print("🚀 Starting bulk insert...")
    print(f"   Batch size: 1,000 functions/transaction")
    print(f"   Total batches: {(len(records) + 999) // 1000:,}")
    print(f"   Estimated time: 1-2 hours")
    print()

    batch_size = 1000
    total_inserted = 0

    try:
        for i in tqdm(range(0, len(records), batch_size), desc="Importing"):
            batch = records[i:i + batch_size]

            # Batch insert
            execute_batch(cursor, insert_query, batch, page_size=batch_size)
            conn.commit()

            total_inserted += len(batch)

            # Progress checkpoint every 50,000 functions
            if total_inserted % 50000 == 0:
                cursor.execute("SELECT COUNT(*) FROM codesearchnet_functions;")
                current_count = cursor.fetchone()[0]
                print(f"\n   Checkpoint: {current_count:,} functions inserted")

        print()
        print(f"✅ Bulk insert complete: {total_inserted:,} functions")
        print()

    except Exception as e:
        print(f"\n❌ ERROR: Import failed")
        print(f"Error: {str(e)}")
        conn.rollback()
        conn.close()
        sys.exit(1)

    # Validation
    print("=" * 80)
    print("Validation")
    print("=" * 80)

    cursor.execute("SELECT COUNT(*) FROM codesearchnet_functions;")
    final_count = cursor.fetchone()[0]
    print(f"✅ Total functions in database: {final_count:,}")

    cursor.execute("""
        SELECT COUNT(*)
        FROM codesearchnet_functions
        WHERE embedding IS NOT NULL;
    """)
    embedded_count = cursor.fetchone()[0]
    print(f"✅ Functions with embeddings: {embedded_count:,}")

    cursor.execute("""
        SELECT COUNT(*)
        FROM codesearchnet_functions
        WHERE search_vector IS NOT NULL;
    """)
    indexed_count = cursor.fetchone()[0]
    print(f"✅ Functions with search_vector: {indexed_count:,}")

    print()

    assert final_count == len(metadata), f"Count mismatch: {final_count} != {len(metadata)}"
    assert embedded_count == len(metadata), f"Embedding count mismatch: {embedded_count} != {len(metadata)}"
    assert indexed_count == len(metadata), f"Index count mismatch: {indexed_count} != {len(metadata)}"

    print("✅ All validation checks passed")
    print()

    # Test search
    print("=" * 80)
    print("Test Unified Search")
    print("=" * 80)

    # Generate test embedding (random for now, will use Voyage in production)
    test_embedding = np.random.randn(1024).tolist()

    cursor.execute("""
        SELECT
            result_id,
            result_name,
            source,
            final_score
        FROM unified_hybrid_search(
            'parse JSON data from API',
            %s::vector,
            'Python',
            0.6,
            5,
            0.70
        );
    """, (test_embedding,))

    results = cursor.fetchall()
    print(f"✅ Test search returned {len(results)} results")

    if results:
        print()
        print("Sample results:")
        for i, (result_id, name, source, score) in enumerate(results[:3], 1):
            print(f"  {i}. {name} (source: {source}, score: {score:.4f})")

    print()

    conn.close()

    # Final summary
    print("=" * 80)
    print("Import Complete!")
    print("=" * 80)
    print(f"✅ {final_count:,} Python functions now searchable")
    print(f"✅ Unified search ready (custom patterns + CodeSearchNet)")
    print(f"✅ Confidence multiplier: 0.95 (custom) vs 0.75 (CodeSearchNet)")
    print()
    print("=" * 80)
    print("Next Steps - Day 4+")
    print("=" * 80)
    print("1. Test unified search via Edge Function:")
    print("   curl -X POST https://<project-id>.supabase.co/functions/v1/search \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -H 'Authorization: Bearer <anon-key>' \\")
    print("     -d '{\"query\": \"parse JSON\", \"language\": \"Python\", \"limit\": 5}'")
    print()
    print("2. Verify CodeSearchNet results returned")
    print("3. Start building custom patterns (Marketing + Legal domains)")
    print("4. Verify custom patterns rank higher (0.95 vs 0.75 confidence)")
    print("5. Dogfood: Use Node 1 while building!")
    print()

if __name__ == "__main__":
    main()
