# Archived: Treatment Plan Builder + SLI 2.0 Assessment

**Archived:** October 23, 2026, by Brandon Bailys
**Why:** A Pimsy update moved treatment plans and the SLI 2.0 screener into the EHR. No staff use these tools now. The code is kept here for reference only.

## What's in this folder

| File | What it was |
|---|---|
| `treatment-plan.html` | Treatment Plan Builder: AI-assisted SMART-goal plans with an inline SLI 2.0 widget and a 90-day review re-score |
| `sli-assessment.html` | Standalone SLI 2.0 Assessment (PHQ-9, GAD-7, BAM, ASAM, Brief Risk/C-SSRS, SDOH), auto-scores a Support Level |
| `sli-scoring.js` | Snapshot of the shared SLI 2.0 scoring engine as of archiving |

## Staff can't reach these

- Both cards were taken off the Clinical Tools home page (`index.html`).
- `server.js` returns 404 for any URL under `/archive/`, so old bookmarks to these files will not open them.

## Still live elsewhere (don't delete)

- **`/sli-scoring.js` at the repo root stays.** The Psychotherapy Note still loads it for its optional "Include an SLI 2.0 re-score" section. If that section gets retired too, the root copy can move here.
- **Supabase tables are untouched:** `sli_assessments`, `treatment_plans`, `treatment_plan_reviews`. Whatever was saved there before is still there. The Psychotherapy Note's re-score still writes to `sli_assessments`.

## Reference value worth keeping

The header comments in `sli-scoring.js` document how the scoring was checked against Pimsy's live scores:
- BAM is a flat, unreversed 16-item sum. It matched Pimsy on 30/30 sessions.
- ASAM floors each dimension's score, with two exceptions: 1-WM scores 2 and Level 3.7 scores 4. It matched Pimsy on 99.6% of 1,954 sessions.
- GAD-7 is a 7-item sum. The legacy "Thrive Screener" form dropped item 7.

The 5 Level-4 ASAM labels added 9/23/26 are approximations taken from ASAM training material, not historical Thrive wording.

## To restore

Move the two `.html` files back to the repo root, point them at the root `sli-scoring.js`, and add their cards back to `index.html`. The archive block in `server.js` only covers `/archive/`, so nothing else needs to change.
