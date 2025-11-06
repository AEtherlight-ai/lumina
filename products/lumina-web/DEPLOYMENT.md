# Lumina Web - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-06

---

## 🚀 Quick Deploy (Vercel - Recommended)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

### Step 2: Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `ÆtherLight_Lumina` repository
4. **Root Directory:** `products/lumina-web`
5. Click "Deploy"

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe (Optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4: Deploy

Vercel automatically builds and deploys. Done! 🎉

**Production URL:** `https://lumina-web.vercel.app`

---

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase project created
- [ ] Database migrations run
- [ ] RLS policies enabled
- [ ] Stripe webhooks configured (if using subscriptions)
- [ ] Custom domain configured (optional)
- [ ] HTTPS enforced
- [ ] Tests passing (`npm run test`)

---

## 🔧 Platform-Specific Guides

### Vercel (Recommended)

**Why Vercel:**
- Zero config for Next.js
- Automatic HTTPS
- Global CDN
- Preview deployments for PRs
- Free hobby tier

**Build Settings:**
- Framework: Next.js
- Root Directory: `products/lumina-web`
- Build Command: `npm run build`
- Output Directory: `.next`

### Netlify

1. Connect GitHub repository
2. Set root directory: `products/lumina-web`
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Add environment variables
6. Deploy

### AWS Amplify

1. Connect repository
2. Root directory: `products/lumina-web`
3. Build settings: Auto-detected (Next.js)
4. Add environment variables
5. Deploy

---

## 🗄️ Database Setup

### Supabase Migrations

Run in Supabase SQL Editor:

```sql
-- See supabase/migrations/001_initial_schema.sql
-- Creates 5 tables with RLS policies
```

### Enable Row Level Security

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_pools ENABLE ROW LEVEL SECURITY;
```

---

## 💳 Stripe Setup

### 1. Create Stripe Account

Go to [stripe.com](https://stripe.com) and create account.

### 2. Get API Keys

Dashboard → Developers → API keys:
- **Publishable key:** `pk_live_...` (client-side)
- **Secret key:** `sk_live_...` (server-side)

### 3. Create Products & Prices

Dashboard → Products → Create product:

- **Network:** $4.99/month
- **Pro:** $14.99/month
- **Enterprise:** $49/month

Copy Price IDs.

### 4. Set up Webhook

Dashboard → Developers → Webhooks → Add endpoint:

**Endpoint URL:** `https://your-domain.com/api/webhooks/stripe`

**Events to listen:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

Copy webhook secret: `whsec_...`

---

## 🌐 Custom Domain

### Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `app.lumina.ai`
3. Update DNS records (provided by Vercel)
4. Wait for propagation (< 5 minutes)

### DNS Configuration

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600
```

---

## 🔒 Security Checklist

- [ ] HTTPS enforced (automatic on Vercel)
- [ ] Environment variables set to production values
- [ ] Supabase RLS policies enabled
- [ ] Stripe webhook signature verification enabled
- [ ] OAuth redirect URLs configured
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (optional)

---

## 📊 Monitoring

### Vercel Analytics

Automatically enabled. View in Vercel dashboard.

### Supabase Monitoring

Dashboard → Logs → View auth, API, and database logs.

### Stripe Monitoring

Dashboard → Events → View webhook deliveries and failures.

---

## 🐛 Troubleshooting

### Build Fails

**Error:** `Module not found`
**Solution:** Run `npm install` locally, commit `package-lock.json`

### Environment Variables Not Working

**Error:** `undefined` in client-side code
**Solution:** Prefix client variables with `NEXT_PUBLIC_`

### Stripe Webhook Fails

**Error:** Signature mismatch
**Solution:** Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint secret

---

## 🔄 CI/CD Pipeline

### Automatic Deployments

- **main branch** → Production (`lumina.ai`)
- **develop branch** → Staging (`staging.lumina.ai`)
- **PR branches** → Preview deployments

### GitHub Actions (Optional)

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: npm run test
```

---

## 📝 Post-Deployment

1. Test all user flows (sign-up, sign-in, dashboard)
2. Verify Stripe webhooks working
3. Check Supabase logs for errors
4. Monitor performance (Vercel Analytics)
5. Set up alerts (optional)

---

**PATTERN:** Pattern-DEPLOY-001 (Next.js deployment to Vercel)
**RELATED:** README.md, WEB_PHASE_1_IMPLEMENTATION.md
**FUTURE:** Add Docker deployment, Kubernetes config

🤖 Generated with [Claude Code](https://claude.com/claude-code)
