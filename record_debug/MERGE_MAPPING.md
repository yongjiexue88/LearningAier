# File Merge Mapping Table

This document shows exactly where each original file's content was merged into `MASTER_MANUAL.md`.

## Summary

- **Total files merged**: 40 markdown files
- **Original size**: 220,921 bytes (216 KB)
- **Master document size**: 221,600 bytes (216 KB)
- **All files safe to delete**: YES (content fully preserved in MASTER_MANUAL.md)

---

## Detailed Mapping

| Original File | Merged Into Section | Safe to Delete? | Notes |
|---------------|---------------------|-----------------|-------|
| **ARCHITECTURE.md** | 1. System Architecture & Overview | ✅ YES | Complete system architecture, all diagrams and flows preserved |
| **README.md** | (Index file) | ✅ YES | Was just an index, actual content in other files |
| **backend_startup_and_config.md** | 2.1 Configuration & Startup | ✅ YES | Firebase creds, ENV handling fully merged |
| **backend_deployment_guide.md** | 2.2 Deployment Guides | ✅ YES | Prod + Lab deployment workflows |
| **backend_BIGQUERY_SETUP_GUIDE.md** | 2.3 BigQuery Integration | ✅ YES | All setup commands, scripts, credentials strategy |
| **backend_VERTEX_AI_INTEGRATION.md** | 2.4 Vertex AI & ML Integration | ✅ YES | Quick reference for Vertex AI setup |
| **gemini.md** | 2.4 > Gemini Integration & Cost Optimization | ✅ YES | Comprehensive Gemini usage patterns, optimization strategies |
| **LLMOPS_GUIDE.md** | 2.4 > LLMOps Guide | ✅ YES | Prompt versioning, monitoring, BigQuery export |
| **ml_integration_fix_experience.md** | 2.4 > ML Integration Fix Experience | ✅ YES | ML model deployment issue, SM-2 vs ML fallback |
| **backend_TEST_STATUS.md** | 2.5 Testing & Status | ✅ YES | Test infrastructure summary, pytest setup |
| **frontend_FRONTEND_API.md** | 3.1 API Integration | ✅ YES | React Query hooks, API client usage |
| **frontend_MIGRATION_GUIDE.md** | 3.2 Migration Guides | ✅ YES | Legacy API to React Query migration |
| **frontend_migration_plan.md** | 3.2 > Migration Plan Summary | ✅ YES | High-level migration checklist |
| **FRONTEND_ML_INTEGRATION.md** | 3.3 ML Integration | ✅ YES | Frontend ML flashcard scheduler integration |
| **frontend_WHITEBOARD_IMPLEMENTATION.md** | 3.4 Whiteboard Implementation | ✅ YES | Collaborative whiteboard feature |
| **GKE_WORKER_ARCHITECTURE.md** | 4.1 GKE Worker Architecture | ✅ YES | Document worker microservice design |
| **gke_networking_architecture.md** | 4.2 Networking Architecture | ✅ YES | Internal DNS, VPC, service communication (19KB comprehensive guide) |
| **gke_https_setup_guide.md** | 4.3 HTTPS Setup & Mixed Content | ✅ YES | Mixed-content fix, managed certificates, Cloudflare tunnel |
| **dns_setup_guide.md** | 4.4 DNS Configuration | ✅ YES | DNS setup steps |
| **kubernetes_pod_management_guide.md** | 4.5 Kubernetes Pod Management | ✅ YES | Complete kubectl command reference (11KB) |
| **gce_quota_and_pod_workarounds.md** | 4.6 GCE Quota & Workarounds | ✅ YES | CPU quota issues, scaling strategies |
| **port_configuration_audit.md** | 4.7 Port Configuration | ✅ YES | Backend/worker/redis port audit (10KB) |
| **worker_port_fix.md** | 4.7 > Worker Port Fix History | ✅ YES | Timeline of port configuration fixes |
| **worker_loadbalancer_removal.md** | 4.8 Load Balancer Management | ✅ YES | Cost savings from removing worker LB |
| **redis_gke_deployment_guide.md** | 4.9 Redis on GKE | ✅ YES | Complete Redis deployment guide (12KB) |
| **CLOUD_BUILD_DEPLOY.md** | 5.1 Cloud Build & Deploy | ✅ YES | CI/CD pipeline setup |
| **github_secrets_setup_guide.md** | 5.2 GitHub Secrets Setup | ✅ YES | Firebase service account key setup |
| **firestore_rules_automation.md** | 5.3 Firestore Rules Automation | ✅ YES | Auto-deploy rules via GitHub Actions |
| **firestore_rules_iam_permissions_guide.md** | 5.3 > IAM Permissions | ✅ YES | IAM roles for rules deployment |
| **firebase_secret_update.md** | 6.1 Firebase Secret Management | ✅ YES | Kubernetes secret update procedures |
| **firestore_quick_reference.md** | 6.2 Firestore Quick Reference | ✅ YES | 3-step process for new collections |
| **local_redis_testing_guide.md** | 6.3 Local Redis Testing | ✅ YES | Comprehensive local testing guide (10KB) |
| **system_upgrade_plan.md** | 7.1 Upgrade Plan | ✅ YES | Phase 1 & 2 improvements |
| **system_upgrade_implementation_summary.md** | 7.2 Implementation Summary | ✅ YES | Redis cache, GKE migration progress (8KB) |
| **auth_troubleshooting_guide.md** | 8.1 Auth Troubleshooting | ✅ YES | 400 Bad Request fixes, API key restrictions |
| **incident_log_2025-12.md** | 8.2 Incident Logs | ✅ YES | December 2025 consolidated incident log |
| **bug_history.md** | 8.3 Bug History | ✅ YES | Historical bug fixes and resolutions |
| **HOW_TO_RUN.md** | 9.1 How to Run | ✅ YES | Complete local dev setup (7KB) |
| **local_frontend_testing_guide.md** | 9.2 Local Frontend Testing | ✅ YES | Testing with GKE backend locally |
| **pomodoro_notes.md** | 10.1 Pomodoro Implementation | ✅ YES | Pomodoro feature notes |

---

## Files Excluded from Merge

| File | Reason |
|------|--------|
| **System_Architecture_and_Operations_Manual.md** | Previous concatenation attempt (232KB), replaced by MASTER_MANUAL.md |
| **System_Architecture_Operations_Manual.md** | Partial manual template (4KB), superseded by MASTER_MANUAL.md |

---

## Verification Checklist

✅ **All 40 source files processed**  
✅ **No duplicate content** - Each file appears exactly once in appropriate section  
✅ **Logical organization** - 10 major sections with clear hierarchy  
✅ **All commands preserved** - kubectl, gcloud, npm, python commands intact  
✅ **All diagrams preserved** - Mermaid diagrams, ASCII art, flowcharts included  
✅ **Troubleshooting notes preserved** - All gotchas, warnings, and fixes retained  
✅ **Incident timelines preserved** - All dates, root causes, resolutions documented  

---

## Post-Merge Actions

### Recommended File Cleanup

Once you've verified MASTER_MANUAL.md contains all needed information:

```bash
cd record_debug

# Backup originals (optional)
mkdir ../record_debug_backup
cp *.md ../record_debug_backup/

# Remove merged files (keeping only MASTER_MANUAL.md)
rm ARCHITECTURE.md CLOUD_BUILD_DEPLOY.md FRONTEND_ML_INTEGRATION.md
rm GKE_WORKER_ARCHITECTURE.md HOW_TO_RUN.md LLMOPS_GUIDE.md
rm README.md System_Architecture_Operations_Manual.md
rm System_Architecture_and_Operations_Manual.md
rm auth_troubleshooting_guide.md backend_BIGQUERY_SETUP_GUIDE.md
rm backend_TEST_STATUS.md backend_VERTEX_AI_INTEGRATION.md
rm backend_deployment_guide.md backend_startup_and_config.md
rm bug_history.md dns_setup_guide.md firebase_secret_update.md
rm firestore_quick_reference.md firestore_rules_automation.md
rm firestore_rules_iam_permissions_guide.md frontend_FRONTEND_API.md
rm frontend_MIGRATION_GUIDE.md frontend_WHITEBOARD_IMPLEMENTATION.md
rm frontend_migration_plan.md gce_quota_and_pod_workarounds.md
rm gemini.md github_secrets_setup_guide.md gke_https_setup_guide.md
rm gke_networking_architecture.md incident_log_2025-12.md
rm kubernetes_pod_management_guide.md local_frontend_testing_guide.md
rm local_redis_testing_guide.md ml_integration_fix_experience.md
rm pomodoro_notes.md port_configuration_audit.md
rm redis_gke_deployment_guide.md system_upgrade_implementation_summary.md
rm system_upgrade_plan.md worker_loadbalancer_removal.md worker_port_fix.md

# Result: Only MASTER_MANUAL.md remains
ls -lh
```

### Keep MASTER_MANUAL.md Updated

As you make changes to the system:
- Update relevant sections in MASTER_MANUAL.md
- Keep one source of truth instead of scattered files
- Version control via git to track changes
