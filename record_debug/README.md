# record_debug Index

Grouped pointers to the ops/debug notes so related topics stay together. Duplicate HTTPS and worker port docs have been merged into the single files below.

## Architecture & Environments
- `ARCHITECTURE.md`
- `backend_deployment_guide.md`
- `CLOUD_BUILD_DEPLOY.md`, `github_secrets_setup_guide.md`
- `system_upgrade_plan.md`, `system_upgrade_implementation_summary.md`

## Networking, DNS, HTTPS
- `gke_https_setup_guide.md` (includes mixed-content fix, Cloud Run fallback, GKE Ingress + managed cert, Cloudflare tunnel option)
- `gke_networking_architecture.md`, `dns_setup_guide.md`

## Worker, Ports, Redis
- `worker_port_fix.md` (merged timeline of port fixes)
- `worker_loadbalancer_removal.md`
- `redis_gke_deployment_guide.md`, `local_redis_testing_guide.md`
- `port_configuration_audit.md`

## Backend Ops & Services
- `backend_startup_and_config.md`, `backend_single_pod_config.md`
- `backend_BIGQUERY_SETUP_GUIDE.md`
- `backend_VERTEX_AI_INTEGRATION.md`, `backend_TEST_STATUS.md`
- `gce_quota_and_pod_workarounds.md`

## Frontend
- `frontend_FRONTEND_API.md`, `frontend_MIGRATION_GUIDE.md`, `frontend_migration_plan.md`
- `frontend_WHITEBOARD_IMPLEMENTATION.md`, `FRONTEND_ML_INTEGRATION.md`
- `local_frontend_testing_guide.md`

## Auth & Firestore
- `auth_troubleshooting_guide.md`, `firebase_secret_update.md`
- `firestore_quick_reference.md`, `firestore_rules_automation.md`, `firestore_rules_iam_permissions_guide.md`

## ML & LLMOps
- `LLMOPS_GUIDE.md`, `gemini.md`
- `ml_integration_fix_experience.md`
- `pomodoro_notes.md`

## Incident/Bug Logs
- `bug_history.md`, `cleanup_old_url_summary.md`
- Dated hotfixes: `2025-12-01_firestore_whiteboard_permissions_fix.md`, `2025-12-02_backend_cors_deployment_fix.md`, `2025-12-02_deployment_fix_and_config_simplification.md`, `2025-12-02_redis_caching_chat_refactoring.md`
