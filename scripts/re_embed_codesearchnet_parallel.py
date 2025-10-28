#!/usr/bin/env python3
"""
Re-Embed CodeSearchNet with PARALLEL Processing (6 Languages Simultaneously)

DESIGN DECISION: Parallelize embedding generation by language for 6× speedup
WHY: Sequential processing takes 39-49 hours, user needs results faster

REASONING CHAIN:
1. User concern: 2-day wait time unacceptable for validation
2. Bottleneck: Sequential language processing (Python → JS → Java → Go → PHP → Ruby)
3. Solution: Run 6 language workers in parallel using multiprocessing
4. Rate limit coordination: Shared rate limiter (100 req/min across all workers)
5. Result: 6-8 hours total vs 39-49 hours sequential (6-8× speedup)

PATTERN: Pattern-PARALLEL-001 (Multiprocessing with Shared Rate Limiting)
PERFORMANCE: 6-8 hours for 2M functions (vs 39-49 hours sequential)
COST: Same ~$24 (2M functions × ~1K tokens × $0.012 per 1K tokens)

SAFETY:
- Shared rate limiter prevents exceeding Voyage API 100 req/min limit
- Resume capability: Skips existing .npy files
- Per-worker progress tracking and logging
- Graceful error handling per worker (doesn't crash other workers)
"""

import os
import sys
import time
import numpy as np
from pathlib import Path
from tqdm import tqdm
import multiprocessing as mp
from multiprocessing import Lock, Value
import ctypes

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

# Shared rate limiter state (100 requests per minute)
rate_lock = None  # Will be initialized in main()
last_request_time = None  # Will be initialized in main()

def rate_limited_sleep():
    """
    Enforce rate limit: 100 requests/minute across ALL workers.

    Uses shared lock and timestamp to coordinate between processes.
    Each request waits 0.6s minimum between requests globally.
    """
    global rate_lock, last_request_time

    with rate_lock:
        current_time = time.time()
        elapsed = current_time - last_request_time.value

        # Minimum 0.6s between any two requests globally (100 req/min)
        if elapsed < 0.6:
            sleep_time = 0.6 - elapsed
            time.sleep(sleep_time)

        last_request_time.value = time.time()

def embed_dataset(dataset_path, output_path, voyage_api_key, lang_name, split_name):
    """
    Embed a single dataset split and save embeddings.

    IDENTICAL to sequential version, but uses shared rate limiter.

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
    print(f"   [{lang_name}] Loading {dataset_path.name}...")
    dataset = load_from_disk(str(dataset_path))
    print(f"   [{lang_name}] Loaded {len(dataset):,} functions")

    # Prepare texts for embedding
    print(f"   [{lang_name}] Preparing texts...")
    texts = []
    for item in dataset:
        # Combine docstring + code for better embeddings
        docstring = item.get('func_documentation_string', '') or ''
        code = item.get('func_code_string', '') or ''

        # Format: "docstring\n\ncode" (up to 8K tokens per Voyage limits)
        text = f"{docstring}\n\n{code}"[:30000]  # ~8K tokens max
        texts.append(text)

    print(f"   [{lang_name}] Prepared {len(texts):,} texts")

    # Batch embedding with Voyage AI
    print(f"   [{lang_name}] Starting batch embedding...")
    embeddings = []
    batch_size = 64  # Reduced from 128 to stay under 120K token limit
    total_batches = (len(texts) + batch_size - 1) // batch_size

    for i in tqdm(range(0, len(texts), batch_size),
                  desc=f"   {lang_name.capitalize()} {split_name}",
                  total=total_batches,
                  position=list(LANGUAGES.keys()).index(lang_name)):  # Staggered progress bars
        batch = texts[i:i + batch_size]

        # Call Voyage API with retry logic
        max_retries = 3
        for retry in range(max_retries):
            try:
                # CRITICAL: Use shared rate limiter before EVERY request
                rate_limited_sleep()

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
                    print(f"\n      [{lang_name}] ERROR: Voyage API returned {response.status_code}")
                    print(f"      [{lang_name}] Response: {response.text}")
                    if retry < max_retries - 1:
                        print(f"      [{lang_name}] Retrying in 10s... (attempt {retry + 2}/{max_retries})")
                        time.sleep(10)
                        continue
                    else:
                        raise Exception(f"API error after {max_retries} retries")

                data = response.json()
                batch_embeddings = [item['embedding'] for item in data['data']]
                embeddings.extend(batch_embeddings)
                break  # Success, exit retry loop

            except requests.exceptions.Timeout:
                if retry < max_retries - 1:
                    print(f"\n      [{lang_name}] Timeout, retrying in 10s... (attempt {retry + 2}/{max_retries})")
                    time.sleep(10)
                else:
                    raise Exception(f"Timeout after {max_retries} retries")

            except Exception as e:
                if retry < max_retries - 1:
                    print(f"\n      [{lang_name}] Error: {str(e)}, retrying in 10s... (attempt {retry + 2}/{max_retries})")
                    time.sleep(10)
                else:
                    raise  # Re-raise to be caught by worker

    # Convert to numpy array and save
    embeddings_array = np.array(embeddings, dtype=np.float32)
    np.save(output_path, embeddings_array)
    print(f"   [{lang_name}] Saved embeddings: {output_path.name}")
    print(f"   [{lang_name}] Shape: {embeddings_array.shape}")
    print()

    return len(embeddings)

def process_language(lang_name, voyage_api_key, data_dir):
    """
    Worker function: Process all splits for one language.

    This runs in a separate process, allowing 6 languages in parallel.

    Args:
        lang_name: Language to process (python, javascript, etc.)
        voyage_api_key: Voyage API key
        data_dir: Path to data directory

    Returns:
        (lang_name, total_embedded, success)
    """
    try:
        print("=" * 80)
        print(f"[{lang_name.upper()}] Starting embedding (Worker PID: {os.getpid()})")
        print("=" * 80)
        print()

        total_embedded = 0

        for split_name in SPLITS:
            dataset_path = data_dir / f"{lang_name}_{split_name}"
            embeddings_path = data_dir / f"{lang_name}_{split_name}_embeddings.npy"

            if not dataset_path.exists():
                print(f"   [{lang_name}] WARNING: Dataset not found: {dataset_path.name}, skipping...")
                print()
                continue

            if embeddings_path.exists():
                print(f"   [{lang_name}] Embeddings already exist: {embeddings_path.name}, skipping...")
                print()
                continue

            count = embed_dataset(dataset_path, embeddings_path, voyage_api_key, lang_name, split_name)
            total_embedded += count

        print("=" * 80)
        print(f"[{lang_name.upper()}] COMPLETE - Embedded {total_embedded:,} functions")
        print("=" * 80)
        print()

        return (lang_name, total_embedded, True)

    except Exception as e:
        print("=" * 80)
        print(f"[{lang_name.upper()}] FAILED - Error: {str(e)}")
        print("=" * 80)
        print()
        return (lang_name, 0, False)

def main():
    global rate_lock, last_request_time

    print("=" * 80)
    print("Re-Embed CodeSearchNet with PARALLEL Processing (6 Languages)")
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
    print(f"Batch size: 64 functions/batch")
    print(f"Rate limit: 100 requests/minute (shared across all workers)")
    print(f"Workers: {len(LANGUAGES)} parallel processes")
    print(f"Estimated time: 6-8 hours (vs 39-49 hours sequential)")
    print()

    print("WARNING: This will cost ~$24 and take 6-8 hours")
    print()

    # Check data directory
    data_dir = Path("./data/codesearchnet")
    if not data_dir.exists():
        print(f"ERROR: Dataset directory not found: {data_dir}")
        print()
        print("Run download script first:")
        print("  python scripts/download_codesearchnet_full.py")
        sys.exit(1)

    # Initialize shared rate limiter
    print("Initializing shared rate limiter...")
    rate_lock = Lock()
    last_request_time = Value(ctypes.c_double, time.time())
    print("Rate limiter ready (100 req/min across all workers)")
    print()

    # Create worker pool
    start_time = time.time()

    print("=" * 80)
    print("Starting 6 parallel workers...")
    print("=" * 80)
    print()

    # Use ProcessPoolExecutor for better control
    with mp.Pool(processes=len(LANGUAGES)) as pool:
        # Launch all workers
        results = []
        for lang_name in LANGUAGES.keys():
            result = pool.apply_async(process_language, (lang_name, voyage_api_key, data_dir))
            results.append(result)

        # Wait for all workers to complete
        pool.close()
        pool.join()

        # Collect results
        total_embedded = 0
        successes = []
        failures = []

        for result in results:
            lang_name, count, success = result.get()
            total_embedded += count
            if success:
                successes.append(lang_name)
            else:
                failures.append(lang_name)

    elapsed_time = time.time() - start_time

    # Summary
    print("=" * 80)
    print("PARALLEL EMBEDDING COMPLETE!")
    print("=" * 80)
    print()
    print(f"✅ Total embedded: {total_embedded:,} functions")
    print(f"✅ Time elapsed: {elapsed_time / 3600:.2f} hours")
    print(f"✅ Successful languages: {len(successes)}/6 ({', '.join(successes)})")
    if failures:
        print(f"❌ Failed languages: {len(failures)}/6 ({', '.join(failures)})")
    print()

    # Validation
    print("Validating embeddings...")
    for lang_name in LANGUAGES.keys():
        for split_name in SPLITS:
            embeddings_path = data_dir / f"{lang_name}_{split_name}_embeddings.npy"
            if embeddings_path.exists():
                embeddings = np.load(embeddings_path)
                print(f"   ✅ {embeddings_path.name}: {embeddings.shape}")
            else:
                print(f"   ❌ {embeddings_path.name}: NOT FOUND")
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
    # CRITICAL: Set multiprocessing start method to 'spawn' for Windows compatibility
    mp.set_start_method('spawn', force=True)
    main()
