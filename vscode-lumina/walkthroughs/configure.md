# Fill In The Gaps ⚙️

Great! ÆtherLight has analyzed your project. Now let's configure the details we couldn't detect automatically.

## Why Do We Need This Step?

While ÆtherLight can detect most things automatically, some configuration requires your input:

### Things We Might Ask About:

**If we couldn't find a test command:**
- How do you run tests? (`npm test`, `pytest`, `cargo test`, etc.)

**If your project structure is non-standard:**
- Where is your source code? (e.g., `src/`, `lib/`, `app/`)
- Where are your tests? (e.g., `test/`, `tests/`, `__tests__/`)

**If we're unsure about your workflow:**
- What's your deployment process?
- Do you use pre-commit hooks?

**Project-specific details:**
- Project name/description
- Custom build commands
- Environment-specific configurations

## How The Interview Works

We'll ask you a series of simple questions. For each question:

1. **We'll show what we detected** (if anything)
2. **We'll suggest defaults** based on common patterns
3. **You confirm or provide the correct value**

The interview is smart - we only ask about things we couldn't figure out automatically.

## Example Questions

Here's what you might see:

```
❓ Project Name
We detected: "my-awesome-app" (from package.json)
Confirm? [Y/n] ▊

❓ Test Command
We couldn't find a test script.
What command runs your tests?
  1) npm test
  2) npm run test:unit
  3) yarn test
  4) Custom command
Choice [1]: ▊

❓ Build Command
We detected: "npm run build" (from package.json scripts)
Confirm? [Y/n] ▊
```

## What Happens Next?

Once you complete the interview:

1. ÆtherLight generates your configuration at `.aetherlight/project-config.json`
2. The configuration includes everything we detected + your answers
3. You can review and customize it in the next step
4. The configuration helps ÆtherLight work intelligently with your project

## Ready to Configure?

Click the button below to start the interactive configuration. This typically takes 2-5 minutes.

> **Note**: You can skip questions or use defaults - you can always edit `.aetherlight/project-config.json` later.
