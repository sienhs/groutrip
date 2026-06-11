# CODEX_DOCUMENT_INDEX.md

## Purpose

This document tells Codex which project documents to read and how to use them.
It is intentionally short. The product specification remains `docs/requirements.md`.

## Required reading order

Before modifying code, read in this order:

1. `docs/requirements.md`
   - Primary source of truth for product behavior and constraints.
2. `AGENTS.md`
   - Repository-level rules and current contributor scope.
3. `docs/codex/PART_B_WORKING_RULES.md`
   - Part B-specific implementation, merge, and contract rules.

For cross-domain, integration, or merge-related work, also read:

4. `docs/team/MASTER_PLAN.md`
   - Overall project direction, A/B responsibilities, and integration points.
5. `docs/team/PROJECT.md`
   - Project structure, stack, existing conventions, and environment notes.
6. `docs/team/MERGE_READINESS_REVIEW.md`
   - Known merge risks and conflict-resolution checklist.

## Excluded document

Do not add or execute the Part A internal task document in the active Codex context.
It was a Part A internal execution plan for Claude and can cause Codex to implement the wrong scope.

## Current active scope

The active contributor is Part B.

Part B owns:

- Group domain
- Group permission AOP
- Expense and settlement
- SSE infrastructure
- Notification
- Cross-domain contracts needed by Part B

Part B does not broadly implement:

- Auth
- Survey
- Place
- Schedule
- Vote
- Recommendation
- Home
- My Page
- Google Places, Kakao Mobility, or TourAPI integrations

## Merge safety priority

When documents disagree with current code, follow this order:

1. Current user instruction
2. `docs/requirements.md`
3. Current source code
4. `AGENTS.md`
5. `docs/codex/PART_B_WORKING_RULES.md`
6. `docs/team/MERGE_READINESS_REVIEW.md`
7. `docs/team/MASTER_PLAN.md` and `docs/team/PROJECT.md`

If a conflict remains, report it before changing code.
