# v0.13.31 Post-Release Testing Prompt

## For Claude Code After Consuming ÆtherLight v0.13.31

Use this prompt after updating to v0.13.31 to verify all systems work:

```
I just updated ÆtherLight to v0.13.31. Please perform a comprehensive system check:

1. SKILL VERIFICATION:
   - Check if /initialize skill is available and documented in .claude/skills/
   - Verify /sprint-plan skill exists
   - Confirm /code-analyze skill is present
   - Validate /publish skill is configured

2. ENHANCEMENT TEST:
   Type this in Voice panel and click Enhance:
   "set up this project with aetherlight"

   Expected: Enhancement should detect Initialize skill and add it to prompt

3. VOICE PANEL TESTS:
   - Open Voice panel (backtick)
   - Switch to Config tab
   - Click "Code Analyzer" button - should work
   - Switch to another tab
   - Return to Voice tab
   - Click "Code Analyzer" again - MUST STILL WORK (fixed bug)
   - Click Record button - should send backtick, NOT request microphone

4. SKILLS EXECUTION:
   Try: /initialize
   Expected: Should offer to set up ÆtherLight structure

   Try: /sprint-plan
   Expected: Should create sprint with Git branches

   Try: /code-analyze
   Expected: Should analyze codebase and generate report

5. ISSUE RESOLUTION CHECK:
   - Read ISSUE_RESOLUTION_MAP.md
   - Verify Issue #6 is marked as resolved by Initialize skill
   - Confirm Issues #1, #2, #4 resolved by Sprint Planning
   - Check that 83% of issues (5/6) are addressed

6. ENHANCEMENT INTELLIGENCE:
   Test these prompts with Enhance button:

   Simple (should pass through minimal):
   "fix typo in README.md"

   Medium (should add light structure):
   "add a new button to the voice panel"

   Complex (should add full structure):
   "refactor the authentication system and add OAuth support while maintaining backward compatibility"

7. TOKEN EFFICIENCY:
   - Check if simple prompts stay simple (no over-structuring)
   - Verify complex prompts get proper structure
   - Confirm skill detection works (adds /skill-name when appropriate)

8. SELF-HOSTING CHECK:
   Can ÆtherLight now consume its own skills and patterns?
   - Skills are executable through VS Code
   - Enhancement detects and adds skills
   - Prompts are Claude-optimized

9. GIT WORKFLOW:
   Try to commit directly to master - should warn
   Publish workflow should go: GitHub first → npm second

10. CODE PROTECTION:
    - Check CODE_PROTECTION_POLICY.md exists
    - Verify protected code can only be refactored
    - Confirm new features must extend, not modify

REPORT: After testing, provide a summary:
- What works perfectly
- What has issues
- What gaps remain
- Success rate percentage
```

## Expected Results

### ✅ Should Work:
- All skills registered and executable
- Enhancement detects skills from intent
- Voice panel buttons persist after tab switch
- Record button sends backtick
- Smart token optimization
- Pattern detection
- Issue resolutions documented

### 🔍 Watch For:
- Skills may need VS Code reload to register
- Enhancement needs proper context
- First-time skill discovery might be slow

### 📊 Success Metrics:
- 5/6 GitHub issues resolved (83%)
- 50%+ token savings on complex prompts
- Zero breaking changes to existing code
- All tests in TESTING_v0.13.31.md pass