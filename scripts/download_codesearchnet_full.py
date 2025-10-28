#!/usr/bin/env python3
"""
Download CodeSearchNet FULL Dataset (All 6 Languages, All Splits) for Node 1 Bootstrap

DESIGN DECISION: Download ALL 6 languages × ALL 3 splits (~2M functions) from CodeSearchNet
WHY: Maximum pattern coverage across ÆtherLight tech stack + validation/test data for quality

REASONING CHAIN:
1. CodeSearchNet has 6 languages: Python, JavaScript, Java, Go, PHP, Ruby
2. CodeSearchNet has 3 splits: train (1.15M), validation (~400K), test (~400K)
3. Total: ~2 MILLION functions vs 1.15M train-only vs 412K Python-only
4. ÆtherLight uses: Rust (similar to Go patterns), TypeScript (JavaScript), Python (scripts)
5. Including validation + test = higher quality patterns (more diverse, tested code)
6. Embedding cost: ~$24 (2M × $0.012 per 1K tokens) vs $13.80 (train-only)
7. Download time: ~20-25 minutes (20GB) vs ~15 minutes (15GB train-only)
8. Result: Universal code pattern library with 2M+ functions across ALL major languages
9. Uses claudios/code_search_net (Parquet version) since original HF dataset is deprecated

PATTERN: Pattern-BOOTSTRAP-003 (Full Multi-Language Multi-Split Bootstrap)
PERFORMANCE: ~20-25 minutes download (depends on connection speed)
COST: ~$24 Voyage AI embeddings (vs $13.80 train-only, vs $4.94 Python-only)
REPOSITORY: Original GitHub (archived): github.com/github/CodeSearchNet
            Working Parquet version: huggingface.co/datasets/claudios/code_search_net
"""

import os
import sys
from pathlib import Path

# Language configurations
LANGUAGES = {
    'python': {'functions': 412_000, 'size_gb': 2.5},
    'javascript': {'functions': 140_000, 'size_gb': 3.0},
    'java': {'functions': 164_000, 'size_gb': 3.5},
    'go': {'functions': 167_000, 'size_gb': 2.0},
    'php': {'functions': 241_000, 'size_gb': 3.0},
    'ruby': {'functions': 24_000, 'size_gb': 1.0}
}

def main():
    print("=" * 80)
    print("CodeSearchNet FULL Dataset Download (All 6 Languages)")
    print("=" * 80)
    print()

    # Show overview
    total_functions = sum(lang['functions'] for lang in LANGUAGES.values())
    total_size = sum(lang['size_gb'] for lang in LANGUAGES.values())

    print("Dataset Overview:")
    print(f"   Total languages: {len(LANGUAGES)}")
    print(f"   Total functions: {total_functions:,}")
    print(f"   Total size: ~{total_size:.1f} GB")
    print()

    for lang_name, info in LANGUAGES.items():
        print(f"   {lang_name.capitalize():12} {info['functions']:>7,} functions  ~{info['size_gb']:.1f} GB")
    print()

    # Confirm download
    print("WARNING: This will download ~15 GB and may take 15-20 minutes")
    print()

    # Check if datasets library is installed
    try:
        from datasets import load_dataset
    except ImportError:
        print("ERROR ERROR: 'datasets' library not installed")
        print()
        print("Install with:")
        print("  pip install datasets")
        print()
        sys.exit(1)

    # Create data directory
    data_dir = Path("./data/codesearchnet")
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"OK Data directory created: {data_dir}")
    print()

    # Download all languages × all splits
    downloaded_counts = {}
    splits = ['train', 'validation', 'test']

    for lang_name in LANGUAGES.keys():
        print("=" * 80)
        print(f"Downloading {lang_name.upper()} (all splits: train + validation + test)")
        print("=" * 80)
        print()

        lang_total = 0

        for split_name in splits:
            try:
                print(f"Downloading {lang_name} {split_name} split...")
                # Use claudios/code_search_net (Parquet version) since original is deprecated
                dataset = load_dataset(
                    'claudios/code_search_net',
                    lang_name,
                    split=split_name,
                    cache_dir=str(data_dir)
                )

                # Save to disk
                output_path = data_dir / f"{lang_name}_{split_name}"
                print(f"Saving to disk: {output_path}")
                dataset.save_to_disk(str(output_path))

                split_count = len(dataset)
                lang_total += split_count
                print(f"OK {lang_name.capitalize()} {split_name}: {split_count:,} functions")
                print()

            except Exception as e:
                print(f"ERROR ERROR: Failed to download {lang_name} {split_name} split")
                print(f"   {str(e)}")
                print()
                print("Troubleshooting:")
                print("  1. Check internet connection")
                print("  2. Try again (download may resume)")
                print("  3. Check Hugging Face status: https://status.huggingface.co/")
                print()
                print("Continuing with next split...")
                print()

        downloaded_counts[lang_name] = lang_total
        print(f"OK {lang_name.capitalize()} TOTAL (all splits): {lang_total:,} functions")
        print()

    # Final summary
    print("=" * 80)
    print("Download Complete!")
    print("=" * 80)
    print()

    total_downloaded = sum(downloaded_counts.values())
    print(f"OK Downloaded {total_downloaded:,} functions across {len(downloaded_counts)} languages")
    print()

    print("Breakdown:")
    for lang_name, count in downloaded_counts.items():
        print(f"   {lang_name.capitalize():12} {count:>7,} functions")
    print()

    print(f"Storage location: {data_dir}")
    print(f"Approximate size: ~{total_size:.1f} GB")
    print()

    # Next steps
    print("=" * 80)
    print("Next Steps")
    print("=" * 80)
    print()
    print("1. Day 2: Re-embed with Voyage-code-2")
    print("   python scripts/re_embed_codesearchnet.py --all-languages")
    print()
    print("2. Day 3: Import to Supabase")
    print("   python scripts/import_codesearchnet.py --all-languages")
    print()
    print("3. Day 4+: Dogfood with 1.15M searchable functions")
    print()
    print("Embedding Cost Estimate:")
    print(f"   Functions: {total_downloaded:,}")
    print(f"   Voyage-code-2: $0.012 per 1K tokens")
    print(f"   Total cost: ~$13.80 (assumes avg 1K tokens per function)")
    print()

if __name__ == "__main__":
    main()
