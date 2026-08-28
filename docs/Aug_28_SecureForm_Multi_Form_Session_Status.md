# SecureForm — Session Status: Multi-Form Support

**Purpose:** Continuity and decision-record document for this session. Covers the full
architecture discussion, the decisions made (including ones proposed and then reversed),
the reasoning behind each, and the final implemented state — so a future session (or a
future you) can understand not just *what* the system does now, but *why* it doesn't do
things that were seriously considered along the way.

---

## 1. Starting point and goal

This session picked up after SecureForm was already complete, deployed, and publicly
launched as a single-form tool (see `SecureForm_Project_Status.md` for the original
project history, and `SecureForm_Session_Status_UI_Update.md` for the prior UI
refinement session).

**The stated goal coming in:** the project owner identified that the app was hardcoded
to exactly one form (`data.json`), and wanted the ability to create and switch between
multiple independent forms, while preserving the app's core identity as a strictly
two-person (one admin, one respondent) tool — not evolving toward multi-tenancy or
per-form access control.

---

## 2. Scope decision: what kind of "multi-form" this is

Before any implementation, three different shapes of "multi-form" were discussed and
narrowed down, in order:

1. **Per-form tokens/access** (different forms shareable with different people via
   separate links) — proposed early by Claude, **rejected** by the project owner.
2. **One tab, admin-created, respondent sees all forms too** — the project owner's own
   proposal, and the one that was adopted.
3. Confirmed explicitly: theme, icons, session, and tokens all remain **global**, shared
   across every form. Only the *content* (questions + answers) varies per form.

**Why this matters:** this scoping decision is what kept the entire rest of the session
simple. Every later architectural question ("does X need to be per-form or global?") was
answered by checking it against this rule, and in every case the answer was "stays
global" except for the actual question/answer content itself.

---

## 3. The central architectural debate: DEK strategy

This was the most significant technical discussion of the session, and it went through
three distinct proposals before landing on the final design. Recording all three is
valuable because the reasoning for rejecting two of them is exactly the reasoning that
protects the system's core security property going forward.

### 3.1 Proposal A (Claude's initial design): per-form DEK

Claude's first instinct was to give every form its own independently generated DEK,
wrapped separately by the admin key and server key, reasoning that this would give
"isolation" between forms — compromising one form's key wouldn't expose others.

**The project owner correctly challenged this** by pointing out that AES-GCM has no
issue reusing one key across many files, provided each encryption uses a fresh IV
(which the existing `encrypt()` function already does).

**On reflection, Claude agreed the per-form-DEK design was solving a problem that didn't
exist here:** since the same admin passphrase unlocks every form's DEK regardless of
whether each form has its own key, per-form isolation provides no real protection in a
single-admin system. The extra keys were complexity without benefit. **This was the
first meaningful correction the project owner made to Claude's proposed design.**

### 3.2 Final design (adopted): one shared DEK, generated once

- A single DEK is generated **once**, at first-run setup — not at form creation time.
- It's wrapped twice, exactly as in the original single-form design: once by the admin
  passphrase-derived key (`adminWrappedDEK`), once by a `SERVER_KEY`-derived key
  (`serverWrappedDEK`).
- Every form's content is encrypted with this *same* DEK, each with its own fresh random
  IV (handled automatically by the existing `encrypt()` function).
- Creating a new form became a **zero-crypto-generation operation**: no new key, no new
  wrapping, no new salt — just encrypt an empty `{questions: {}}` blob with the DEK
  already sitting in the admin's active session.

**Impact:** this is a meaningful simplification over the original per-form-DEK draft.
Form creation is now cheap and simple, `app-data.json` holds all key material in one
place, and the mental model is "one key protects the whole app's content, filed across
multiple documents" rather than "every document has its own lock."

### 3.3 Proposal B (project owner's idea, correctly rejected): symmetric passphrase-derived keys

Later in the session, in an effort to further simplify login, the project owner proposed
having **both** admin and respondent derive real encryption keys from their own
passphrases (with their own salts), rather than admin-only key derivation plus
respondent-only hash-checking.

**This was identified as a real security regression, not just a style choice**, and
Claude flagged it directly rather than implementing it. The reasoning:

- The entire point of the *original* project's envelope-encryption design (from the
  very first build, documented in `SecureForm_Project_Status.md` §3.4) was that the
  respondent's passphrase is **never** capable of decrypting content on its own — it's
  purely an authentication gate, checked via Argon2id hash comparison. The actual
  decryption capability is deliberately restricted to two paths: the admin's derived key,
  or the server's own key (used to serve the respondent's session after her passphrase
  is verified).
- If the respondent's passphrase were *also* used to derive a real decryption key, then
  anyone holding that passphrase — not just the app acting on her behalf after
  verification — could decrypt the entire file directly, including unpublished
  admin-only draft content. This is exactly the flaw the project's original design was
  built specifically to prevent (see the project's own historical notes: "the naive
  design — one shared passphrase for both people — has a real flaw...").
- **This proposal was not adopted.** The project owner accepted the explanation and
  the session returned to the proven original mechanism.

**Why this is worth recording prominently:** this is the one moment in the session where
a proposed simplification would have quietly reintroduced a previously-identified and
previously-fixed security gap. It's a useful example of "smaller code" and "correct
security model" pulling in different directions, and of the value of checking new
proposals against the *original* threat model rather than only against "does this still
technically function."

### 3.4 Secondary refinement (adopted, then reverted at the project owner's request): admin login via hash-check

Independently of the DEK debate, Claude proposed changing **admin login verification**
from "derive key, then confirm by successfully decrypting real data" (the original
mechanism) to "verify an `adminPassphraseHash` via Argon2, then derive the key" —
mirroring the respondent's login flow and removing a decrypt-and-catch pattern that
assumed a form always existed to test against (which is no longer guaranteed once forms
can be created after setup, rather than existing from setup onward).

**This was drafted, then explicitly rolled back** at the project owner's instruction
("Let's keep the base things as it is. Not much of the changes needed"), in favor of
minimizing the size of the change overall. The final implementation keeps the **original**
admin login mechanism (unwrap and rely on `unwrapKey` throwing on a bad passphrase),
just repointed from `data.json` to `app-data.json`.

**Net effect:** the admin/respondent login flows remain intentionally **asymmetric** —
admin derives a real key from her passphrase; respondent's passphrase is hash-checked
only, and the server derives the unwrap key on her behalf via `SERVER_KEY`. This was a
deliberate choice to keep the change footprint small, not an oversight.

---

## 4. Storage architecture — final state

### 4.1 Three-way split (replacing the single `data.json`)

| File | Scope | Contents | Encrypted? |
|---|---|---|---|
| `data/app-data.json` | Global, app-wide | Passphrase salts, `respondentPassphraseHash`, `adminWrappedDEK`, `serverWrappedDEK`, theme, gradient angle, icons | No (key material is wrapped/hashed, not the raw DEK) |
| `data/forms/<id>.json` | Per-form | `version`, `createdAt`, `encrypted` (the form's `{questions: {...}}` blob) | Yes — AES-256-GCM via the shared DEK |
| `data/forms-index.json` | Global, plaintext | `{forms: [{id, title, createdAt}]}` | No — intentionally plaintext, since titles/IDs/timestamps aren't sensitive, and this lets both admin and respondent tab bars render instantly without any decryption |

### 4.2 New `lib/` files

- **`lib/appData.ts`** — `appDataFileExists`, `readAppData`, `writeAppData`. Mirrors the
  original `datafile.ts`'s exact function-naming style, scoped to the new global file.
- **`lib/formFile.ts`** — `formFileExists`, `readFormFile`, `writeFormFile`,
  `deleteFormFile`. Same style, parameterized by form `id`.
- **`lib/formsIndex.ts`** — `readFormsIndex`, `addFormToIndex`, `renameFormInIndex`,
  `removeFormFromIndex`. New concept, not present in the original single-form design.
- **`lib/crypto.ts`** — one addition: `generateFormId()`, following the existing
  `crypto.randomBytes`-based token style (`form_` + 32 hex chars). Everything else in
  `crypto.ts` (scrypt key derivation, AES-256-GCM encrypt/decrypt, key wrap/unwrap) was
  reused unchanged — no new crypto primitives were needed.

### 4.3 `lib/datafile.ts` — status

**No longer used by any route.** Every route that previously imported from it has been
converted to `appData.ts` and/or `formFile.ts`. It was deliberately left in place,
untouched, until the full conversion was tested end-to-end, per the project owner's
preference for verifying before deleting. **It is now safe to delete** — this is an open
action item, not yet done as of this session's end.

### 4.4 Migration decision: none performed

Partway through the session, after initial migration planning (splitting an existing
`data.json` into the new file shapes) had already begun, the project owner reset the
project to a clean state (deleted `.env.local` and `data.json`) and the session
continued as a fresh build rather than a migration. **No migration script or logic
exists in the current codebase** — this is fine given the project's actual current
state, but is worth flagging if a *future* real dataset ever needs porting from the old
single-file format; the manual splitting logic discussed earlier in this session (before
the reset) would need to be revisited and re-verified, not assumed to still be
accurate against the final schema.

---

## 5. Route-by-route changes

| Route | Change |
|---|---|
| `setup/route.ts` | Writes `app-data.json` via `writeAppData` instead of `data.json`. DEK generated and wrapped here, once — no form is created during setup anymore. |
| `admin/login/route.ts` | Reads `app-data.json` instead of `data.json`. Dropped the old "decrypt real data as a sanity check" step (no longer valid once forms may not exist at login time) — relies on `unwrapKey` throwing on an incorrect passphrase instead. Mechanism otherwise unchanged (scrypt-derived key, not hash-check — see §3.4). |
| `respondent/login/route.ts` | Same treatment: reads `app-data.json`; same "no more sanity decrypt" removal. |
| `admin/data/route.ts` | Now requires a `formId` query parameter; reads that specific form file via `readFormFile`. Returns 400 if missing, 404 if the form doesn't exist. |
| `respondent/data/route.ts` | Same `formId`-awareness; existing published-only filtering logic unchanged. |
| `admin/questions/route.ts` (POST/PATCH/DELETE) | Same `formId`-awareness on all three handlers. **Bug caught and fixed during implementation:** the write-back step must preserve the form file's original `version`/`createdAt` rather than regenerating `createdAt` on every edit — an early draft would have silently overwritten a form's creation date on its first question edit. |
| `respondent/answer/route.ts` | Same `formId`-awareness and same `createdAt`-preservation fix applied. |
| `respondent/verify-token/route.ts` | **No changes required** — this route never touches form or app data, only the static `RESPONDENT_TOKEN` env value. |
| `admin/reset-respondent-passphrase/route.ts` | **No changes required** — already operates purely on `app-data.json` (admin re-verification + respondent hash update), which made the migration cleanly with zero edits needed. Confirmed by direct review at the end of the session. |
| `api/forms/route.ts` (**new**) | `GET` — lists forms from the index; available to **any** authenticated session (admin or respondent), since both roles need the tab list. `POST` — creates a new form (admin-only): generates a form ID, encrypts an empty `{questions:{}}` blob with the session's DEK, writes the form file, adds an index entry. `PATCH` — renames a form (admin-only, index-only operation, no decryption needed). `DELETE` — removes a form (admin-only): removes the index entry, then deletes the form file. |

**Design note on `api/forms` location:** this was deliberately placed **outside** the
`admin/` route folder (not `admin/forms/route.ts`) specifically because its `GET`
handler is shared by both roles — a project-owner-proposed simplification adopted in
place of Claude's earlier suggestion of a separate parallel `respondent/forms/route.ts`
file. Role separation is enforced per-HTTP-verb inside the single file instead of by
folder structure.

---

## 6. `formId` delivery mechanism: query string, not route param

Two options were seriously weighed: nesting `formId` as a dynamic route segment
(`/api/admin/forms/[formId]/questions`) versus passing it as a query string on the
existing route paths (`/api/admin/questions?formId=...`).

**Query string was chosen**, specifically because:
- It required no file/folder restructuring of already-working, tested routes.
- It kept each diff small and isolated (add one param-read block per handler, swap two
  function calls) rather than relocating files and updating every frontend fetch URL's
  shape.
- It matched the project owner's consistent preference throughout this session for the
  smallest correct change over the more "architecturally pure" option.

This is recorded explicitly because it was a real trade-off, not an obvious default —
the nested-route-param approach is arguably more conventional in RESTful API design, and
would scale more cleanly if the project ever grew additional per-form sub-resources. That
scaling need doesn't currently exist, so the simpler option was correctly prioritized.

---

## 7. Frontend changes

### 7.1 Admin page (`admin/[token]/page.tsx`)

- New state: `forms` (list from the index) and `selectedFormId`.
- New `loadForms()` call, invoked alongside the existing theme-loading step both on
  session-restore and on fresh login.
- New `useEffect` keyed on `[loggedIn, selectedFormId]` that re-fetches
  `/api/admin/data?formId=...` whenever the selected form changes — replacing the old
  one-time question load that used to happen only at login.
- New `handleCreateForm`, `handleRenameForm`, `handleDeleteForm` handlers, using
  `prompt()`/`confirm()` for input — deliberately matching the existing
  `handleDelete`-for-questions pattern rather than introducing a new modal component,
  per explicit project owner preference ("Same pattern as existing handleDelete for
  questions").
- All six pre-existing `/api/admin/data` and `/api/admin/questions` call sites updated
  to include `?formId=${selectedFormId}` — verified individually during review (publish
  toggle, delete, both modal-submit branches, both question-reorder PATCH calls).
- Form switcher implemented as a `<select>` dropdown (not a horizontal tab-button row as
  originally sketched) — the project owner's own UI implementation, reviewed and
  confirmed correct.
- **Deleting the currently-selected form** falls back to the next remaining form, or to
  an empty state if none remain, rather than leaving `selectedFormId` pointing at
  deleted data.

### 7.2 Respondent page (`answer/[token]/page.tsx`)

- Same `forms`/`selectedFormId` state and `loadForms()` pattern as the admin side.
- Same `useEffect`-on-`selectedFormId` re-fetch pattern, targeting
  `/api/respondent/data?formId=...`.
- `saveAnswer` includes `?formId=${selectedFormId}` in its POST to
  `/api/respondent/answer`.
- Correctly **read-only** with respect to forms — no create/rename/delete UI, consistent
  with the two-person design where only the admin manages form lifecycle.
- Same `<select>`-dropdown form switcher as the admin side, giving both roles a
  consistent visual pattern for choosing a form.

### 7.3 Minor review notes (non-blocking, not yet acted on)

- `loadForms()`'s "auto-select first form if none selected" check
  (`data.forms.length > 0 && !selectedFormId`) reads `selectedFormId` from closure at
  definition time. This works correctly on initial load (the only place it's currently
  called from a "fresh" state) but would not behave as expected if `loadForms()` were
  ever called again later in the component's lifecycle expecting it to respect a
  since-changed `selectedFormId`. Not currently a bug in practice, since the app doesn't
  call it that way today — flagged for awareness if `loadForms()` usage expands later.
- No dedicated "create your first form" empty-state UI when `forms.length === 0` — the
  Questions tab currently just renders nothing until a form exists. Functional, not
  polished.

---

## 8. What stayed completely unchanged

Recording this explicitly, since a large part of the value of this session's design was
in what it deliberately did *not* touch:

- `ADMIN_TOKEN`, `RESPONDENT_TOKEN`, `SESSION_SECRET`, `SERVER_KEY` — all four remain
  global env secrets with identical roles to the original single-form design.
- `scripts/setup-secrets.js` — required no code changes; only its comments were flagged
  as slightly stale (referring to "data.json" instead of "forms" generically) — a cosmetic
  fix, not yet applied.
- Session shape (`{dek, role}`) — completely unchanged; the same DEK now just applies
  across multiple form files instead of one.
- Theme, gradient angle, icon system — fully global, untouched by this feature, confirmed
  explicitly early in the session per the project owner's direction.
- `admin/reset-respondent-passphrase` — required zero changes, confirmed by direct
  review.
- `respondent/verify-token` — required zero changes, confirmed by direct review.
- The envelope-encryption security model itself (admin key + server key independently
  wrapping one DEK, respondent passphrase as pure authentication rather than key
  material) — preserved exactly as originally designed, including surviving a proposal
  (§3.3) that would have broken it.

---

## 9. Impact assessment

**Positive:**
- The app now supports an arbitrary number of independent forms while preserving every
  original security property (envelope encryption, two-person-only access, no
  third-party trust) with **zero new attack surface** — no new tokens, no new passphrase
  types, no per-form access control complexity that would need its own reasoning about
  who-can-see-what.
- Form creation, rename, and deletion are all cheap operations after the "one shared
  DEK" simplification — no key generation/wrapping overhead per form.
- The `forms-index.json` plaintext-list design means both roles' tab bars render
  instantly without decryption, keeping the UI snappy even before login-derived key
  material is available for the actual question content.
- The architecture discussion itself surfaced and corrected two flawed proposals before
  they were implemented (per-form DEKs — unnecessary complexity; respondent-derived
  decryption keys — a real security regression), rather than after the fact.

**Neutral / accepted trade-offs:**
- Admin and respondent login remain intentionally asymmetric (real key derivation vs.
  hash-check-then-server-derives), preserving the original design rather than the
  proposed symmetric simplification. This means the two login code paths look
  structurally different from each other, which is a minor maintenance asymmetry judged
  acceptable to preserve the security property it protects.
- `formId` passed via query string rather than nested route params is a lighter-weight,
  less conventionally-RESTful approach that suits the current scale but would need
  reconsideration if the API's surface grows substantially (e.g. per-form sub-resources).

**Outstanding / not yet done:**
- `lib/datafile.ts` is dead code, safe to delete, not yet removed.
- `scripts/setup-secrets.js` comments still reference "data.json" instead of "forms"
  generically — cosmetic only.
- No "create your first form" empty-state UI.
- No migration path exists from the old single-`data.json` format, since the project was
  reset to a clean slate rather than migrated — a real dataset in the old format would
  need fresh migration planning if one is ever encountered.

---

## 10. Summary

The multi-form feature is complete, implemented, and confirmed working end-to-end by
the project owner (create → add questions → publish → respondent login → answer →
rename → delete → switch between forms, tested on both roles). The core envelope
encryption security model from the original single-form design was preserved
unchanged throughout, including surviving direct pressure-testing via two proposals
that would have weakened it. The implementation favored the smallest correct diff at
every decision point (shared DEK over per-form DEKs, query-string `formId` over nested
routes, reused `confirm()`/`prompt()` patterns over new UI components, a single shared
`/api/forms` route over role-parallel files) — consistent with the project owner's
steering throughout this session toward minimal, well-understood changes over
architectural elaboration.
