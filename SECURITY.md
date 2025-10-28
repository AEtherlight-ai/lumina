# Security Policy

## Supported Versions

ÆtherLight is currently in **Pre-Beta Development**. We are actively working toward our November 2025 beta release.

| Version | Status | Supported          |
| ------- | ------ | ------------------ |
| 0.1.x   | Pre-Beta | :white_check_mark: |

**Note:** Security updates will be prioritized once we enter beta. During pre-beta, we appreciate all security reports as they help us build a more secure foundation.

---

## Reporting a Vulnerability

**We take security seriously.** If you discover a security vulnerability, please report it responsibly.

### How to Report

**Email:** security@aetherlight.ai

**What to Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity
  - **Critical:** Immediate (within 24-48 hours)
  - **High:** Within 1 week
  - **Medium:** Within 2 weeks
  - **Low:** Next release cycle

### What to Expect

1. **Acknowledgment:** We'll confirm receipt of your report within 48 hours
2. **Investigation:** We'll investigate and assess the vulnerability
3. **Updates:** We'll keep you informed of our progress
4. **Fix:** We'll develop and test a fix
5. **Disclosure:** We'll coordinate disclosure timing with you
6. **Credit:** We'll credit you in our security advisories (unless you prefer to remain anonymous)

---

## Security Best Practices

### For Users

**Local-First Security:**
- ÆtherLight is designed to work offline by default
- Your patterns and data stay on your local machine
- Only opt-in features sync to cloud (your choice)

**API Keys:**
- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Review `.env.example` files for guidance

**Permissions:**
- VS Code extension requires minimal permissions
- Desktop app uses Tauri's security model
- Review requested permissions before installation

### For Contributors

**Code Security:**
- All pull requests are reviewed for security issues
- Follow secure coding practices
- Use dependency scanning tools
- Keep dependencies up to date

**Secrets Management:**
- Never commit credentials, API keys, or tokens
- Use `.gitignore` to exclude sensitive files
- Check `internal/` directory is git-ignored

**Testing:**
- Include security test cases
- Test input validation
- Test authentication/authorization logic

---

## Known Security Considerations

### Pre-Beta Status

**Current State:**
- This is pre-beta software under active development
- Not recommended for production use yet
- Security hardening in progress

**Use Responsibly:**
- Test in isolated environments
- Don't use with sensitive production data
- Report any security concerns immediately

### Architecture

**Local-First Design:**
- Primary security through local-only data storage
- Optional cloud sync requires explicit configuration
- No data leaves your machine without your permission

**Network Security:**
- API communications use HTTPS
- Optional Supabase connections use secure credentials
- Pattern network accessed via authenticated API only

---

## Security Advisories

We will publish security advisories for any confirmed vulnerabilities:
- **GitHub Security Advisories:** https://github.com/AEtherlight-ai/lumina/security/advisories
- **Discord Announcements:** https://discord.gg/ExkyhBny

---

## Disclosure Policy

**Coordinated Disclosure:**
- We follow responsible disclosure practices
- We'll work with you to coordinate public disclosure
- Typical embargo period: 90 days (negotiable)

**Public Disclosure:**
- After fix is released, we'll publish a security advisory
- Credit will be given to the reporter (unless anonymous)
- CVE will be requested for significant vulnerabilities

---

## Bug Bounty Program

**Status:** Not currently available

We're a pre-beta open-source project and don't have a formal bug bounty program yet. However:
- We deeply appreciate security research
- Reporters will be credited in our security hall of fame
- Consider contributing a fix via pull request!

After our beta launch and with funding, we plan to establish a bug bounty program.

---

## Questions?

For general security questions (not vulnerability reports):
- **Discord:** https://discord.gg/ExkyhBny (#security channel)
- **GitHub Discussions:** https://github.com/AEtherlight-ai/lumina/discussions
- **Email:** security@aetherlight.ai

---

**Thank you for helping keep ÆtherLight secure!**
