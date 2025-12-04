# Documentation Consolidation Prompt Template

**Use this prompt when you have scattered documentation files that need to be merged into a single comprehensive manual.**

---

## PROMPT FOR AI ASSISTANT

```
You are an AI documentation-merging assistant. Your job is to read every file under the [FOLDER_NAME] folder and produce one unified, comprehensive, clean, logically structured master document. I want fewer files, and it is acceptable to create one very large file. No information should be lost.

YOUR SCOPE

- Only process files under the [FOLDER_NAME] directory
- Ignore files outside this folder
- Skip any existing merged/manual files (e.g., *_Manual.md, *_Operations.md)

YOUR GOALS

1. Read and fully analyze every file in [FOLDER_NAME]
2. Identify duplicate topics, overlapping sections, or repeated content
3. Merge all related sections into a single combined structure, organized by categories and subtopics
4. Preserve all unique information - if two files cover the same topic, merge them
5. Rewrite for consistency in formatting, tone, terminology, section headings, examples, and step-by-step guides
6. Minimize the number of files - prefer ONE final large master document
7. After confirming content has been merged, mark the original file as safe to delete

MERGING METHOD

For each file in [FOLDER_NAME]:
1. Extract all headings, bullet points, code blocks, tables, and diagrams
2. Determine its category (architecture, backend, frontend, infrastructure, debugging, etc.)
3. Decide where it fits in the unified document
4. Combine information by:
   - Merging duplicated explanations
   - Resolving conflicts explicitly (noting the final recommended approach)
   - Keeping subtle "gotchas" and edge cases
   - Cleaning up outdated notes while preserving context if still useful for history
5. Only consider a file "fully merged" when 100% of its content is either directly included or clearly summarized without losing important details

FINAL OUTPUT YOU MUST PRODUCE

1. A final unified document for [FOLDER_NAME]
   Use a clear, top-level structure such as:
   
   # System Architecture & Overview
   # Backend Services
     ## Configuration & Startup
     ## Deployment
     ## Database Integration
     ## ML/AI Integration
   # Frontend
     ## API Integration
     ## Migration Guides
   # Infrastructure & Platform
     ## Kubernetes/GKE
     ## Networking & DNS
     ## Redis/Caching
   # CI/CD & Automation
   # Debugging & Troubleshooting
     ## Incident Logs
     ## Bug History
   # Local Development
   
2. A mapping table for traceability
   Produce a table showing:
   - Original File → Merged Into Section → Safe to Delete? → Notes
   
   Mark "Safe to Delete?" as YES only when ALL content is fully preserved.

SPECIAL REQUIREMENTS

- Maintain technical accuracy for all code, commands, YAML, configurations
- Preserve all troubleshooting and "gotcha" notes
- Preserve incident timelines and root cause analyses
- Normalize naming and style for consistency
- Keep all kubectl, gcloud, npm, docker commands exact

FINAL EXPECTATION

When finished:
- One master document (or minimal set) fully replaces all individual files
- Mapping table confirms all original files can be deleted
- Zero information loss - all unique content preserved
```

---

## HOW TO USE THIS PROMPT

### Step 1: Customize the Prompt

Replace `[FOLDER_NAME]` with your actual folder name (e.g., `record_debug`, `docs`, `guides`).

Adjust the suggested structure to match your content:
- For technical docs: Use sections like Backend, Frontend, Infrastructure
- For project docs: Use sections like Planning, Development, Testing, Deployment
- For knowledge base: Use sections like Concepts, Tutorials, Reference, Troubleshooting

### Step 2: Provide to AI Assistant

Give the customized prompt to your AI assistant along with access to the folder.

### Step 3: Review Output

The AI will create:
1. `MASTER_MANUAL.md` - The unified document
2. `MERGE_MAPPING.md` - Traceability table

### Step 4: Verify and Clean Up

1. Review the master document to ensure all content is preserved
2. Check the mapping table to see where each file went
3. Delete original files once verified (AI can do this if you approve)

---

## EXAMPLE USAGE

**For the recent record_debug consolidation:**

```
Folder: record_debug/
Files: 40 markdown files (220 KB)
Result: MASTER_MANUAL.md (226 KB, 10 sections)
Time: ~5 minutes
Outcome: 40 files → 3 files (master + mapping + README)
```

**Key sections created:**
1. System Architecture & Overview
2. Backend Services (Config, Deployment, BigQuery, Vertex AI, ML, Testing)
3. Frontend Architecture (API, Migration, ML, Whiteboard)
4. Infrastructure & GKE (Worker, Networking, HTTPS, DNS, Pods, Redis)
5. CI/CD & Automation
6. Firebase, Firestore & Redis
7. System Upgrades
8. Debugging & Troubleshooting
9. Local Development
10. Miscellaneous

---

## TIPS FOR BEST RESULTS

✅ **Be specific about structure** - Provide example section names
✅ **Mention what to preserve** - Commands, configurations, diagrams, troubleshooting notes
✅ **Request mapping table** - Essential for verification and traceability
✅ **Ask for verification** - Have AI check that all content is preserved
✅ **Review before deleting** - Always verify the master document first

---

## BENEFITS

- **Single source of truth** - One document instead of dozens
- **Easy to search** - Ctrl+F finds everything
- **Easy to maintain** - Update one file, not many
- **Better organization** - Logical grouping by topic
- **Complete traceability** - Know exactly where content came from
- **Zero information loss** - All unique content preserved

---

Save this template and reuse it whenever you need to consolidate scattered documentation!
