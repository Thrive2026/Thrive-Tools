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

var SLI_ASAM_DIMENSION_OPTIONS = [
  [ // Acute Intoxication and/or Withdrawal Potential
    { label: 'No withdrawal risk', level: 0.5, otp: false },
    { label: 'Not experiencing significant withdrawal or at minimal risk of severe withdrawal, manageable at Level 1-WM', level: 1.0, otp: false },
    { label: 'Physiologically dependent on opioids and requires OTP to prevent withdrawal', level: 1.0, otp: true },
    { label: 'Minimal risk of severe withdrawal', level: 2.1, otp: false },
    { label: 'Moderate risk of severe withdrawal', level: 2.5, otp: false },
    { label: 'No withdrawal risk, or minimal or stable withdrawal', level: 3.1, otp: false },
    { label: 'Minimal risk of severe withdrawal, manageable withdrawal', level: 3.3, otp: false },
    { label: 'Minimal severe withdrawal risk, manageable withdrawal', level: 3.5, otp: false },
    { label: 'High withdrawal risk, manageable withdrawal risk', level: 3.7, otp: false },
    { label: 'High withdrawal risk requiring full hospital resources', level: 4.0, otp: false }
  ],
  [ // Biomedical Conditions and Complications
    { label: 'None, or stable', level: 0.5, otp: false },
    { label: 'None, or stable', level: 1.0, otp: false },
    { label: 'None, or manageable', level: 1.0, otp: true },
    { label: 'None, or not distracting', level: 2.1, otp: false },
    { label: 'None, or not distracting', level: 2.5, otp: false },
    { label: 'None, or stable', level: 3.1, otp: false },
    { label: 'None, or stable', level: 3.3, otp: false },
    { label: 'None, or stable', level: 3.5, otp: false },
    { label: 'Requires 24-hour medical monitoring', level: 3.7, otp: false }
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Emotional, Behavioral, or Cognitive Conditions and Complications
    { label: 'None, or stable', level: 0.5, otp: false },
    { label: 'None, or stable', level: 1.0, otp: false },
    { label: 'None, or manageable', level: 1.0, otp: true },
    { label: 'Mild severity', level: 2.1, otp: false },
    { label: 'Mild to moderate severity', level: 2.5, otp: false },
    { label: 'None or minimal', level: 3.1, otp: false },
    { label: 'Mild to moderate', level: 3.3, otp: false },
    { label: '24-hour setting for stabilization', level: 3.5, otp: false },
    { label: 'Moderate severity, requires 24-hour structured setting', level: 3.7, otp: false }
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Readiness to Change
    { label: 'Willing to explore how use affects personal goals', level: 0.5, otp: false },
    { label: 'Ready for recovery, needs strategies to strengthen readiness', level: 1.0, otp: false },
    { label: 'Ready to change, but not ready for total abstinence', level: 1.0, otp: true },
    { label: 'Variable treatment engagement, requires structured program', level: 2.1, otp: false },
    { label: 'Poor treatment engagement, needs near-daily structured program', level: 2.5, otp: false },
    { label: 'Open to recovery, needs structured environment', level: 3.1, otp: false },
    { label: 'Needs interventions to engage and stay in treatment', level: 3.3, otp: false },
    { label: 'Has significant difficulty with treatment, with negative consequences', level: 3.5, otp: false },
    { label: 'Low interest in treatment, needs motivational strategies in 24-hour structured setting', level: 3.7, otp: false }
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Relapse, Continued Use, or Continued Problem Potential
    { label: 'Needs understanding or skills to change current use or high-risk behavior', level: 0.5, otp: false },
    { label: 'Able to maintain abstinence or control use with minimal support', level: 1.0, otp: false },
    { label: 'At risk of continued use without OTP', level: 1.0, otp: true },
    { label: 'High likelihood of relapse without close monitoring and support', level: 2.1, otp: false },
    { label: 'High likelihood of relapse without near-daily monitoring and support', level: 2.5, otp: false },
    { label: 'Understands relapse, needs structure', level: 3.1, otp: false },
    { label: 'Needs intervention to prevent relapse', level: 3.3, otp: false },
    { label: 'Needs intervention to prevent relapse', level: 3.5, otp: false },
    { label: 'Challenges controlling use at less intensive care levels', level: 3.7, otp: false }
    // No Level-4 example found in the historical data for this dimension.
  ],
  [ // Recovery/Living Environment
    { label: 'Environment increases risk of use', level: 0.5, otp: false },
    { label: 'Supportive environment, patient has coping skills', level: 1.0, otp: false },
    { label: 'Supportive environment, patient has coping skills', level: 1.0, otp: true },
    { label: 'Unsupportive environment, patient has coping skills', level: 2.1, otp: false },
    { label: 'Unsupportive environment, cope with structure and support', level: 2.5, otp: false },
    { label: 'Unsupportive environment, cope with structure and support', level: 3.1, otp: false },
    { label: 'Dangerous environment, 24-hour structure needed', level: 3.3, otp: false },
    { label: 'Dangerous environment, highly structured 24-hour setting needed', level: 3.5, otp: false },
    { label: 'Dangerous environment', level: 3.7, otp: false }
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
var SLI_BAM_SCORED_KEYS = [
  'physical_health', 'sleep_trouble', 'mood_distress', 'alcohol_days', 'heavy_drinking_days',
  'drug_days', 'cravings', 'abstinence_confidence', 'self_help_days', 'risky_situations_days',
  'spirituality', 'work_school_days', 'relationship_problems', 'supportive_contact_days',
  'recovery_satisfaction'
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

  var bamRaw = sliSum(SLI_BAM_SCORED_KEYS.map(function(k) { return state.bam[k]; }));
  var bamBand = sliBandFromTable(bamRaw, [
    { min: 0, max: 20, label: '0-20 Low Risk', points: 1 },
    { min: 21, max: 35, label: '21-35 Moderate Risk', points: 2 },
    { min: 36, max: 45, label: '36-45 High Risk', points: 3 },
    { min: 46, max: 9999, label: '46+ Very High Risk', points: 4 }
  ]);

  // FIX (BUG-07, 9/15/26): asam_dims now holds each dimension's real 0.5-4 ASAM
  // level (from SLI_ASAM_DIMENSION_OPTIONS), not a 0-4 placeholder index -- the sum
  // and banding below are unchanged, since the band table was already written
  // against the real 0.5-4-per-dimension scale the placeholder was standing in for.
  var asamRaw = state.asam_mh_only ? 0 : sliSum(state.asam_dims);
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
