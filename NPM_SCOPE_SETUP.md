# NPM Scope Setup for @aetherlight

**Issue:** Publishing `@aetherlight/analyzer` failed with "Scope not found"

**Error:**
```
npm error 404 Not Found - PUT https://registry.npmjs.org/@aetherlight%2fanalyzer - Scope not found
```

---

## What is an NPM Scope?

An npm scope (like `@aetherlight`) is a namespace for related packages. It's like an organization on GitHub.

**Benefits:**
- Groups related packages under one name
- Prevents name conflicts
- Professional organization structure
- Can make packages private (paid feature)

---

## How to Create @aetherlight Scope

### Option 1: Create via NPM Website (Recommended)

1. Go to https://www.npmjs.com/
2. Log in as `aelor`
3. Click your profile → "Add Organization"
4. Create organization named `aetherlight`
5. Choose "Unlimited public packages" (free)
6. Add team members if needed

### Option 2: Create via CLI

```bash
npm org create aetherlight
```

This will prompt you through creating the organization.

---

## After Creating Scope

Once the `@aetherlight` scope exists, you can publish:

```bash
cd packages/aetherlight-analyzer
npm publish --access public

cd ../aetherlight-sdk
npm publish --access public

cd ../aetherlight-node
npm publish --access public
```

**Note:** The `--access public` flag is required for scoped packages on free npm accounts.

---

## Alternative: Publish Without Scope

If you don't want to use a scope, you can publish with simple names:

### Change package names:
- `@aetherlight/analyzer` → `aetherlight-analyzer`
- `@aetherlight/sdk` → `aetherlight-sdk`
- `@aetherlight/node` → `aetherlight-node`

### Pros:
- No organization setup needed
- Simpler names

### Cons:
- Name conflicts (someone might have taken these)
- Less professional
- Can't group packages easily

---

## Recommended Approach

1. **Create @aetherlight organization on npm** (5 minutes)
2. **Publish scoped packages** (professional, grouped)
3. **Keep current package.json names** (no changes needed)

---

## Current Status

✅ **Packages ready to publish:**
- `@aetherlight/analyzer` v1.0.0
- `@aetherlight/sdk` v0.1.0
- `@aetherlight/node` v0.1.0 (after binaries built)

✅ **Already published:**
- `aetherlight` (VS Code extension) v0.13.11

⚠️ **Blocked by:**
- Need to create `@aetherlight` npm organization

---

## Quick Start

**To publish right now:**

```bash
# 1. Create organization at https://www.npmjs.com/org/create
# Name: aetherlight

# 2. Then publish packages:
cd packages/aetherlight-analyzer
npm publish --access public

cd ../aetherlight-sdk
npm publish --access public
```

---

**Next:** After publishing, update VS Code extension to use published packages and bump version to v0.13.12
