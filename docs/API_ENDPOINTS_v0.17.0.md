# API Endpoints - Sprint 4 (v0.17.0)

**Status:** ✅ All Deployed and Ready
**Base URL:** https://aetherlight-aelors-projects.vercel.app
**Date:** 2025-11-11

---

## 📡 Token Management API

### 1. Check Token Balance
**Task:** API-001b
**Status:** ✅ Deployed

```http
GET /api/tokens/balance
Authorization: Bearer {license_key}
```

**Response (200):**
```json
{
  "success": true,
  "tokens_balance": 1000000,
  "tokens_used_this_month": 50000,
  "subscription_tier": "pro",
  "minutes_remaining": 2666
}
```

**Errors:**
- `401` - Invalid license key
- `403` - Device not active

**Use Cases:**
- Display balance on app startup
- Pre-flight check before recording (requires 375 tokens = 1 minute)
- Background refresh every 5 minutes
- Real-time balance updates

**Token Calculation:**
- 1 minute = 375 tokens
- minutes_remaining = tokens_balance / 375

---

### 2. Manual Token Consumption
**Task:** API-001c
**Status:** ✅ Deployed (Optional - NOT for transcription)

```http
POST /api/tokens/consume
Authorization: Bearer {license_key}
Content-Type: application/json

{
  "tokens_amount": 1000,
  "description": "Feature usage"
}
```

**Response (200):**
```json
{
  "success": true,
  "tokens_consumed": 1000,
  "tokens_balance": 999000,
  "transaction_id": "uuid-here"
}
```

**⚠️ IMPORTANT:**
- ❌ **DO NOT use for transcription** (transcribe endpoint handles tokens automatically)
- ✅ **DO use for future non-transcription features**

**Errors:**
- `402` - Insufficient tokens

---

## 🎤 Transcription API

### 3. Desktop Transcribe (with Token Deduction)
**Task:** API-001
**Status:** ✅ Deployed

```http
POST /api/desktop/transcribe
Authorization: Bearer {license_key}
Content-Type: multipart/form-data

file: [audio binary WAV/MP3/etc]
model: whisper-1 (optional, defaults to whisper-1)
language: en (optional, defaults to en)
```

**Response (200):**
```json
{
  "success": true,
  "text": "Transcribed text here",
  "tokens_used": 750,
  "tokens_balance": 999250,
  "duration_seconds": 120,
  "transaction_id": "uuid-here"
}
```

**What It Does:**
1. Validates license key
2. Checks token balance (pre-flight)
3. Sends audio to OpenAI Whisper API
4. Deducts tokens automatically
5. Logs transaction
6. Returns transcript + updated balance

**Token Deduction:**
- Calculated: `(duration_seconds / 60) * 375`
- Example: 2-minute audio = 750 tokens

**Errors:**
- `401` - Invalid license key
- `402` - Insufficient tokens
- `403` - Device not active
- `400` - Invalid audio file / too large (max 25MB)
- `500` - OpenAI API error

**Supported Formats:**
wav, mp3, m4a, flac, ogg, opus, webm

---

## 💳 Payment API (Not Yet Implemented)

### 4. Purchase Credits
**Task:** API-002
**Status:** ⬜ Pending (Not deployed yet)

```http
POST /api/credits/purchase
Authorization: Bearer {license_key}
Content-Type: application/json

{
  "amount_usd": 10 | 20,
  "payment_method_id": "pm_..."
}
```

**This will be for:**
- Stripe integration
- One-time token purchases
- Top-up packs

---

## 📊 Pricing Reference

| Tier | Tokens/Month | Price | Minutes Available |
|------|--------------|-------|-------------------|
| Free | 250,000 | $0 | 666 minutes |
| Pro | 1,000,000 | $29.99/mo | 2,666 minutes |
| Token Purchase | 1,000,000 | $24.99 (one-time) | 2,666 minutes (never expires) |

**Token-to-Minute Conversion:**
- 1 minute = 375 tokens
- 1 token = ~0.0027 minutes (~0.16 seconds)

---

## 🔗 Upgrade URLs

**Dashboard:**
```
https://aetherlight-aelors-projects.vercel.app/dashboard
```

**Upgrade to Pro:**
```
https://aetherlight-aelors-projects.vercel.app/dashboard?action=upgrade
```

**Buy Tokens:**
```
https://aetherlight-aelors-projects.vercel.app/dashboard?action=buy-tokens
```

---

## 🧪 Testing

### cURL Examples

**Check Balance:**
```bash
curl -X GET "https://aetherlight-aelors-projects.vercel.app/api/tokens/balance" \
  -H "Authorization: Bearer YOUR-LICENSE-KEY"
```

**Transcribe Audio:**
```bash
curl -X POST "https://aetherlight-aelors-projects.vercel.app/api/desktop/transcribe" \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -F "file=@test.wav" \
  -F "model=whisper-1" \
  -F "language=en"
```

**Consume Tokens (Optional):**
```bash
curl -X POST "https://aetherlight-aelors-projects.vercel.app/api/tokens/consume" \
  -H "Authorization: Bearer YOUR-LICENSE-KEY" \
  -H "Content-Type: application/json" \
  -d '{"tokens_amount": 1000, "description": "Test consumption"}'
```

---

## ⚠️ Important Notes

### For Desktop App Integration:

1. **Use `/api/desktop/transcribe` for transcription:**
   - Handles token deduction automatically
   - Returns updated balance
   - Logs usage events

2. **Do NOT use `/api/tokens/consume` for transcription:**
   - That's for future non-transcription features
   - Transcription endpoint already handles tokens

3. **Pre-flight Check:**
   - Always check balance before recording
   - Minimum required: 375 tokens (1 minute)
   - Show error modal if insufficient

4. **Background Polling:**
   - Refresh balance every 5 minutes
   - Update UI automatically
   - Handle network errors gracefully

5. **Error Handling:**
   - `402` - Show upgrade modal with pricing link
   - `401` - Clear license key, prompt re-auth
   - `500` - Show retry button, don't deduct tokens

---

## 📁 Sprint TOML Reference

**Completed Tasks:**
- ✅ API-001: POST /api/desktop/transcribe
- ✅ API-001b: GET /api/tokens/balance
- ✅ API-001c: POST /api/tokens/consume

**Pending Tasks:**
- ⬜ API-002: POST /api/credits/purchase (Stripe integration)

**See:** `internal/sprints/ACTIVE_SPRINT_KEY_AUTHORIZATION.toml`

---

**Document Version:** v0.17.0
**Last Updated:** 2025-11-11
**Maintained By:** Sprint 4 Key Authorization Team
