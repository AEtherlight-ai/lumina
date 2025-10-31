# Code Protection & Refactoring Policy

## Purpose
Once code is committed to master and published, it becomes **protected**. This policy ensures stability, backward compatibility, and maintainability.

## Protection Levels

### 🔴 Level 1: IMMUTABLE (Never Change)
Code that **CANNOT** be modified after release:
- Published API contracts
- Database migration files
- Authentication/Authorization core
- Cryptographic implementations
- Payment processing logic

**Enforcement**: These files are tagged with `@immutable` and any modification is blocked.

### 🟡 Level 2: PROTECTED (Refactor Only)
Code that can only be modified through refactoring:
- Core business logic
- Published npm packages
- Configuration schemas
- Public interfaces
- Event handlers

**Rules for Modification**:
1. Create `refactor/[component]` branch
2. Maintain **exact** same interface
3. All existing tests must pass
4. Add new tests for changes
5. Requires 2+ reviewers
6. Performance must not degrade

### 🟢 Level 3: MAINTAINABLE (Bug Fixes Allowed)
Code that can be fixed but not redesigned:
- UI components
- Internal utilities
- Non-critical algorithms
- Documentation
- Tests

**Rules for Fixes**:
1. Create `fix/[issue-id]` branch
2. Minimal change principle
3. Add regression test
4. Document in CHANGELOG
5. Single reviewer required

## Refactoring Protocol

### When to Refactor (Allowed)
✅ **Performance Improvement**
```typescript
// BEFORE (Protected)
function slowSort(arr: number[]): number[] {
  // O(n²) implementation
  return bubbleSort(arr);
}

// AFTER (Refactored)
function slowSort(arr: number[]): number[] {
  // O(n log n) - Same interface, better performance
  return quickSort(arr);
}
```

✅ **Code Clarity**
```typescript
// BEFORE (Protected)
function calc(x: number, y: number): number {
  return x * 1.1 + y * 0.9; // Magic numbers
}

// AFTER (Refactored)
function calc(x: number, y: number): number {
  const WEIGHT_X = 1.1;
  const WEIGHT_Y = 0.9;
  return x * WEIGHT_X + y * WEIGHT_Y;
}
```

✅ **Dependency Updates**
```typescript
// BEFORE (Protected)
import oldLibrary from 'old-lib';

// AFTER (Refactored)
import newLibrary from 'new-lib'; // Compatible API
```

### When NOT to Refactor (Forbidden)
❌ **Interface Changes**
```typescript
// FORBIDDEN - Changes interface
function getUserById(id: number) → function getUser(id: string)
```

❌ **Behavior Changes**
```typescript
// FORBIDDEN - Changes behavior
function calculate(x) { return x * 2; } → function calculate(x) { return x * 3; }
```

❌ **Breaking Dependencies**
```typescript
// FORBIDDEN - Breaks consumers
export class OldName → export class NewName
```

## New Feature Protocol

### Adding Features (The Right Way)

✅ **Extend, Don't Modify**
```typescript
// PROTECTED (Don't touch)
class UserService {
  getUser(id: string) { /* existing */ }
}

// NEW (Add alongside)
class UserServiceV2 extends UserService {
  getUserWithRoles(id: string) { /* new feature */ }
}
```

✅ **Composition Over Modification**
```typescript
// PROTECTED (Don't touch)
function processPayment(amount: number) { /* existing */ }

// NEW (Compose with existing)
function processPaymentWithTax(amount: number) {
  const tax = calculateTax(amount);
  return processPayment(amount + tax);
}
```

✅ **Feature Flags**
```typescript
// PROTECTED (Original flow)
function handleRequest(req: Request) {
  if (featureFlags.useNewFlow) {
    return newHandler(req); // NEW
  }
  return originalHandler(req); // PROTECTED
}
```

## Git Branch Enforcement

### Branch Naming Rules
```bash
# For new features (new code only)
feature/[epic]/[name]

# For refactoring (interface preserved)
refactor/[component]/[improvement]

# For bug fixes (minimal changes)
fix/[issue-id]/[description]

# For security patches (critical only)
security/[CVE-id]/[patch]

# FORBIDDEN on master
master ← NO direct commits
main ← NO direct commits
```

### Protection Workflow
```mermaid
graph LR
  A[Feature Branch] -->|PR| B[Code Review]
  B -->|Approved| C[Automated Tests]
  C -->|Pass| D[Merge to Develop]
  D -->|Sprint Complete| E[PR to Master]
  E -->|2+ Reviews| F[Merge to Master]
  F -->|Tagged| G[Protected Forever]
```

## Enforcement Mechanisms

### 1. File Annotations
```typescript
/**
 * @protected since v1.0.0
 * @immutable - DO NOT MODIFY
 * @refactor-only - Interface must be preserved
 *
 * This function is part of the public API.
 * Any changes require refactor/ branch and 2 reviews.
 */
export function criticalFunction() { }
```

### 2. Pre-commit Hooks
```bash
#!/bin/bash
# .githooks/pre-commit

# Check for protected file modifications
git diff --cached --name-only | while read file; do
  if grep -q "@protected\|@immutable" "$file"; then
    current_branch=$(git branch --show-current)
    if [[ ! "$current_branch" =~ ^refactor/ ]]; then
      echo "ERROR: Protected file $file can only be modified in refactor/ branches"
      exit 1
    fi
  fi
done
```

### 3. CI/CD Checks
```yaml
# .github/workflows/protection.yml
name: Code Protection Check
on: [pull_request]

jobs:
  check:
    steps:
      - name: Verify Branch Type
        run: |
          if [[ "${{ github.head_ref }}" =~ ^feature/ ]]; then
            # Ensure no protected files modified
            ./scripts/check-protected-files.sh
          fi
```

### 4. Code Review Rules
```markdown
## PR Review Checklist

### For Refactor Branches
- [ ] Interface unchanged?
- [ ] All tests pass?
- [ ] Performance same or better?
- [ ] Backward compatible?
- [ ] 2+ reviewers approved?

### For Feature Branches
- [ ] Only new code added?
- [ ] No protected files modified?
- [ ] Tests for new features?
- [ ] Documentation updated?

### For Fix Branches
- [ ] Minimal change?
- [ ] Regression test added?
- [ ] Root cause documented?
- [ ] CHANGELOG updated?
```

## Examples

### Example 1: Adding Voice Feature ✅
```bash
# Correct approach
git checkout -b feature/voice-commands
# Add NEW voice command handler
# Don't modify existing command system
# Create VoiceCommandHandler extends CommandHandler
```

### Example 2: Fixing Performance ✅
```bash
# Correct approach
git checkout -b refactor/database-queries
# Keep same function signatures
# Optimize query implementation
# Ensure all tests pass
```

### Example 3: Fixing Bug ✅
```bash
# Correct approach
git checkout -b fix/AUTH-403/session-timeout
# Minimal change to fix issue
# Add test for the bug case
# Document in CHANGELOG
```

### Example 4: Changing API ❌
```bash
# WRONG - Never do this
git checkout master
# Modify API endpoint directly
# THIS BREAKS CONSUMERS
```

## Migration Strategy

When breaking changes are absolutely necessary:

1. **Version the API**
   - Keep v1 endpoints working
   - Add v2 with new design
   - Deprecate v1 with timeline

2. **Feature Flag Transition**
   - Old code runs by default
   - New code behind flag
   - Gradual rollout
   - Remove old code in major version

3. **Database Migrations**
   - Never modify existing migrations
   - Only add new migrations
   - Support rollback

## Consequences of Violations

### Level 1: Warning
- Modifying protected code in feature branch
- Missing tests for refactor
- No regression test for fix

### Level 2: PR Blocked
- Changing immutable code
- Breaking interface in refactor
- Direct commit to master

### Level 3: Rollback
- Published breaking change
- Failed production tests
- Customer-reported regression

## Success Metrics

- **Zero** breaking changes in patch/minor releases
- **100%** backward compatibility maintained
- **All** refactors pass existing tests
- **Every** fix includes regression test

## Questions?

- Review this policy before any modification
- When in doubt, create new code instead
- Ask team lead for protection level clarification
- See `RELEASE_WORKFLOW.md` for release process