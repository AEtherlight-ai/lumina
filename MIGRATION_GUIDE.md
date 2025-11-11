# Migration Guide: v0.16.x → v0.17.0

**ÆtherLight Key Authorization & Monetization**

---

## 🎯 What's Changing

### BYOK Model Removed
- **Before (v0.16.x):** Users provided their own OpenAI API keys (Bring Your Own Key)
- **After (v0.17.0):** All transcription goes through ÆtherLight servers (server-managed keys)

### Why the Change?

#### ✅ Simpler Setup
- **No OpenAI account needed** - Sign up once at aetherlight.dev
- **No API key configuration** - Just enter your license key and go
- **Works immediately** - No troubleshooting API key issues

#### ✅ Better Security
- **No API keys in config files** - License key only (no sensitive OpenAI credentials)
- **Centralized key management** - Server rotates keys without user intervention
- **No accidental exposure** - Can't commit API keys to git

#### ✅ Usage Tracking & Limits
- **Fair pricing model** - Pay for what you use (375 tokens/minute)
- **Free tier** - 250,000 tokens (~666 minutes one-time)
- **Transparent billing** - See exact token balance in desktop app

---

## 📊 New Pricing Model

### Free Tier
- **250,000 tokens** (~666 minutes) one-time
- No credit card required
- Perfect for trying ÆtherLight

### Pro Tier ($29.99/month)
- **1,000,000 tokens/month** (~2,666 minutes)
- Automatic monthly refresh
- Priority support

### Token Purchase ($24.99 one-time)
- **1,000,000 tokens** (never expires)
- No monthly commitment
- Great for occasional users

**Conversion:** 375 tokens = 1 minute of transcription

---

## 🚀 How to Upgrade

### Step 1: Update Extension & Desktop App
```bash
# VS Code Marketplace will auto-update extension to v0.17.0
# Download desktop app v0.17.0 from GitHub releases
```

### Step 2: Sign Up for ÆtherLight Account
Visit: https://aetherlight.dev/signup

- Create account with email/password
- No credit card required for free tier
- Verify email to activate account

### Step 3: Get Your License Key
1. Log in at https://aetherlight.dev/dashboard
2. Copy your license key (format: `XXXX-XXXX-XXXX-XXXX`)
3. Keep this key secure (treat like a password)

### Step 4: Activate Desktop App
1. Launch desktop app v0.17.0
2. Installation wizard will show "Activate Your Device" (Step 3)
3. Paste license key into input field
4. Click "Validate License Key"
5. ✅ Success! Desktop app is now activated

### Step 5: Start Recording
- Press hotkey (Shift+~ or `)
- Desktop app sends audio to server
- Server transcribes using OpenAI Whisper
- Tokens deducted automatically
- Transcription typed at cursor position

**That's it!** No OpenAI account, no API key configuration needed.

---

## ❓ FAQ

### Q: Can I still use my own OpenAI API key?
**A:** No, v0.17.0 removes BYOK support entirely. All users now use server-managed keys for consistent experience and pricing.

### Q: What happens to my old API key setting?
**A:** The setting is deprecated but won't cause errors. Extension ignores it. You can safely remove it from VS Code settings.

### Q: I have 1000 minutes left on my OpenAI prepaid credits. What now?
**A:** You can continue using v0.16.x until you're ready to upgrade. OpenAI credits won't transfer to ÆtherLight (different billing systems).

### Q: How do I check my token balance?
**A:** Desktop app shows balance in bottom-right corner (e.g., "250,000 tokens | Free"). Updates in real-time after each transcription.

### Q: What if I run out of tokens?
**A:** Desktop app will show "Insufficient Tokens" modal with two options:
1. **Buy Tokens** - $24.99 for 1M tokens (never expires)
2. **Upgrade to Pro** - $29.99/month for 1M tokens/month

### Q: Do tokens expire?
- **Free tier:** Never expires
- **Token purchase:** Never expires
- **Pro tier:** 1M tokens refresh on 1st of each month (unused tokens do NOT roll over)

### Q: Can I use both extension and desktop app with one license key?
**A:** Yes! License key works across all your devices. Sign in to dashboard, copy key, activate each device.

### Q: What if I have multiple computers?
**A:** Use the same license key on all devices. Token balance is shared across all devices (deducted from central account).

### Q: Is there a usage cap?
- **Free tier:** 250,000 tokens total
- **Pro tier:** 1,000,000 tokens/month (hard cap, resets monthly)
- **Token purchase:** No cap (use at your own pace)

### Q: What happens if I exceed Pro tier monthly limit?
**A:** Desktop app disables voice capture button. Text input still works. Options:
1. Wait for monthly reset (1st of next month)
2. Purchase additional tokens ($24.99 for 1M tokens)

### Q: Can I downgrade from Pro to Free?
**A:** Yes. Cancel subscription in dashboard. Current month's tokens remain until end of billing cycle. After that, you're on free tier.

### Q: Are there warnings before I run out?
**A:** Yes! Desktop app shows toast notifications at:
- 80% used (yellow warning)
- 90% used (orange warning)
- 95% used (red critical warning)

### Q: How accurate is the token usage estimation?
**A:** Very accurate. Server estimates tokens from audio duration:
- 1 minute audio = 375 tokens (exact)
- Pre-flight check blocks recording if insufficient tokens
- Server-side validation prevents overuse

---

## 🔧 Troubleshooting

### Issue: "Invalid license key" error
**Solution:**
1. Copy license key from https://aetherlight.dev/dashboard
2. Ensure no spaces before/after key
3. Format must be: `XXXX-XXXX-XXXX-XXXX` (4 groups of 4 characters)

### Issue: Desktop app doesn't show license key step
**Solution:** Reinstall desktop app v0.17.0. Installation wizard must show 6 steps (Step 3 = Activate Your Device).

### Issue: Balance shows 0 tokens but I just signed up
**Solution:**
1. Log out of dashboard
2. Log back in
3. Check balance again (should show 250,000 tokens)
4. If still 0, contact support

### Issue: Extension says "Desktop app not connected"
**Solution:**
1. Launch desktop app
2. Check status in bottom-right (should say "Connected")
3. If not connected, restart both extension and desktop app

### Issue: Transcription takes longer than before
**Solution:** Expected. v0.17.0 adds network hop (Desktop → Server → OpenAI). Typical latency: 2-5 seconds (was 1-3 seconds in v0.16.x with direct OpenAI).

---

## 📝 What Changed (Technical Details)

### Extension (vscode-lumina)
- ❌ Removed: `transcribeAudioWithWhisper()` function
- ❌ Removed: Direct OpenAI API calls
- ❌ Removed: `api.openai.com` from CSP header
- ✅ Deprecated: `aetherlight.openaiApiKey` setting
- ✅ Deprecated: `aetherlight.terminal.voice.autoTranscribe` setting
- ✅ Deprecated: OpenAI model settings

### Desktop App (lumina-desktop)
- ✅ Added: Server API integration (`POST /api/desktop/transcribe`)
- ✅ Added: Token balance display (bottom-right widget)
- ✅ Added: Pre-flight token checks (blocks recording if < 375 tokens)
- ✅ Added: License key activation wizard (Step 3)
- ✅ Added: Insufficient tokens modal with upgrade CTA
- ✅ Added: Warning toasts at 80%, 90%, 95% usage
- ✅ Changed: Whisper calls now proxied through server API

### API (aetherlight-aelors-projects.vercel.app)
- ✅ Added: `GET /api/tokens/balance` - Check balance
- ✅ Added: `POST /api/desktop/transcribe` - Server-proxied transcription
- ✅ Added: `POST /api/tokens/consume` - Manual token deduction
- ✅ Added: `POST /api/stripe/create-checkout` - Payment integration
- ✅ Added: `POST /api/webhooks/stripe` - Stripe fulfillment
- ✅ Added: `POST /api/cron/refresh-tokens` - Monthly refresh automation

---

## 🎉 Benefits of Upgrading

### For Individual Users
- ✅ No more OpenAI account setup (simplest onboarding)
- ✅ No API key management headaches
- ✅ Free tier is generous (666 minutes one-time)
- ✅ Clear pricing (know exactly what you'll pay)
- ✅ Real-time balance visibility

### For Teams
- ✅ Centralized billing (team admin pays, members use)
- ✅ Usage tracking per team member
- ✅ No individual OpenAI accounts needed
- ✅ Predictable monthly costs ($29.99/member/month)

### For Developers
- ✅ Server handles API key rotation (zero downtime)
- ✅ Better error messages (402 errors with exact token shortfall)
- ✅ Webhooks for usage events (integrate with your own tools)
- ✅ API documentation: https://aetherlight.dev/docs/api

---

## 📞 Support

**Need help migrating?**
- Documentation: https://aetherlight.dev/docs
- Discord: https://discord.gg/aetherlight
- Email: support@aetherlight.dev
- GitHub Issues: https://github.com/aetherlight/lumina/issues

**Found a bug?**
- Report at: https://github.com/aetherlight/lumina/issues
- Include: Extension version, desktop version, license key (first 4 chars only)

---

**Last Updated:** 2025-11-11
**Applies to:** v0.17.0 (Sprint 4: Key Authorization & Monetization)
