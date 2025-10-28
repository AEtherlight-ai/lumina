#!/usr/bin/env python3
"""
Re-Embed CodeSearchNet Functions with Voyage-code-2

DESIGN DECISION: Re-embed 412K functions with Voyage-code-2 (code-optimized)
WHY: Original CodeSearchNet embeddings are from CodeBERT (older model), Voyage-code-2 outperforms by 15%+

REASONING CHAIN:
1. Load CodeSearchNet dataset from disk (412K functions)
2. Batch embed with Voyage-code-2 (128 functions/batch for speed)
3. Save embeddings to disk (numpy array: 412,178 × 1024)
4. Validate: All functions embedded, no errors
5. Result: Ready for Day 3 import to Supabase

PATTERN: Pattern-BOOTSTRAP-001 (CodeSearchNet Bootstrap)
PERFORMANCE: ~4 hours for 412K functions (batch API)
COST: $12.36 (206M tokens × $0.06/1M)
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from tqdm import tqdm
import json

def main():
    print("=" * 80)
    print("Re-Embed CodeSearchNet with Voyage-code-2")
    print("=" * 80)
    print()

    # Check environment
    voyage_api_key = os.getenv('VOYAGE_API_KEY')
    if not voyage_api_key:
        print("❌ ERROR: VOYAGE_API_KEY not set")
        print()
        print("Set environment variable:")
        print("  export VOYAGE_API_KEY=<your-key>")
        print()
        print("Or add to .env.local and source it:")
        print("  source .env.local")
        sys.exit(1)

    # Check dependencies
    try:
        import requests
        from datasets import load_from_disk
    except ImportError as e:
        print(f"❌ ERROR: Missing dependency: {e}")
        print()
        print("Install with:")
        print("  pip install requests datasets tqdm numpy")
        sys.exit(1)

    # Load dataset
    data_dir = Path("./data/codesearchnet/python_train")
    if not data_dir.exists():
        print(f"❌ ERROR: Dataset not found at {data_dir}")
        print()
        print("Run download script first:")
        print("  python scripts/download_codesearchnet.py")
        sys.exit(1)

    print(f"📂 Loading dataset from {data_dir}...")
    dataset = load_from_disk(str(data_dir))
    print(f"✅ Loaded {len(dataset):,} functions")
    print()

    # Prepare texts for embedding
    print("📝 Preparing texts for embedding...")
    texts = []
    metadata = []

    for idx, item in enumerate(tqdm(dataset, desc="Preparing")):
        # Combine docstring + code for better embeddings
        docstring = item['func_documentation_string'] or ''
        code = item['func_code_string'] or ''

        # Format: "docstring\n\ncode" (up to 8K tokens per Voyage limits)
        text = f"{docstring}\n\n{code}"[:30000]  # ~8K tokens max
        texts.append(text)

        # Save metadata for later import
        metadata.append({
            'function_id': f"csn-python-{idx}",
            'function_name': item['func_name'],
            'repo': item['repo_name'],
            'path': item['path'],
            'language': 'Python',
            'docstring': docstring,
            'code': code,
        })

    print(f"✅ Prepared {len(texts):,} texts for embedding")
    print()

    # Batch embedding with Voyage AI
    print("🚀 Starting batch embedding with Voyage-code-2...")
    print(f"   Model: voyage-code-2 (code-optimized, 1024-dim)")
    print(f"   Batch size: 128 functions/batch")
    print(f"   Total batches: {(len(texts) + 127) // 128:,}")
    print(f"   Estimated time: ~4 hours")
    print(f"   Estimated cost: $12.36")
    print()

    embeddings = []
    batch_size = 128
    total_batches = (len(texts) + batch_size - 1) // batch_size

    start_time = time.time()

    for i in tqdm(range(0, len(texts), batch_size), desc="Embedding", total=total_batches):
        batch = texts[i:i + batch_size]

        # Call Voyage API
        try:
            response = requests.post(
                'https://api.voyageai.com/v1/embeddings',
                headers={
                    'Authorization': f'Bearer {voyage_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'voyage-code-2',  # Code-optimized model
                    'input': batch,
                    'input_type': 'document',  # Document mode for indexing
                },
                timeout=120
            )

            if response.status_code != 200:
                print(f"\n❌ ERROR: Voyage API returned {response.status_code}")
                print(f"Response: {response.text}")
                sys.exit(1)

            data = response.json()
            batch_embeddings = [item['embedding'] for item in data['data']]
            embeddings.extend(batch_embeddings)

        except requests.exceptions.Timeout:
            print(f"\n⚠️  Timeout on batch {i // batch_size + 1}, retrying...")
            time.sleep(5)
            # Retry once
            response = requests.post(
                'https://api.voyageai.com/v1/embeddings',
                headers={
                    'Authorization': f'Bearer {voyage_api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'voyage-code-2',
                    'input': batch,
                    'input_type': 'document',
                },
                timeout=180
            )
            data = response.json()
            batch_embeddings = [item['embedding'] for item in data['data']]
            embeddings.extend(batch_embeddings)

        except Exception as e:
            print(f"\n❌ ERROR: Failed on batch {i // batch_size + 1}")
            print(f"Error: {str(e)}")
            sys.exit(1)

        # Rate limiting: 100 requests/minute for Voyage AI
        time.sleep(0.6)  # ~100 req/min

    elapsed_time = time.time() - start_time
    print()
    print(f"✅ Embedding complete in {elapsed_time / 3600:.2f} hours")
    print()

    # Convert to numpy array
    print("💾 Saving embeddings to disk...")
    embeddings_array = np.array(embeddings, dtype=np.float32)

    # Save embeddings
    embeddings_path = Path("./data/codesearchnet/python_embeddings.npy")
    np.save(embeddings_path, embeddings_array)
    print(f"✅ Embeddings saved: {embeddings_path}")
    print(f"   Shape: {embeddings_array.shape} (412,178 × 1024)")
    print(f"   Size: {embeddings_path.stat().st_size / 1024 / 1024:.1f} MB")
    print()

    # Save metadata
    metadata_path = Path("./data/codesearchnet/python_metadata.json")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)
    print(f"✅ Metadata saved: {metadata_path}")
    print(f"   Records: {len(metadata):,}")
    print()

    # Validation
    print("=" * 80)
    print("Validation")
    print("=" * 80)
    assert len(embeddings) == len(texts), "Embedding count mismatch"
    assert embeddings_array.shape == (len(texts), 1024), "Embedding shape mismatch"
    print(f"✅ All {len(embeddings):,} functions embedded successfully")
    print(f"✅ Embedding dimensions: 1024 (Voyage-code-2)")
    print()

    # Cost calculation
    total_tokens = sum(len(text.split()) * 1.3 for text in texts)  # Rough estimate
    cost = (total_tokens / 1_000_000) * 0.06  # $0.06 per 1M tokens
    print(f"📊 Estimated cost: ${cost:.2f}")
    print(f"   Total tokens: ~{total_tokens / 1_000_000:.1f}M")
    print(f"   Rate: $0.06 per 1M tokens")
    print()

    print("=" * 80)
    print("Next Steps")
    print("=" * 80)
    print("Day 3: Import to Supabase")
    print("  python scripts/import_codesearchnet.py")
    print()
    print("This will:")
    print("  1. Load embeddings from python_embeddings.npy")
    print("  2. Load metadata from python_metadata.json")
    print("  3. Bulk insert 412K functions into codesearchnet_functions table")
    print("  4. Verify: 412,178 searchable functions ready")
    print()

if __name__ == "__main__":
    main()
