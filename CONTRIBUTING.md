# Contributing to Agent Factory UI

Thanks for your interest in contributing! Agent Factory UI is the web client for [Agent Factory](https://github.com/Ursa-Minor-Beta/agent-factory), built with React, TypeScript, and Mantine UI. This guide explains how to report bugs, suggest features, and submit pull requests.

> **Heads up:** the project is under active development and breaking changes can happen. For larger changes, please open an issue to discuss first.

## Ways to contribute

- **Report bugs** by opening an issue
- **Suggest features** or improvements
- **Improve documentation** (README, component docs, examples)
- **Fix bugs or add features** via pull requests


## Claiming an issue

Before starting work on an issue, comment on it to let others know you're taking it. This avoids duplicate effort. If you don't see activity on your comment within a few days, feel free to start working. For larger changes, wait for a maintainer to confirm the approach before investing significant time.

## Related repositories

- [agent-factory](https://github.com/Ursa-Minor-Beta/agent-factory): the backend API. API issues and PRs belong there.
- [agent-factory-docker-api-ui](https://github.com/Ursa-Minor-Beta/agent-factory-docker-api-ui): one-shot Docker deployment of API + UI.

## Reporting bugs

Search existing issues first to avoid duplicates. A good bug report includes:

- What you expected and what actually happened
- Steps to reproduce (browser, screen size, and user actions help a lot)
- Your environment: OS, browser and version, Node.js version
- Screenshots or screen recordings for UI issues
- Console errors or network request failures

**Security vulnerabilities:** do not open a public issue. Follow [SECURITY.md](SECURITY.md) and report privately.

## Suggesting features

Open an issue describing the problem you want to solve and your proposed approach. Mention which part of the UI it touches (pages, components, routing, API integration, etc.).

## Development setup

**Prerequisites:** Node.js and npm, plus a running [Agent Factory](https://github.com/Ursa-Minor-Beta/agent-factory) backend.

1. **Fork** the repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agent-factory-ui.git
   cd agent-factory-ui
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/Ursa-Minor-Beta/agent-factory-ui.git
   ```
4. **Install dependencies:**
   ```bash
   npm install
   ```
5. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set VITE_API_URL to your backend API
   ```
6. **Start development server:**
   ```bash
   npm run dev
   ```

## Making changes

1. Sync with upstream and create a branch from `master`:
   ```bash
   git fetch upstream
   git checkout -b my-change upstream/master
   ```
2. Make your changes. Keep each pull request focused on one logical change.
3. Before pushing, make sure the project lints and builds cleanly:
   ```bash
   npm run lint
   npm run build
   ```
4. Test your changes in the browser at different screen sizes (desktop and mobile).
5. Update the README if you change behavior or add new features.

## Code guidelines

- The project is written in **TypeScript** with **React 19**.
- Use **Mantine UI** components and follow the existing component patterns.
- Use **Tabler Icons** (`@tabler/icons-react`) for icons.
- Follow the architecture decisions documented in [CLAUDE.md](CLAUDE.md):
  - Server-side filtering only (no client-side filtering with `useMemo`)
  - Extract modals into separate files
  - Use global modals with URL state for cross-page resource details
  - Prefer optimistic updates over refetching
- Fix all ESLint errors; don't disable rules without a good reason.
- Keep components consistent with the existing dark theme and styling conventions.
- **Security matters.** Be careful with user input, avoid XSS vulnerabilities, and never expose sensitive data in client-side code.
- Don't add dependencies unless necessary, and mention why in the PR.

## Commit messages

- Use the imperative mood: "Add user settings page", not "Added..."
- Keep the first line under 72 characters
- Reference related issues, e.g. `Fixes #123`

## Submitting a pull request

1. Push your branch to your fork:
   ```bash
   git push origin my-change
   ```
2. Open a pull request against the `master` branch of `Ursa-Minor-Beta/agent-factory-ui`.
3. Describe what changed and why, link the related issue, and note how you tested it.
4. Make sure CI checks pass.
5. Respond to review feedback by pushing follow-up commits to the same branch; the PR updates automatically.

**Tips for faster reviews**

- Small, focused PRs get reviewed sooner.
- Explain the "why", not just the "what".
- Include screenshots or screen recordings for UI changes.
- Test on both desktop and mobile viewport sizes.
- Breaking changes to routes or component APIs should be called out clearly in the PR description.

## Review process

A maintainer will review your PR and may request changes or explain why a change doesn't fit the project's direction. Please don't take that personally; it's about keeping the project coherent. Once approved and passing CI, a maintainer will merge it.

## License

Agent Factory UI is licensed under the [Apache License 2.0](LICENSE). By submitting a contribution, you agree that it is licensed under the same terms, as described in Section 5 of the license.

## Questions?

Open an issue or start a discussion in the repository. Thanks for helping improve Agent Factory UI!
