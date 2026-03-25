# Negocios Drive Sync — Project Walkthrough

## Current Status: Phases 0–2 Complete · Phase 3 Pending

---

## What's Been Built

### Phase 0 — Reorganization
All source code consolidated into `negocios_sync_platform/`. Root-level launchers ([sync_negocios.py](file:///c:/Users/luuis/Downloads/Negocios/sync_negocios.py), [.bat](file:///c:/Users/luuis/Downloads/Negocios/sync_negocios.bat)) allow running from `Negocios/`.

### Phase 1 — Security Hardening
- Credentials moved to `~/.config/negocios_sync/` (out of project tree).
- All Drive API calls retry automatically with exponential backoff (`tenacity`).
- OAuth tokens auto-refresh and persist to the secure path.

### Phase 2 — Operational Improvements
- **YAML Config**: Settings in `config/config.yaml` with profile support (`--profile recipes`).
- **Delta Sync**: Modified files detected via MD5 hash comparison and re-uploaded.
- **Sync History**: Every run logged to `logs/sync_history.db` (SQLite).
- **CLI**: New flags `--config`, `--profile`, `--dry-run`.

---

## What's Next: Phase 3 — Sync Dashboard

A live web dashboard at `sync.luisaguilaraguila.com` showing sync health, timelines, and errors.

**Stack**: FastAPI + Supabase + Docker + Cloudflare Tunnel

> [!IMPORTANT]
> ### Decisions Required Before Proceeding
>
> **1. Supabase Project** — Create a new project or reuse an existing one?
> - Recommended: New project in **"luuisaguilar's Org"** (free tier is fine).
> - Alternatives: Reactivate `scrapydo` or another inactive project.
>
> **2. Cloudflare Tunnel** — Confirm you can map the subdomain:
> - `sync.luisaguilaraguila.com` → `http://dashboard:8000`
> - This is configured in the Cloudflare Zero Trust dashboard.

---

## Key Files

| File | Purpose |
|------|---------|
| [sync_negocios.py](file:///c:/Users/luuis/Downloads/Negocios/sync_negocios.py) | Root launcher |
| [config.yaml](file:///c:/Users/luuis/Downloads/Negocios/negocios_sync_platform/config/config.yaml) | YAML settings |
| [matcher.py](file:///c:/Users/luuis/Downloads/Negocios/negocios_sync_platform/negocios_drive_sync/matcher.py) | Delta Sync logic |
| [reporting.py](file:///c:/Users/luuis/Downloads/Negocios/negocios_sync_platform/negocios_drive_sync/reporting.py) | SQLite history + reports |
| [completed_tasks.md](file:///C:/Users/luuis/.gemini/antigravity/brain/c689c21d-f060-490d-9436-f925dcbddf6e/completed_tasks.md) | Full completed task log |
| [implementation_plan.md](file:///C:/Users/luuis/.gemini/antigravity/brain/c689c21d-f060-490d-9436-f925dcbddf6e/implementation_plan.md) | Phase 3 dashboard plan |
