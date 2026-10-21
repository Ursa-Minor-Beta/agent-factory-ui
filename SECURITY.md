# Security Policy

> **Please do not report security vulnerabilities through public issues, discussions, or pull requests.**

Thank you for helping keep Agent Factory UI and its users safe.

## Supported versions

Agent Factory UI is under active development and does not yet publish versioned releases. Breaking changes may occur.

| Version                      | Supported |
| ---------------------------- | --------- |
| Latest commit on `master`    | Yes       |
| Older commits, forks, tags   | No        |

Security fixes are applied to `master` only. If you run Agent Factory UI, please keep your deployment up to date. Once tagged releases exist, this table will be updated.

## Reporting a vulnerability

Report them privately using either option:

- **GitHub private vulnerability reporting (preferred):** open the repository's [Security tab](https://github.com/Ursa-Minor-Beta/agent-factory-ui/security) and click **Report a vulnerability**.

Please include as much of the following as you can:

- The type of issue (e.g., XSS, CSRF, authentication bypass, sensitive data exposure)
- The affected component, route, or source file
- The commit hash you tested against
- Step-by-step instructions to reproduce, ideally with a minimal proof of concept
- The impact and how an attacker could exploit it
- Your suggested fix, if you have one

## What to expect

- **Acknowledgment:** within 3 business days.
- **Assessment:** we will confirm the issue, determine severity, and may ask for more details.
- **Fix:** we will work on a fix and keep you updated on progress. Timelines depend on severity and complexity.
- **Disclosure:** once a fix is available, we will publish a GitHub security advisory. We follow coordinated disclosure and ask for up to 90 days before public disclosure.
- **Credit:** with your permission, we will credit you in the advisory.

## Scope

In scope (this repository, `Ursa-Minor-Beta/agent-factory-ui`):

- Authentication flows: login, logout, token refresh handling, protected routes
- Cross-site scripting (XSS) vulnerabilities in React components
- Cross-site request forgery (CSRF) issues
- Sensitive data exposure in client-side code or browser storage
- Insecure handling of API responses or user input
- Authentication state management and session handling
- Redirect vulnerabilities (open redirects after login)

Out of scope:

- Vulnerabilities in third-party dependencies with no impact on Agent Factory UI (report those upstream, but let us know if we're affected)
- Vulnerabilities in the separate [agent-factory](https://github.com/Ursa-Minor-Beta/agent-factory) backend API (please report them in that repository)
- Vulnerabilities in the [agent-factory-docker-api-ui](https://github.com/Ursa-Minor-Beta/agent-factory-docker-api-ui) repository (please report them in that repository)
- Weaknesses that require a deployment that ignores security best practices
- Browser-specific issues that require outdated or unsupported browsers
- Automated scanner output without a demonstrated impact

## Deployment hardening

If you deploy Agent Factory UI:

- Always serve over HTTPS in production.
- Set appropriate Content Security Policy (CSP) headers.
- Configure `VITE_API_URL` to point to your secured backend API.
- Keep dependencies updated and monitor for security advisories.
- Use environment-specific builds (don't expose development configurations in production).

## Good-faith research

We will not pursue legal action against researchers who act in good faith: test only against your own instances, avoid accessing other people's data, avoid degrading service for others, and report findings to us privately and promptly.
