# Website API Requirements for Desktop App Integration

**Date:** 2025-11-09
**Purpose:** Deploy API endpoint for desktop app to call
**Sprint:** ACTIVE_SPRINT_KEY_AUTHORIZATION (task API-001)

---

## Quick Status Check

**Paste this prompt into the website repo Claude terminal:**

```
Check deployment status:

1. Does /api/desktop/transcribe endpoint exist?
   File: products/lumina-web/app/api/desktop/transcribe/route.ts

2. Is migration 007_credit_system.sql applied?
   Table: profiles
   Column: credits_balance_usd DECIMAL(10,2)

3. Is OPENAI_API_KEY set in Vercel?
   Dashboard: https://vercel.com/[your-project]/settings/environment-variables

4. Test with:
   curl -X POST https://aetherlight.ai/api/desktop/transcribe \
     -H "Authorization: Bearer 131fbfaf-5399-48f1-95c6-3ec0ce2b6942" \
     -F "file=@test.wav"

Response format:
✅/❌ for each item
If ❌, provide task list to implement
```

---

## What Desktop App Expects

### Endpoint: POST /api/desktop/transcribe

**URL:** `https://aetherlight.ai/api/desktop/transcribe`

**Request:**
```http
POST /api/desktop/transcribe HTTP/1.1
Host: aetherlight.ai
Authorization: Bearer {license_key}
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="audio.wav"
Content-Type: audio/wav

[binary WAV data]
--boundary
Content-Disposition: form-data; name="model"

whisper-1
--boundary
Content-Disposition: form-data; name="language"

en
--boundary--
```

**Success Response (200):**
```json
{
  "success": true,
  "text": "This is the transcribed text from the audio.",
  "cost_usd": 0.03,
  "balance_remaining_usd": 4.97,
  "duration_seconds": 300,
  "transaction_id": "uuid-here"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "error": "Invalid license key"
}
```

**402 Payment Required:**
```json
{
  "error": "Insufficient credits",
  "balance_usd": 0.02,
  "required_usd": 0.05,
  "message": "You need $0.0500 but only have $0.02. Please add credits to continue."
}
```

**403 Forbidden:**
```json
{
  "error": "Device is not active"
}
```

**400 Bad Request:**
```json
{
  "error": "Audio file too large. Max size: 25 MB. Received: 30.5 MB"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "OpenAI API timeout"
}
```

---

## Implementation Requirements

### 1. Database Schema (Migration 007)

**Table: profiles**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_balance_usd DECIMAL(10, 2) DEFAULT 5.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_usage_minutes INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_usage_reset_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;
```

**Table: credit_transactions**
```sql
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_usd DECIMAL(10, 4) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('usage', 'purchase', 'refund', 'bonus')),
  description TEXT,
  balance_after_usd DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
```

### 2. API Route Implementation

**File:** `products/lumina-web/app/api/desktop/transcribe/route.ts`

**Pseudocode:**
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Extract license_key from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
  }
  const license_key = authHeader.substring(7);

  // 2. Validate license_key and get user_id
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('user_id, is_active')
    .eq('license_key', license_key)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 401 });
  }

  if (!device.is_active) {
    return NextResponse.json({ error: 'Device is not active' }, { status: 403 });
  }

  // 3. Get user's credit balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits_balance_usd')
    .eq('id', device.user_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 4. Parse audio file from FormData
  const formData = await request.formData();
  const audioFile = formData.get('file') as File;

  if (!audioFile) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
  }

  if (audioFile.size > 25 * 1024 * 1024) { // 25 MB limit
    return NextResponse.json({
      error: `Audio file too large. Max size: 25 MB. Received: ${(audioFile.size / 1024 / 1024).toFixed(1)} MB`
    }, { status: 400 });
  }

  // 5. Estimate cost (OpenAI Whisper: $0.006 per minute)
  const estimatedDurationSeconds = audioFile.size / 16000; // Rough estimate: 16KB per second
  const estimatedCostUsd = (estimatedDurationSeconds / 60) * 0.006;

  // 6. Check if user has enough credits
  if (profile.credits_balance_usd < estimatedCostUsd) {
    return NextResponse.json({
      error: 'Insufficient credits',
      balance_usd: profile.credits_balance_usd,
      required_usd: estimatedCostUsd,
      message: `You need $${estimatedCostUsd.toFixed(4)} but only have $${profile.credits_balance_usd.toFixed(2)}. Please add credits to continue.`
    }, { status: 402 });
  }

  // 7. Call OpenAI Whisper API
  try {
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile);
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('language', formData.get('language') || 'en');

    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json({
        error: 'Transcription failed',
        details: 'OpenAI API error'
      }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const transcriptText = openaiResult.text;

    // 8. Calculate actual cost (based on OpenAI's duration)
    const actualDurationSeconds = openaiResult.duration || estimatedDurationSeconds;
    const actualCostUsd = (actualDurationSeconds / 60) * 0.006;

    // 9. Deduct credits from user balance
    const newBalance = profile.credits_balance_usd - actualCostUsd;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_balance_usd: newBalance })
      .eq('id', device.user_id);

    if (updateError) {
      console.error('Failed to update balance:', updateError);
      // Continue anyway - we'll log the transaction
    }

    // 10. Log credit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: device.user_id,
        amount_usd: -actualCostUsd,
        transaction_type: 'usage',
        description: `Voice transcription (${Math.round(actualDurationSeconds)}s)`,
        balance_after_usd: newBalance,
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('Failed to log transaction:', transactionError);
    }

    // 11. Log usage event (optional)
    await supabase.from('usage_events').insert({
      user_id: device.user_id,
      event_type: 'voice_capture',
      duration_seconds: Math.round(actualDurationSeconds),
      cost_usd: actualCostUsd,
    });

    // 12. Return success response
    return NextResponse.json({
      success: true,
      text: transcriptText,
      cost_usd: parseFloat(actualCostUsd.toFixed(4)),
      balance_remaining_usd: parseFloat(newBalance.toFixed(2)),
      duration_seconds: Math.round(actualDurationSeconds),
      transaction_id: transaction?.id || null,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 3. Environment Variables

**Vercel Dashboard:** Settings → Environment Variables

```
OPENAI_API_KEY=sk-proj-... (your OpenAI API key)
```

**Also needed (should already exist):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xpklyvcbzbwmgtnztjei.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Testing Checklist

### 1. Test License Validation

```bash
# Should return 401
curl -X POST https://aetherlight.ai/api/desktop/transcribe \
  -H "Authorization: Bearer invalid-key" \
  -F "file=@test.wav"
```

### 2. Test Credit Check

```bash
# Manually set balance to $0 in Supabase
# Should return 402
curl -X POST https://aetherlight.ai/api/desktop/transcribe \
  -H "Authorization: Bearer 131fbfaf-5399-48f1-95c6-3ec0ce2b6942" \
  -F "file=@test.wav"
```

### 3. Test Success Case

```bash
# Should return 200 with transcript
curl -X POST https://aetherlight.ai/api/desktop/transcribe \
  -H "Authorization: Bearer 131fbfaf-5399-48f1-95c6-3ec0ce2b6942" \
  -F "file=@test.wav"
```

Expected response:
```json
{
  "success": true,
  "text": "This is a test transcription.",
  "cost_usd": 0.0006,
  "balance_remaining_usd": 4.9694,
  "duration_seconds": 6,
  "transaction_id": "uuid-here"
}
```

### 4. Verify Database Changes

After successful transcription:

```sql
-- Check balance was deducted
SELECT credits_balance_usd FROM profiles WHERE id = 'user-id-here';

-- Check transaction was logged
SELECT * FROM credit_transactions WHERE user_id = 'user-id-here' ORDER BY created_at DESC LIMIT 1;

-- Check usage was logged
SELECT * FROM usage_events WHERE user_id = 'user-id-here' ORDER BY created_at DESC LIMIT 1;
```

---

## Performance Optimization (Optional)

### 1. Deploy as Vercel Edge Function

```typescript
// Add to top of route.ts
export const runtime = 'edge';
```

**Benefits:**
- Deploys to 100+ locations worldwide
- Reduces latency by ~100-200ms
- Faster cold starts

### 2. License Key Caching

```typescript
import { unstable_cache } from 'next/cache';

const getCachedDevice = unstable_cache(
  async (license_key: string) => {
    const supabase = await createClient();
    return supabase.from('devices').select('*').eq('license_key', license_key).single();
  },
  ['device-cache'],
  { revalidate: 60 } // Cache for 60 seconds
);
```

**Benefits:**
- Reduces database queries
- Saves ~50ms per request

### 3. Async Usage Logging

```typescript
// Don't await these (fire and forget)
supabase.from('usage_events').insert({ ... }); // No await
supabase.from('credit_transactions').insert({ ... }); // No await

// Return response immediately
return NextResponse.json({ ... });
```

**Benefits:**
- Saves ~100-150ms
- User gets response faster

---

## Test User Credentials

**Email:** bb@adhubaudience.com
**License Key:** `131fbfaf-5399-48f1-95c6-3ec0ce2b6942`
**User ID:** `c7ee7caf-5478-4a03-84c1-9cefbd76af25`
**Balance:** $4.97

---

## Deployment Steps

1. **Apply migration 007**
   ```bash
   supabase migration up
   ```

2. **Set OPENAI_API_KEY in Vercel**
   - Go to Vercel dashboard
   - Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your key

3. **Deploy endpoint**
   ```bash
   git add products/lumina-web/app/api/desktop/transcribe/route.ts
   git commit -m "feat(API-001): Add desktop transcription endpoint"
   git push
   ```
   Vercel auto-deploys on push to main

4. **Test endpoint**
   ```bash
   curl -X POST https://aetherlight.ai/api/desktop/transcribe \
     -H "Authorization: Bearer 131fbfaf-5399-48f1-95c6-3ec0ce2b6942" \
     -F "file=@test.wav"
   ```

5. **Verify desktop app works**
   - Open desktop app
   - Configure license key in settings
   - Press backtick
   - Speak
   - Check transcription appears

---

## Success Criteria

- [ ] Endpoint returns 200 with valid license
- [ ] Endpoint returns 401 with invalid license
- [ ] Endpoint returns 402 with insufficient credits
- [ ] Balance is deducted after transcription
- [ ] Transaction is logged in credit_transactions table
- [ ] Usage is logged in usage_events table
- [ ] Desktop app receives transcript and types at cursor
- [ ] Processing indicator shows in desktop app during transcription
- [ ] Latency < 5 seconds (target: 3-4 seconds)

---

**Ready to deploy? Use the status check prompt at the top to verify current state!**
