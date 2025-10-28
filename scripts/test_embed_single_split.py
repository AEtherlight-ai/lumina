#!/usr/bin/env python3
"""
Test Embedding Script - Single Split Only (Python Validation)

DESIGN DECISION: Test with small dataset before full 2-day run
WHY: Verify voyage-code-3 works correctly, catch errors early

REASONING CHAIN:
1. Load ONLY python_validation (23,107 functions, ~2 hours)
2. Embed with voyage-code-3 (batch size 64)
3. Save python_validation_embeddings.npy
4. Validate: Check file exists, correct shape, no errors
5. If success → proceed with full dataset
6. If failure → fix issues without losing 2 days

PATTERN: Pattern-VALIDATION-001 (Test small before big)
PERFORMANCE: ~2 hours for 23K functions
COST: ~$0.28 (test run)
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from tqdm import tqdm

def embed_single_split():
    """Test embedding with python_validation split only."""

    # Check environment
    voyage_api_key = os.getenv('VOYAGE_API_KEY')
    if not voyage_api_key:
        print("ERROR: VOYAGE_API_KEY not set")
        sys.exit(1)

    # Check dependencies
    try:
        import requests
        from datasets import load_from_disk
    except ImportError as e:
        print(f"ERROR: Missing dependency: {e}")
        sys.exit(1)

    print("=" * 80)
    print("TEST RUN: Embedding Python Validation Split Only")
    print("=" * 80)
    print()
    print("Dataset: python_validation")
    print("Functions: 23,107")
    print("Model: voyage-code-3 (1024-dim)")
    print("Batch size: 64")
    print("Estimated time: ~2 hours")
    print("Estimated cost: ~$0.28")
    print()
    print("This will verify:")
    print("  1. voyage-code-3 API works correctly")
    print("  2. Batch size 64 stays under token limit")
    print("  3. Embeddings save correctly to .npy file")
    print("  4. No errors during processing")
    print()
    print("If successful, run full dataset with confidence!")
    print()

    # Load dataset
    data_dir = Path("./data/codesearchnet")
    dataset_path = data_dir / "python_validation"
    embeddings_path = data_dir / "python_validation_embeddings.npy"

    if not dataset_path.exists():
        print(f"ERROR: Dataset not found: {dataset_path}")
        sys.exit(1)

    if embeddings_path.exists():
        print(f"WARNING: Embeddings already exist: {embeddings_path}")
        print("Delete file to re-run test")
        sys.exit(0)

    print(f"Loading {dataset_path.name}...")
    dataset = load_from_disk(str(dataset_path))
    print(f"Loaded {len(dataset):,} functions")
    print()

    # Prepare texts
    print("Preparing texts...")
    texts = []
    for item in dataset:
        docstring = item.get('func_documentation_string', '') or ''
        code = item.get('func_code_string', '') or ''
        text = f"{docstring}\n\n{code}"[:30000]  # ~8K tokens max
        texts.append(text)
    print(f"Prepared {len(texts):,} texts")
    print()

    # Batch embedding
    print("Starting batch embedding...")
    embeddings = []
    batch_size = 64
    total_batches = (len(texts) + batch_size - 1) // batch_size

    for i in tqdm(range(0, len(texts), batch_size), desc="Embedding", total=total_batches):
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
                        'model': 'voyage-code-3',
                        'input': batch,
                        'input_type': 'document',
                    },
                    timeout=120
                )

                if response.status_code != 200:
                    print(f"\nERROR: Voyage API returned {response.status_code}")
                    print(f"Response: {response.text}")
                    if retry < max_retries - 1:
                        print(f"Retrying in 10s... (attempt {retry + 2}/{max_retries})")
                        time.sleep(10)
                        continue
                    else:
                        sys.exit(1)

                data = response.json()
                batch_embeddings = [item['embedding'] for item in data['data']]
                embeddings.extend(batch_embeddings)
                break  # Success

            except Exception as e:
                if retry < max_retries - 1:
                    print(f"\nError: {str(e)}, retrying in 10s... (attempt {retry + 2}/{max_retries})")
                    time.sleep(10)
                else:
                    print(f"\nERROR: Failed after {max_retries} retries")
                    print(f"Error: {str(e)}")
                    sys.exit(1)

        # Rate limiting
        time.sleep(0.6)  # ~100 req/min

    # Save embeddings
    embeddings_array = np.array(embeddings, dtype=np.float32)
    np.save(embeddings_path, embeddings_array)

    print()
    print("=" * 80)
    print("TEST RUN SUCCESSFUL!")
    print("=" * 80)
    print()
    print(f"✅ Embedded {len(embeddings):,} functions")
    print(f"✅ Saved to: {embeddings_path}")
    print(f"✅ Shape: {embeddings_array.shape}")
    print(f"✅ Size: {embeddings_path.stat().st_size / (1024**2):.1f} MB")
    print()
    print("Validation:")
    print(f"  Expected shape: ({len(dataset)}, 1024)")
    print(f"  Actual shape: {embeddings_array.shape}")
    print(f"  Match: {'✅ YES' if embeddings_array.shape == (len(dataset), 1024) else '❌ NO'}")
    print()
    print("Next Steps:")
    print("  1. ✅ Test successful - voyage-code-3 works!")
    print("  2. Run full dataset: python re_embed_codesearchnet_full.py")
    print("  3. Estimated time: ~39-49 hours for 2M functions")
    print()

if __name__ == "__main__":
    embed_single_split()
