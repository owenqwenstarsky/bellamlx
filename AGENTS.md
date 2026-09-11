# Agent instructions

## Repository issue workflow

Use `KNOWN_ISSUES.md` as the active tracker and `.github/PAST_ISSUES.md` as the historical record. Do not create GitHub Issues. Pull requests are the mechanism for proposing issues and their resolutions; merging the tracker entry into `main` accepts a new issue. A branch-only entry is a proposal, not an accepted main-branch issue.

### Reporting

1. Read both logs before reporting or fixing a bug. Update an existing matching issue instead of duplicating it.
2. Reproduce UI reports in the running UI. Separate observed behavior from hypotheses; source inspection alone is not evidence of a UI reproduction. Record date, revision/build, platform, relevant profile/model state, exact steps, actual result, expected result, impact, workaround (or none known), and acceptance checks. Include sanitized screenshot/log links when available; never include credentials or unnecessary personal data.
3. Allocate the next unused `KI-NNNN` number across both files. IDs are permanent and must never be reused. Recheck main before merge and resolve concurrent ID collisions, updating references in the PR.
4. Use one focused entry per defect. Label severity: P1 = critical data loss/security or broad unusability; P2 = a blocked workflow or substantial incorrect behavior; P3 = recoverable/minor UX defect. Explain the impact rather than relying on the label. Mark uncertain or unreproduced reports explicitly, with the missing evidence.
5. Open a reporting PR with the issue IDs, concise reproduction/evidence, and tracker edits. Reporting does not authorize fixing the app. In an audit-only task, change documentation only. Do not invent PR numbers or merge references before they exist.

### Fixing and closing

1. Select an accepted issue from main, reproduce it on the current revision, and use its context and acceptance checks to bound the fix. A report is context, not a guaranteed root-cause diagnosis. If reproduction fails, document the environment and attempts; do not silently delete the report.
2. Open a fix PR referencing the stable issue ID and original reporting PR when available. Describe the change, regression risk, and actual verification. Keep the issue active on main until the resolution PR merges. A branch/PR may indicate that a fix is proposed; this does not mean resolved.
3. Verify the original reproduction in the UI and relevant neighboring/edge cases. Add or run focused automated regression checks where appropriate; do not substitute a passing unrelated suite for UI verification. Record exact results and any remaining limitations.
4. In the same resolution PR, move the complete issue record from `KNOWN_ISSUES.md` to `.github/PAST_ISSUES.md`. Preserve its ID, reproduction, original observations, and reporting references. Append disposition (`Fixed`, `Duplicate`, `Not reproducible`, or `Won't fix`), rationale, resolution date, fix/resolution PR or commit reference when available, and concrete verification evidence. Resolution is effective only on merge. Do not fabricate a future merge SHA; add it afterward if needed.
5. Partial fixes leave the issue active with remaining acceptance checks clearly stated. Closing as duplicate links the canonical ID; closing without a fix requires explicit rationale reviewed in the resolution PR. If an archived problem recurs, restore its original ID to the active log and retain a historical resolution/reopening note linking both records.

### Review checklist

Ensure IDs are unique among active issues, links resolve, steps are reproducible, evidence supports the claimed severity/result, and resolved records retain useful context. Keep coverage limitations separate from confirmed defects. No code fixes should be mixed into an issue-reporting-only request. Follow `docs/DEVELOPMENT.md` for test/profile isolation; never run automated tests against a personal profile or launch ad-hoc engine probes on irreplaceable model files.
