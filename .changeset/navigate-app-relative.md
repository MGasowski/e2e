---
"e2e": patch
---

Agent navigations to the app recorded from this release on replay when the app runs on another port or deployment with the same `app.identity`, instead of stopping at the old address (`REPLAY_STALE` under `--strict-cache`).
