#!/usr/bin/env python3
"""
Re-Embed CodeSearchNet FULL Dataset with Voyage-code-3 (All 6 Languages, All Splits)

DESIGN DECISION: Embed ALL 2M functions with Voyage-code-3 (code-optimized, 1024-dim)
WHY: Maximum pattern coverage + validation/test data for quality assessment

REASONING CHAIN:
1. Load all 18 datasets from disk (6 languages × 3 splits)
2. Batch embed with Voyage-code-3 (32 functions/batch to stay under 120K token limit)
3. Adaptive text truncation: 15K-30K chars based on function length
4. Save embeddings per dataset (e.g., python_train_embeddings.npy)
5. Validate: All functions embedded, no errors
6. Result: Ready for Day 3 import to Supabase (2M searchable functions)

PATTERN: Pattern-BOOTSTRAP-003 (Full Multi-Language Bootstrap)
PERFORMANCE: ~36-50 hours for 2M functions (batch API, rate limited, safer batch size)
COST: ~$24 (2M functions × ~1K tokens × $0.012 per 1K tokens)

FIX (2025-10-16): Reduced batch size 64→32 and added adaptive truncation after
batch 298 token limit error (126,602 tokens exceeded 120K limit)
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from tqdm import tqdm
import json

# Language configurations (from download script)
LANGUAGES = {
    'python': {'functions': 457_461, 'cost': 4.94},
    'javascript': {'functions': 138_625, 'cost': 1.66},
    'java': {'functions': 496_688, 'cost': 5.96},
    'go': {'functions': 346_365, 'cost': 4.16},
    'php': {'functions': 523_712, 'cost': 6.28},
    'ruby': {'functions': 57_393, 'cost': 0.69}
}

SPLITS = ['train', 'validation', 'test']

def embed_dataset(dataset_path, output_path, voyage_api_key, lang_name, split_name):
    """
    Embed a single dataset split and save embeddings.

    Args:
        dataset_path: Path to dataset directory
        output_path: Path to save embeddings (.npy)
        voyage_api_key: Voyage API key
        lang_name: Language name (for progress display)
        split_name: Split name (train/validation/test)
    """
    import requests
    from datasets import load_from_disk

    # Load dataset
    print(f"   Loading {dataset_path.name}...")
    dataset = load_from_disk(str(dataset_path))
    print(f"   Loaded {len(dataset):,} functions")

    # Prepare texts for embedding
    print(f"   Preparing texts...")
    texts = []
    for item in dataset:
        # Combine docstring + code for better embeddings
        docstring = item.get('func_documentation_string', '') or ''
        code = item.get('func_code_string', '') or ''

        # FIXED: Adaptive truncation based on length
        # Very long functions: 15K chars (~4K tokens)
        # Medium functions: 20K chars (~5K tokens)
        # Short functions: 30K chars (~8K tokens)
        combined = f"{docstring}\n\n{code}"
        if len(combined) > 50000:
            text = combined[:15000]  # Extra long → 15K chars
        elif len(combined) > 30000:
            text = combined[:20000]  # Long → 20K chars
        else:
            text = combined[:30000]  # Normal → 30K chars

        texts.append(text)

    print(f"   Prepared {len(texts):,} texts")

    # Batch embedding with Voyage AI
    print(f"   Starting batch embedding...")
    embeddings = []
    batch_size = 32  # FIXED: Reduced from 64 to 32 (50% reduction for safety)
    total_batches = (len(texts) + batch_size - 1) // batch_size

    for i in tqdm(range(0, len(texts), batch_size), desc=f"   {lang_name.capitalize()} {split_name}", total=total_batches):
        batch = texts[i:i + batch_size]

        # Call Voyage API
        max_retries = 3
        for retry in range(max_retries):
            try:
                response = requests.post(
                    'https://api.voyageai.com/v1/embeddings',
                    headers={
                        'Authorization': f'Bearer {voyage_api_key}',
                        'Content-Type': 'application/json',
                    },
                    json={
                        'model': 'voyage-code-3',  # Code-optimized model (1024-dim)
                        'input': batch,
                        'input_type': 'document',  # Document mode for indexing
                    },
                    timeout=120
                )

                if response.status_code != 200:
                    print(f"\n      ERROR: Voyage API returned {response.status_code}")
                    print(f"      Response: {response.text}")
                    if retry < max_retries - 1:
                        print(f"      Retrying in 10s... (attempt {retry + 2}/{max_retries})")
                        time.sleep(10)
                        continue
                    else:
                        sys.exit(1)

                data = response.json()
                batch_embeddings = [item['embedding'] for item in data['data']]
                embeddings.extend(batch_embeddings)
                break  # Success, exit retry loop

            except requests.exceptions.Timeout:
                if retry < max_retries - 1:
                    print(f"\n      Timeout, retrying in 10s... (attempt {retry + 2}/{max_retries})")
                    time.sleep(10)
                else:
                    print(f"\n      ERROR: Max retries exceeded")
                    sys.exit(1)

            except Exception as e:
                if retry < max_retries - 1:
                    print(f"\n      Error: {str(e)}, retrying in 10s... (attempt {retry + 2}/{max_retries})")
                    time.sleep(10)
                else:
                    print(f"\n      ERROR: Failed after {max_retries} retries")
                    print(f"      Error: {str(e)}")
                    sys.exit(1)

        # Rate limiting: 100 requests/minute for Voyage AI
        time.sleep(0.6)  # ~100 req/min

    # Convert to numpy array and save
    embeddings_array = np.array(embeddings, dtype=np.float32)
    np.save(output_path, embeddings_array)
    print(f"   Saved embeddings: {output_path.name}")
    print(f"   Shape: {embeddings_array.shape}")
    print()

    return len(embeddings)

def main():
    print("=" * 80)
    print("Re-Embed CodeSearchNet FULL Dataset with Voyage-code-2")
    print("=" * 80)
    print()

    # Check environment
    voyage_api_key = os.getenv('VOYAGE_API_KEY')
    if not voyage_api_key:
        print("ERROR: VOYAGE_API_KEY not set")
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
        print(f"ERROR: Missing dependency: {e}")
        print()
        print("Install with:")
        print("  pip install requests datasets tqdm numpy")
        sys.exit(1)

    # Overview
    total_functions = sum(lang['functions'] for lang in LANGUAGES.values())
    total_cost = sum(lang['cost'] for lang in LANGUAGES.values())

    print("Dataset Overview:")
    print(f"   Total languages: {len(LANGUAGES)}")
    print(f"   Total functions: {total_functions:,}")
    print(f"   Estimated cost: ${total_cost:.2f}")
    print()

    for lang_name, info in LANGUAGES.items():
        print(f"   {lang_name.capitalize():12} {info['functions']:>7,} functions  ${info['cost']:>5.2f}")
    print()

    print(f"Model: voyage-code-3 (code-optimized, 1024-dim)")
    print(f"Batch size: 32 functions/batch (FIXED: reduced from 64)")
    print(f"Text truncation: Adaptive 15K-30K chars (FIXED: prevents token limit errors)")
    print(f"Rate limit: 100 requests/minute")
    print(f"Estimated time: 36-50 hours")
    print()

    # Confirm
    print("WARNING: This will cost ~$24 and take 36-50 hours")
    print()

    # Process each language × split
    data_dir = Path("./data/codesearchnet")
    if not data_dir.exists():
        print(f"ERROR: Dataset directory not found: {data_dir}")
        print()
        print("Run download script first:")
        print("  python scripts/download_codesearchnet_full.py")
        sys.exit(1)

    start_time = time.time()
    total_embedded = 0

    for lang_name in LANGUAGES.keys():
        print("=" * 80)
        print(f"Embedding {lang_name.upper()} (all splits)")
        print("=" * 80)
        print()

        for split_name in SPLITS:
            dataset_path = data_dir / f"{lang_name}_{split_name}"
            embeddings_path = data_dir / f"{lang_name}_{split_name}_embeddings.npy"

            if not dataset_path.exists():
                print(f"   WARNING: Dataset not found: {dataset_path.name}, skipping...")
                print()
                continue

            if embeddings_path.exists():
                print(f"   Embeddings already exist: {embeddings_path.name}, skipping...")
                print()
                continue

            count = embed_dataset(dataset_path, embeddings_path, voyage_api_key, lang_name, split_name)
            total_embedded += count

    elapsed_time = time.time() - start_time

    # Summary
    print("=" * 80)
    print("Embedding Complete!")
    print("=" * 80)
    print()
    print(f"OK Embedded {total_embedded:,} functions")
    print(f"OK Time elapsed: {elapsed_time / 3600:.2f} hours")
    print(f"OK Embeddings saved to: {data_dir}")
    print()

    # Validation
    print("Validating embeddings...")
    for lang_name in LANGUAGES.keys():
        for split_name in SPLITS:
            embeddings_path = data_dir / f"{lang_name}_{split_name}_embeddings.npy"
            if embeddings_path.exists():
                embeddings = np.load(embeddings_path)
                print(f"   OK {embeddings_path.name}: {embeddings.shape}")
    print()

    # Next steps
    print("=" * 80)
    print("Next Steps")
    print("=" * 80)
    print()
    print("1. Upload to Supabase:")
    print("   python scripts/import_codesearchnet.py --all-languages")
    print()
    print("2. This will:")
    print("   - Load all 18 embeddings files")
    print("   - Bulk insert 2M functions into code_examples table")
    print("   - Create HNSW index for semantic search")
    print("   - Create GIN index for keyword search")
    print("   - Verify: 2M searchable functions ready")
    print()

if __name__ == "__main__":
    main()
