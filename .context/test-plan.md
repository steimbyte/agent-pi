# Authentication System Overhaul

## Overview

Migrate the existing session-based authentication to OAuth 2.0 with support for Google and GitHub providers. This includes a new login flow, token management, and backward-compatible session handling for existing users.

---

## Phase 1: Foundation

- [ ] Set up OAuth 2.0 provider configuration (Google, GitHub)
- [ ] Create `auth/providers/` module with provider abstraction layer
- [ ] Implement JWT token generation and validation service
- [x] Add environment variable schema for client IDs and secrets
- [x] Configure CORS policies for OAuth callback URLs

## Phase 2: Core Implementation

- [ ] Build OAuth login flow — redirect → callback → token exchange
- [ ] Implement refresh token rotation with sliding window expiry
- [ ] Create user profile sync from provider data (name, email, avatar)
- [ ] Add session migration path for existing cookie-based sessions
- [ ] Write middleware for JWT validation on protected routes

## Phase 3: Frontend Integration

- [ ] Design login page with provider buttons (Google, GitHub)
- [ ] Implement PKCE flow for SPA clients
- [ ] Add token storage with secure httpOnly cookie fallback
- [ ] Build "connected accounts" settings panel
- [ ] Handle token refresh transparently in API client

## Phase 4: Security & Testing

- [ ] Add rate limiting on auth endpoints (10 req/min per IP)
- [ ] Implement CSRF protection for OAuth state parameter
- [ ] Write integration tests for full OAuth flow (mock providers)
- [ ] Load test token validation endpoint (target: <5ms p99)
- [ ] Security audit: review token lifetimes, rotation policy, revocation

## Out of Scope

- SAML/SSO enterprise integration (planned for Q3)
- Biometric authentication
- Custom OAuth provider registration by end users

## Technical Notes

> The existing `sessions` table should be preserved during migration. New OAuth sessions will write to both the legacy `sessions` table and the new `oauth_tokens` table for a 30-day transition period.

```typescript
interface OAuthConfig {
  provider: 'google' | 'github';
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
}
```

| Provider | Scopes | Token Lifetime |
|----------|--------|----------------|
| Google | `openid`, `email`, `profile` | 1 hour |
| GitHub | `read:user`, `user:email` | 8 hours |

### Dependencies

- `jose` — JWT signing/verification
- `arctic` — OAuth 2.0 client library
- `oslo` — CSRF and cookie utilities
