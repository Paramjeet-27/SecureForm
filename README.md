# SecureForm

A self-hosted, encrypted, single-purpose questionnaire tool — built for exactly two people: one admin, one respondent. No accounts, no database, no third party ever touches your data.

This isn't trying to be a general-purpose form builder. It's the opposite: a deliberately narrow tool for the specific case where you need to ask someone a set of private questions, let them answer at their own pace, and guarantee that nothing leaves infrastructure you control.

---

## Why this exists

Most "private form" tools ask you to trust a company. Even self-hosted alternatives usually carry multi-tenant complexity (accounts, role management, database infrastructure) built for teams, not two people.

This project starts from a different question: _if it's really just two people, one time, how simple and how private can this actually be?_

The answer turned out to be: one encrypted file, two access tokens, two passphrases, and no database at all.

---

## Design principles

- **Zero third-party trust.** No cloud database, no email-based auth, no SaaS dependency. The only infrastructure is your own machine.
- **Encryption at rest, always.** Even though this is a two-person tool, the data file is fully encrypted — not because either person is a threat to the other, but because the realistic risk is _accidental_ leaks: cloud sync tools silently backing up the file, an accidental git commit, a laptop handed off or resold, a screen-share exposing an open file.
- **No accounts, no passwords stored for recovery.** Access is two secret URL tokens plus two passphrases, each doing a different job (see below). There is no "forgot password" flow — that flow is itself an attack surface.
- **Simplicity over scale.** This will never support multiple forms, multiple respondents, or multiple admins on one instance. That's a feature, not a limitation — every piece of complexity a general-purpose tool needs (multi-tenant data isolation, RBAC, per-user encryption boundaries) is complexity this tool simply doesn't have to defend.

---

## Architecture

### Storage

Everything lives in a single encrypted file, `data.json`. There is no database. At this scale (one respondent, on the order of ~1000 questions), a database adds tooling and operational overhead without adding any real capability — a flat file re-encrypted on every write is simpler and just as correct.

Each question is a self-contained object keyed by a stable ID, merging its metadata and its answer together:

```json
{
  "questions": {
    "q_a3f9c21b": {
      "type": "mcq_single",
      "text": "...",
      "options": ["Option A", "Option B"],
      "published": true,
      "order": 1,
      "answer": { "value": "Option A", "updatedAt": "..." }
    }
  }
}
```

Stable IDs (not question text) mean the admin can freely reword or reorder questions mid-survey without breaking the link to an existing answer.

### Encryption — envelope encryption, not a single shared key

This is the core design decision worth explaining, because the naive version of this app (one shared passphrase for both people) has a real flaw: whoever holds the passphrase can decrypt _everything_ in the file — including draft questions the admin never intended the respondent to see.

The fix is **envelope encryption**:

- A random **data encryption key (DEK)** is generated once, and _it_ is what actually encrypts the file contents.
- The DEK itself is then encrypted ("wrapped") **twice**, independently:
  - Once with a key derived from the **admin's passphrase** (via scrypt) — lets the admin unwrap the DEK and read/write everything.
  - Once with a key derived from a **server-only secret** (`SERVER_KEY`, never exposed to either human) — lets the _server_ independently unwrap the DEK to serve the respondent a filtered view, without the respondent ever holding a real decryption key themselves.
- The respondent's passphrase is checked separately, via **Argon2id hash comparison** — it authenticates _who_ they are, but never touches decryption. It's a gate, not a key.

The result: the respondent can only ever see published questions and their own answers, and this is enforced structurally — not by the UI being polite, but because they never possesses a key capable of decrypting the raw file, even in principle.

### Access model

No accounts, no signup, no email. Access is:

1. **Two long, random, secret tokens** (`ADMIN_TOKEN`, `RESPONDENT_TOKEN`), each gating a distinct route (`/admin/<token>`, `/answer/<token>`). Token comparison uses a timing-safe equality check to avoid leaking correctness information via response-time side channels.
2. **Two independent passphrases**, chosen at first-run setup, never stored in recoverable form:
   - The admin's passphrase derives the real encryption key. If forgotten, the data is unrecoverable — there is no backdoor, by design.
   - The respondent's passphrase is hashed (Argon2id) purely for verification, and can be reset by the admin if forgotten.

Link and passphrase are meant to be shared over different channels — a leaked link alone should never be enough to gain access.

### Sessions

Server-side sessions use `iron-session` with encrypted, httpOnly cookies, holding the unwrapped DEK in memory for the session's duration (default 2-hour expiry). The key is never sent to or stored in the browser in any readable form.

### Hosting

Designed to run on hardware you control — a personal laptop or home server, kept on for the duration of use. Public HTTPS access is provided via **Tailscale Funnel** rather than a reverse-proxy service like Cloudflare Tunnel, specifically because Funnel preserves true end-to-end TLS straight to the origin machine — no intermediary ever terminates or sees decrypted traffic. No domain purchase, no port forwarding, no router configuration required.

---

## Question types

Kept deliberately minimal:

- `short_text` — single line
- `long_text` — multi-line / paragraph
- `mcq_single` — single-select from a list of options
- `mcq_multi` — multi-select from a list of options

Yes/no and rating-scale questions are just `mcq_single` with the right options — no need for dedicated types.

## Answering experience

No "submit" button. Each answer autosaves as the respondent goes, so they can leave at any point and resume later — answering one question at a time, in any order, over any timeframe.

## Admin experience

- Add, edit, delete, reorder, and publish/unpublish questions individually — unpublished (draft) questions are invisible to the respondent, so the full question set can be authored gradually without exposing incomplete work.
- View all answers as they're submitted, at any time.
- Theming: a small, curated set of complete visual themes (colors, gradients, icon set) defined in code — not a free-form customization system. The admin can pick a theme and adjust the background gradient's angle; the palette and gradient stops themselves are intentionally not runtime-editable, to avoid the tool ever producing a broken or unreadable combination. New themes are added by contributing to the codebase, not through the UI.

---

## What this is _not_

Being direct about scope, because overclaiming is worse than a narrow, honest tool:

- **Not multi-tenant.** One instance serves exactly one admin and one respondent. It will not support multiple simultaneous forms or user bases without a fundamentally different architecture (this is intentional — that complexity is exactly what's being traded away).
- **Not designed for non-technical self-deployment.** Setting this up requires comfort with a terminal, environment variables, and (for public access) Tailscale. There's no one-click hosted version, on purpose — a hosted version would reintroduce the third-party trust this tool exists to avoid.
- **Not a general-purpose form builder.** No file uploads, no complex conditional logic, no integrations. If you need any of that, this is the wrong tool.
- **Not immune to host compromise.** If the machine running this is compromised while a session is active (i.e., a key is unwrapped in memory), that session's data is exposed like any running application. Encryption at rest protects against the realistic passive risks (accidental sync, git leaks, disk residue) — it is not a defense against an actively compromised, currently-running host.

---

## Tech stack

- **Framework:** Next.js (App Router, TypeScript)
- **Storage:** Single encrypted JSON file, no database
- **Encryption:** AES-256-GCM (data), scrypt (passphrase → key derivation), Argon2id (respondent passphrase hashing)
- **Sessions:** `iron-session`, encrypted httpOnly cookies
- **Hosting:** Self-hosted, exposed via Tailscale Funnel
- **Icons:** `lucide-react`, curated subset

---

## Setup

| Command               | What it does                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `npm run secrets`     | Generates `.env.local` with all required secrets — nothing else                     |
| `npm run dev:fresh`   | Generates secrets, then starts the dev server                                       |
| `npm run start:fresh` | Generates secrets, builds, then starts the production server                        |
| `npm run setup:dev`   | Installs dependencies, generates secrets, then starts the dev server                |
| `npm run setup:prod`  | Installs dependencies, generates secrets, builds, then starts the production server |

For a first-time clone, `npm run setup:prod` (or `setup:dev` if you're planning to modify the code) takes you from a fresh checkout to a running server in one command.

The secrets script refuses to overwrite an existing `.env.local` unless you pass `--force` — this protects a running instance from accidentally invalidating `SERVER_KEY` (which would break the respondent's ability to decrypt existing data) or `ADMIN_TOKEN`/`RESPONDENT_TOKEN` (which would invalidate your existing access links).

Once running, visit `/admin/<ADMIN_TOKEN>` — the token is printed to your terminal when secrets are generated. Since no data file exists yet, you'll be prompted to set both passphrases (admin and respondent) on first load; this is the only setup step, there is no separate CLI script for it.

To make the app reachable outside your local network, expose it via [Tailscale Funnel](https://tailscale.com/kb/1223/funnel):

```bash
tailscale funnel 3000
```

Share the respondent link and passphrase with the other person through **separate channels**.

## A note on threat model

This tool protects against:

- Accidental plaintext leaks via cloud backup/sync tools, git, device handoff, or screen sharing
- A leaked access link alone being sufficient to read anything
- The respondent seeing draft/unpublished content, even if they had raw file access
- Timing-based token guessing

This tool does **not** protect against:

- A compromised or actively monitored host machine while a session is live
- Forgotten admin passphrases (by design — there is no recovery path)
- Anyone with both a valid access token _and_ the corresponding passphrase, which is the intended access boundary

If your threat model requires protection beyond this, this tool is not sufficient on its own — but for the case it's built for (two people, complete mutual trust, wanting to keep a third party out of their private data), it should hold up well.

## License

MIT

---
