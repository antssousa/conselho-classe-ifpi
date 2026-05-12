# Ata Conselho IFPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Ata Conselho IFPI MVP with local auth, Prisma/SQLite data, meeting room workflow, minute generation, signatures, audit logs, seed data, and PDF export.

**Architecture:** Use Next.js App Router with server actions and Prisma. Keep business rules in pure TypeScript modules covered by tests, and keep UI forms thin.

**Tech Stack:** TypeScript, Next.js, Tailwind CSS, Prisma, SQLite, Vitest.

---

### Task 1: Project Foundation

- [ ] Add package, TypeScript, Next, Tailwind, Vitest and environment configuration.
- [ ] Add Prisma schema with all PRD models and seed data.
- [ ] Add domain-rule tests before implementing production rule helpers.

### Task 2: Domain and Auth

- [ ] Implement meeting rule helpers, minute generation and PDF helper.
- [ ] Implement local password hashing, session cookies and authenticated user helpers.
- [ ] Verify rule tests fail before implementation and pass after implementation.

### Task 3: Server Actions

- [ ] Implement actions for login/logout, cadastros, meeting lifecycle, participants, attendance, agenda, discussions, student cases, action items, deliberations, votes, minutes, approvals, signatures, finalization and reopening.
- [ ] Write AuditLog entries for critical events.

### Task 4: UI

- [ ] Implement app shell, login, dashboard, cadastro pages and `/meetings/[id]`.
- [ ] Implement all requested meeting tabs with compact forms and status panels.
- [ ] Ensure public minutes omit confidential details.

### Task 5: Verification

- [ ] Install dependencies.
- [ ] Run Prisma generate/migrate/seed.
- [ ] Run tests and build.
- [ ] Start dev server and verify the main route manually if possible.
