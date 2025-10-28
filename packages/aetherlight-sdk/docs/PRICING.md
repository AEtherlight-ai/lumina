# ÆtherLight SDK Pricing

**VERSION:** 1.0
**DATE:** 2025-10-07
**CLASSIFICATION:** 🌐 PUBLIC (SDK licensing model)

---

## Executive Summary

**DESIGN DECISION:** SDK licensing separate from Lumina subscriptions
**WHY:** Developers integrate SDK into THEIR applications (not using Lumina UI)

**Pricing Model:**
- **Starter:** $99/mo - 1 app, local intelligence
- **Growth:** $299/mo - 3 apps, Circle of Trust
- **Enterprise:** $999/mo - Unlimited apps, global network

**Result:** Developers pay for SDK capabilities, not per-user seats.

---

## Pricing Tiers

### Starter ($99/month)

**Best for:** Single application, proof-of-concept, small teams

**Includes:**
- ✅ 1 application license
- ✅ 1,000 public patterns (curated, validated)
- ✅ Local intelligence (pattern matching, confidence scoring)
- ✅ Chain of Thought reasoning
- ✅ Basic architecture analysis (security scan, performance bench)
- ✅ 100MB pattern storage (local SQLite)
- ✅ Email support (48-hour response)

**Does NOT include:**
- ❌ Circle of Trust (encrypted peer sharing)
- ❌ Global network access (DHT pattern discovery)
- ❌ Premium patterns (≥95% confidence, 100+ validations)
- ❌ Priority support

**Limitations:**
- 10,000 pattern matches per month
- 100 architecture analyses per month
- Local-only (no network contribution)

**Example Use Case:**
Legal research platform (single deployment) with 1,000 California employment law patterns (local storage).

---

### Growth ($299/month)

**Best for:** Multiple applications, team collaboration, regional expansion

**Includes:**
- ✅ 3 application licenses
- ✅ 10,000 public patterns (curated, validated)
- ✅ All Starter features
- ✅ Circle of Trust (5-20 trusted peers, Shamir encrypted)
- ✅ Advanced architecture analysis (auto-docs, roadmap generation)
- ✅ Pattern contribution (earn reputation credits)
- ✅ 1GB pattern storage (local + encrypted peer backup)
- ✅ Slack/Discord support (24-hour response)

**Does NOT include:**
- ❌ Global network access (still Circle-only)
- ❌ Premium patterns (Gold tier, experimental)
- ❌ Enterprise SLA (99.9% uptime)

**Limitations:**
- 100,000 pattern matches per month
- 1,000 architecture analyses per month
- Circle of Trust limited to 20 peers

**Example Use Case:**
Legal research platform (3 jurisdictions: CA, NY, TX) sharing patterns with 5 peer law firms (Circle of Trust).

---

### Enterprise ($999/month)

**Best for:** Large-scale deployments, global network, premium intelligence

**Includes:**
- ✅ Unlimited application licenses
- ✅ 100,000 public patterns (curated, validated)
- ✅ All Growth features
- ✅ Global network access (DHT pattern discovery, 100k+ nodes)
- ✅ Premium patterns (Gold tier: ≥95% confidence, 100+ validations)
- ✅ Early access (experimental patterns, beta features)
- ✅ Enterprise architecture analysis (multi-codebase, org-wide)
- ✅ 10GB pattern storage (local + distributed + cloud backup)
- ✅ Dedicated support (4-hour response, video calls)
- ✅ Enterprise SLA (99.9% uptime, $5K/hour penalty)
- ✅ Self-hosted option (on-premises DHT node)

**No limitations:**
- Unlimited pattern matches
- Unlimited architecture analyses
- Unlimited Circle of Trust peers

**Example Use Case:**
Legal research conglomerate (50 state jurisdictions + international) contributing 10,000 patterns to global network, discovering 90,000 patterns from other firms.

---

## Add-Ons (All Tiers)

### Additional Application License
- **$49/month per app** (Starter/Growth only)
- Example: Starter + 2 extra apps = $99 + ($49 × 2) = $197/mo

### Additional Storage
- **$19/month per 1GB** (all tiers)
- Example: Growth (1GB base) + 4GB extra = $299 + ($19 × 4) = $375/mo

### Premium Pattern Access (Starter/Growth only)
- **$199/month** (unlock 10,000 premium patterns)
- Enterprise tier includes this by default

### Priority Support Upgrade (Starter/Growth only)
- **$99/month** (4-hour response, video calls)
- Enterprise tier includes this by default

---

## Reputation Credit System

**How It Works:**
1. Integrate SDK, validate patterns (≥85% success rate)
2. Contribute patterns to network (opt-in, zero-knowledge encrypted)
3. Earn reputation credits (10-20 credits per pattern)
4. Unlock premium patterns (no additional cost)

**Credit Tiers:**
- **Bronze (0-99 credits):** Access 1,000 public patterns (Starter default)
- **Silver (100-499 credits):** Access 10,000 public + 1,000 premium patterns
- **Gold (500+ credits):** Access 100,000 public + 10,000 premium + experimental

**Example Progression:**
- Month 1: Install SDK, validate 5 patterns → 25 credits (Bronze)
- Month 3: Contribute 10 patterns (Circle of Trust) → 125 credits (Silver)
- Month 6: 50 patterns contributed (global network) → 525 credits (Gold)

**Gold Tier Benefits:**
- Early access to experimental patterns (beta features)
- Voting rights on pattern curation (community governance)
- Featured contributor badge (public profile)

**Credits DON'T expire** - reputation is permanent (incentivizes long-term contribution).

---

## Network Effects Math

### Value Scaling (Metcalfe's Law)

**Formula:** Intelligence = N² (where N = contributing applications)

**Starter Tier (Local-Only):**
- Your 1,000 patterns × 1 app = 1,000 validated patterns
- No network effects (isolated intelligence)

**Growth Tier (Circle of Trust, 10 apps):**
- Your 1,000 patterns + (9 peers × 1,000 patterns) = 10,000 patterns
- 10² = 100 value units (100 cross-validations possible)

**Enterprise Tier (Global Network, 1,000 apps):**
- Your 10,000 patterns + (999 peers × 10,000 patterns) = 10,000,000 patterns
- 1,000² = 1,000,000 value units (exponential intelligence)

**Result:** Enterprise customers get 10,000× more intelligence than Starter (for 10× price).

---

## Pricing Comparison: SDK vs Lumina

### Lumina Subscriptions (End-User Products)
- **Free:** $0/mo - Voice-to-intelligence (local-only)
- **Network:** $4.99/mo - Team sync, mobile app, +10MB storage per invite
- **Pro:** $14.99/mo - 3 knowledge pools, analytics, +20MB storage per invite
- **Enterprise:** $49/mo - Unlimited pools, self-hosted, SSO/SAML

**Who pays:** End users (developers using Lumina voice/keyboard UI)

### ÆtherLight SDK (Developer Infrastructure)
- **Starter:** $99/mo - 1 app, local intelligence
- **Growth:** $299/mo - 3 apps, Circle of Trust
- **Enterprise:** $999/mo - Unlimited apps, global network

**Who pays:** Development teams integrating SDK into THEIR applications

**Example Scenario:**
- Legal research startup integrates SDK (pays $299/mo Growth tier)
- Their 100 attorney end-users use Lumina voice UI (pay $4.99/mo each = $499/mo)
- **Total revenue:** $299 (SDK) + $499 (Lumina subscriptions) = $798/mo from one customer

---

## Revenue Projections

### Conservative Scenario (100 SDK Customers)

**Customer Mix:**
- 60 Starter ($99/mo) = $5,940/mo
- 30 Growth ($299/mo) = $8,970/mo
- 10 Enterprise ($999/mo) = $9,990/mo

**Total MRR:** $24,900 ($298,800 ARR)

**Network Intelligence:**
- 60 Starter (1k patterns each) = 60,000 local patterns (no contribution)
- 30 Growth (10k patterns, 50% contribute) = 150,000 patterns (Circle of Trust)
- 10 Enterprise (100k patterns, 100% contribute) = 1,000,000 patterns (global network)

**Total Network:** 1,210,000 validated patterns

---

### Aggressive Scenario (1,000 SDK Customers)

**Customer Mix:**
- 600 Starter ($99/mo) = $59,400/mo
- 300 Growth ($299/mo) = $89,700/mo
- 100 Enterprise ($999/mo) = $99,900/mo

**Total MRR:** $249,000 ($2,988,000 ARR)

**Network Intelligence:**
- 600 Starter (1k patterns each) = 600,000 local patterns (no contribution)
- 300 Growth (10k patterns, 50% contribute) = 1,500,000 patterns (Circle of Trust)
- 100 Enterprise (100k patterns, 100% contribute) = 10,000,000 patterns (global network)

**Total Network:** 12,100,000 validated patterns (10× intelligence vs 100 customers)

---

## Bundled Pricing (SDK + Lumina)

### Development Team Bundle

**Includes:**
- ÆtherLight SDK (Growth tier: 3 apps, Circle of Trust)
- 10 Lumina Pro seats (developers using voice/keyboard UI)

**Regular Price:** $299 (SDK) + ($14.99 × 10 Lumina seats) = $448.90/mo
**Bundled Price:** $399/mo (11% discount)

**Savings:** $49.90/mo ($598.80/year)

---

### Enterprise Organization Bundle

**Includes:**
- ÆtherLight SDK (Enterprise tier: unlimited apps, global network)
- 100 Lumina Enterprise seats (SSO/SAML, self-hosted)

**Regular Price:** $999 (SDK) + ($49 × 100 Lumina seats) = $5,899/mo
**Bundled Price:** $4,999/mo (15% discount)

**Savings:** $900/mo ($10,800/year)

---

## Payment Options

### Monthly Billing
- All tiers available monthly (no commitment)
- Cancel anytime (prorated refund)
- Credit card or ACH required

### Annual Billing (10% Discount)
- **Starter:** $1,069/year (vs $1,188/year monthly) - Save $119
- **Growth:** $3,229/year (vs $3,588/year monthly) - Save $359
- **Enterprise:** $10,789/year (vs $11,988/year monthly) - Save $1,199

### Custom Enterprise Agreements
- Multi-year contracts (3-5 years)
- Volume discounts (>10 Enterprise licenses)
- Self-hosted infrastructure (on-premises DHT nodes)
- Custom SLA (99.99% uptime, $10K/hour penalty)
- Dedicated account manager

**Contact:** enterprise-sales@aetherlight.network

---

## Free Trial

### 30-Day Free Trial (All Tiers)

**Includes:**
- Full access to tier features (Starter, Growth, or Enterprise)
- No credit card required
- 10,000 pattern matches
- 100 architecture analyses
- Email support

**After Trial:**
- Downgrade to Starter (if no payment method)
- Upgrade to Growth/Enterprise (add payment method)
- Cancel subscription (all data exported)

**Trial Extensions:**
- 60 days for open-source projects (GitHub verification)
- 90 days for educational institutions (.edu email)
- Custom trials for enterprise evaluations (contact sales)

---

## Licensing Terms

### Application License Definition

**1 Application =** Single codebase with unique deployment

**Examples:**
- **1 License:** Legal research platform (single React app, deployed at legalresearch.com)
- **2 Licenses:** Legal research platform + mobile app (separate codebases)
- **3 Licenses:** Legal research platform + mobile app + admin dashboard

**NOT Counted:**
- Development/staging environments (same codebase)
- Load balancers, CDNs, redundant servers (same deployment)
- Different customers using your SaaS (shared codebase)

---

### Fair Use Policy

**Reasonable Use:**
- Pattern matching for legitimate business purposes
- Architecture analysis on codebases you own/maintain
- Network contribution of original patterns (validated outcomes)

**Prohibited Use:**
- Reselling SDK access (must be integrated into YOUR application)
- Bulk scraping patterns (for competing pattern libraries)
- Reverse engineering SDK binaries
- Pattern contribution without validation (spam patterns)

**Enforcement:**
- First violation: Warning + 7-day remediation period
- Second violation: Temporary suspension (account review)
- Third violation: Permanent ban + no refund

---

## Support Levels

### Email Support (Starter)
- **Response time:** 48 hours (business days)
- **Channels:** Email only (sdk-support@aetherlight.network)
- **Coverage:** Technical questions, bug reports

### Slack/Discord Support (Growth)
- **Response time:** 24 hours (business days)
- **Channels:** Email, Slack, Discord
- **Coverage:** Technical questions, integration assistance, best practices

### Dedicated Support (Enterprise)
- **Response time:** 4 hours (24/7, including weekends)
- **Channels:** Email, Slack, Discord, video calls (Zoom/Teams)
- **Coverage:** Technical questions, integration assistance, code reviews, architecture consulting
- **Dedicated contact:** Named support engineer

---

## Migration & Cancellation

### Upgrade/Downgrade
- **Upgrade:** Immediate (prorated charge for remainder of billing period)
- **Downgrade:** End of current billing period (no prorated refund)

**Example:** Upgrade from Starter to Growth on day 15 of monthly cycle
- Charged: ($299 - $99) × (15 days / 30 days) = $100 prorated upgrade fee

### Cancellation
- Cancel anytime (no penalty)
- Access continues until end of current billing period
- Prorated refund for annual plans (>30 days remaining)

### Data Export
- **Before cancellation:** Export all patterns (JSON), architecture analyses (PDF)
- **After cancellation:** 30-day grace period (read-only access)
- **After 30 days:** All data deleted (GDPR compliant)

---

## Frequently Asked Questions

### Can I use the SDK in multiple applications with one license?
**No.** Each application requires a separate license. Upgrade to Growth (3 apps) or Enterprise (unlimited apps).

### What happens if I exceed pattern match limits (Starter/Growth)?
**Soft limit:** You'll receive email warning at 80%, 90%, 100% usage. Service continues.
**Hard limit:** After 120% usage, pattern matching throttled (10 requests/hour until next billing cycle).
**Solution:** Upgrade tier or purchase additional capacity ($49/mo for +10,000 matches).

### Do reputation credits transfer between tiers?
**Yes.** Credits are tied to your account (not tier). Downgrade from Enterprise to Starter? Keep your Gold tier credits.

### Can I contribute patterns without Growth/Enterprise tier?
**No.** Starter tier is local-only (no network access). Pattern contribution requires Growth (Circle of Trust) or Enterprise (global network).

### Is there a non-profit discount?
**Yes.** 50% discount for registered 501(c)(3) organizations. Contact: nonprofit@aetherlight.network

### Can I self-host the SDK?
**Partially.** Core SDK runs locally (always). DHT node can be self-hosted (Enterprise tier only, requires Kubernetes cluster).

### What happens if ÆtherLight servers go down?
**Local-first architecture:** Pattern matching continues (local SQLite). Network discovery pauses (falls back to Circle of Trust or local-only).

---

## Pricing Roadmap

### Phase 1 (Current): Starter/Growth/Enterprise Tiers
- Fixed pricing ($99/$299/$999)
- Reputation credit system (earn credits → unlock premium patterns)

### Phase 2 (Q2 2026): Usage-Based Pricing Option
- Pay-per-pattern-match ($0.01 per match, no monthly minimum)
- Best for: Low-volume applications (<1,000 matches/month)

### Phase 3 (Q3 2026): Marketplace Model
- Developers sell custom patterns (70% revenue share)
- Customers buy premium patterns (à la carte, $5-$50 per pattern)
- ÆtherLight takes 30% commission

### Phase 4 (Q4 2026): Community Edition
- Open-source SDK (MIT license, self-hosted DHT)
- Limited to 100 patterns (no network access)
- Best for: Hobbyists, open-source projects

---

## Contact Sales

**Questions about pricing?**
- Email: sdk-sales@aetherlight.network
- Schedule demo: [calendly.com/aetherlight-sdk](https://calendly.com/aetherlight-sdk)
- Live chat: [aetherlight.network/sdk](https://aetherlight.network/sdk)

**Enterprise evaluations:**
- Custom pricing for >10 Enterprise licenses
- Multi-year contracts (15-20% discount)
- Proof-of-concept trials (90 days, full features)

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - SDK component breakdown
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 30-minute integration
- [NETWORK_CONTRIBUTION.md](./NETWORK_CONTRIBUTION.md) - Pattern feedback loop, reputation credits
- [DOMAIN_TEMPLATES.md](./DOMAIN_TEMPLATES.md) - 5 copy-paste templates

---

**STATUS:** SDK pricing model documented
**CLASSIFICATION:** 🌐 PUBLIC (customer-facing pricing)
**OWNER:** Sales & Marketing Team
