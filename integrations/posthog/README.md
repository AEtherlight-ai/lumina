# PostHog Integration (Optional Add-on)

**Type:** Optional Analytics Plugin
**Purpose:** Event monitoring for AI agents and user applications
**Documentation:** [Complete Architecture](../../docs/architecture/INTEGRATIONS_ARCHITECTURE.md)

---

## ⚠️ This is Optional

**PostHog is NOT required for ÆtherLight to work.**

- ✅ ÆtherLight works fully offline without PostHog
- ✅ Zero dependencies on external services by default
- ✅ Enable only if you want analytics/monitoring
- ✅ Can be disabled anytime without breaking functionality

---

## What PostHog Provides

### For Developers Using ÆtherLight:

**1. Application Analytics**
- Track user interactions in your app
- Monitor feature adoption
- Understand user workflows
- Measure performance metrics

**2. AI Agent Monitoring (Unique to ÆtherLight)**
- Track agent reasoning steps (Chain of Thought)
- Monitor confidence scores
- Detect hallucinations in real-time
- Measure pattern matching accuracy
- Meta-learning from agent outcomes

**3. Product Analytics**
- Funnels
- Retention cohorts
- Session recordings
- Feature flags
- A/B testing

---

## Quick Setup (5 Minutes)

### 1. Install Dependencies

**Lumina Desktop (Tauri):**
```bash
cd products/lumina-desktop
npm install posthog-js
```

**VS Code Extension:**
```bash
cd vscode-lumina
npm install posthog-js
```

### 2. Add Environment Variables

```bash
# .env.local
POSTHOG_API_KEY=your_api_key_here
POSTHOG_HOST=https://app.posthog.com  # or self-hosted URL
```

### 3. Initialize PostHog

**Desktop (Tauri):**
```typescript
// src/main.tsx
import { initPostHog } from '@/integrations/posthog/config';

initPostHog();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
```

**VS Code Extension:**
```typescript
// src/extension.ts
import { initPostHog } from './integrations/posthog/config';

export function activate(context: vscode.ExtensionContext) {
  initPostHog();
  // ... rest of activation
}
```

### 4. Track Events

```typescript
import { posthog } from '@/integrations/posthog/config';

// Track user action
posthog.capture('feature_used', {
  feature: 'voice_capture',
  duration_ms: 1500
});

// Track AI agent event
import { trackAgentReasoning } from '@/integrations/posthog/tracking/agent-events';

trackAgentReasoning('agent-123', 'Analyzing pattern match', {
  confidence_score: 0.87,
  pattern_id: 'pattern-456'
});
```

---

## Configuration Options

### Basic Config

```typescript
// integrations/posthog/config.ts
export const POSTHOG_CONFIG = {
  apiKey: process.env.POSTHOG_API_KEY!,
  apiHost: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  options: {
    api_host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,  // Manual tracking for precision
    disable_session_recording: false,
  },
};
```

### Advanced: Feature Flags

```typescript
// Enable/disable features dynamically
const isEnabled = await posthog.isFeatureEnabled('new-voice-ui');

if (isEnabled) {
  // Show new UI
}
```

### Advanced: A/B Testing

```typescript
const variant = await posthog.getFeatureFlag('voice-ui-test');

if (variant === 'control') {
  // Original UI
} else if (variant === 'variant-a') {
  // New UI A
}
```

---

## AI Agent Monitoring (ÆtherLight Specific)

### What Gets Tracked

**Agent Lifecycle:**
- Agent created/started/completed/failed
- Execution time
- Resource usage

**Reasoning Process (Chain of Thought):**
- Each reasoning step
- Confidence scores
- Pattern matches
- Escalation triggers (local → mentor → ether)

**Outcomes:**
- Success/failure/partial
- Hallucination detection
- Pattern validation results

**Meta-Learning:**
- Pattern confidence updates
- Model improvements
- Quality metrics

### Event Schema

```typescript
// Example: Agent reasoning event
{
  event: 'reasoning_step',
  properties: {
    agent_id: 'agent-123',
    agent_type: 'domain_agent',
    domain: 'Infrastructure',
    step: 'Analyzing pattern match',
    confidence_score: 0.87,
    pattern_id: 'pattern-456',
    escalation_level: 'local',
    timestamp: 1699564800000
  }
}
```

### Hallucination Detection

```typescript
import { trackHallucination } from '@/integrations/posthog/tracking/agent-events';

// Detect low-confidence responses
if (confidenceScore < 0.5) {
  trackHallucination('agent-123', true, confidenceScore, 'Pattern match uncertainty');
}
```

---

## Privacy & Security

**ÆtherLight PostHog integration respects privacy:**

✅ **No PII by default** - Only anonymous event data
✅ **Opt-out anytime** - Set `POSTHOG_ENABLED=false`
✅ **Self-hosted option** - Use your own PostHog instance
✅ **Zero-knowledge** - Pattern content NOT sent, only metadata
✅ **Local-first** - Works offline, syncs when online

**Example: What we track vs don't track:**

```typescript
// ✅ TRACKED (metadata only)
{
  pattern_matched: true,
  confidence: 0.87,
  duration_ms: 45,
  pattern_id: 'pattern-123'  // UUID, no content
}

// ❌ NOT TRACKED (user data)
{
  pattern_content: "...",  // Never sent
  user_query: "...",       // Never sent
  code_snippet: "...",     // Never sent
}
```

---

## Disable PostHog

### Option 1: Environment Variable

```bash
# .env.local
POSTHOG_ENABLED=false
```

### Option 2: Config

```typescript
// integrations/posthog/config.ts
export function initPostHog() {
  if (process.env.POSTHOG_ENABLED === 'false') {
    return; // PostHog not initialized
  }

  posthog.init(POSTHOG_CONFIG.apiKey, POSTHOG_CONFIG.options);
}
```

### Option 3: Remove Package

```bash
npm uninstall posthog-js posthog-node
```

ÆtherLight will continue working without any issues.

---

## Self-Hosted PostHog

**For enterprises wanting full control:**

```bash
# 1. Deploy PostHog (Docker)
docker run -d \
  --name posthog \
  -p 8000:8000 \
  -e SECRET_KEY=your_secret_key \
  posthog/posthog:latest

# 2. Update env variable
POSTHOG_HOST=https://your-posthog-instance.com
```

**Benefits:**
- Full data ownership
- No external dependencies
- GDPR/HIPAA compliant
- Custom retention policies

---

## Dashboard Examples

### 1. Agent Performance Dashboard

**Metrics:**
- Agent success rate (%)
- Average confidence score
- Hallucination detection rate
- Pattern match accuracy
- Escalation frequency (local vs ether)

**Visualizations:**
- Line chart: Confidence scores over time
- Funnel: Reasoning steps → Outcome
- Pie chart: Success vs Failure outcomes
- Heatmap: Agent activity by domain

### 2. Feature Adoption Dashboard

**Metrics:**
- Feature usage count
- User retention (7-day, 30-day)
- Time to first use
- Churn indicators

### 3. Performance Dashboard

**Metrics:**
- Pattern match latency (<50ms target)
- Agent response time
- Error rates
- Resource usage

---

## Troubleshooting

### PostHog not capturing events?

**Check:**
1. API key is correct in `.env.local`
2. PostHog initialized before first event
3. Network connectivity (if not self-hosted)
4. Console for errors: `posthog.debug()`

**Debug mode:**
```typescript
import { posthog } from '@/integrations/posthog/config';

posthog.debug(true);  // Logs all events to console
```

### Events not showing in dashboard?

- **Delay:** Events may take 1-2 minutes to appear
- **Filters:** Check dashboard filters
- **Environment:** Verify correct project (dev/prod)

---

## Cost Estimate

**PostHog Pricing (Cloud):**
- Free tier: 1M events/month
- Growth: $0.00031/event after free tier
- Enterprise: Custom pricing

**Self-Hosted:**
- Free (open source)
- Infrastructure cost only (Docker hosting)

**For typical ÆtherLight usage:**
- ~100K events/month per user (agent monitoring)
- Stays within free tier for most developers
- Enterprise can self-host for zero cost

---

## Related Documentation

- **Complete Architecture:** [INTEGRATIONS_ARCHITECTURE.md](../../docs/architecture/INTEGRATIONS_ARCHITECTURE.md)
- **Internal Usage:** [How ÆtherLight uses PostHog](../../docs/internal/POSTHOG_INTERNAL_USAGE.md)
- **Agent Monitoring Guide:** [AGENT_MONITORING.md](../../docs/integrations/AGENT_MONITORING.md)
- **Adding Integrations:** [ADDING_INTEGRATIONS.md](../../docs/integrations/ADDING_INTEGRATIONS.md)

---

## Summary

**PostHog is a powerful but optional add-on for ÆtherLight.**

✅ **Enable if you want:** Analytics, agent monitoring, feature flags, A/B testing
✅ **Disable if you want:** Full offline, zero dependencies, maximum privacy
✅ **ÆtherLight works perfectly either way**

---

**Questions?**
- GitHub Issues: [Report problems](https://github.com/AEtherlight-ai/aetherlight/issues)
- Discussions: [Ask questions](https://github.com/AEtherlight-ai/aetherlight/discussions)
- PostHog Docs: [PostHog official docs](https://posthog.com/docs)

---

**Status:** Optional plugin, ready to use
**Setup Time:** ~5 minutes
**Cost:** Free tier sufficient for most use cases
