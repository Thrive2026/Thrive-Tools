// ══════════════════════════════════════════════════════════════════════════
// SLI 2.0 SCORING ENGINE — single shared source of truth for Support-Level math.
//
// Used by: sliassessment_1.html (standalone Initial/30-day/90-day/Ad-hoc assessment),
// treatmentplan_2.html (Treatment Plan Builder's inline SLI widget + 90-day review
// re-score), psychotherapynote.html (Psychotherapy Note's inline SLI re-score).
//
// FIX (BUG-13/BUG-33, 9/4/26): this exact math was independently re-implemented 4+
// times across these files (confirmed numerically identical on 9/4/26, with one
// already-fixed drift -- a variable-name typo, not a logic difference). Rather than
// keep re-verifying N copies stay in sync by hand, this is now the ONE place the
// math lives; each tool's own file wires its DOM/UI to this.
//
// FIX (BUG-07, 9/15/26): the real Thrive ASAM picklist replaces the 5-point
// placeholder. It was recovered from Audits_all_time.xlsx (the historical export of
// every completed Thrive Screener/Thrive Screener 2.0 audit) rather than written
// fresh -- clinicians had already been recording placements against a real 9-option,
// 0.5-4-point-per-dimension picklist that lines up with the standard ASAM Levels of
// Care (0.5 Early Intervention, 1 / OTP-1 Outpatient, 2.1 IOP, 2.5 Partial
// Hospitalization/High-Intensity Outpatient, 3.1/3.3/3.5/3.7 Residential tiers, 4
// Medically Managed Intensive Inpatient) -- it just wasn't wired into any of the
// digital tools yet. See SLI_ASAM_DIMENSION_OPTIONS below. Two things still open:
// (1) five of the six dimensions have no real-world example of a "Level 4" answer in
// the historical data, so no Level-4 label could be recovered for them (left out
// rather than invented -- add it once clinical leadership can supply the wording);
// (2) this file's own math didn't need to change (asam_dims already held whatever
// point value the UI recorded), but every consuming tool's ASAM render/option-wiring
// code does, since dimensions no longer share one flat option list -- see the
// dimension-specific SLI_ASAM_DIMENSION_OPTIONS shape below. sliassessment.html in
// this delivery has been updated to match; treatmentplan.html (all 4 internal
// copies) and psychotherapynote.html still need the equivalent render-side update
// wherever they build their own ASAM option rows.
//
// FIX (SCORING-REVIEW-2, 9/18/26) -- BAM item 14 added; the 9/17/26 item-17
// reversal RETRACTED. Two independent, good-faith attempts (this file's own
// 9/17/26 revision, and a parallel one made in a different session the same
// day -- see bam_historical_recompute_1.sql) both "corrected" BAM's flat sum by
// reversing some of its protective-direction items, reasoning from the
// official Brief Addiction Monitor guidelines PDF. Both turned out wrong,
// caught by finally checking the one source that actually matters: Thrive's
// own LIVE Pimsy system. Pimsy's real "BAM Score" field (Order 495 -- what
// staff already look at today to pick the BAM Normalized band that drives real
// Support Level assignments) was pulled for 30 real, fully-answered sessions
// alongside their raw item answers, and tested against every candidate
// formula. A flat, fully UNREVERSED sum of all 16 items (item 17 counted
// forward like every other extreme-scale item; the newly-added
// income_sufficient counted as a raw 0/1, not scaled to 0-4) matched Pimsy's
// real score on 30/30 sessions, using the ORIGINAL band table (0-20/21-35/
// 36-45/46+) with no rescaling. The item-17-reversed version matched 6/30; the
// six-item-reversed version matched 3/30. See the inline comment at bamRaw
// below for the full account. income_sufficient (BAM item 14, the official
// Protective Factors income question) really was missing from every digital
// SLI 2.0 tool despite full coverage in Pimsy's own audit trail (Thrive's own
// Training Manual describes it as item 14 too) -- that part of both prior
// fixes was correct and is kept, just scored the way Pimsy actually scores it:
// added in unchanged, no reversal, no rescaling.
//
// FIX (SCORING-REVIEW-3, 9/18/26) -- GAD-7 and ASAM checked the same way BAM
// just was (Pimsy's own live score on real sessions, not guideline-reasoning
// alone). GAD-7: no change. The existing 7-item sum already matches Pimsy's
// current form ("Thrive Screener 2.0") 97.8% of the time; it only diverges
// from Pimsy's real score on the legacy "Thrive Screener" form, which turns
// out to compute a non-standard 6-item sum (silently drops item 7). That's a
// quirk of the retired Pimsy form, not a bug here. ASAM: real bug, fixed.
// asamRaw was summing each dimension's literal ASAM Level of Care number
// (0.5, 2.1, 2.5, 3.1, 3.3, 3.5, 3.7...) including the fractional
// sub-designation; Pimsy's real score floors each dimension to its whole
// Level first. Flooring raised the match on 1,954 real sessions from 54% to
// 93.7% (verified through this file's own sliComputeScores()). Two rarer
// option-specific exceptions (dimension 1's "Level 1-WM" pick scores 2, not
// 1; any "Level 3.7" pick scores 4, not 3) explain nearly all of the rest and
// took the match to 99.6% -- applied the same day once the three consuming
// tools were updated to save which picklist OPTION was chosen, not just its
// bare level number, which used to be identical for the WM/OTP/plain choices
// at the same level (each option now carries its own `points` value in
// SLI_ASAM_DIMENSION_OPTIONS below). See the inline comment at asamRaw below, and
// outcomes-dashboard-live-metrics-migration-plan.md's "GAD-7 and ASAM checked
// against Pimsy's live score" section, for the full account.
//
// Include this file with a same-origin relative path (not an external host) BEFORE
// each tool's own <script> block:
//   <script src="sli-scoring.js"></script>
// Same-origin on purpose -- see BUG-22 (Provider Match widget) for what an
// externally-hosted single point of failure costs when it's down; this file
// ships in the same repo/deploy as the tools that need it.
//
// Every function here is a pure function of its arguments -- no DOM access, no
// Supabase calls, nothing global except the constants below. That's deliberate:
// it's what makes it safe to unit-test in isolation and safe to share across three
// otherwise-unrelated single-file tools with no build step.
// ══════════════════════════════════════════════════════════════════════════

// Real Thrive ASAM dimension names (unchanged from the placeholder -- these were
// already correct) and, for each dimension, its real picklist: label + the actual
// ASAM Level of Care number that answer corresponds to (0.5-4, matching how the raw
// per-dimension score is summed below). `otp` flags the Opioid Treatment Program
// variant of a rung, which some dimensions and clients need to track distinctly from
// the standard version at the same numeric level.
var SLI_ASAM_DIMENSIONS = [
  'Acute Intoxication and/or Withdrawal Potential',
  'Biomedical Conditions and Complications',
  'Emotional, Behavioral, or Cognitive Conditions and Complications',
  'Readiness to Change',
  'Relapse, Continued Use, or Continued Problem Potential',
  'Recovery/Living Environment'
];

// FIX (SCORING-REVIEW-3, 9/18/26): `points` added to every option -- the exact
// whole-number contribution Pimsy's real ASAM Score gives that specific pick,
// confirmed against 1,954 real sessions (see the file header and asamRaw
// below). It's floor(level) for the overwhelming majority of options, with
// two confirmed exceptions: dimension 1's "Level 1-WM" (ambulatory withdrawal
// management) option scores 2, not 1 -- it's genuinely a step up in care even
// though it shares the same displayed level number as plain "Level 1"; and
// any dimension's "Level 3.7" option scores 4, not 3. Both exceptions are
// marked inline below. OTP options were checked too and do NOT need an
// exception -- they score floor(level) like any other option at that level.
var SLI_ASAM_DIMENSION_OPTIONS = [
  [ // Acute Intoxication and/or Withdrawal Potential
    { label: 'No withdrawal risk', level: 0.5, otp: false, points: 0 },
    { label: 'Not experiencing significant withdrawal or at minimal risk of severe withdrawal, manageable at Level 1-WM', level: 1.0, otp: false, points: 2 }, // WM exception
    { label: 'Physiologically dependent on opioids and requires OTP to prevent withdrawal', level: 1.0, otp: true, points: 1 },
    { label: 'Minimal risk of severe withdrawal', level: 2.1, otp: false, points: 2 },
    { label: 'Moderate risk of severe withdrawal', level: 2.5, otp: false, points: 2 },
    { label: 'No withdrawal risk, or minimal or stable withdrawal', level: 3.1, otp: false, points: 3 },
    { label: 'Minimal risk of severe withdrawal, manageable withdrawal', level: 3.3, otp: false, points: 3 },
    { label: 'Minimal severe withdrawal risk, manageable withdrawal', level: 3.5, otp: false, points: 3 },
    { label: 'High withdrawal risk, manageable withdrawal risk', level: 3.7, otp: false, points: 4 }, // 3.7 exception
    { label: 'High withdrawal risk requiring full hospital resources', level: 4.0, otp: false, points: 4 }
  ],
  [ // Biomedical Conditions and Complications
    { label: 'None, or stable', level: 0.5, otp: false, points: 0 },
    { label: 'None, or stable', level: 1.0, otp: false, points: 1 },
    { label: 'None, or manageable', level: 1.0, otp: true, points: 1 },
    { label: 'None, or not distracting', level: 2.1, otp: false, points: 2 },
    { label: 'None, or not distracting', level: 2.5, otp: false, points: 2 },
    { label: 'None, or stable', level: 3.1, otp: false, points: 3 },
    { label: 'None, or stable', level: 3.3, otp: false, points: 3 },
    { label: 'None, or stable', level: 3.5, otp: false, points: 3 },
    { label: 'Requires 24-hour medical monitoring', level: 3.7, otp: false, points: 4 } // 3.7 exception
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Emotional, Behavioral, or Cognitive Conditions and Complications
    { label: 'None, or stable', level: 0.5, otp: false, points: 0 },
    { label: 'None, or stable', level: 1.0, otp: false, points: 1 },
    { label: 'None, or manageable', level: 1.0, otp: true, points: 1 },
    { label: 'Mild severity', level: 2.1, otp: false, points: 2 },
    { label: 'Mild to moderate severity', level: 2.5, otp: false, points: 2 },
    { label: 'None or minimal', level: 3.1, otp: false, points: 3 },
    { label: 'Mild to moderate', level: 3.3, otp: false, points: 3 },
    { label: '24-hour setting for stabilization', level: 3.5, otp: false, points: 3 },
    { label: 'Moderate severity, requires 24-hour structured setting', level: 3.7, otp: false, points: 4 } // 3.7 exception
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Readiness to Change
    { label: 'Willing to explore how use affects personal goals', level: 0.5, otp: false, points: 0 },
    { label: 'Ready for recovery, needs strategies to strengthen readiness', level: 1.0, otp: false, points: 1 },
    { label: 'Ready to change, but not ready for total abstinence', level: 1.0, otp: true, points: 1 },
    { label: 'Variable treatment engagement, requires structured program', level: 2.1, otp: false, points: 2 },
    { label: 'Poor treatment engagement, needs near-daily structured program', level: 2.5, otp: false, points: 2 },
    { label: 'Open to recovery, needs structured environment', level: 3.1, otp: false, points: 3 },
    { label: 'Needs interventions to engage and stay in treatment', level: 3.3, otp: false, points: 3 },
    { label: 'Has significant difficulty with treatment, with negative consequences', level: 3.5, otp: false, points: 3 },
    { label: 'Low interest in treatment, needs motivational strategies in 24-hour structured setting', level: 3.7, otp: false, points: 4 } // 3.7 exception
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Relapse, Continued Use, or Continued Problem Potential
    { label: 'Needs understanding or skills to change current use or high-risk behavior', level: 0.5, otp: false, points: 0 },
    { label: 'Able to maintain abstinence or control use with minimal support', level: 1.0, otp: false, points: 1 },
    { label: 'At risk of continued use without OTP', level: 1.0, otp: true, points: 1 },
    { label: 'High likelihood of relapse without close monitoring and support', level: 2.1, otp: false, points: 2 },
    { label: 'High likelihood of relapse without near-daily monitoring and support', level: 2.5, otp: false, points: 2 },
    { label: 'Understands relapse, needs structure', level: 3.1, otp: false, points: 3 },
    { label: 'Needs intervention to prevent relapse', level: 3.3, otp: false, points: 3 },
    { label: 'Needs intervention to prevent relapse', level: 3.5, otp: false, points: 3 },
    { label: 'Challenges controlling use at less intensive care levels', level: 3.7, otp: false, points: 4 } // 3.7 exception
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Recovery/Living Environment
    { label: 'Environment increases risk of use', level: 0.5, otp: false, points: 0 },
    { label: 'Supportive environment, patient has coping skills', level: 1.0, otp: false, points: 1 },
    { label: 'Supportive environment, patient has coping skills', level: 1.0, otp: true, points: 1 },
    { label: 'Unsupportive environment, patient has coping skills', level: 2.1, otp: false, points: 2 },
    { label: 'Unsupportive environment, cope with structure and support', level: 2.5, otp: false, points: 2 },
    { label: 'Unsupportive environment, cope with structure and support', level: 3.1, otp: false, points: 3 },
    { label: 'Dangerous environment, 24-hour structure needed', level: 3.3, otp: false, points: 3 },
    { label: 'Dangerous environment, highly structured 24-hour setting needed', level: 3.5, otp: false, points: 3 },
    { label: 'Dangerous environment', level: 3.7, otp: false, points: 4 } // 3.7 exception
    // No Level-4 example found in the historical data for this dimension.
  ]
];

// Deprecated aliases -- kept only so any code that still references the old
// placeholder names doesn't fail outright while the three consuming tools are
// updated one at a time. Do not add new references to these; use
// SLI_ASAM_DIMENSIONS / SLI_ASAM_DIMENSION_OPTIONS above instead.
var SLI_ASAM_DIMENSIONS_PLACEHOLDER = SLI_ASAM_DIMENSIONS;
var SLI_ASAM_PLACEHOLDER_OPTIONS = [
  { label: '0 — No problem: fully stable', points: 0 },
  { label: '1 — Mild: slight issue, manageable in current setting', points: 1 },
  { label: '2 — Moderate: requires structured support or intervention', points: 2 },
  { label: '3 — Serious: presents a clear risk, needs intensive services', points: 3 },
  { label: '4 — Severe: imminent danger or inability to function without 24/7 care', points: 4 }
];

// Canonical item KEYS only (not labels -- each tool phrases questions for its own
// audience: "you" in the self-report SLI Assessment, "the individual" in Treatment
// Plan Builder, "the client" in Psychotherapy Note). Confirmed identical key sets
// across all three files' own item-definition arrays before extracting this.
// FIX (SCORING-REVIEW-2, 9/18/26): item 14 (income_sufficient, the official BAM
// Protective Factors income question) added -- see this file's header for why.
// Inserted in the instrument's real 1-17 order (between work_school_days/13 and
// relationship_problems/15), matching sliassessment.html/treatmentplan.html/
// psychotherapynote.html's own BAM_SCORED_ITEMS arrays, which already carry this
// item as of 9/17/26. No reversal applied -- see header comment for why not.
var SLI_BAM_SCORED_KEYS = [
  'physical_health', 'sleep_trouble', 'mood_distress', 'alcohol_days', 'heavy_drinking_days',
  'drug_days', 'cravings', 'abstinence_confidence', 'self_help_days', 'risky_situations_days',
  'spirituality', 'work_school_days', 'income_sufficient', 'relationship_problems',
  'supportive_contact_days', 'recovery_satisfaction'
];
var SLI_CSSRS_KEYS = ['1a', '1b', '1c', '1d', '1e', '1f'];
var SLI_CSSRS_ESCALATION_KEYS = ['1c', '1d', '1e', '1f'];
var SLI_RISK_EXTRA_KEYS = ['harm_others', 'abuse', 'psychosis'];
var SLI_SDOH_KEYS = ['housing', 'food_utilities', 'transportation', 'healthcare_access', 'isolation', 'legal_safety'];

var SLI_LEVEL_TABLE = [
  { min: 0, max: 5, level: 1, label: 'Level 1 — Maintenance', hours: '1-2 hrs/wk' },
  { min: 6, max: 8, level: 2, label: 'Level 2 — Moderate', hours: '2-4 hrs/wk' },
  { min: 9, max: 11, level: 3, label: 'Level 3 — High', hours: '4-6 hrs/wk' },
  { min: 12, max: 14, level: 4, label: 'Level 4 — Intensive', hours: '6-8 hrs/wk' },
  { min: 15, max: 9999, level: 5, label: 'Level 5 — Critical', hours: '8+ hrs/wk (Director approval required)' }
];

function sliSum(arr) {
  return arr.reduce(function(a, b) { return a + (b === null || b === undefined ? 0 : b); }, 0);
}

function sliBandFromTable(raw, table) {
  for (var i = 0; i < table.length; i++) {
    if (raw >= table[i].min && raw <= table[i].max) return table[i];
  }
  return table[table.length - 1];
}

// state shape (matches what all three tools already keep in memory):
//   { phq9:[9 nums], gad7:[7 nums], bam:{key:num}, asam_mh_only:bool,
//     asam_dims:[6 nums -- each the real 0.5-4 ASAM level picked for that dimension,
//     not an index], cssrs:{key:0|1}, risk_extra:{key:0|1}, sdoh:{key:0|1} (optional
//     -- see opts.sdoh) }
// opts (all optional):
//   sdoh -- an SDOH map to use INSTEAD of state.sdoh. Treatment Plan Builder doesn't keep
//     SDOH on its sliState/reviewSliState objects (it reads 6 checkboxes straight from the
//     DOM) -- its wrapper builds this map from those checkboxes and passes it here rather
//     than restructuring its state object. Every other caller can just rely on state.sdoh.
function sliComputeScores(state, opts) {
  opts = opts || {};
  var sdoh = opts.sdoh || state.sdoh;

  var phq9Raw = sliSum(state.phq9);
  var phq9Band = sliBandFromTable(phq9Raw, [
    { min: 0, max: 9, label: '0-9 Minimal', points: 1 },
    { min: 10, max: 14, label: '10-14 Mild-Moderate', points: 2 },
    { min: 15, max: 19, label: '15-19 Moderate-Severe', points: 3 },
    { min: 20, max: 27, label: '20-27 Severe', points: 4 }
  ]);

  var gad7Raw = sliSum(state.gad7);
  var gad7Band = sliBandFromTable(gad7Raw, [
    { min: 0, max: 9, label: '0-9 Minimal', points: 1 },
    { min: 10, max: 14, label: '10-14 Mild-Moderate', points: 2 },
    { min: 15, max: 19, label: '15-19 Moderate-Severe', points: 3 },
    { min: 20, max: 21, label: '20-21 Severe', points: 4 }
  ]);

  // FIX (SCORING-REVIEW-2, 9/18/26) -- REVERTS the 9/17/26 item-17 reversal fix
  // below (kept visible, struck through in spirit, so the history is legible
  // rather than silently erased -- see this file's header for the full story).
  // That fix reasoned from the *official* Brief Addiction Monitor guidelines
  // PDF alone -- which does reverse item 17's own point values -- and concluded
  // Thrive's tools should match the guidelines. That reasoning skipped a check
  // this correction did not: what does Thrive's own LIVE system (Pimsy's actual
  // "BAM Score" field, Order 495 -- the number staff already look at today to
  // pick the BAM Normalized band that feeds real Support Level decisions)
  // actually compute? Pulled 30 real, fully-answered sessions from
  // Audits_all_time.xlsx with both the raw item answers AND Pimsy's own
  // precomputed BAM Score/Level fields, and tested every candidate formula
  // against it directly. Result, unambiguous: a flat, UNREVERSED sum of all 16
  // items (item 17 counted forward, same as every other extreme-scale item;
  // income_sufficient added as a raw 0/1, not scaled to 0-4) reproduces Pimsy's
  // real BAM Score exactly on 30/30 sessions -- and the same real data confirms
  // Pimsy is still using the ORIGINAL band cutoffs below (0-20/21-35/36-45/46+),
  // not a rescaled table. Reversing item 17 (last fix) matched only 6/30;
  // reversing six items plus a reversed+rescaled income term (a second,
  // independent attempt at this same fix, from a parallel session -- see
  // bam_historical_recompute_1.sql/the pasted engine it produced) matched only
  // 3/30. Both were good-faith, sourced attempts at a real problem, and both
  // turned out to diverge from what Thrive's own operational system already
  // does today -- which is the one thing that actually determines real Support
  // Level assignments and billing right now, guideline PDF notwithstanding.
  // The one earlier finding that DOES hold up under this same real-data check:
  // income_sufficient (item 14) really was missing from every digital tool
  // despite being asked at full coverage in Pimsy's own audit trail -- that
  // addition stands, just scored the way Pimsy actually scores it (below).
  var bamRaw = sliSum(SLI_BAM_SCORED_KEYS.map(function(k) { return state.bam[k]; }));
  var bamBand = sliBandFromTable(bamRaw, [
    { min: 0, max: 20, label: '0-20 Low Risk', points: 1 },
    { min: 21, max: 35, label: '21-35 Moderate Risk', points: 2 },
    { min: 36, max: 45, label: '36-45 High Risk', points: 3 },
    { min: 46, max: 9999, label: '46+ Very High Risk', points: 4 }
  ]);

  // FIX (SCORING-REVIEW-3, 9/18/26): BUG-07 (9/15/26) switched asam_dims from a
  // 0-4 placeholder index to the real 0.5-4 ASAM Level of Care number per
  // dimension, but left the sum itself as a literal add of those fractional
  // numbers (0.5, 2.1, 2.5, 3.1, 3.3, 3.5, 3.7 and so on). Checked against
  // Pimsy's own real "ASAM Score" field on 1,954 real, fully-answered sessions
  // (Audits_all_time.xlsx) the same way BAM was checked: the literal fractional
  // sum matched only 1,058/1,954 (54%) -- and matched far less often than that
  // on sessions where any dimension sits on a real sub-level (2.1/2.5/3.1/3.3/
  // 3.5/3.7), which is most of them. The band table below (0-6 / 7-12 / 13-17 /
  // 18-24) only makes sense for a whole-number 0-24 total in the first place --
  // it was already written assuming each dimension contributes a whole point
  // (0/1/2/3/4), i.e. the ASAM Level of Care number with its .1/.3/.5/.7
  // sub-designation dropped, not carried into the sum as a fraction.
  //
  // Flooring each dimension's level before summing (0.5->0, 2.1/2.5->2,
  // 3.1/3.3/3.5/3.7->3, 4.0->4) raised the match to 1,831/1,954 (93.7%), and
  // fully explains the outcome for every session that doesn't hit one of two
  // rare option-specific exceptions Pimsy's own scoring makes (dimension 1's
  // "Level 1-WM" ambulatory withdrawal management option scores 2, not 1; a
  // rare "Level 3.7" pick on any dimension scores 4, not 3) -- together these
  // took the match to 1,947/1,954 (99.6%), with the last 7 sessions being
  // pre-picklist free-text entries or otherwise-inconsistent legacy rows, not
  // a formula gap.
  //
  // UPDATE (9/18/26, same day): both exceptions are now applied. The three
  // consuming tools save which picklist OPTION was picked, not just its bare
  // level number (which used to be identical for the WM and non-WM choice at
  // dimension 1's "Level 1", and for OTP vs non-OTP choices at the same
  // level) -- each option in SLI_ASAM_DIMENSION_OPTIONS now carries its own
  // exact `points` value (see above), and the tools send that as
  // `state.asam_dimension_points`, a parallel array to `state.asam_dims`
  // (which still holds the bare level, unchanged, for display and for the
  // `asam_dimensions` field every existing consumer -- SQL, trend charts --
  // already expects). When a dimension's points value is present, it's used
  // as-is; when it's missing (an older saved draft, or any future caller that
  // hasn't been updated to send it), this falls back to floor(level) exactly
  // as before -- a safe default, never a regression.
  var asamRaw = state.asam_mh_only ? 0 : sliSum(state.asam_dims.map(function(lvl, i) {
    if (lvl == null) return 0;
    var pts = state.asam_dimension_points && state.asam_dimension_points[i];
    return (pts === 0 || pts) ? pts : Math.floor(lvl);
  }));
  var asamBand = state.asam_mh_only
    ? { label: 'N/A (MH Only)', points: 0 }
    : sliBandFromTable(asamRaw, [
        { min: 0, max: 6, label: '0-6 Early/Outpatient', points: 1 },
        { min: 7, max: 12, label: '7-12 IOP', points: 2 },
        { min: 13, max: 17, label: '13-17 Residential', points: 3 },
        { min: 18, max: 9999, label: '18-24 Intensive', points: 4 }
      ]);

  var escalation = SLI_CSSRS_ESCALATION_KEYS.some(function(k) { return state.cssrs[k] === 1; });
  var riskExtraRaw = sliSum(SLI_RISK_EXTRA_KEYS.map(function(k) { return state.risk_extra[k]; }));
  var riskRaw = sliSum(SLI_CSSRS_KEYS.map(function(k) { return state.cssrs[k]; })) + riskExtraRaw;
  var riskBand;
  // FIX (BUG-13, 9/4): standardized on the "High/Low-Moderate/No Risk" label text already
  // used by 2 of the 3 tools -- sliassessment_1.html previously saved a differently-formatted
  // label ("2 High Risk") to the SAME shared sli_assessments.risk_band column, which meant
  // that one text field could read two different ways depending on which tool wrote the row.
  if (escalation || riskRaw >= 4) riskBand = { label: 'High Risk', points: 2 };
  else if (riskRaw >= 1) riskBand = { label: 'Low-Moderate Risk', points: 1 };
  else riskBand = { label: 'No Risk', points: 0 };

  var sdohScore = sdoh ? sliSum(SLI_SDOH_KEYS.map(function(k) { return sdoh[k]; })) : 0;

  var clinicalScore = phq9Band.points + gad7Band.points + bamBand.points + asamBand.points + riskBand.points;
  var adjustedSli = clinicalScore + sdohScore;

  var lowClinicalFlag = clinicalScore <= 4;
  var highSdohFlag = sdohScore >= 3;
  var cap = lowClinicalFlag && highSdohFlag;

  var calculatedLevel = cap ? SLI_LEVEL_TABLE[0] : sliBandFromTable(adjustedSli, SLI_LEVEL_TABLE);
  var directorReviewRequired = calculatedLevel.level === 5 && !cap;

  return {
    phq9Raw: phq9Raw, phq9Band: phq9Band,
    gad7Raw: gad7Raw, gad7Band: gad7Band,
    bamRaw: bamRaw, bamBand: bamBand,
    asamRaw: asamRaw, asamBand: asamBand,
    escalation: escalation, riskRaw: riskRaw, riskBand: riskBand,
    sdohScore: sdohScore,
    clinicalScore: clinicalScore, adjustedSli: adjustedSli,
    lowClinicalFlag: lowClinicalFlag, highSdohFlag: highSdohFlag, cap: cap,
    calculatedLevel: calculatedLevel, directorReviewRequired: directorReviewRequired
  };
}

// Node's `require()` isn't available in a plain browser <script> include, and this same
// file is also loaded directly by the regression harness (sli-scoring.test.js) under
// Node -- this makes both work from one file without a build step either way.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SLI_ASAM_DIMENSIONS: SLI_ASAM_DIMENSIONS,
    SLI_ASAM_DIMENSION_OPTIONS: SLI_ASAM_DIMENSION_OPTIONS,
    SLI_ASAM_DIMENSIONS_PLACEHOLDER: SLI_ASAM_DIMENSIONS_PLACEHOLDER,
    SLI_ASAM_PLACEHOLDER_OPTIONS: SLI_ASAM_PLACEHOLDER_OPTIONS,
    SLI_BAM_SCORED_KEYS: SLI_BAM_SCORED_KEYS,
    SLI_CSSRS_KEYS: SLI_CSSRS_KEYS,
    SLI_CSSRS_ESCALATION_KEYS: SLI_CSSRS_ESCALATION_KEYS,
    SLI_RISK_EXTRA_KEYS: SLI_RISK_EXTRA_KEYS,
    SLI_SDOH_KEYS: SLI_SDOH_KEYS,
    SLI_LEVEL_TABLE: SLI_LEVEL_TABLE,
    sliSum: sliSum,
    sliBandFromTable: sliBandFromTable,
    sliComputeScores: sliComputeScores
  };
}
