# record_debug/

**Documentation has been consolidated into a single master document.**

## Primary Documentation

📘 **[MASTER_MANUAL.md](./MASTER_MANUAL.md)** - Complete system documentation
- System Architecture & Overview
- Backend Services (Configuration, Deployment, BigQuery, Vertex AI, ML, Testing)
- Frontend Architecture (API Integration, Migration, ML, Whiteboard)
- Infrastructure & GKE (Worker Architecture, Networking, HTTPS, DNS, Pod Management, Redis)
- CI/CD & Automation (Cloud Build, GitHub Secrets, Firestore Rules)
- Firebase, Firestore & Redis (Secret Management, Quick Reference, Local Testing)
- System Upgrades & Evolution
- Debugging & Troubleshooting (Auth, Incidents, Bug History)
- Local Development (How to Run, Testing Guides)
- Miscellaneous (Pomodoro, etc.)

📋 **[MERGE_MAPPING.md](./MERGE_MAPPING.md)** - File merge mapping table
- Shows where each original file's content was merged
- Verification checklist
- Complete traceability

## Quick Links

| Topic | Section in MASTER_MANUAL.md |
|-------|----------------------------|
| **System Overview** | Section 1 - System Architecture |
| **How to Run Locally** | Section 9.1 - Local Development |
| **GKE & Kubernetes** | Section 4 - Infrastructure & GKE |
| **Backend Deployment** | Section 2.2 - Backend Deployment |
| **BigQuery Setup** | Section 2.3 - BigQuery Integration |
| **Redis & Caching** | Section 4.9, 6.3 - Redis |
| **Auth Troubleshooting** | Section 8.1 - Debugging |
| **Incident History** | Section 8.2 - Incident Logs |

## Workflow

**All documentation is now centralized in MASTER_MANUAL.md.**

- ✅ Search one document instead of 40+ files
- ✅ Consistent formatting and organization
- ✅ Easy to maintain and update
- ✅ Full version control via git

## Adding New Documentation

When adding new content:

1. Open `MASTER_MANUAL.md`
2. Find the appropriate section (or add a new one)
3. Add your content with clear headers
4. Commit to git with descriptive message

## History

- **December 2025**: Consolidated 40+ scattered markdown files into unified MASTER_MANUAL.md
- All original content preserved with zero information loss
- Organized into 10 major sections for easy navigation
