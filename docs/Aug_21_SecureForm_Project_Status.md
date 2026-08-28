# SecureForm — Project Status Document

**Type:** Self-hosted, encrypted, single-purpose questionnaire application
**Status:** Complete, deployed, tested, open-sourced, publicly announced
**Duration:** ~4-5 days, spanning architecture design, implementation, deployment, and launch

---

## 1. What this project is

SecureForm is a private, self-hosted questionnaire tool built for exactly two people — one admin and one respondent. It lets the admin author a set of private questions, publish them incrementally, and let the respondent answer at their own pace with autosave — all while guaranteeing that no third party (cloud provider, database vendor, hosting company) ever has access to the plaintext data.

It originated from a personal need — one person wanting to ask another a set of genuinely private questions without trusting any commercial form tool with the content — but was deliberately generalized during development into a reusable, open-source tool for anyone in a similar two-person, high-privacy situation.

It is **not** a general-purpose form builder. It has no accounts, no multi-tenancy, no integrations, and is not intended for non-technical self-deployment. That narrowness is an intentional design choice, not a limitation to be fixed later.

---

## 2. Requirements that shaped the design

The project began from seven explicit constraints:

1. Questions are very private.
2. Nobody other than the admin and the one respondent should ever see questions or answers.
3. Nothing should leak in transit.
4. Not for public/general use — a one-time, personal-scale tool.
5. Privacy and security are the top priority, above convenience or feature breadth.
6. The respondent must be able to answer incrementally — save progress, leave, and resume later — not fill out everything in one sitting.
7. The admin must be able to view all answers at any time.

Every architectural decision in the project traces back to one or more of these constraints.

---

## 3. Architecture — final state

### 3.1 Stack
- **Framework:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Storage:** A single encrypted JSON file (`data.json`) — no database
- **Encryption:** AES-256-GCM for data at rest, scrypt for admin passphrase key derivation, Argon2id for respondent passphrase hashing
- **Sessions:** `iron-session` — encrypted, httpOnly cookies, 2-hour expiry
- **Icons:** `lucide-react`, a curated subset exposed through an admin-configurable picker
- **Hosting:** Self-hosted on personal hardware, exposed publicly via **Tailscale Funnel**

### 3.2 Why no database
At the confirmed scale — one respondent, on the order of 100 questions — a database adds operational and tooling overhead without adding real capability. A flat file, fully re-encrypted on every write, is simpler and equally correct at this scale. This was a deliberate choice after comparing SQLite and a flat encrypted file; SQLite was discarded once the two-person, one-time scope was confirmed.

### 3.3 Why Next.js over Express + React
Originally scoped as Express (backend) + React via Vite (frontend). Switched to Next.js because a single framework handling both frontend and backend API routes removes CORS complexity and reduces the project to one process, one deploy — appropriate for a small, single-purpose, single-maintainer application.

### 3.4 The core security decision: envelope encryption

The most significant architectural decision in the project. The naive design — one shared passphrase for both people — has a real flaw: whoever holds it can decrypt everything in the file, including admin-only content like unpublished draft questions.

The resolution, arrived at collaboratively mid-project when this gap was identified:

- A random **data encryption key (DEK)** is generated once, and is what actually encrypts the file's contents.
- The DEK is wrapped (encrypted) **twice, independently**:
  - Once with a key derived from the **admin's passphrase** (via scrypt) — allows the admin to unwrap the DEK and access everything.
  - Once with a key derived from a **server-only secret** (`SERVER_KEY`, never exposed to either person) — allows the *server* to independently unwrap the DEK to build the respondent's filtered view, without the respondent ever holding a real decryption key.
- The respondent's passphrase is verified separately via **Argon2id hash comparison** — it authenticates identity but never touches decryption. It is an access gate, not a key.

Result: the respondent is structurally prevented from ever seeing unpublished or admin-only content, even with raw file access — not because the UI is polite about it, but because she never possesses a key capable of decrypting the file.

### 3.5 Question and answer schema

Went through several iterations before converging on a merged, per-question structure:

- **Started with:** separate `questions[]` array and `answers{}` map, joined by `questionId`.
- **Converged on:** a single `questions` object, keyed by stable question ID, with each question's own `answer` field embedded directly inside it.

This eliminated the need for manual ID-mapping between two structures, removed the possibility of orphaned answer records, and matched the natural mental model of "this question and its answer are one unit."

Final shape (illustrative):
```json
{
  "meta": {
    "version": 1,
    "adminPassphraseSalt": "...",
    "serverKeySalt": "...",
    "respondentPassphraseHash": "...",
    "adminWrappedDEK": "...",
    "serverWrappedDEK": "...",
    "theme": "light",
    "gradientAngle": null,
    "icons": { "...": "..." }
  },
  "questions": {
    "q_a3f9c21b": {
      "type": "short_text",
      "text": "...",
      "options": null,
      "published": true,
      "order": 1,
      "answer": { "value": "...", "updatedAt": "..." }
    }
  }
}
```

### 3.6 Access model

- **No accounts, no signup, no email-based auth** — each of those introduces third-party dependency or extra attack surface.
- **Two long, random, secret URL tokens** (`ADMIN_TOKEN`, `RESPONDENT_TOKEN`), gating `/admin/<token>` and `/answer/<token>` respectively. Token comparison uses `crypto.timingSafeEqual`, added specifically to prevent timing-based side-channel guessing of the correct token.
- **Two independent passphrases**, chosen at first-run, in-browser setup (no separate CLI step):
  - Admin passphrase — derives the real encryption key; unrecoverable if forgotten, by design.
  - Respondent passphrase — hashed via Argon2id; recoverable, since the admin can reset it through a dedicated, step-up-verified admin action (requires re-entering the admin passphrase before the reset is allowed).
- Link and passphrase are intended to be shared over separate channels, so a leaked link alone is never sufficient for access.

### 3.7 Answer types

Reduced from an initially broader list down to four, since yes/no and scale-style questions are just `mcq_single` with the right options:

- `short_text`
- `long_text`
- `mcq_single`
- `mcq_multi`

### 3.8 Answering experience

No submit button. Every answer autosaves individually as the respondent works, debounced at 600ms, so she can leave and resume at any point without losing progress — directly satisfying requirement 6.

### 3.9 Theming system

Built after the core functionality was complete, in response to the realization that the project could be broadly useful as an open-source tool, not just a personal one:

- **7 curated, hand-designed themes** (Calm, Midnight, Forest, Blush, Ocean, Amber, Lavender), each a complete object in code — not user-composable from raw color pickers, to avoid ever producing a broken or unreadable combination.
- Deliberate rule: **rich, multi-stop gradients only on the page background** (where mood/feel matters most); cards and buttons use simple, low-contrast gradients, to keep ~100 repeated question cards readable rather than visually noisy.
- The admin can adjust the background gradient's **angle** (0–360°) at runtime; the color stops themselves remain code-only.
- **Icons** are theme-independent and individually assignable per UI slot (edit, delete, publish, logout, add-question, save-indicator, favicon) from a curated `lucide-react` subset — the favicon reuses the same icon-selection system rather than requiring separate file upload handling.
- Both admin and respondent views always share the same theme and icon choices — no per-role divergence, by explicit design decision.

### 3.10 Deployment

Hosted on personal hardware (a laptop, kept on), exposed publicly via **Tailscale Funnel** rather than Cloudflare Tunnel — chosen specifically because Funnel preserves true end-to-end TLS straight to the origin machine, with no intermediary terminating traffic. This directly serves the "nothing should leak in transit" requirement more strictly than the alternative.

---

## 4. Development process highlights

### 4.1 Collaborative architecture decisions
Several key decisions were driven by the project owner identifying gaps and proposing improvements mid-build, rather than purely following a pre-set plan:
- Identifying the shared-passphrase security flaw before it was flagged, leading directly to the envelope-encryption redesign.
- Proposing the merged question/answer schema to remove manual ID-mapping overhead.
- Independently auditing and fixing a timing-attack vulnerability in token comparison after the initial implementation.
- Requesting session-persistence-on-refresh as a usability fix once it was identified as a real pain point, correctly diagnosing the cause as component state not checking for an existing valid session cookie.

### 4.2 Real infrastructure issues debugged
- A Windows filename-casing conflict (`dataFile.ts` vs `datafile.ts`) that required deleting and recreating the file to clear a stale TypeScript reference.
- A route file incorrectly named `routes.ts` instead of `route.ts`, causing silent 404s on new API endpoints.
- A Tailscale virtual network adapter left behind after quitting the app, which caused both the questionnaire app and an unrelated project (SwiftBill) to advertise an incorrect link-local IP address for LAN access — diagnosed via `ipconfig` and resolved by using the correct Wi-Fi adapter's IP directly.
- A cookie `secure: true` flag correctly refusing to transmit the session cookie over plain HTTP (LAN IP testing) while working correctly over the HTTPS Tailscale Funnel URL — identified as expected, correct behavior rather than a bug, since real usage was always intended to go through Funnel's HTTPS endpoint.

### 4.3 Post-build hardening (done independently between sessions)
Before returning to continue work, the project owner independently:
- Removed a dead-end orphaned setup script no longer used once in-browser setup replaced it.
- Replaced a plain `===` token comparison with a timing-safe comparison using `crypto.timingSafeEqual`, including a dummy comparison on length mismatch to avoid leaking length information via timing.
- Added a fallback guard to the public, unauthenticated `/api/theme` route so it fails gracefully (503) rather than erroring if the data file doesn't exist yet.
- Rebuilt the UI end-to-end: unified add/edit modal for questions, a dedicated MCQ option list-builder, icon-only action buttons, a shared `QuestionCard` component used identically on both admin and respondent views, dedicated loading-state components, and a fixed-header/independently-scrolling-body layout.

### 4.4 Features added in response to real usage gaps
- Question editing (text/options) and manual reordering (up/down), added after initial testing revealed both were missing.
- Logout and session expiry (2-hour session TTL), added as a deliberate security/hygiene pass.
- Session-persistence-on-refresh fix, resolving a real usability pain point.
- Background gradient scroll-cutoff fix (`background-attachment: fixed`), resolving a visual bug that appeared once question lists grew past one screen.
- Respondent passphrase reset — a fully built admin-facing feature (API route with step-up admin re-verification, plus Settings tab UI) added specifically to make good on a claim in the project's own README, once that gap between documentation and actual capability was noticed.
- Root `/` landing page and consistent loading states across every screen state (loading, invalid token, setup, login, dashboard).

### 4.5 Operational tooling
- A one-command secrets-generation script (renamed to `setup-secrets.js` per the project owner's preference) replacing four manual `node -e` commands, producing `.env.local` with all four required secrets (`ADMIN_TOKEN`, `RESPONDENT_TOKEN`, `SESSION_SECRET`, `SERVER_KEY`) in one run, with a `--force` flag guard against accidentally invalidating a running instance's secrets.
- Five `package.json` script variants covering every realistic entry point: generate secrets only, generate + dev, generate + build + start, install + generate + dev, install + generate + build + start.
- Token length was deliberately reduced from 24 bytes to 16 bytes (192 bits → 128 bits of entropy) for `ADMIN_TOKEN`/`RESPONDENT_TOKEN` specifically — still cryptographically unguessable, but produces meaningfully shorter, more shareable URLs. `SERVER_KEY`/`SESSION_SECRET` were kept at 32 bytes since they are actual key material, not access tokens.

---

## 5. What was ultimately built — summary

A fully functional, end-to-end tested, publicly deployed application consisting of:

- **Admin flow** (`/admin/<token>`): loading state, invalid-token screen, one-time in-browser setup, passphrase login, a Questions tab (add/edit/delete/reorder/publish via modal-based editing with a dedicated MCQ builder), a Settings tab (theme picker across 7 presets, gradient angle control, per-slot icon pickers, respondent passphrase reset with step-up verification), session persistence across refresh, and logout.
- **Respondent flow** (`/answer/<token>`): loading state, invalid-token screen, passphrase login, a filtered questions view showing only published questions, per-question autosave with visible saving/saved state, session persistence across refresh, and logout.
- **Shared infrastructure**: a single envelope-encrypted data file, timing-safe token verification, Argon2id passphrase hashing, scrypt key derivation, iron-session-based authentication with role enforcement checked server-side (not trusted from the client), and a shared `QuestionCard` component ensuring visual and behavioral consistency between the two roles.
- **Deployment**: running on self-hosted hardware, publicly reachable over true end-to-end HTTPS via Tailscale Funnel, verified working across multiple independent devices and networks.
- **Documentation and public release**: a README documenting the full architecture, threat model, explicit non-goals, and setup instructions; a public GitHub repository (clone-tested independently); a detailed LinkedIn launch post covering the three core technical decisions (envelope encryption, Tailscale Funnel choice, flat-file storage), accompanied by diagrams of the setup flow, the authentication/access flow, and the autosave write path; and tailored project descriptions prepared for the resume, LinkedIn's Projects section, and Naukri.

---

## 6. Explicit non-goals (by design, not by omission)

- No multi-tenancy — one instance serves exactly one admin and one respondent.
- No non-technical, one-click deployment path — self-hosting requires terminal comfort, environment variable configuration, and (for public access) Tailscale.
- No general-purpose form-builder features — no file uploads, no conditional logic, no third-party integrations.
- No protection against an actively compromised host machine while a session is live — the threat model covers realistic passive risks (accidental sync/backup leaks, git leaks, device handoff, screen-sharing exposure), not active host compromise.

---

## 7. Current state

The project is complete, functionally tested end-to-end (including multi-device and cross-network verification of the Tailscale Funnel deployment), committed to a public GitHub repository, and publicly announced. Resume and job-portal listing language has been prepared and is ready to use.
