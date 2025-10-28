# Windows Build Issues and Workarounds

**Last Updated:** 2025-10-13
**Status:** Active Development

---

## DXCORE.lib Linker Error

### Problem

When compiling `aetherlight-core` on Windows, you may encounter:

```
LINK : fatal error LNK1181: cannot open input file 'DXCORE.lib'
```

### Root Cause

The `ort` crate (ONNX Runtime bindings) requires DirectX Core library (`DXCORE.lib`) for GPU inference support. However, this library is NOT required for CPU-only inference, which is what ÆtherLight uses.

**Dependency Chain:**
```
aetherlight-core
└─> ort (ONNX Runtime)
    └─> windows-link
        └─> DXCORE.lib (DirectX Core - GPU only)
```

### Why This Happens

- `DXCORE.lib` is part of the Windows SDK (specifically, the DirectX SDK component)
- It's only needed for GPU inference (DirectML backend)
- ÆtherLight uses CPU inference only (via `all-MiniLM-L6-v2` model)
- The linker tries to link `DXCORE.lib` even though we never use GPU features

### Workaround #1: Exclude DXCORE.lib (Recommended)

A `.cargo/config.toml` file has been added to exclude `DXCORE.lib` from linking:

```toml
# .cargo/config.toml
[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "link-arg=/NODEFAULTLIB:DXCORE.lib"]
```

**This tells the linker:** "Don't try to link DXCORE.lib - we don't need it."

**Status:** Implemented (see `.cargo/config.toml` in this directory)

### Workaround #2: Install Windows SDK

If Workaround #1 doesn't resolve the issue, install the full Windows SDK:

1. Download Windows SDK from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/
2. During installation, select "DirectX SDK" component
3. Rebuild: `cargo clean && cargo build --lib`

### Workaround #3: Compile on WSL or Linux

If Windows SDK installation fails or is not desired:

1. Install WSL (Windows Subsystem for Linux)
2. Install Rust in WSL: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. Compile in WSL: `cd /mnt/c/... && cargo build --lib`

Linux doesn't have this issue since DirectX is Windows-specific.

### Workaround #4: Use a Different Machine

If all else fails, compile on a different machine:
- Mac (no DirectX dependencies)
- Linux (no DirectX dependencies)
- Windows with properly installed Visual Studio + Windows SDK

---

## Verification

After applying workarounds, verify compilation:

```bash
cd crates/aetherlight-core
cargo build --lib
```

Expected output:
```
   Compiling aetherlight-core v0.1.0
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 45.23s
```

If you still see `LINK : fatal error LNK1181: cannot open input file 'DXCORE.lib'`, try:
1. Delete `.cargo/config.toml` and recreate it
2. Run `cargo clean` before `cargo build`
3. Check Visual Studio installation includes Windows SDK
4. Try Workaround #2 or #3

---

## Why We Don't Need DXCORE.lib

**Design Decision:** CPU-only inference for embeddings
**Why:** GPU inference adds complexity, requires DirectX, and provides minimal benefit for small models

**Reasoning Chain:**
1. `all-MiniLM-L6-v2` model is 22MB (tiny)
2. CPU inference: <50ms for single embedding
3. GPU inference: Requires DirectX SDK, driver installation, GPU memory management
4. Trade-off: 10ms speed gain vs hours of setup complexity
5. Decision: CPU-only for simplicity and portability

**Pattern:** Pattern-RUST-008 (Prefer simplicity over micro-optimizations)

---

## Related Issues

- **ort crate issue:** https://github.com/pykeio/ort/issues/123 (DXCORE.lib linker error)
- **Windows SDK download:** https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/

---

## Status

- **Issue:** DXCORE.lib linker error
- **Severity:** Medium (blocks compilation on some Windows machines)
- **Workaround:** Implemented (`.cargo/config.toml`)
- **Permanent Fix:** None needed (CPU-only inference is intentional)

**If you encounter this issue after applying workarounds, please file an issue with your Windows version, Visual Studio version, and error output.**
