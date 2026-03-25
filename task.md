# Negocios Drive Sync — Task Tracker

## Phase 0: Reorganization ✅
- [x] Consolidate project into `negocios_sync_platform/`
- [x] Create root-level launchers ([sync_negocios.py](file:///c:/Users/luuis/Downloads/Negocios/sync_negocios.py), [.bat](file:///c:/Users/luuis/Downloads/Negocios/sync_negocios.bat))

## Phase 1: Security Hardening ✅
- [x] Relocate credentials to `~/.config/negocios_sync/`
- [x] Add `tenacity` retry logic to [DriveClient](file:///c:/Users/luuis/Downloads/Negocios/negocios_sync_platform/negocios_drive_sync/drive_client.py#86-316)
- [x] Implement OAuth token auto-rotation
- [x] Create robust [.gitignore](file:///c:/Users/luuis/Downloads/Negocios/.gitignore)

## Phase 2: Operational Improvements ✅
- [x] YAML configuration system (`config.yaml`)
- [x] Delta Sync via MD5 hash comparison
- [x] SQLite history + JSON reporting
- [x] CLI enhancements (`--config`, `--profile`, `--dry-run`)

## Phase 3: Sync Dashboard 🔲 (Blocked — Awaiting Decisions)
- [ ] Create Supabase project + schema (sync_runs, file_decisions, portfolios)
- [ ] Build FastAPI dashboard app (summary cards, charts, error log)
- [ ] Integrate sync script → Supabase push ([reporting.py](file:///c:/Users/luuis/Downloads/Negocios/negocios_drive_sync/reporting.py))
- [ ] Dockerize dashboard + Cloudflare tunnel
- [ ] Deploy to `sync.luisaguilaraguila.com`
