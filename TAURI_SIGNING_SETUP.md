# Tauri Signing Key Setup Instructions

**Purpose:** Generate signing keys for Lumina desktop app to enable auto-updates and remove Windows SmartScreen warnings.

---

## Step 1: Generate the Signing Key

Open **PowerShell** or **Command Prompt** and run:

```powershell
cd "C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean\products\lumina-desktop"
npm run tauri -- signer generate -w "%USERPROFILE%\.tauri\lumina.key"
```

**When prompted for password:** Press `Enter` twice (empty password for automated builds)

---

## Step 2: Copy the Public Key

The command will output:

```
Your keypair was generated successfully
Private: C:\Users\Brett\.tauri\lumina.key (Keep this private!)
Public: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IABCD...
```

**COPY THE ENTIRE PUBLIC KEY STRING** (starts with `dW50cnVzdGVk...`)

Paste it into a new file here:
```
C:\Users\Brett\Dropbox\Ferret9 Global\lumina-clean\TAURI_PUBLIC_KEY.txt
```

---

## Step 3: Set Environment Variable (Permanent)

**Option A - System Environment Variable (Recommended):**

1. Press `Win + R`, type `sysdm.cpl`, press Enter
2. Go to "Advanced" tab → "Environment Variables"
3. Under "User variables", click "New"
4. Variable name: `TAURI_SIGNING_PRIVATE_KEY`
5. Variable value: Copy the entire contents of `C:\Users\Brett\.tauri\lumina.key`
6. Click OK, OK, OK

**Option B - PowerShell (Session only):**

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$env:USERPROFILE\.tauri\lumina.key" -Raw
```

---

## Step 4: Tell Claude the Public Key

Once you have the public key saved in `TAURI_PUBLIC_KEY.txt`, tell Claude:

**"Public key saved, ready to continue"**

Claude will:
1. Update `tauri.conf.json` with your public key
2. Rebuild the desktop app with signing
3. Update the GitHub release with signed binaries

---

## Files Generated

- **Private key:** `C:\Users\Brett\.tauri\lumina.key` (DO NOT COMMIT TO GIT!)
- **Public key:** Save to `TAURI_PUBLIC_KEY.txt` (safe to commit)

---

## Important Notes

- ⚠️ **Keep private key secret!** Don't commit it to git
- ✅ Public key is safe to commit to tauri.conf.json
- 🔄 Set environment variable permanently for automated builds
- 📦 v0.17.5 is already published (API fix deployed), signing is for v0.17.6+
