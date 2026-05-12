# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint via Next.js
npm test             # Run all tests with Vitest (no watch)
npm run seed         # Populate DB with sample data (password: ifpi123)
npm run prisma:migrate   # Apply/create migrations (dev)
npm run prisma:generate  # Regenerate Prisma Client after schema changes
```

Run a single test file:
```bash
npx vitest run src/lib/domain/meeting-rules.test.ts
```

> **Windows note:** If `npm run build` fails during `prisma generate` with `EPERM ... rename ... .dll.node`, close all Node/Next processes and rerun `npm run prisma:generate` before building.

## Architecture

### Mutation layer: Server Actions

All write operations live in a single file — `src/app/actions.ts` — as Next.js Server Actions. Pages import and bind these directly to `<form action={...}>`. There are no API routes for mutations. Each action calls `requireUser()` first, enforces domain rules, writes via Prisma, then calls `revalidatePath`.

### Domain rules: pure functions

`src/lib/domain/meeting-rules.ts` contains every business invariant as a standalone `assert*` or `calculate*` function. These are **framework-free** and fully unit-tested in `meeting-rules.test.ts`. Actions import and call them before any DB write.

`src/lib/domain/minute-generator.ts` builds the full and public minute text from a `MinuteInput` shape. It produces both `content` (unredacted) and `publicContent` (confidential records replaced). The SHA-256 hash of `content` becomes `contentHash`, used to bind signatures.

### Meeting lifecycle

```
DRAFT → CALLED → OPEN → FINALIZED
                       ↘ REOPENED ↗
```

- Opening requires `PRESIDENT` and `SECRETARY` participants.
- Finalizing (`assertMeetingCanBePubliclyFinalized`) blocks if a `STUDENT_REPRESENTATIVE` is marked present.
- A finalized meeting/minute can only be edited after reopening with a justification (`assertMinuteCanBeUpdated`).

### Minute lifecycle

```
(none) → DRAFT → READ_APPROVED → FINALIZED
                               ↘ REOPENED ↗
```

Signatures are only accepted in `READ_APPROVED` state (`assertMinuteCanBeSigned`). Each signature stores `contentHash` at signing time so changes after signing are detectable.

### Confidentiality

`DiscussionRecord` and `StudentCase` have a `confidential` flag plus an optional `publicSummary`. `generateMinuteText` calls `redactConfidentialText` to substitute the full `content` with `publicSummary` (or the literal `[Registro sigiloso omitido]`) in `publicContent`. The PDF route exports only `publicContent`.

### Authentication

`src/lib/auth.ts` — PBKDF2 password hashing, HMAC-signed session cookie (`ata_ifpi_session`, 8-hour TTL). `requireUser()` redirects to `/login` if the session is missing or invalid. No external auth provider.

### Data model highlights

- `Campus → Course → ClassGroup` — reference hierarchy used when creating a meeting.
- `Meeting` owns `MeetingParticipant[]`, `AgendaItem[]`, `DiscussionRecord[]`, `StudentCase[]`, `ActionItem[]`, `Deliberation[]`, and one `Minute`.
- `Vote` has a unique constraint on `(deliberationId, userId)` — upsert is used so a participant can change their vote.
- `MinuteSignature` has a unique constraint on `(minuteId, userId)`.
- `MinuteVersion` tracks every save of the minute content with an incrementing version number.
- `AuditLog` records critical events (meeting opened, minute signed, etc.) with `event`, `entityType`, `entityId`, and optional `userId`/`meetingId`.

### Environment variables

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me-in-development"
```
