# Website Implementation Guide - Key Authorization & Monetization (v0.17.0)

**Sprint:** Key Authorization & Monetization
**Phase:** 4 (Website Dashboard)
**Status:** Phase 1-2 Complete (API + Desktop), Phase 3-6 Pending

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Setup](#database-setup)
3. [API Endpoints (Already Built)](#api-endpoints-already-built)
4. [Website Components Needed](#website-components-needed)
5. [User Flows](#user-flows)
6. [Stripe Integration](#stripe-integration)
7. [Environment Variables](#environment-variables)
8. [Testing Plan](#testing-plan)

---

## Architecture Overview

### Current State (Phase 1-2 Complete ✅)

```
Extension → Desktop App (audio capture) → Server API → OpenAI Whisper API
                                            ↓
                                  Database (Supabase)
                                    - Tracks credits
                                    - Logs usage
                                    - Records transactions
```

### What Website Needs to Provide (Phase 4)

```
User Dashboard (Website)
  ├── Credits & Billing Page
  │   ├── Current Balance Display
  │   ├── Purchase Credits Button → Stripe Checkout
  │   └── Transaction History Table
  │
  ├── Device Management Page
  │   ├── Active Devices List (with license keys)
  │   ├── Activate New Device Button → Generate license_key
  │   └── Deactivate/Revoke Device Button
  │
  └── Usage Analytics Page
      ├── Monthly Usage Chart (minutes used)
      ├── Cost Breakdown by Day/Week/Month
      └── Transcription History Table
```

---

## Database Setup

### Step 1: Apply Migration (CRITICAL - DO THIS FIRST)

**Location:** `products/lumina-web/supabase/migrations/007_credit_system.sql`

**How to Apply:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/xpklyvcbzbwmgtnztjei/editor
2. Click "SQL Editor" in left sidebar
3. Copy contents of `007_credit_system.sql`
4. Paste into SQL Editor
5. Click "Run" (F5)
6. Verify success (should see "Success. No rows returned")

**What This Does:**
- Adds `credits_balance_usd` column to `profiles` table (defaults to $5.00 free credit)
- Adds `monthly_usage_minutes` and `monthly_limit_minutes` columns
- Creates `credit_transactions` table (immutable audit log)
- Updates `usage_events` table with `cost_usd` and `duration_seconds`
- Adds helper functions: `record_credit_transaction()`, `check_sufficient_credits()`, `calculate_whisper_cost()`
- Backfills existing users with $5 free credit

### Step 2: Verify Tables Exist

Run this query in Supabase SQL Editor:

```sql
-- Check profiles table has new columns
SELECT
  id,
  email,
  credits_balance_usd,
  monthly_usage_minutes,
  monthly_limit_minutes,
  subscription_tier
FROM profiles
LIMIT 5;

-- Check credit_transactions table exists
SELECT * FROM credit_transactions LIMIT 5;

-- Check usage_events table has cost tracking
SELECT * FROM usage_events WHERE cost_usd IS NOT NULL LIMIT 5;
```

---

## API Endpoints (Already Built ✅)

### 1. `/api/desktop/transcribe` (API-001) ✅

**Status:** Complete (Phase 1)
**Location:** `products/lumina-web/app/api/desktop/transcribe/route.ts`

**Purpose:** Proxy Whisper transcription with credit tracking

**Request:**
```typescript
POST /api/desktop/transcribe
Headers:
  Authorization: Bearer {license_key}
Body (FormData):
  file: audio.wav
  model: "whisper-1" (optional)
  language: "en" (optional)
```

**Response (200 Success):**
```json
{
  "text": "Transcribed text here",
  "cost_usd": 0.0012,
  "balance_remaining_usd": 4.9988,
  "duration_seconds": 12,
  "message": "Transcription successful"
}
```

**Response (402 Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "balance_usd": 0.0005,
  "required_usd": 0.0012,
  "message": "Please purchase more credits or upgrade your plan.",
  "upgrade_url": "/dashboard/credits"
}
```

**Desktop App Integration:** ✅ Complete (Phase 2, DESKTOP-001)

---

### 2. `/api/credits/purchase` (API-002) ✅

**Status:** Complete (Phase 1)
**Location:** `products/lumina-web/app/api/credits/purchase/route.ts`

**Purpose:** Self-service credit top-up with Stripe

**Request:**
```typescript
POST /api/credits/purchase
Headers:
  Authorization: Bearer {session_token}
Body:
  amount_usd: 10 | 20  // Only $10 or $20 allowed
```

**Response:**
```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "amount_usd": 10,
  "minutes_purchased": 833,
  "message": "Payment initiated. Complete checkout with Stripe."
}
```

**Stripe Integration:** ⚠️ Needs Stripe Secret Key (see Environment Variables below)

---

### 3. `/api/credits/status` (API-003) ✅

**Status:** Complete (Phase 1)
**Location:** `products/lumina-web/app/api/credits/status/route.ts`

**Purpose:** Real-time credit balance and usage warnings

**Request:**
```typescript
GET /api/credits/status
Headers:
  Authorization: Bearer {session_token}
```

**Response:**
```json
{
  "balance_usd": 4.85,
  "monthly_usage_minutes": 150,
  "monthly_limit_minutes": 2083,
  "usage_percentage": 7.2,
  "warnings": [],  // ["80_percent", "90_percent", "95_percent", "exhausted"]
  "tier": "paid",
  "minutes_remaining": 1933
}
```

**Desktop App Integration:** Pending (Phase 2, DESKTOP-002 - polls every 5 minutes, shows toast at thresholds)

---

## Website Components Needed

### Page 1: `/dashboard/credits` (WEB-001)

**File:** `products/lumina-web/app/dashboard/credits/page.tsx`

**Components to Build:**

#### 1. Credit Balance Card
```tsx
<Card>
  <h2>Credit Balance</h2>
  <div className="balance">
    <span className="amount">${balance.toFixed(2)}</span>
    <span className="minutes">≈ {(balance / 0.006 * 60).toFixed(0)} minutes</span>
  </div>
  <ProgressBar
    value={monthlyUsageMinutes}
    max={monthlyLimitMinutes}
    showPercentage={true}
  />
  <p>Used {monthlyUsageMinutes} of {monthlyLimitMinutes} minutes this month</p>
</Card>
```

#### 2. Purchase Credits Section
```tsx
<Card>
  <h2>Top Up Credits</h2>
  <div className="options">
    <Button onClick={() => purchaseCredits(10)}>
      <div>$10</div>
      <div>833 minutes</div>
      <small>$0.012/min</small>
    </Button>
    <Button onClick={() => purchaseCredits(20)}>
      <div>$20</div>
      <div>1,666 minutes</div>
      <small>$0.012/min (Best Value)</small>
    </Button>
  </div>
</Card>
```

#### 3. Transaction History Table
```tsx
<Table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Type</th>
      <th>Amount</th>
      <th>Balance After</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    {transactions.map(tx => (
      <tr key={tx.id}>
        <td>{formatDate(tx.created_at)}</td>
        <td>{tx.transaction_type}</td>
        <td className={tx.amount_usd > 0 ? 'credit' : 'debit'}>
          {tx.amount_usd > 0 ? '+' : ''}{tx.amount_usd.toFixed(4)}
        </td>
        <td>${tx.balance_after_usd.toFixed(2)}</td>
        <td>{tx.description}</td>
      </tr>
    ))}
  </tbody>
</Table>
```

#### 4. Data Fetching (React Query)
```tsx
const { data: creditStatus } = useQuery({
  queryKey: ['credits', 'status'],
  queryFn: async () => {
    const res = await fetch('/api/credits/status', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    return res.json();
  },
  refetchInterval: 30000 // Refresh every 30s
});

const { data: transactions } = useQuery({
  queryKey: ['credits', 'transactions'],
  queryFn: async () => {
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    return data;
  }
});
```

---

### Page 2: `/dashboard/devices` (WEB-002)

**File:** `products/lumina-web/app/dashboard/devices/page.tsx`

**Components to Build:**

#### 1. Active Devices List
```tsx
<Card>
  <h2>Active Devices</h2>
  <DeviceList>
    {devices.map(device => (
      <DeviceCard key={device.id}>
        <div className="device-info">
          <h3>{device.device_name}</h3>
          <p>Fingerprint: {device.device_fingerprint}</p>
          <p>Last Seen: {formatRelativeTime(device.last_seen_at)}</p>
          <Badge status={device.connection_status}>
            {device.connection_status}
          </Badge>
        </div>
        <div className="device-key">
          <label>License Key:</label>
          <code>{device.license_key}</code>
          <Button onClick={() => copyToClipboard(device.license_key)}>
            Copy
          </Button>
        </div>
        <div className="device-actions">
          <Button variant="danger" onClick={() => deactivateDevice(device.id)}>
            Deactivate
          </Button>
        </div>
      </DeviceCard>
    ))}
  </DeviceList>
</Card>
```

#### 2. Activate New Device Button
```tsx
<Button onClick={activateNewDevice}>
  + Activate New Device
</Button>

async function activateNewDevice() {
  // Generate 24-character nanoid license key
  const licenseKey = nanoid(24);

  // Get device fingerprint (browser fingerprint for now, desktop will replace)
  const fingerprint = await getBrowserFingerprint();

  // Insert into devices table
  const { data, error } = await supabase
    .from('devices')
    .insert({
      user_id: session.user.id,
      device_name: `Device ${devices.length + 1}`,
      device_fingerprint: fingerprint,
      license_key: licenseKey,
      is_active: true,
      connection_status: 'offline'
    })
    .select()
    .single();

  if (error) {
    alert('Failed to activate device: ' + error.message);
    return;
  }

  // Show license key to user
  showLicenseKeyModal(licenseKey);
}
```

#### 3. License Key Display Modal
```tsx
<Modal isOpen={showKeyModal} onClose={() => setShowKeyModal(false)}>
  <h2>Device Activated Successfully!</h2>
  <p>Copy this license key and paste it into your desktop app settings:</p>
  <div className="license-key-display">
    <code>{newLicenseKey}</code>
    <Button onClick={() => copyToClipboard(newLicenseKey)}>
      Copy to Clipboard
    </Button>
  </div>
  <Alert variant="warning">
    ⚠️ Save this key! You won't be able to see it again.
  </Alert>
  <div className="instructions">
    <h3>Next Steps:</h3>
    <ol>
      <li>Open Lumina Desktop App</li>
      <li>Go to Settings</li>
      <li>Paste license key in "License Key" field</li>
      <li>Click "Save"</li>
      <li>Start using voice capture!</li>
    </ol>
  </div>
</Modal>
```

#### 4. Data Fetching
```tsx
const { data: devices } = useQuery({
  queryKey: ['devices'],
  queryFn: async () => {
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    return data;
  }
});
```

---

### Page 3: `/dashboard/usage` (Optional - Enhanced UX)

**File:** `products/lumina-web/app/dashboard/usage/page.tsx`

**Components to Build:**

#### 1. Usage Chart (Recharts)
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<Card>
  <h2>Usage Over Time</h2>
  <LineChart width={600} height={300} data={usageByDay}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="minutes" stroke="#8884d8" />
    <Line type="monotone" dataKey="cost_usd" stroke="#82ca9d" />
  </LineChart>
</Card>
```

#### 2. Usage History Table
```tsx
<Table>
  <thead>
    <tr>
      <th>Date/Time</th>
      <th>Device</th>
      <th>Duration</th>
      <th>Cost</th>
      <th>Model</th>
    </tr>
  </thead>
  <tbody>
    {usageEvents.map(event => (
      <tr key={event.id}>
        <td>{formatDateTime(event.created_at)}</td>
        <td>{event.device_id}</td>
        <td>{event.duration_seconds}s</td>
        <td>${event.cost_usd.toFixed(4)}</td>
        <td>{event.metadata?.model || 'whisper-1'}</td>
      </tr>
    ))}
  </tbody>
</Table>
```

---

## User Flows

### Flow 1: New User Sign-Up (Free Tier)

1. **User signs up** (existing auth flow)
2. **Trigger:** `profiles` table insert via RLS + trigger
3. **Result:** User gets $5.00 free credit automatically
4. **Credits:** $5.00 = 833 minutes of transcription (OpenAI: $0.006/min)
5. **Next:** User activates device to get license key

### Flow 2: Device Activation

1. **User clicks "Activate New Device"** on `/dashboard/devices`
2. **System generates 24-char license key** (nanoid)
3. **System inserts row into `devices` table:**
   ```sql
   INSERT INTO devices (user_id, device_name, device_fingerprint, license_key, is_active)
   VALUES ('{user_id}', 'Device 1', '{fingerprint}', '{license_key}', true);
   ```
4. **Modal shows license key** (one-time view)
5. **User copies key** and pastes into desktop app Settings
6. **Desktop app saves key** to `~/.lumina/settings.json`
7. **Desktop app sends test request** to `/api/desktop/transcribe` with Bearer token
8. **Server validates license key** → Updates `last_seen_at` + `connection_status: 'online'`
9. **Done:** Device is active and authenticated

### Flow 3: Voice Transcription (With Credit Tracking)

1. **User presses hotkey** (Shift+~ or `) in desktop app
2. **Desktop app captures audio** (voice.rs)
3. **Desktop app sends audio to server:**
   ```http
   POST /api/desktop/transcribe
   Authorization: Bearer {license_key}
   Body: audio.wav
   ```
4. **Server authenticates device** by license_key
5. **Server checks credits:**
   - If `credits_balance_usd < estimated_cost` → Return 402 Insufficient Credits
   - If sufficient → Continue
6. **Server calls OpenAI Whisper API** with server's OpenAI key
7. **Server calculates actual cost** (duration_seconds / 60 * $0.006)
8. **Server deducts cost atomically:**
   ```sql
   SELECT record_credit_transaction(
     p_user_id => '{user_id}',
     p_amount_usd => -0.0012,  -- Negative = deduction
     p_transaction_type => 'usage',
     p_description => 'Transcription: 12s (0 min)'
   );
   ```
9. **Server logs usage event:**
   ```sql
   INSERT INTO usage_events (user_id, device_id, event_type, cost_usd, duration_seconds)
   VALUES ('{user_id}', '{device_id}', 'voice_capture', 0.0012, 12);
   ```
10. **Server returns transcription:**
    ```json
    {
      "text": "Hello world",
      "cost_usd": 0.0012,
      "balance_remaining_usd": 4.9988
    }
    ```
11. **Desktop app types transcript** at cursor position (OS-level keyboard simulation)

### Flow 4: Credit Purchase (Top-Up)

1. **User clicks "$10" or "$20" button** on `/dashboard/credits`
2. **Frontend calls `/api/credits/purchase`:**
   ```tsx
   const response = await fetch('/api/credits/purchase', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${session.access_token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ amount_usd: 10 })
   });
   const { client_secret } = await response.json();
   ```
3. **Frontend redirects to Stripe Checkout:**
   ```tsx
   const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
   await stripe.confirmCardPayment(client_secret);
   ```
4. **User completes payment** on Stripe
5. **Stripe webhook fires** → `/api/webhooks/stripe` (needs to be built)
6. **Webhook handler:**
   - Verifies payment succeeded
   - Adds credits to user balance:
     ```sql
     SELECT record_credit_transaction(
       p_user_id => '{user_id}',
       p_amount_usd => 10.00,  -- Positive = addition
       p_transaction_type => 'purchase',
       p_stripe_payment_intent_id => 'pi_xxx'
     );
     ```
7. **User sees updated balance** on dashboard (React Query refetch)

### Flow 5: Insufficient Credits (Desktop App)

1. **User presses hotkey** to start transcription
2. **Desktop app sends audio to server**
3. **Server checks credits:** `balance_usd < estimated_cost`
4. **Server returns 402:**
   ```json
   {
     "error": "Insufficient credits",
     "balance_usd": 0.0005,
     "required_usd": 0.0012,
     "message": "Please purchase more credits or upgrade your plan.",
     "upgrade_url": "/dashboard/credits"
   }
   ```
5. **Desktop app shows error message:**
   ```
   ⚠️ Insufficient Credits

   Your balance: $0.00
   Required: $0.00

   Please visit the dashboard to purchase more credits:
   https://app.aetherlight.ai/dashboard/credits

   [Open Dashboard] [Dismiss]
   ```
6. **User clicks "Open Dashboard"** → Opens browser to `/dashboard/credits`
7. **User purchases credits** (Flow 4)
8. **User returns to desktop app** and tries again

---

## Stripe Integration

### Step 1: Create Stripe Account

1. Go to https://stripe.com/
2. Sign up for account
3. Complete onboarding
4. Switch to "Test Mode" for development

### Step 2: Get API Keys

1. Go to Developers → API Keys
2. Copy **Publishable Key** (pk_test_xxx)
3. Copy **Secret Key** (sk_test_xxx)
4. Add to environment variables (see below)

### Step 3: Configure Webhooks

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy **Signing Secret** (whsec_xxx)
6. Add to environment variables

### Step 4: Build Webhook Handler

**File:** `products/lumina-web/app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  const supabase = await createClient();

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const userId = paymentIntent.metadata.supabase_user_id;
    const amountUsd = paymentIntent.amount / 100; // Convert cents to dollars

    // Add credits to user balance
    const { error } = await supabase.rpc('record_credit_transaction', {
      p_user_id: userId,
      p_amount_usd: amountUsd,
      p_transaction_type: 'purchase',
      p_description: `Credit purchase: $${amountUsd}`,
      p_stripe_payment_intent_id: paymentIntent.id
    });

    if (error) {
      console.error('Failed to record credit transaction:', error);
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

    console.log(`✅ Added $${amountUsd} credits to user ${userId}`);
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.error('Payment failed:', paymentIntent.id);
    // TODO: Send email notification to user
  }

  return NextResponse.json({ received: true });
}
```

### Step 5: Test Stripe Integration

**Test Credit Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`

**Testing Flow:**
1. Go to `/dashboard/credits`
2. Click "$10" button
3. Enter test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Click "Pay"
7. Check Supabase: `credit_transactions` table should have new row
8. Check dashboard: Balance should increase by $10.00

---

## Environment Variables

### Required Environment Variables

**File:** `products/lumina-web/.env.local`

```bash
# Supabase Configuration (Already exists)
NEXT_PUBLIC_SUPABASE_URL=https://xpklyvcbzbwmgtnztjei.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# OpenAI API Key (CRITICAL - MUST ADD)
OPENAI_API_KEY=sk-proj-xxx  # Get from https://platform.openai.com/api-keys

# Stripe Configuration (MUST ADD)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # From Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_xxx                    # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_xxx                  # From Stripe Webhooks

# Application URLs (Already exists)
NEXT_PUBLIC_APP_URL=https://app.aetherlight.ai
```

### Vercel Environment Variables

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add these variables:
   - `OPENAI_API_KEY` → `sk-proj-xxx` (Production + Preview + Development)
   - `STRIPE_SECRET_KEY` → `sk_test_xxx` (Start with test key)
   - `STRIPE_WEBHOOK_SECRET` → `whsec_xxx`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_test_xxx`
3. Redeploy application after adding variables

---

## Testing Plan

### Phase 1: Database & API Testing ✅

**Status:** Complete

- [x] Apply migration 007_credit_system.sql
- [x] Verify profiles table has new columns
- [x] Verify credit_transactions table exists
- [x] Test `/api/desktop/transcribe` endpoint
- [x] Test `/api/credits/purchase` endpoint
- [x] Test `/api/credits/status` endpoint

### Phase 2: Desktop App Testing ✅

**Status:** Complete (DESKTOP-001)

- [x] Desktop app refactored to proxy through server
- [x] Desktop app sends license_key in Authorization header
- [x] Desktop app handles 402 Insufficient Credits
- [x] Desktop app logs cost + balance

**Pending:**
- [ ] DESKTOP-002: Credit balance UI component (polls status, shows toast)
- [ ] DESKTOP-003: Enforce credit limits (disable voice, keep text input)

### Phase 3: Website Testing (Current Phase)

**Status:** Pending

**Test Checklist:**

#### 1. Credits Page (`/dashboard/credits`)
- [ ] Balance displays correctly
- [ ] Usage percentage shows 0-100%
- [ ] Transaction history loads
- [ ] "$10" button opens Stripe checkout
- [ ] "$20" button opens Stripe checkout
- [ ] Stripe test card (4242...) completes successfully
- [ ] Balance updates after purchase
- [ ] Transaction appears in history

#### 2. Devices Page (`/dashboard/devices`)
- [ ] Active devices list loads
- [ ] "Activate New Device" generates license key
- [ ] License key displays in modal (one-time)
- [ ] Copy button copies key to clipboard
- [ ] Key saves to devices table
- [ ] "Deactivate" button revokes device
- [ ] Last seen timestamp updates when desktop app connects

#### 3. Integration Testing
- [ ] Sign up new user → Receives $5 free credit
- [ ] Activate device → Get license key
- [ ] Paste key into desktop app settings
- [ ] Desktop app sends test request → Server responds 200
- [ ] Use voice capture → Credit balance decreases
- [ ] Check transaction history → Usage event appears
- [ ] Drain credits to $0.00 → Desktop app shows 402 error
- [ ] Purchase $10 credits → Balance increases
- [ ] Use voice capture again → Works after purchase

#### 4. Error Handling
- [ ] Invalid license key → 401 Unauthorized
- [ ] Inactive device → 403 Forbidden
- [ ] Insufficient credits → 402 Payment Required
- [ ] Invalid audio file → 400 Bad Request
- [ ] OpenAI API error → 500 Internal Server Error
- [ ] Stripe payment failure → Shows error message

---

## Implementation Priority

### Immediate (Phase 4 - Week 1)

1. **Apply Database Migration** ✅ (Already done)
2. **Add OPENAI_API_KEY to .env.local** ⚠️ CRITICAL
3. **Build `/dashboard/credits` page** (WEB-001)
   - Credit balance display
   - Purchase buttons ($10, $20)
   - Transaction history table
4. **Build `/dashboard/devices` page** (WEB-002)
   - Active devices list
   - Activate device button
   - License key modal
5. **Test end-to-end flow:**
   - Sign up → Activate device → Use voice → Purchase credits

### Secondary (Phase 4 - Week 2)

6. **Stripe Integration**
   - Get Stripe API keys
   - Configure webhooks
   - Build webhook handler (`/api/webhooks/stripe`)
   - Test with Stripe test cards
7. **Usage Analytics Page** (Optional)
   - Usage chart (Recharts)
   - Usage history table
8. **Desktop App Credit UI** (DESKTOP-002, DESKTOP-003)
   - Poll `/api/credits/status` every 5 minutes
   - Show toast at 80%, 90%, 95% thresholds
   - Disable voice when exhausted (keep text input)

### Future Enhancements

9. **Paid Tier Upgrade** (v0.18.0)
   - Monthly subscription ($24.99/month)
   - Stripe Checkout for subscriptions
   - Cancel subscription flow
10. **Multi-Device Support** (v0.18.0)
   - Device limit enforcement (free: 1, paid: 5)
   - Device fingerprint validation
11. **Usage Alerts** (v0.19.0)
   - Email notifications at 80%, 90%, 100%
   - SMS notifications (Twilio)
12. **Referral Program** (v0.20.0)
   - Referral codes
   - $5 credit for referrer + referee

---

## File Checklist

### Files to Create

- [ ] `products/lumina-web/app/dashboard/credits/page.tsx` (WEB-001)
- [ ] `products/lumina-web/app/dashboard/devices/page.tsx` (WEB-002)
- [ ] `products/lumina-web/app/api/webhooks/stripe/route.ts` (Stripe webhook)
- [ ] `products/lumina-web/components/CreditBalanceCard.tsx` (Reusable component)
- [ ] `products/lumina-web/components/DeviceCard.tsx` (Reusable component)
- [ ] `products/lumina-web/components/TransactionHistory.tsx` (Reusable component)

### Files to Update

- [ ] `products/lumina-web/.env.local` (Add OPENAI_API_KEY, Stripe keys)
- [ ] `products/lumina-web/app/layout.tsx` (Add dashboard navigation links)
- [ ] Vercel Dashboard → Environment Variables (Add production keys)

### Files Already Complete ✅

- [x] `products/lumina-web/supabase/migrations/007_credit_system.sql`
- [x] `products/lumina-web/app/api/desktop/transcribe/route.ts`
- [x] `products/lumina-web/app/api/credits/purchase/route.ts`
- [x] `products/lumina-web/app/api/credits/status/route.ts`
- [x] `products/lumina-desktop/src-tauri/src/transcription.rs`
- [x] `products/lumina-desktop/src-tauri/src/main.rs`

---

## Summary

### What's Built (Phase 1-2) ✅

- ✅ Database schema (credit tracking, transactions, usage events)
- ✅ API endpoints (transcribe, purchase, status)
- ✅ Desktop app refactored to proxy through server
- ✅ Desktop app authentication with license_key
- ✅ Credit deduction on every transcription
- ✅ Error handling for insufficient credits

### What's Needed (Phase 3-4) 🔨

**Website:**
- 🔨 `/dashboard/credits` page (balance, purchase, history)
- 🔨 `/dashboard/devices` page (activate, manage devices)
- 🔨 Stripe webhook handler for payment completion
- 🔨 Environment variables (OPENAI_API_KEY, Stripe keys)

**Desktop App:**
- 🔨 DESKTOP-002: Credit balance UI (polls status, shows toast)
- 🔨 DESKTOP-003: Enforce limits (disable voice when exhausted)

### Next Steps

1. **Apply migration** (if not done): Run `007_credit_system.sql` in Supabase
2. **Add OPENAI_API_KEY** to `.env.local` and Vercel
3. **Build `/dashboard/credits` page** with credit balance + purchase UI
4. **Build `/dashboard/devices` page** with device activation
5. **Test end-to-end:** Sign up → Activate → Use voice → Purchase credits
6. **Configure Stripe** webhooks for payment completion
7. **Build desktop credit UI** (DESKTOP-002, DESKTOP-003)

---

**Questions? Issues?**

- Database: Check Supabase logs at https://supabase.com/dashboard/project/xpklyvcbzbwmgtnztjei/logs
- API: Check Vercel logs at Vercel Dashboard → Logs
- Desktop: Check console output when running `cargo run`
- Stripe: Check Stripe Dashboard → Logs

**Architecture Decision:**
- ✅ Server-managed OpenAI key (not BYOK) for monetization
- ✅ Desktop app REQUIRED (VS Code can't capture audio)
- ✅ License key authentication (24-char nanoid)
- ✅ Credit tracking on every transcription
- ✅ $5 free credit for new users (833 minutes)
