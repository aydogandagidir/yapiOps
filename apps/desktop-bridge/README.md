# YapıOps Desktop Bridge

> **Status:** Placeholder. Implementation begins in **Phase 1, Week 8** (Ek3Pilot MVP).

## Purpose

Thin Windows client (~50–80 MB) that reads ETABS models via the OAPI and
forwards structured metadata to the YapıOps cloud. See
[`docs-internal/CLAUDE.md`](../../docs-internal/CLAUDE.md) §4.4 for the
target stack and [`docs-internal/adr/0001-hibrit-mimari.md`](../../docs-internal/adr/0001-hibrit-mimari.md)
for the rationale.

## Stack (target)

- **Framework:** .NET 8 + WPF
- **ETABS API:** ETABSv1.dll (OAPI v21+) via COM/.NET interop
- **Auth:** OAuth 2.0 PKCE — browser login, token returned to bridge,
  stored in Windows Credential Manager
- **Updates:** Squirrel.Windows
- **Installer:** WiX Toolset (MSI)
- **Crash reporting:** Sentry

## Phase 0 scope

Nothing to build here yet. The web-only foundation (apps/web + Supabase +
BillingCore) ships first; the desktop bridge follows in Phase 1.
