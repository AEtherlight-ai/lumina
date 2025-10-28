#!/usr/bin/env python3
"""
Download CodeSearchNet Python Dataset for Node 1 Bootstrap

DESIGN DECISION: Download 412K Python functions from CodeSearchNet
WHY: Bootstrap Node 1 with real data for immediate dogfooding

REASONING CHAIN:
1. Install Hugging Face datasets library
2. Download Python subset only (412K functions, ~2.5GB)
3. Save to disk for later re-embedding with Voyage-code-2
4. Validate download (count functions, show sample)
5. Result: Ready for Day 2 re-embedding

PATTERN: Pattern-BOOTSTRAP-001 (CodeSearchNet Bootstrap)
PERFORMANCE: ~2-5 minutes download (depends on connection speed)
"""

import os
import sys
from pathlib import Path

def main():
    print("=" * 80)
    print("CodeSearchNet Python Dataset Download")
    print("=" * 80)
    print()

    # Check if datasets library is installed
    try:
        from datasets import load_dataset
    except ImportError:
        print("❌ ERROR: 'datasets' library not installed")
        print()
        print("Install with:")
        print("  pip install datasets")
        print()
        sys.exit(1)

    # Create data directory
    data_dir = Path("./data/codesearchnet")
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"✅ Data directory created: {data_dir}")
    print()

    # Download Python subset
    print("📥 Downloading CodeSearchNet Python subset...")
    print("   This will download ~2.5GB and may take 2-5 minutes")
    print()

    try:
        dataset = load_dataset(
            'code_search_net',
            'python',
            split='train',
            cache_dir=str(data_dir)
        )
    except Exception as e:
        print(f"❌ ERROR: Failed to download dataset")
        print(f"   {str(e)}")
        print()
        print("Troubleshooting:")
        print("  1. Check internet connection")
        print("  2. Try again (download may resume)")
        print("  3. Check Hugging Face status: https://status.huggingface.co/")
        sys.exit(1)

    print()
    print("=" * 80)
    print("Download Complete!")
    print("=" * 80)
    print()

    # Validation
    print(f"✅ Downloaded {len(dataset):,} Python functions")
    print()

    # Show sample
    if len(dataset) > 0:
        print("📄 Sample function:")
        print(f"   Name: {dataset[0]['func_name']}")
        print(f"   Docstring: {dataset[0]['func_documentation_string'][:100]}...")
        print(f"   Code: {dataset[0]['func_code_string'][:100]}...")
        print()

    # Save to disk
    output_path = data_dir / "python_train"
    print(f"💾 Saving dataset to disk: {output_path}")
    dataset.save_to_disk(str(output_path))
    print("✅ Dataset saved successfully")
    print()

    # Final stats
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Functions downloaded: {len(dataset):,}")
    print(f"Storage location: {output_path}")
    print(f"Approximate size: ~2.5GB")
    print()
    print("Next steps:")
    print("  1. Day 2: Re-embed with Voyage-code-2 (scripts/re_embed_codesearchnet.py)")
    print("  2. Day 3: Import to Supabase (scripts/import_codesearchnet.py)")
    print("  3. Day 4+: Dogfood with 412K searchable functions")
    print()

if __name__ == "__main__":
    main()
