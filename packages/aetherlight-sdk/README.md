# @aetherlight/sdk

**Intelligence infrastructure for any application.**

ÆtherLight SDK enables your application to integrate pattern recognition, architecture analysis, and neural network learning in 30 minutes.

## What This SDK Provides

1. **Pattern Recognition Engine** - Multi-dimensional confidence scoring, Chain of Thought reasoning
2. **Architecture Advisor** - Analyze your codebase, get recommendations, auto-generate documentation
3. **Neural Network Integration** - Join distributed pattern network, contribute and discover patterns
4. **Domain-Specific Templates** - Legal, analytics, medical, support, engineering (copy-paste ready)

## Quick Start

```bash
npm install @aetherlight/sdk
```

```typescript
import { AetherlightCore } from '@aetherlight/sdk';

const core = new AetherlightCore({
  domain: 'legal',
  confidence: { threshold: 0.85 }
});

const match = await core.matchPattern({
  query: 'Find California non-compete cases',
  context: { jurisdiction: 'CA' }
});

console.log(match.patterns[0].chainOfThought.reasoningChain);
// ["California Business & Professions Code §16600 voids non-compete agreements", ...]
```

**Integration time:** 10-30 minutes (depends on features needed)

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - SDK component breakdown, integration patterns, business model
- **[INTEGRATION_GUIDE.md](./docs/INTEGRATION_GUIDE.md)** - Step-by-step 30-minute integration guide
- **[DOMAIN_TEMPLATES.md](./docs/DOMAIN_TEMPLATES.md)** - 5 copy-paste templates (legal, analytics, medical, support, engineering)
- **[NETWORK_CONTRIBUTION.md](./docs/NETWORK_CONTRIBUTION.md)** - Pattern feedback loop, network effects, reputation credits
- **[PRICING.md](./docs/PRICING.md)** - SDK licensing tiers ($99-$999/mo)

## Key Features

### Intelligence-Only Integration (10 minutes)
```typescript
const core = new AetherlightCore({ domain: 'legal' });
const match = await core.matchPattern({ query: 'non-compete' });
// Instant pattern matching, no UI needed
```

### Architecture Analysis (5 minutes)
```typescript
const advisor = new ArchitectureAdvisor({ targetApp: './src' });
const analysis = await advisor.analyzeCodebase({ includeSecurityScan: true });
// Get architecture recommendations, security findings, auto-generated docs
```

### Network Effects (15 minutes)
```typescript
const network = new NeuralNetwork({ contributePatterns: true });
const matches = await network.discoverPatterns({ query: '...' });
// Search 100k+ patterns from global network
```

## Use Cases

- **Legal Research Platforms** - Case law matching, jurisdiction-aware search
- **Data Analytics (NL→SQL)** - Natural language to SQL query generation
- **Medical Records Systems** - HIPAA-compliant diagnosis suggestions
- **Customer Support** - Ticket routing, automation suggestions
- **Engineering Tools** - Code search, React pattern recommendations

## Network Effects

When you integrate ÆtherLight SDK:
1. Your application gets intelligence (pattern matching, architecture analysis)
2. Your patterns contribute back to network (opt-in, zero-knowledge encrypted)
3. Future customers benefit from your edge cases
4. You earn reputation credits (unlock premium patterns)

**Result:** N applications → N² intelligence (Metcalfe's Law)

## Package Structure

```
@aetherlight/sdk (full package)
├── @aetherlight/sdk-core (lightweight: pattern matching only)
├── @aetherlight/sdk-advisor (architecture analysis only)
└── @aetherlight/sdk-network (DHT + neural network only)
```

Install lightweight packages if you don't need all features:
```bash
npm install @aetherlight/sdk-core  # 2MB (vs 10MB full SDK)
```

## Pricing

- **Starter:** $99/mo - 1 app, 1,000 public patterns, local-only
- **Growth:** $299/mo - 3 apps, 10,000 patterns, Circle of Trust access
- **Enterprise:** $999/mo - Unlimited apps, 100,000 patterns, global network access

See [PRICING.md](./docs/PRICING.md) for full details.

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/AEtherlight-ai/lumina/issues)
- **Email:** sdk-support@aetherlight.network
- **Discord:** [ÆtherLight Community](https://discord.gg/aetherlight)

## License

MIT (see LICENSE file)

---

**ÆtherLight SDK** - Intelligence infrastructure for the AI age.
