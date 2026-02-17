# Security Checklist for Release

Before building and submitting the APK, verify all security requirements are met.

## Pre-Build Security

### Environment Configuration
- [ ] `.env` file does NOT contain localhost URLs
- [ ] `.env` uses `wss://` (secure WebSocket) not `ws://`
- [ ] No hardcoded API keys or secrets in code
- [ ] All sensitive values use environment variables

### Code Security
- [ ] No `console.log` with sensitive data (tokens, private keys, passwords)
- [ ] No commented-out credentials or API keys
- [ ] No test accounts with real credentials
- [ ] No debug flags enabled in production code

### Keystore Security
- [ ] `gradle.properties` is NOT committed to git
- [ ] `*.keystore` files are NOT committed to git
- [ ] Keystore passwords saved in password manager (not in code)
- [ ] Keystore file backed up to secure location (encrypted USB, password manager)
- [ ] Only ONE keystore per app (don't generate multiple)

### Dependency Security
- [ ] Run `npm audit` and fix high/critical vulnerabilities
- [ ] No deprecated packages with security warnings
- [ ] All dependencies from trusted sources (npm, not random repos)

### Wallet Integration Security
- [ ] App NEVER asks for private keys or seed phrases
- [ ] Wallet connection uses official Solana Mobile SDK
- [ ] No custom wallet adapter code (use @solana-mobile libraries)
- [ ] Transaction signing requests show clear details to user

## Build Security

### APK Configuration
- [ ] ProGuard/R8 enabled for release builds (`minifyEnabled = true`)
- [ ] Resource shrinking enabled (`shrinkResources = true`)
- [ ] Signing config uses release keystore (not debug)
- [ ] Version code incremented from previous release

### Permissions
- [ ] Only necessary permissions in `AndroidManifest.xml`
- [ ] No dangerous permissions without justification
- [ ] Permissions explained in Privacy Policy

### Network Security
- [ ] All HTTP requests use HTTPS (no plaintext)
- [ ] Certificate pinning considered (optional for v1.0)
- [ ] No self-signed SSL certificates in production

## Post-Build Security

### APK Verification
```bash
# Check APK signature
jarsigner -verify -verbose -certs app-release.apk

# Should show "jar verified"

# Check for debug builds (should be empty)
unzip -l app-release.apk | grep debug

# Verify no sensitive files included
unzip -l app-release.apk | grep -E '\.(env|key|pem|keystore)'
```

### Runtime Security
- [ ] Test app on physical device (not just emulator)
- [ ] Verify wallet connections work correctly
- [ ] Test app behavior when wallet denies transaction
- [ ] Check error messages don't leak sensitive info
- [ ] Verify logout clears auth tokens

### Data Security
- [ ] User passwords hashed with bcrypt (server-side)
- [ ] JWT tokens have reasonable expiry (7 days max)
- [ ] No sensitive data stored in AsyncStorage unencrypted
- [ ] Game state doesn't expose other players' hands

## Submission Security

### Solana dApp Store
- [ ] APK signed with correct keystore
- [ ] Privacy policy URL provided
- [ ] App description doesn't make false claims
- [ ] Screenshots don't show fake balances or rewards
- [ ] Compliance checkbox checked honestly

### Documentation
- [ ] Privacy Policy accurate and complete
- [ ] Privacy Policy URL accessible (GitHub, website)
- [ ] Contact email for security reports provided
- [ ] Data retention policy clearly stated

## User Safety

### Onboarding
- [ ] Clear warning: "Never share private keys"
- [ ] Tutorial explains wallet connection safely
- [ ] First-time users see privacy policy link
- [ ] Email signup has strong password requirements

### Gameplay
- [ ] Server validates all moves (no client-side trust)
- [ ] Anti-cheat measures in place
- [ ] Rate limiting prevents abuse
- [ ] Timeouts prevent indefinite waits

### Blockchain Interactions
- [ ] Transaction amounts clearly shown
- [ ] User approves all transactions explicitly
- [ ] Failed transactions handled gracefully
- [ ] No automatic transactions without consent

## Incident Response Plan

### If Private Key Leaked
1. **DO NOT PANIC** - Private keys are never stored in app!
2. If a test wallet key was exposed:
   - Rotate the key immediately
   - Alert users to update
   - Review code for leaks

### If Server Compromised
1. Take server offline immediately
2. Notify users via in-app message
3. Reset all JWT tokens
4. Force re-authentication
5. Investigate breach
6. Restore from backup after fix

### If APK Signing Key Lost
1. **PREVENTION IS CRITICAL** - Backup keystore NOW!
2. If lost, you cannot update the app on dApp Store
3. Would need to publish new app with different package name
4. Users would lose existing data

## Regular Security Maintenance

### Weekly
- [ ] Review crash reports for security issues
- [ ] Monitor server logs for suspicious activity
- [ ] Check for new CVEs in dependencies

### Monthly
- [ ] Run `npm audit` and update packages
- [ ] Review user feedback for security concerns
- [ ] Test wallet integration with latest Phantom/Seeker versions

### Before Each Release
- [ ] Complete this entire checklist
- [ ] Have second person review (if team)
- [ ] Test on clean device (factory reset or new device)

## Red Flags to NEVER Ignore

🚨 **STOP RELEASE if ANY of these are true:**
- Private keys or seed phrases in code
- API secrets hardcoded
- Debug keystore used for release
- HTTP (not HTTPS) in production
- User data transmitted unencrypted
- Password stored in plaintext
- SQL injection vulnerability
- XSS vulnerability in user-generated content

## Security Contact

Report security issues to:
- **Email:** security@bataktournament.com
- **Bug Bounty:** (Optional - announce if you have one)
- **Response Time:** <24 hours for critical issues

## Legal Requirements

### GDPR (if serving EU users)
- [ ] Privacy policy compliant
- [ ] Data deletion process documented
- [ ] User consent for data collection
- [ ] Data breach notification plan

### CCPA (if serving California users)
- [ ] "Do Not Sell My Info" option (if applicable)
- [ ] Data access request process
- [ ] Privacy policy meets CCPA standards

### Solana dApp Store Policies
- [ ] No malware or spyware
- [ ] No illegal content
- [ ] No scams or fraud
- [ ] No impersonation of other apps

## Final Security Sign-Off

Before submitting:

**I certify that:**
- [ ] All items in this checklist are complete
- [ ] No known security vulnerabilities exist
- [ ] Privacy policy is accurate and accessible
- [ ] App does not request private keys or seed phrases
- [ ] All user data is handled securely
- [ ] Emergency contact information is current

**Signed:** _______________________
**Date:** _______________________

---

**Remember:** Security is not a one-time checklist. It's an ongoing process.

**When in doubt, ASK before releasing!**

Contact Solana Mobile team in Discord if you have security questions: https://discord.gg/solanamobile
